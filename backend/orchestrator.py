"""Orthogonal fan-out orchestrator.

The money shot: fires 8–10 paid APIs in parallel via asyncio.gather and
streams per-call latencies back to the mobile Orthogonal ticker. Phase 0
runs deterministic stubs with realistic-looking latencies so the animation
works against a fresh backend. Phase 1 swaps stubs for real Orthogonal
SDK calls one by one.

Design notes:
- Each `_call_*` coroutine must return (payload, OrthogonalCallLog) so
  failures are captured as log entries rather than crashing the fan-out.
- Never let one slow call block the whole request — honor
  `settings.orthogonal_timeout_seconds`.
- ZenPower lookup is in-process, not Orthogonal, but we fire it via the
  same fan-out so the UI ticker lists it.
"""

from __future__ import annotations

import asyncio
import random
import time
from typing import TypedDict

from config import settings
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
    calls: list[OrthogonalCallLog]


async def _stub(api: str, purpose: str, payload: dict, latency_range: tuple[int, int]) -> tuple[dict, OrthogonalCallLog]:
    """Phase 0 stub — sleeps a realistic latency, returns payload + call log.

    Swap the body of each per-source wrapper below for a real Orthogonal
    SDK call. Keep the return shape the same so the ticker contract
    doesn't break.
    """
    start = time.perf_counter()
    lo, hi = latency_range
    await asyncio.sleep(random.uniform(lo, hi) / 1000.0)
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    log = OrthogonalCallLog(api=api, purpose=purpose, latency_ms=elapsed_ms, status="success")
    return payload, log


# --- Per-source calls ------------------------------------------------------


async def fetch_tariff(profile: UserProfile) -> tuple[dict, OrthogonalCallLog]:
    return await _stub(
        "ScrapeGraph",
        f"Utility tariff for {profile.utility}",
        {"utility": profile.utility, "plan": profile.tariff_plan or "EV2-A"},
        (600, 1400),
    )


async def fetch_weather(lat: float, lng: float) -> tuple[dict, OrthogonalCallLog]:
    return await _stub(
        "OpenWeather",
        "Solar irradiance + 24h forecast",
        {"lat": lat, "lng": lng, "irradiance_kwh_m2_day": 5.2},
        (400, 900),
    )


async def fetch_installer_pricing(zip_code: str) -> tuple[dict, OrthogonalCallLog]:
    return await _stub(
        "ScrapeGraph",
        "Installer pricing (EnergySage)",
        {"zip": zip_code, "usd_per_watt_low": 3.2, "usd_per_watt_high": 4.5},
        (1200, 2400),
    )


async def fetch_financing(profile: UserProfile) -> tuple[dict, OrthogonalCallLog]:
    return await _stub(
        "ScrapeGraph",
        "Solar loan APR (GoodLeap, Sunlight)",
        {"apr_low": 0.069, "apr_high": 0.099},
        (800, 1600),
    )


async def fetch_news(state: str) -> tuple[dict, OrthogonalCallLog]:
    return await _stub(
        "Linkup",
        f"{state} solar rebates + NEM 3.0 news",
        {"headlines": ["SGIP equity budget expanded", "NEM 3.0 ACC tables update"]},
        (1500, 2800),
    )


async def fetch_property_value(address: str) -> tuple[dict, OrthogonalCallLog]:
    return await _stub(
        "Aviato",
        "Property value estimate",
        {"address": address, "estimated_value_usd": 820_000},
        (700, 1400),
    )


async def fetch_demographics(lat: float, lng: float) -> tuple[dict, OrthogonalCallLog]:
    return await _stub(
        "PDL",
        "Neighborhood demographics (income)",
        {"median_household_income": 115_000},
        (600, 1200),
    )


async def fetch_installer_reviews(zip_code: str) -> tuple[dict, OrthogonalCallLog]:
    return await _stub(
        "ScrapeGraph",
        "Local installer reviews (Yelp/EnergySage)",
        {"avg_stars": 4.4, "review_count": 312},
        (1400, 2400),
    )


async def fetch_carbon_price(state: str) -> tuple[dict, OrthogonalCallLog]:
    return await _stub(
        "Linkup",
        "Social cost of carbon ($/ton)",
        {"usd_per_ton_co2": 185.0},
        (600, 1100),
    )


async def fetch_zenpower_summary(
    zip_code: str, index: ZenPowerIndex | None
) -> tuple[dict, OrthogonalCallLog]:
    start = time.perf_counter()
    if index is None:
        payload = {"installs_count": 0, "avg_system_kw": 0.0, "median_permit_days": None}
        status = "error"
    else:
        s = index.summary_for_zip(zip_code)
        payload = {
            "installs_count": s.installs_count,
            "avg_system_kw": s.avg_system_kw,
            "median_permit_days": s.median_permit_days,
        }
        status = "success"
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    log = OrthogonalCallLog(
        api="ZenPower (local CSV)",
        purpose="Per-ZIP permit summary",
        latency_ms=elapsed_ms,
        status=status,
    )
    return payload, log


# --- Fan-out ---------------------------------------------------------------


def _extract_zip(address: str) -> str:
    # Rough extraction from "..., CITY, CA, 92093, US" style addresses.
    parts = [p.strip() for p in address.split(",")]
    for p in reversed(parts):
        if p.isdigit() and len(p) == 5:
            return p
    return "92093"


async def gather_for_roi(profile: UserProfile, zenpower: ZenPowerIndex | None) -> ExternalInputs:
    zip_code = _extract_zip(profile.address)
    state = "CA"

    tasks = [
        fetch_tariff(profile),
        fetch_weather(profile.lat, profile.lng),
        fetch_installer_pricing(zip_code),
        fetch_financing(profile),
        fetch_news(state),
        fetch_property_value(profile.address),
        fetch_demographics(profile.lat, profile.lng),
        fetch_installer_reviews(zip_code),
        fetch_carbon_price(state),
        fetch_zenpower_summary(zip_code, zenpower),
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

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

    out: ExternalInputs = {"calls": []}
    for k, r in zip(keys, results, strict=True):
        if isinstance(r, Exception):
            out["calls"].append(
                OrthogonalCallLog(
                    api=k,
                    purpose=f"(failed) {k}",
                    latency_ms=0,
                    status="error",
                    error_message=str(r),
                )
            )
            continue
        payload, log = r
        out[k] = payload  # type: ignore[literal-required]
        out["calls"].append(log)

    return out


async def gather_for_live(profile: UserProfile) -> ExternalInputs:
    """Lightweight fan-out for the live endpoint — tariff + weather + CAISO."""
    tasks = [
        fetch_tariff(profile),
        fetch_weather(profile.lat, profile.lng),
        fetch_news("CA"),
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    keys = ["tariff", "weather", "news"]
    out: ExternalInputs = {"calls": []}
    for k, r in zip(keys, results, strict=True):
        if isinstance(r, Exception):
            out["calls"].append(
                OrthogonalCallLog(
                    api=k,
                    purpose=f"(failed) {k}",
                    latency_ms=0,
                    status="error",
                    error_message=str(r),
                )
            )
            continue
        payload, log = r
        out[k] = payload  # type: ignore[literal-required]
        out["calls"].append(log)
    return out


__all__ = [
    "ExternalInputs",
    "gather_for_live",
    "gather_for_roi",
]
