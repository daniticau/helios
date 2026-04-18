"""CAISO OASIS direct client for real-time wholesale LMP prices.

Used by Mode B to value export decisions. Phase 1 reads Day-Ahead
Market (DAM) LMPs for a SoCal trading hub node
(``TH_SP15_GEN-APND``) straight from the public OASIS SingleZip
endpoint. Falls back to a synthesized diurnal curve on any error so
the demo keeps working without network access.

OASIS returns a ZIP containing a single CSV; we unpack and parse it
in-memory.
"""

from __future__ import annotations

import io
import math
import zipfile
from datetime import datetime, timedelta, timezone

import httpx

OASIS_URL = "https://oasis.caiso.com/oasisapi/SingleZip"

# Default SoCal trading hub. Override if we need a specific substation.
DEFAULT_NODE = "TH_SP15_GEN-APND"


def _oasis_time(dt: datetime) -> str:
    """OASIS wants ``YYYYMMDDTHH:MM-0000`` UTC format."""
    return dt.strftime("%Y%m%dT%H:%M-0000")


async def fetch_lmp_24h_real(
    node: str = DEFAULT_NODE,
    timeout_seconds: float = 12.0,
) -> list[float] | None:
    """Pull the next 24h Day-Ahead LMPs for ``node`` from CAISO OASIS.

    Returns a 24-entry list of ``$/kWh`` floats, or ``None`` on failure.
    OASIS reports LMPs in ``$/MWh`` so we divide by 1000.

    Docs (best available):
    https://www.caiso.com/Documents/OASIS-InterfaceSpecification_v5_1_8Clean_Fall2017Release.pdf
    """
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    end = now + timedelta(hours=25)
    params = {
        "queryname": "PRC_LMP",
        "startdatetime": _oasis_time(now),
        "enddatetime": _oasis_time(end),
        "version": "12",
        "market_run_id": "DAM",
        "node": node,
        "resultformat": "6",  # CSV (zipped)
    }

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            resp = await client.get(OASIS_URL, params=params)
            if resp.status_code >= 400 or not resp.content:
                return None
            # Response is a zip containing a CSV.
            try:
                zf = zipfile.ZipFile(io.BytesIO(resp.content))
            except zipfile.BadZipFile:
                return None
            names = zf.namelist()
            if not names:
                return None
            with zf.open(names[0]) as f:
                text = f.read().decode("utf-8", errors="replace")
    except (httpx.HTTPError, OSError):
        return None

    lines = text.strip().splitlines()
    if len(lines) < 2:
        return None
    header = [h.strip() for h in lines[0].split(",")]

    def _col(name: str) -> int:
        for i, h in enumerate(header):
            if h.upper() == name.upper():
                return i
        return -1

    # OASIS PRC_LMP CSV shape (v12):
    #   INTERVALSTARTTIME_GMT, ..., XML_DATA_ITEM, ..., MW, ...
    # The "MW" column carries the numeric price for the component named
    # in XML_DATA_ITEM. We want XML_DATA_ITEM = "LMP_PRC" (total).
    value_col = _col("MW")
    if value_col < 0:
        value_col = _col("VALUE")
    if value_col < 0:
        value_col = _col("LMP_PRC")
    interval_col = _col("INTERVALSTARTTIME_GMT")
    item_col = _col("XML_DATA_ITEM")
    if item_col < 0:
        item_col = _col("DATA_ITEM")
    if value_col < 0 or interval_col < 0:
        return None

    rows: list[tuple[str, float]] = []
    for line in lines[1:]:
        cells = line.split(",")
        if len(cells) <= max(value_col, interval_col):
            continue
        if item_col >= 0 and item_col < len(cells):
            di = cells[item_col].strip().upper()
            if di and di != "LMP_PRC":
                continue
        try:
            price_mwh = float(cells[value_col])
        except ValueError:
            continue
        rows.append((cells[interval_col], price_mwh))

    if not rows:
        return None

    # Sort chronologically and take 24 hourly values.
    rows.sort(key=lambda r: r[0])
    usd_per_kwh = [round(price / 1000.0, 4) for _, price in rows[:24]]
    while len(usd_per_kwh) < 24:
        usd_per_kwh.append(usd_per_kwh[-1] if usd_per_kwh else 0.05)
    return usd_per_kwh[:24]


def synth_lmp_24h(now: datetime | None = None) -> list[float]:
    """Synthesize a plausible 24hr LMP curve in $/kWh.

    Shape: low overnight, dip mid-day (solar glut), high late afternoon.
    Returns hourly values starting at ``now``.
    """
    now = now or datetime.now()
    start_hour = now.hour
    out = []
    for i in range(24):
        hour = (start_hour + i) % 24
        # Baseline diurnal wave
        base = 0.08 + 0.05 * math.sin((hour - 6) / 24.0 * 2 * math.pi)
        # Mid-day solar glut: export rates plunge 10am-2pm
        if 10 <= hour <= 14:
            base = max(0.02, base - 0.05)
        # Peak window: 4-9pm spike
        if 16 <= hour <= 21:
            spike = 0.50 * math.exp(-((hour - 18.5) ** 2) / 3.0)
            base += spike
        out.append(round(base, 4))
    return out
