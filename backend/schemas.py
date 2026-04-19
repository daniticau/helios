"""Pydantic v2 schemas mirroring mobile/src/shared/types.ts.

These are the wire contracts between backend and mobile. Keep both sides
in sync — the TS types in mobile/src/shared/types.ts must match these.
See HELIOS.md §6 for the canonical spec.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, NonNegativeFloat, PositiveFloat

UtilityCode = Literal["PGE", "SCE", "SDGE", "LADWP", "OTHER"]

LiveAction = Literal[
    "CHARGE_BATTERY_FROM_SOLAR",
    "EXPORT_SOLAR",
    "DISCHARGE_BATTERY_TO_HOUSE",
    "DISCHARGE_BATTERY_TO_GRID",
    "CHARGE_BATTERY_FROM_GRID",
    "HOLD",
]

OrthogonalStatus = Literal["success", "cached", "error"]


class UserProfile(BaseModel):
    address: str
    lat: float
    lng: float
    utility: UtilityCode
    tariff_plan: str | None = None
    monthly_bill_usd: NonNegativeFloat
    monthly_kwh: NonNegativeFloat
    has_solar: bool = False
    solar_kw: PositiveFloat | None = None
    has_battery: bool = False
    battery_kwh: PositiveFloat | None = None
    battery_max_kw: PositiveFloat | None = None


class ProposedSystem(BaseModel):
    solar_kw: PositiveFloat
    battery_kwh: NonNegativeFloat


class ROIRequest(BaseModel):
    profile: UserProfile
    proposed_system: ProposedSystem | None = None


class OrthogonalCallLog(BaseModel):
    api: str
    purpose: str
    latency_ms: int
    status: OrthogonalStatus
    error_message: str | None = None
    # Stable id used to dedupe streamed logs and address a single source
    # for retry (see POST /api/roi/retry/{job_id}). Optional only for
    # back-compat with any code path that manually constructs a log.
    source_id: str | None = None


class ROIResult(BaseModel):
    recommended_system: ProposedSystem
    upfront_cost_usd: float
    federal_itc_usd: float
    net_upfront_usd: float
    npv_25yr_usd: float
    payback_years: float
    annual_savings_yr1_usd: float
    co2_avoided_tons_25yr: float
    installer_quotes_range: tuple[float, float]
    financing_apr_range: tuple[float, float]
    tariff_summary: str
    orthogonal_calls_made: list[OrthogonalCallLog] = Field(default_factory=list)
    # Extra orthogonal-derived context (optional — surfaced in UI if present)
    property_value_usd: float | None = None
    roi_pct_of_home_value: float | None = None
    zenpower_permits_in_zip: int | None = None
    zenpower_avg_system_kw: float | None = None
    social_cost_of_carbon_usd: float | None = None
    # Names of sources whose live Orthogonal parse failed and fell back to
    # documented defaults (installer_pricing, financing, property_value,
    # carbon_price). The UI surfaces a `via fallback` chip on affected
    # numbers so judges can tell live values from defaults at a glance.
    fallbacks_used: list[str] = Field(default_factory=list)


class HouseholdState(BaseModel):
    battery_soc_pct: NonNegativeFloat
    solar_kw_now: NonNegativeFloat
    load_kw_now: NonNegativeFloat
    timestamp: datetime


class LiveStateRequest(BaseModel):
    profile: UserProfile
    current_state: HouseholdState


class ForecastPoint(BaseModel):
    hour_offset: int
    retail_rate: float
    export_rate: float
    solar_kw_forecast: float


class PeakWindow(BaseModel):
    start_iso: datetime
    expected_rate: float


class LiveRecommendation(BaseModel):
    action: LiveAction
    reasoning: str
    expected_hourly_gain_usd: float
    retail_rate_now: float
    export_rate_now: float
    next_peak_window: PeakWindow | None = None
    forecast_24h: list[ForecastPoint]
    orthogonal_calls_made: list[OrthogonalCallLog] = Field(default_factory=list)


class ParseBillResult(BaseModel):
    monthly_kwh: float
    utility: UtilityCode
    tariff_guess: str | None = None


class ZenPowerSummary(BaseModel):
    zip: str
    avg_system_kw: float
    median_permit_days: float | None
    installs_count: int
