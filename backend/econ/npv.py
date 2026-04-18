"""NPV computation per HELIOS.md §3.1.

Phase 1 introduces an hourly-resolution savings model. Instead of the
naive ``self_consume_frac`` heuristic (which treats solar output as
uniformly overlapping house load) we now simulate a typical household
"duck curve" day against the hourly solar production and hourly TOU
retail/export rates. That makes NPV sensitive to tariff shape — a big
mid-day system on a NEM 3.0 plan correctly shows lower savings than the
same system on a flat-rate plan.
"""

from __future__ import annotations

import numpy as np

from schemas import ProposedSystem, ROIResult, UserProfile
from tariffs import resolve_tariff, tou_weighted_export, tou_weighted_retail

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

# Typical residential "duck curve" load shape (24 weights, will be
# normalized to the household's daily kWh). Trough mid-day, morning and
# evening peaks. Based on CAISO aggregate residential load profiles.
_DAILY_LOAD_SHAPE = np.array(
    [
        0.9, 0.8, 0.75, 0.7, 0.7, 0.8,    # 00–05 overnight baseline
        1.0, 1.3, 1.2, 1.0, 0.85, 0.75,   # 06–11 morning peak then taper
        0.7, 0.7, 0.75, 0.85, 1.1, 1.45,  # 12–17 ramp into evening
        1.75, 1.7, 1.5, 1.25, 1.05, 0.95, # 18–23 evening peak
    ]
)


def _normalized_daily_load(daily_kwh: float) -> np.ndarray:
    """Return a 24-float array summing exactly to ``daily_kwh``."""
    shape = _DAILY_LOAD_SHAPE
    return shape / shape.sum() * daily_kwh


def _hourly_production_clear_sky(system_kw: float, irradiance_factor: float) -> np.ndarray:
    """Clear-sky bell production curve (24,) scaled so the annual total
    matches ``KWH_PER_KW_PER_YEAR_SOCAL`` * system_kw * irradiance_factor.
    """
    hours = np.arange(24)
    bell = np.zeros(24)
    for h in hours:
        if 6 <= h <= 19:
            phase = (h - 6) / 13.0
            bell[h] = max(0.0, 1 - ((phase - 0.5) * 2) ** 2)
    # Scale the bell so daily production = annual / 365
    annual_kwh = system_kw * KWH_PER_KW_PER_YEAR_SOCAL * irradiance_factor
    daily_kwh = annual_kwh / 365.0
    bell_sum = bell.sum()
    if bell_sum <= 0:
        return np.zeros(24)
    return bell * (daily_kwh / bell_sum)


def compute_annual_savings_hourly(
    profile: UserProfile,
    system: ProposedSystem,
    irradiance_factor: float = 1.0,
) -> tuple[float, float, float]:
    """Compute year-1 annual savings using the hourly TOU model.

    Returns (savings_usd, self_consumed_kwh, exported_kwh) all scaled to
    annual values. Savings = self-consumed * retail_h + exported *
    export_h, summed over 24 hours, times 365.
    """
    tariff = resolve_tariff(profile.utility, profile.tariff_plan)
    retail_by_hour = np.array(tariff.retail_by_hour)
    export_by_hour = np.array(tariff.export_by_hour)

    daily_kwh = max(profile.monthly_kwh * 12.0 / 365.0, 0.1)
    load_h = _normalized_daily_load(daily_kwh)
    prod_h = _hourly_production_clear_sky(system.solar_kw, irradiance_factor)

    # Per-hour dispatch (battery ignored in NPV — tariff-shape is the
    # dominant driver; battery adds a second-order arbitrage uplift that
    # we approximate separately below).
    self_h = np.minimum(load_h, prod_h)
    export_h = np.maximum(prod_h - load_h, 0.0)

    daily_savings = float(np.sum(self_h * retail_by_hour + export_h * export_by_hour))
    annual_savings = daily_savings * 365.0
    self_annual = float(self_h.sum() * 365.0)
    export_annual = float(export_h.sum() * 365.0)
    return annual_savings, self_annual, export_annual


def _battery_arbitrage_uplift(
    profile: UserProfile,
    system: ProposedSystem,
) -> float:
    """Rough annual $ uplift from battery arbitrage.

    Model: every day, cycle the usable battery capacity once from the
    cheapest retail hour (charge) to the highest export hour (sell).
    Cap at one cycle/day. Roundtrip efficiency 0.9. This is a lower
    bound — a real LP would find more cycles and smarter routing.
    """
    if system.battery_kwh <= 0:
        return 0.0
    tariff = resolve_tariff(profile.utility, profile.tariff_plan)
    retail = np.array(tariff.retail_by_hour)
    export = np.array(tariff.export_by_hour)
    # Usable capacity: 90% depth of discharge convention
    usable_kwh = system.battery_kwh * 0.9
    # Simplest: buy at the cheapest retail, sell at the highest export
    cheap = float(retail.min())
    peak = float(export.max())
    roundtrip = 0.9
    per_cycle = usable_kwh * (peak * roundtrip - cheap)
    # Only count if profitable
    if per_cycle <= 0:
        return 0.0
    return per_cycle * 365.0


def compute_roi(
    profile: UserProfile,
    system: ProposedSystem,
    external: dict,
) -> ROIResult:
    """Compute a 25-year NPV + payback for a proposed solar+battery system."""
    tariff_plan = profile.tariff_plan

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

    # --- Year-1 savings (hourly TOU model) ---------------------------------
    year1_savings, _self_kwh_y1, _export_kwh_y1 = compute_annual_savings_hourly(
        profile, system, irradiance_factor=irradiance_factor
    )
    arb_uplift_y1 = _battery_arbitrage_uplift(profile, system)
    year1_total = year1_savings + arb_uplift_y1

    # --- Hourly irradiance-adjusted annual production for CO2 --------------
    p0_kwh = system.solar_kw * KWH_PER_KW_PER_YEAR_SOCAL * irradiance_factor

    # --- 25-year cashflow --------------------------------------------------
    # Year t savings = year 1 savings * (1 - degradation)^t * (1 + g)^t
    # (rate escalation applied to the $ value since savings scale with
    # retail rates; export rate also escalates but slower — we fold both
    # into one conservative ``g`` here for simplicity).
    years = np.arange(1, LIFETIME_YEARS + 1)
    production = p0_kwh * (1 - DEGRADATION_PER_YEAR) ** years
    degradation = (1 - DEGRADATION_PER_YEAR) ** years
    escalation = (1 + RATE_ESCALATION_PER_YEAR) ** years
    savings = year1_total * degradation * escalation
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

    # Tariff summary uses flat-weighted averages for the tooltip copy.
    retail_avg = tou_weighted_retail(profile.utility, tariff_plan)
    export_avg = tou_weighted_export(profile.utility, tariff_plan)

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
                       f"retail avg ${retail_avg:.2f}/kWh, export avg ${export_avg:.2f}/kWh",
        orthogonal_calls_made=external.get("calls", []),
        property_value_usd=property_value,
        roi_pct_of_home_value=round(roi_pct_home, 1) if roi_pct_home is not None else None,
        zenpower_permits_in_zip=zp.get("installs_count"),
        zenpower_avg_system_kw=zp.get("avg_system_kw"),
        social_cost_of_carbon_usd=round(scc_usd, 2) if scc_usd is not None else None,
    )
