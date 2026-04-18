"""Orthogonal fan-out orchestrator — real API calls, parallel, cached.

The money shot: fires up to 10 paid APIs in parallel via
``asyncio.gather`` and streams per-call latencies back to the mobile
Orthogonal ticker. Every fetch function returns ``(payload, log)`` so
per-source failures are captured as log entries instead of crashing the
fan-out.

Layering:

* ``orthogonal_client.run`` does the raw HTTPS POST to
  ``https://api.orthogonal.com/v1/run``.
* ``_timed_call`` wraps one partner invocation with timing + error
  handling + TTL caching.
* ``fetch_*`` per-source adapters translate partner-specific responses
  into the normalized ``ExternalInputs`` shape that the econ engine
  expects (see ``econ/npv.py`` and ``econ/arbitrage.py``).
* ``gather_for_roi`` / ``gather_for_live`` fan out in parallel.

Normalization contract — what each key in ``ExternalInputs`` must look
like for the econ engine:

* ``weather``: ``{"irradiance_kwh_m2_day": float, ...}``
* ``installer_pricing``: ``{"usd_per_watt_low": float, "usd_per_watt_high": float, ...}``
* ``financing``: ``{"apr_low": float, "apr_high": float, ...}``
* ``property_value``: ``{"estimated_value_usd": float, ...}``
* ``carbon_price``: ``{"usd_per_ton_co2": float, ...}``
* ``tariff``, ``news``, ``demographics``, ``reviews``: free-form
  (only displayed in UI, not consumed by econ math).
* ``zenpower``: ``{"installs_count": int, "avg_system_kw": float, "median_permit_days": float|None}``

If an external call fails, the econ engine falls back to documented
defaults (see ``npv.compute_roi``). Partial success is the norm.
"""

from __future__ import annotations

import asyncio
import json
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, TypedDict

from cache import cache
from caiso import fetch_lmp_24h_real, synth_lmp_24h
from config import settings
from orthogonal_client import OrthogonalError
from orthogonal_client import run as orth_run
from schemas import OrthogonalCallLog, UserProfile
from zenpower import ZenPowerIndex


class ExternalInputs(TypedDict, total=False):
    tariff: dict
    weather: dict
    installer_pricing: dict
    financing: dict
    news: dict
    zenpower: dict
    property_value: dict
    demographics: dict
    reviews: dict
    carbon_price: dict
    caiso_lmp_24h: list[float]
    calls: list[OrthogonalCallLog]


# --- TTLs per source (seconds) ------------------------------------------
# Ref: HELIOS.md §8.4.

CACHE_TTL = {
    "tariff": 24 * 3600,
    "weather": 3600,
    "installer_pricing": 6 * 3600,
    "financing": 24 * 3600,
    "news": 6 * 3600,
    "property_value": 24 * 3600,
    "demographics": 24 * 3600,
    "reviews": 6 * 3600,
    "carbon_price": 12 * 3600,
    "caiso_lmp": 600,  # 10 min — LMPs refresh every ~5min
}


# --- Helpers ---------------------------------------------------------------


def _extract_zip(address: str) -> str:
    """Pull a 5-digit US ZIP from a free-text address; default La Jolla."""
    match = re.search(r"\b(\d{5})\b", address)
    return match.group(1) if match else "92093"


def _state_from_profile(profile: UserProfile) -> str:
    # Simple heuristic — CA-only for the hackathon.
    m = re.search(r"\b([A-Z]{2})\b", profile.address)
    return m.group(1) if m else "CA"


async def _timed_call(
    api_label: str,
    purpose: str,
    cache_key: str | None,
    ttl_seconds: int,
    coro_factory,
) -> tuple[dict, OrthogonalCallLog]:
    """Wrap a per-source coroutine with timing, caching, and error capture.

    Args:
        api_label: Name shown in the mobile ticker (e.g. ``"Linkup"``).
        purpose: Human description for the ticker row.
        cache_key: Stable key for the TTL cache. ``None`` skips caching.
        ttl_seconds: Cache TTL if caching is enabled.
        coro_factory: Zero-arg callable returning the coroutine to await.
            We use a factory (not a coroutine directly) so we don't create
            and discard a coroutine when we hit the cache.

    Returns:
        ``(payload, log)``. On error, payload is ``{}`` and
        ``log.status = "error"`` with a message.
    """
    # Cache hit?
    if settings.cache_enabled and cache_key:
        hit = cache.get(cache_key)
        if hit is not None:
            start = time.perf_counter()
            elapsed_ms = max(1, int((time.perf_counter() - start) * 1000))
            return hit, OrthogonalCallLog(
                api=api_label,
                purpose=purpose,
                latency_ms=elapsed_ms,
                status="cached",
            )

    start = time.perf_counter()
    try:
        payload = await asyncio.wait_for(
            coro_factory(),
            timeout=settings.orthogonal_timeout_seconds,
        )
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        if settings.cache_enabled and cache_key:
            cache.set(cache_key, payload, ttl_seconds)
        return payload, OrthogonalCallLog(
            api=api_label,
            purpose=purpose,
            latency_ms=elapsed_ms,
            status="success",
        )
    except asyncio.TimeoutError:
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return {}, OrthogonalCallLog(
            api=api_label,
            purpose=purpose,
            latency_ms=elapsed_ms,
            status="error",
            error_message=f"timeout after {settings.orthogonal_timeout_seconds}s",
        )
    except OrthogonalError as e:
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return {}, OrthogonalCallLog(
            api=api_label,
            purpose=purpose,
            latency_ms=elapsed_ms,
            status="error",
            error_message=str(e)[:300],
        )
    except Exception as e:  # noqa: BLE001
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return {}, OrthogonalCallLog(
            api=api_label,
            purpose=purpose,
            latency_ms=elapsed_ms,
            status="error",
            error_message=f"{type(e).__name__}: {e}"[:300],
        )


# --- Per-source adapters ---------------------------------------------------
#
# Each adapter calls a specific Orthogonal partner and normalizes the
# response into the shape that the econ engine expects. Adapters never
# raise — failures bubble up as an "error" log via `_timed_call`.


async def fetch_weather(lat: float, lng: float) -> tuple[dict, OrthogonalCallLog]:
    """Hourly solar shortwave radiation via Precip AI.

    Returns 24h of W/m^2 and the daily-mean kWh/m^2/day that ``npv.py``
    consumes (``irradiance_kwh_m2_day``).

    Timezone note: we query yesterday UTC 00:00 → today UTC 24:00 so
    the 24-hour window always straddles a full local daytime (prevents
    a "ran at night UTC" zero-irradiance bug). We then take the most
    recent complete solar day from the series.
    """
    now = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    start_dt = now - timedelta(days=1)
    end_dt = now + timedelta(days=1)
    start = start_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    end = end_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    async def _call() -> dict:
        data = await orth_run(
            "precip",
            "/api/v1/solar-radiation-hourly",
            query={
                "start": start,
                "end": end,
                "latitude": f"{lat:.4f}",
                "longitude": f"{lng:.4f}",
                "format": "json",
            },
        )
        # Precip returns either a list wrapping one station or a single
        # {hours:[{DSWRF, startTime}, ...]} dict.
        hours: list[dict] = []
        if isinstance(data, list) and data:
            hours = data[0].get("hours") or []
        elif isinstance(data, dict):
            hours = data.get("hours") or []

        watts = [float(h.get("DSWRF") or 0.0) for h in hours]
        if not watts:
            return {
                "irradiance_kwh_m2_day": 5.2,
                "hourly_w_m2": [],
                "source": "precip:empty",
            }
        # Integrate W/m^2 over 24h → kWh/m^2/day. Picking the best rolling
        # 24h window in the series protects us against a sliver at dawn.
        window = 24
        best = 0.0
        best_slice = watts[:window]
        for i in range(0, max(1, len(watts) - window + 1)):
            slice_ = watts[i : i + window]
            if len(slice_) < window:
                continue
            total = sum(slice_) / 1000.0  # W·h / m^2 per hour → kWh/m^2
            if total > best:
                best = total
                best_slice = slice_
        return {
            "irradiance_kwh_m2_day": round(best, 3) if best > 0 else 5.2,
            "hourly_w_m2": best_slice,
            "source": "precip",
        }

    return await _timed_call(
        "Precip AI",
        "Hourly solar irradiance (24h)",
        f"weather:{round(lat, 3)}:{round(lng, 3)}",
        CACHE_TTL["weather"],
        _call,
    )


async def fetch_news(state: str) -> tuple[dict, OrthogonalCallLog]:
    """Recent solar rebate / NEM 3.0 news via Linkup."""

    async def _call() -> dict:
        q = f"{state} residential solar rebate 2026 SGIP NEM 3.0 updates"
        data = await orth_run(
            "linkup",
            "/search",
            body={"q": q, "depth": "standard", "outputType": "searchResults"},
        )
        items = data.get("results") or []
        headlines = [
            {
                "title": r.get("name") or r.get("title") or "",
                "url": r.get("url", ""),
                "snippet": (r.get("content") or "")[:240],
            }
            for r in items[:5]
        ]
        return {"headlines": headlines, "state": state, "source": "linkup"}

    return await _timed_call(
        "Linkup",
        f"{state} solar rebate + NEM 3.0 news",
        f"news:{state}",
        CACHE_TTL["news"],
        _call,
    )


async def fetch_carbon_price(state: str) -> tuple[dict, OrthogonalCallLog]:
    """Current social cost of carbon ($/ton CO2) via Linkup search.

    Asks Linkup for a structured numeric answer. Falls back to the EPA
    2023 default ($185/ton) if extraction fails.
    """

    async def _call() -> dict:
        data = await orth_run(
            "linkup",
            "/search",
            body={
                "q": (
                    f"Current {state} social cost of carbon USD per metric ton CO2 "
                    f"(EPA or California Air Resources Board). Numeric value."
                ),
                "depth": "standard",
                "outputType": "structured",
                "structuredOutputSchema": json.dumps(
                    {
                        "type": "object",
                        "properties": {
                            "usd_per_ton_co2": {
                                "type": "number",
                                "description": "Social cost of carbon in USD per metric ton",
                            },
                            "source_note": {"type": "string"},
                        },
                        "required": ["usd_per_ton_co2"],
                    }
                ),
            },
        )
        value = data.get("usd_per_ton_co2")
        if not isinstance(value, (int, float)) or value <= 0:
            return {"usd_per_ton_co2": 185.0, "source_note": "EPA 2023 default"}
        return {
            "usd_per_ton_co2": float(value),
            "source_note": data.get("source_note") or "Linkup",
        }

    return await _timed_call(
        "Linkup",
        "Social cost of carbon ($/ton)",
        f"carbon_price:{state}",
        CACHE_TTL["carbon_price"],
        _call,
    )


async def fetch_financing(state: str) -> tuple[dict, OrthogonalCallLog]:
    """Solar loan APR range via Linkup structured search."""

    async def _call() -> dict:
        data = await orth_run(
            "linkup",
            "/search",
            body={
                "q": (
                    f"GoodLeap Sunlight Financial Mosaic {state} solar loan APR "
                    f"rates 2026 range low high"
                ),
                "depth": "standard",
                "outputType": "structured",
                "structuredOutputSchema": json.dumps(
                    {
                        "type": "object",
                        "properties": {
                            "apr_low": {
                                "type": "number",
                                "description": "Lowest advertised APR as decimal (e.g. 0.069)",
                            },
                            "apr_high": {
                                "type": "number",
                                "description": "Highest advertised APR as decimal",
                            },
                            "lenders": {"type": "array", "items": {"type": "string"}},
                        },
                        "required": ["apr_low", "apr_high"],
                    }
                ),
            },
        )
        apr_low = data.get("apr_low")
        apr_high = data.get("apr_high")

        # Guard: Linkup returns APRs inconsistently — sometimes decimals
        # (0.069), sometimes percents (6.9), occasionally integer-as-percent
        # (99 for 9.9%). Normalize every value and sanity-bound to the
        # plausible solar-loan range (3% to 18%).
        def _norm(v):
            if not isinstance(v, (int, float)) or v <= 0:
                return None
            if v < 1:
                return float(v)
            if v < 25:
                return v / 100.0
            # > 25 — probably a parse artifact like "99" meaning 9.9%.
            return v / 1000.0

        def _sane(v):
            return v is not None and 0.02 <= v <= 0.22

        low_n = _norm(apr_low)
        high_n = _norm(apr_high)
        if not _sane(low_n):
            low_n = 0.069
        if not _sane(high_n):
            high_n = 0.099
        if high_n < low_n:
            low_n, high_n = high_n, low_n
        return {
            "apr_low": round(low_n, 4),
            "apr_high": round(high_n, 4),
            "lenders": data.get("lenders") or ["GoodLeap", "Sunlight Financial"],
            "source": "linkup",
        }

    return await _timed_call(
        "Linkup",
        "Solar loan APR range",
        f"financing:{state}",
        CACHE_TTL["financing"],
        _call,
    )


async def fetch_installer_pricing(zip_code: str) -> tuple[dict, OrthogonalCallLog]:
    """Residential solar install $/W for a ZIP via Linkup structured search.

    We originally wanted ScrapeGraph's smartscraper against EnergySage
    here, but its server-side LLM extraction typically takes 30-45s —
    too slow for our <20s budget. Linkup's structured search is 3-6s
    with the same effective data quality for aggregate $/W figures.
    """

    async def _call() -> dict:
        data = await orth_run(
            "linkup",
            "/search",
            body={
                "q": (
                    f"California residential solar panel installation cost "
                    f"per watt 2026 low and high range for ZIP {zip_code}. "
                    f"EnergySage marketplace aggregate data."
                ),
                "depth": "standard",
                "outputType": "structured",
                "structuredOutputSchema": json.dumps(
                    {
                        "type": "object",
                        "properties": {
                            "usd_per_watt_low": {"type": "number"},
                            "usd_per_watt_high": {"type": "number"},
                        },
                        "required": ["usd_per_watt_low", "usd_per_watt_high"],
                    }
                ),
            },
        )
        low = data.get("usd_per_watt_low")
        high = data.get("usd_per_watt_high")

        def _sane(v):
            # EnergySage prices are roughly $2.50-$5.50/W in CA.
            return isinstance(v, (int, float)) and 1.5 <= float(v) <= 7.0

        if not _sane(low) or not _sane(high):
            return {
                "usd_per_watt_low": 3.2,
                "usd_per_watt_high": 4.5,
                "zip": zip_code,
                "source": "linkup:fallback",
            }
        lo, hi = float(low), float(high)
        if hi < lo:
            lo, hi = hi, lo
        return {
            "usd_per_watt_low": round(lo, 2),
            "usd_per_watt_high": round(hi, 2),
            "zip": zip_code,
            "source": "linkup",
        }

    return await _timed_call(
        "Linkup",
        "Installer $/W (EnergySage data)",
        f"installer_pricing:{zip_code}",
        CACHE_TTL["installer_pricing"],
        _call,
    )


async def fetch_installer_reviews(zip_code: str) -> tuple[dict, OrthogonalCallLog]:
    """Installer credibility signal via Aviato company enrichment.

    Aviato ``/company/enrich`` returns structured firmographics (size,
    funding, public/private) on a leading CA solar installer, which we
    surface as a trust signal on the ROI screen. Cheap and <2s.
    """

    async def _call() -> dict:
        # Pick a representative top-3 CA installer. Sunrun is the largest
        # residential installer nationally; swapping it out is a one-line
        # change if we want to rotate per ZIP.
        data = await orth_run(
            "aviato",
            "/company/enrich",
            query={"website": "sunrun.com", "preview": "true"},
        )
        return {
            "zip": zip_code,
            "reference_installer": "Sunrun",
            "aviato_id": data.get("id"),
            "linkedin_url": (data.get("URLs") or {}).get("linkedin"),
            "source": "aviato",
        }

    return await _timed_call(
        "Aviato",
        "Installer credibility signal",
        f"reviews:{zip_code}",
        CACHE_TTL["reviews"],
        _call,
    )


async def fetch_tariff(profile: UserProfile) -> tuple[dict, OrthogonalCallLog]:
    """Live utility TOU tariff summary via Linkup structured search.

    This call is mainly for demo theater + UI copy: the ticker shows a
    "tariff lookup" row resolving against the utility's rate page. The
    NPV math still uses the authoritative in-process ``TARIFFS`` dict
    in ``tariffs.py`` because scraping every CA rate schedule live in
    20s is out of scope.
    """
    utility = profile.utility
    plan = profile.tariff_plan or {
        "PGE": "EV2-A",
        "SCE": "TOU-D-PRIME",
        "SDGE": "EV-TOU-5",
        "LADWP": "R-1A",
    }.get(utility, "default")

    async def _call() -> dict:
        data = await orth_run(
            "linkup",
            "/search",
            body={
                "q": (
                    f"{utility} {plan} residential time-of-use rate "
                    f"schedule 2026: peak, partial-peak, off-peak "
                    f"prices in USD per kWh and their hour windows."
                ),
                "depth": "standard",
                "outputType": "structured",
                "structuredOutputSchema": json.dumps(
                    {
                        "type": "object",
                        "properties": {
                            "peak_usd_per_kwh": {"type": "number"},
                            "offpeak_usd_per_kwh": {"type": "number"},
                            "peak_hours": {"type": "string"},
                            "plan_name": {"type": "string"},
                        },
                    }
                ),
            },
        )
        return {
            "utility": utility,
            "plan": plan,
            "peak_usd_per_kwh": data.get("peak_usd_per_kwh"),
            "offpeak_usd_per_kwh": data.get("offpeak_usd_per_kwh"),
            "peak_hours": data.get("peak_hours"),
            "source": "linkup",
        }

    return await _timed_call(
        "Linkup",
        f"{utility} {plan} tariff lookup",
        f"tariff:{utility}:{plan}",
        CACHE_TTL["tariff"],
        _call,
    )


async def fetch_property_value(
    address: str, zip_code: str
) -> tuple[dict, OrthogonalCallLog]:
    """Rough property value estimate. Aviato covers companies, not homes,
    so we run a structured Linkup search against public listings.
    """

    async def _call() -> dict:
        data = await orth_run(
            "linkup",
            "/search",
            body={
                "q": (
                    f"Typical single-family home value in ZIP code {zip_code} "
                    f"California near {address}. Zillow Redfin median estimate."
                ),
                "depth": "standard",
                "outputType": "structured",
                "structuredOutputSchema": json.dumps(
                    {
                        "type": "object",
                        "properties": {
                            "estimated_value_usd": {"type": "number"},
                            "source": {"type": "string"},
                        },
                        "required": ["estimated_value_usd"],
                    }
                ),
            },
        )
        value = data.get("estimated_value_usd")
        if not isinstance(value, (int, float)) or value <= 50_000:
            return {
                "address": address,
                "estimated_value_usd": 850_000.0,  # SoCal median fallback
                "source": "linkup:fallback",
            }
        return {
            "address": address,
            "estimated_value_usd": float(value),
            "source": data.get("source") or "linkup",
        }

    return await _timed_call(
        "Linkup",
        "Property value estimate",
        f"property_value:{zip_code}",
        CACHE_TTL["property_value"],
        _call,
    )


async def fetch_demographics(zip_code: str, utility: str) -> tuple[dict, OrthogonalCallLog]:
    """Utility-company firmographics via People Data Labs.

    PDL's consumer endpoints need a person identifier and can't pull
    ACS by ZIP, so we use ``/v5/company/enrich`` to return the user's
    utility's size, industry, and revenue. This powers the "your
    utility serves N customers" credibility line and keeps PDL on the
    ticker as a distinct partner.
    """

    # Map our utility codes to real company domains.
    utility_websites = {
        "PGE": "pge.com",
        "SCE": "sce.com",
        "SDGE": "sdge.com",
        "LADWP": "ladwp.com",
    }
    website = utility_websites.get(utility, "pge.com")

    async def _call() -> dict:
        data = await orth_run(
            "peopledatalabs",
            "/v5/company/enrich",
            query={"website": website},
        )
        return {
            "zip": zip_code,
            "utility": utility,
            "utility_company_website": website,
            "utility_employee_count": data.get("employee_count"),
            "utility_industry": data.get("industry"),
            "utility_size": data.get("size"),
            "median_household_income": 115_000,  # SoCal default for NPV context
            "source": "peopledatalabs",
        }

    return await _timed_call(
        "People Data Labs",
        f"Utility firmographics ({utility})",
        f"demographics:{utility}",
        CACHE_TTL["demographics"],
        _call,
    )


async def fetch_caiso_lmp() -> tuple[dict, OrthogonalCallLog]:
    """Real-time CA ISO wholesale LMP curve via direct OASIS call.

    Not an Orthogonal call (CAISO OASIS is public), but we route it
    through the same fan-out so the mobile ticker shows it as a row.
    Falls back to a synthesized diurnal curve on error.
    """

    async def _call() -> dict:
        series = await fetch_lmp_24h_real()
        if not series:
            return {
                "hourly_usd_kwh": synth_lmp_24h(),
                "node": "TH_SP15_GEN-APND",
                "source": "synth:fallback",
            }
        return {
            "hourly_usd_kwh": series,
            "node": "TH_SP15_GEN-APND",
            "source": "caiso_oasis",
        }

    return await _timed_call(
        "CAISO OASIS",
        "Wholesale LMP curve (24h)",
        "caiso_lmp:SP15",
        CACHE_TTL["caiso_lmp"],
        _call,
    )


async def fetch_zenpower_summary(
    zip_code: str, index: ZenPowerIndex | None
) -> tuple[dict, OrthogonalCallLog]:
    """Local CSV lookup — fast, but wired through the fan-out so the
    ticker shows a ZenPower row alongside the 9 Orthogonal calls.
    """
    start = time.perf_counter()
    if index is None:
        payload: dict[str, Any] = {
            "installs_count": 0,
            "avg_system_kw": 0.0,
            "median_permit_days": None,
        }
        status = "error"
        err = "ZenPower CSV not loaded on this server"
    else:
        s = index.summary_for_zip(zip_code)
        payload = {
            "installs_count": s.installs_count,
            "avg_system_kw": s.avg_system_kw,
            "median_permit_days": s.median_permit_days,
        }
        status = "success"
        err = None
    elapsed_ms = max(1, int((time.perf_counter() - start) * 1000))
    return payload, OrthogonalCallLog(
        api="ZenPower (local CSV)",
        purpose="Per-ZIP permit summary",
        latency_ms=elapsed_ms,
        status=status,
        error_message=err,
    )


# --- Fan-out ---------------------------------------------------------------


async def gather_for_roi(
    profile: UserProfile, zenpower: ZenPowerIndex | None
) -> ExternalInputs:
    """Fire every ROI-relevant source in parallel; return normalized dict.

    Order matches the mobile ticker animation. Any single failure is
    captured as an ``error`` log rather than raising.
    """
    zip_code = _extract_zip(profile.address)
    state = _state_from_profile(profile)

    tasks = [
        fetch_tariff(profile),
        fetch_weather(profile.lat, profile.lng),
        fetch_installer_pricing(zip_code),
        fetch_financing(state),
        fetch_news(state),
        fetch_property_value(profile.address, zip_code),
        fetch_demographics(zip_code, profile.utility),
        fetch_installer_reviews(zip_code),
        fetch_carbon_price(state),
        fetch_zenpower_summary(zip_code, zenpower),
    ]
    keys = [
        "tariff",
        "weather",
        "installer_pricing",
        "financing",
        "news",
        "property_value",
        "demographics",
        "reviews",
        "carbon_price",
        "zenpower",
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    out: ExternalInputs = {"calls": []}
    for k, r in zip(keys, results, strict=True):
        if isinstance(r, Exception):
            out["calls"].append(
                OrthogonalCallLog(
                    api=k,
                    purpose=f"(fatal) {k}",
                    latency_ms=0,
                    status="error",
                    error_message=f"{type(r).__name__}: {r}"[:300],
                )
            )
            continue
        payload, log = r
        out[k] = payload  # type: ignore[literal-required]
        out["calls"].append(log)

    return out


async def gather_for_live(profile: UserProfile) -> ExternalInputs:
    """Lightweight fan-out for Mode B: weather + CAISO LMP + tariff.

    ``external["caiso_lmp_24h"]`` is flattened into a plain list so the
    econ engine can drop it in as an override for the synthetic export
    curve (see TODO in ``econ/arbitrage.py`` — WS2 can consume this if
    available, else falls back to ``caiso.synth_lmp_24h``).
    """
    tasks = [
        fetch_weather(profile.lat, profile.lng),
        fetch_caiso_lmp(),
        fetch_news(_state_from_profile(profile)),
    ]
    keys = ["weather", "caiso_lmp", "news"]

    results = await asyncio.gather(*tasks, return_exceptions=True)
    out: ExternalInputs = {"calls": []}
    for k, r in zip(keys, results, strict=True):
        if isinstance(r, Exception):
            out["calls"].append(
                OrthogonalCallLog(
                    api=k,
                    purpose=f"(fatal) {k}",
                    latency_ms=0,
                    status="error",
                    error_message=f"{type(r).__name__}: {r}"[:300],
                )
            )
            continue
        payload, log = r
        out[k] = payload  # type: ignore[literal-required]
        out["calls"].append(log)

    # Promote the LMP series to a flat list so downstream consumers don't
    # have to unwrap the Orthogonal/CAISO envelope.
    lmp_payload = out.get("caiso_lmp") or {}
    lmp = lmp_payload.get("hourly_usd_kwh") if isinstance(lmp_payload, dict) else None
    if isinstance(lmp, list) and len(lmp) >= 24:
        out["caiso_lmp_24h"] = [float(x) for x in lmp[:24]]

    return out


__all__ = [
    "ExternalInputs",
    "gather_for_live",
    "gather_for_roi",
]
