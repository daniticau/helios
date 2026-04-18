"""Tests for backend.caiso — OASIS client + synthetic LMP fallback."""

from __future__ import annotations

import asyncio
import io
import zipfile
from datetime import datetime

import httpx
import respx

from caiso import OASIS_URL, fetch_lmp_24h_real, synth_lmp_24h


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


# ---------------------------------------------------------------------------
# synth_lmp_24h
# ---------------------------------------------------------------------------


def test_synth_lmp_24h_returns_24_floats() -> None:
    series = synth_lmp_24h()
    assert len(series) == 24
    assert all(isinstance(x, float) for x in series)
    assert all(x >= 0 for x in series)


def test_synth_lmp_24h_has_range() -> None:
    series = synth_lmp_24h()
    assert max(series) > min(series)


def test_synth_lmp_24h_evening_start_puts_peak_in_first_4h() -> None:
    """If we boot at 5pm, the 4-9pm spike should appear inside the first 4h."""
    now = datetime(2026, 4, 18, 17, 0, 0)
    series = synth_lmp_24h(now)
    first_window = series[:4]
    assert max(first_window) > 0.3, first_window


def test_synth_lmp_24h_noon_start_has_peak_later() -> None:
    """Boot at noon — peak (4-9pm) should be 4-9 hours out."""
    now = datetime(2026, 4, 18, 12, 0, 0)
    series = synth_lmp_24h(now)
    assert max(series[4:10]) > max(series[:3])


# ---------------------------------------------------------------------------
# fetch_lmp_24h_real (via respx)
# ---------------------------------------------------------------------------


def _build_oasis_zip(hourly_prices_mwh: list[float]) -> bytes:
    """Assemble a CSV matching OASIS PRC_LMP v12 shape, zipped."""
    header = (
        "INTERVALSTARTTIME_GMT,INTERVALENDTIME_GMT,NODE,XML_DATA_ITEM,MW,LMP_TYPE"
    )
    rows = [header]
    for hr, price in enumerate(hourly_prices_mwh):
        start = f"2026-04-18T{hr:02d}:00:00-00:00"
        end = f"2026-04-18T{(hr + 1) % 24:02d}:00:00-00:00"
        rows.append(f"{start},{end},TH_SP15_GEN-APND,LMP_PRC,{price},LMP")
    csv_text = "\n".join(rows) + "\n"

    zbuf = io.BytesIO()
    with zipfile.ZipFile(zbuf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("PRC_LMP.csv", csv_text)
    return zbuf.getvalue()


def test_fetch_lmp_24h_real_returns_none_on_500() -> None:
    with respx.mock(assert_all_called=False) as mock:
        mock.get(OASIS_URL).mock(return_value=httpx.Response(500, text="oops"))
        result = _run(fetch_lmp_24h_real(timeout_seconds=2.0))
    assert result is None


def test_fetch_lmp_24h_real_parses_valid_zip() -> None:
    # Prices in $/MWh; divide by 1000 → $/kWh.
    prices_mwh = [30.0 + i for i in range(24)]  # 30..53
    zip_bytes = _build_oasis_zip(prices_mwh)
    with respx.mock(assert_all_called=False) as mock:
        mock.get(OASIS_URL).mock(
            return_value=httpx.Response(200, content=zip_bytes)
        )
        result = _run(fetch_lmp_24h_real(timeout_seconds=2.0))
    assert result is not None
    assert len(result) == 24
    # Each value should be in $/kWh (≤ $1 for a sane CAISO LMP).
    for v in result:
        assert 0.0 <= v < 1.0
    # First entry should be 30/1000 = 0.03.
    assert abs(result[0] - 0.03) < 1e-6


def test_fetch_lmp_24h_real_returns_none_on_malformed_zip() -> None:
    with respx.mock(assert_all_called=False) as mock:
        mock.get(OASIS_URL).mock(
            return_value=httpx.Response(200, content=b"not a zip file")
        )
        result = _run(fetch_lmp_24h_real(timeout_seconds=2.0))
    assert result is None


def test_fetch_lmp_24h_real_returns_none_on_empty_response() -> None:
    with respx.mock(assert_all_called=False) as mock:
        mock.get(OASIS_URL).mock(return_value=httpx.Response(200, content=b""))
        result = _run(fetch_lmp_24h_real(timeout_seconds=2.0))
    assert result is None


def test_fetch_lmp_24h_real_pads_short_series() -> None:
    # Only 10 entries — the function should pad by repeating the last one.
    zip_bytes = _build_oasis_zip([25.0] * 10)
    with respx.mock(assert_all_called=False) as mock:
        mock.get(OASIS_URL).mock(
            return_value=httpx.Response(200, content=zip_bytes)
        )
        result = _run(fetch_lmp_24h_real(timeout_seconds=2.0))
    assert result is not None
    assert len(result) == 24


def test_fetch_lmp_24h_real_returns_none_on_network_error() -> None:
    with respx.mock(assert_all_called=False) as mock:
        mock.get(OASIS_URL).mock(side_effect=httpx.ConnectError("nope"))
        result = _run(fetch_lmp_24h_real(timeout_seconds=2.0))
    assert result is None
