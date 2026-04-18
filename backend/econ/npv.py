"""NPV computation per HELIOS.md §3.1.

Phase 0: delivers real math so the mobile UI shows believable numbers
even before Phase 1 wires real Orthogonal data. All inputs come from the
orchestrator's `ExternalInputs` dict; missing fields fall back to
documented defaults.
"""

from __future__ import annotations

import numpy as np

from schemas import ProposedSystem, ROIResult, UserProfile
from tariffs import tou_weighted_export, tou_weighted_retail

# --- Model constants -------------------------------------------------------

DISCOUNT_RATE = 0.05
LIFETIME_YEARS = 25
DEGRADATION_PER_YEAR = 0.005
RATE_ESCALATION_PER_YEAR = 0.04
MAINTENANCE_USD_PER_YEAR = 200.0
CA_GRID_INTENSITY_TONS_PER_KWH = 0.000395
FEDERAL_ITC = 0.30
KWH_PER_KW_PER_YEAR_SOCAL = 1500.0
BATTERY_USD_PER_KWH = 900.0


def compute_roi(
    profile: UserProfile,
    system: ProposedSystem,
    external: dict,
) -> ROIResult:
    tariff_plan = profile.tariff_plan
    retail_rate = tou_weighted_retail(profile.utility, tariff_plan)
    export_rate = tou_weighted_export(profile.utility, tariff_plan)

    irradiance = (external.get("weather") or {}).get("irradiance_kwh_m2_day", 5.2)
    irradiance_factor = irradiance / 5.5  # SoCal nominal ≈ 5.5 kWh/m²/day

    # --- Costs -------------------------------------------------------------
    pricing = external.get("installer_pricing") or {}
    usd_per_watt_low = pricing.get("usd_per_watt_low", 3.2)
    usd_per_watt_high = pricing.get("usd_per_watt_high", 4.5)
    usd_per_watt = (usd_per_watt_low + usd_per_watt_high) / 2.0
    solar_cost = system.solar_kw * 1000.0 * usd_per_watt
    battery_cost = system.battery_kwh * BATTERY_USD_PER_KWH
    upfront_cost = solar_cost + battery_cost

    federal_itc = upfront_cost * FEDERAL_ITC
    net_upfront = upfront_cost - federal_itc

    # --- Annual production -------------------------------------------------
    p0_kwh = system.solar_kw * KWH_PER_KW_PER_YEAR_SOCAL * irradiance_factor

    # Naive split: up to monthly load is self-consumed; rest is exported.
    annual_load_kwh = max(profile.monthly_kwh * 12.0, 1.0)
    self_consume_frac = min(1.0, annual_load_kwh / max(p0_kwh, 1.0))

    # --- 25-year cashflow --------------------------------------------------
    years = np.arange(1, LIFETIME_YEARS + 1)
    production = p0_kwh * (1 - DEGRADATION_PER_YEAR) ** years
    retail_t = retail_rate * (1 + RATE_ESCALATION_PER_YEAR) ** years
    export_t = export_rate * (1 + RATE_ESCALATION_PER_YEAR) ** (years / 2)  # slower

    self_kwh = production * self_consume_frac
    export_kwh = production * (1 - self_consume_frac)
    savings = self_kwh * retail_t + export_kwh * export_t
    maintenance = np.full_like(savings, MAINTENANCE_USD_PER_YEAR, dtype=float)

    discount_factors = 1.0 / ((1 + DISCOUNT_RATE) ** years)
    npv = -net_upfront + float(np.sum((savings - maintenance) * discount_factors))

    # Payback (undiscounted)
    cumulative = np.cumsum(savings - maintenance)
    payback_idx = np.argmax(cumulative >= net_upfront) if (cumulative >= net_upfront).any() else -1
    payback_years = float(payback_idx + 1) if payback_idx >= 0 else float(LIFETIME_YEARS + 1)

    co2_tons = float(np.sum(production) * CA_GRID_INTENSITY_TONS_PER_KWH)

    # --- Optional orthogonal-derived context -------------------------------
    property_value = (external.get("property_value") or {}).get("estimated_value_usd")
    roi_pct_home = (npv / property_value * 100.0) if property_value else None

    carbon_price = (external.get("carbon_price") or {}).get("usd_per_ton_co2")
    scc_usd = co2_tons * carbon_price if carbon_price else None

    zp = external.get("zenpower") or {}

    financing = external.get("financing") or {}
    apr_low = financing.get("apr_low", 0.069)
    apr_high = financing.get("apr_high", 0.099)

    return ROIResult(
        recommended_system=system,
        upfront_cost_usd=round(upfront_cost, 2),
        federal_itc_usd=round(federal_itc, 2),
        net_upfront_usd=round(net_upfront, 2),
        npv_25yr_usd=round(npv, 2),
        payback_years=round(payback_years, 2),
        annual_savings_yr1_usd=round(float(savings[0] - maintenance[0]), 2),
        co2_avoided_tons_25yr=round(co2_tons, 2),
        installer_quotes_range=(
            round(system.solar_kw * 1000.0 * usd_per_watt_low + battery_cost, 2),
            round(system.solar_kw * 1000.0 * usd_per_watt_high + battery_cost, 2),
        ),
        financing_apr_range=(apr_low, apr_high),
        tariff_summary=f"{profile.utility} {tariff_plan or 'default TOU'}: "
                       f"retail avg ${retail_rate:.2f}/kWh, export avg ${export_rate:.2f}/kWh",
        orthogonal_calls_made=external.get("calls", []),
        property_value_usd=property_value,
        roi_pct_of_home_value=round(roi_pct_home, 1) if roi_pct_home is not None else None,
        zenpower_permits_in_zip=zp.get("installs_count"),
        zenpower_avg_system_kw=zp.get("avg_system_kw"),
        social_cost_of_carbon_usd=round(scc_usd, 2) if scc_usd is not None else None,
    )
