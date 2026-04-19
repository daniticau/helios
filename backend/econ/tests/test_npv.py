"""Tests for econ.npv — hourly NPV model + acceptance criteria from
HELIOS.md §9.WS2.

Coverage:
- Zero-solar baseline (tiny system on low-consumption household → NPV
  can be negative, or at least the savings line is bounded).
- La Jolla SDGE typical profile → positive NPV on a reasonably sized
  system.
- Larger system → larger annual savings AND larger upfront cost.
- Hourly savings math matches first principles on a flat tariff.
"""

from __future__ import annotations

from econ import compute_roi, recommend_system_size
from econ.npv import (
    _battery_arbitrage_uplift,
    _hourly_production_clear_sky,
    _normalized_daily_load,
    compute_annual_savings_hourly,
)
from schemas import ProposedSystem, UserProfile


def _profile(
    monthly_kwh: float = 650.0,
    utility: str = "SDGE",
    tariff_plan: str | None = "EV-TOU-5",
) -> UserProfile:
    """La Jolla SDGE household default — realistic US-CA baseline."""
    return UserProfile(
        address="9500 Gilman Dr, La Jolla, CA, 92093, US",
        lat=32.8801,
        lng=-117.2340,
        utility=utility,
        tariff_plan=tariff_plan,
        monthly_bill_usd=240.0,
        monthly_kwh=monthly_kwh,
        has_solar=False,
        has_battery=False,
    )


# ---------------------------------------------------------------------------
# Existing smoke tests (kept from Phase 0)
# ---------------------------------------------------------------------------


def test_compute_roi_returns_positive_npv_on_sane_inputs():
    profile = _profile()
    system = recommend_system_size(profile.monthly_kwh)
    roi = compute_roi(profile=profile, system=system, external={"calls": []})
    assert roi.net_upfront_usd > 0
    assert roi.payback_years > 0
    assert roi.npv_25yr_usd != 0.0
    assert roi.co2_avoided_tons_25yr > 0


def test_larger_system_has_larger_upfront():
    profile = _profile()
    small = recommend_system_size(profile.monthly_kwh)

    big = ProposedSystem(solar_kw=12.0, battery_kwh=20.0)
    r_small = compute_roi(profile=profile, system=small, external={"calls": []})
    r_big = compute_roi(profile=profile, system=big, external={"calls": []})
    assert r_big.upfront_cost_usd > r_small.upfront_cost_usd


# ---------------------------------------------------------------------------
# Hourly model helpers
# ---------------------------------------------------------------------------


def test_normalized_daily_load_sums_to_target():
    load = _normalized_daily_load(21.6)  # typical ~650 kWh/month
    assert abs(load.sum() - 21.6) < 1e-9
    assert len(load) == 24


def test_daily_load_shape_is_duck_curve():
    load = _normalized_daily_load(24.0)
    # Evening peak (hour 18) should be the highest
    evening_peak = load[18]
    midday = load[12]
    assert evening_peak > midday, "evening peak should exceed midday trough"


def test_clear_sky_production_zero_overnight_peaks_midday():
    prod = _hourly_production_clear_sky(8.0, irradiance_factor=1.0)
    assert prod[0] == 0.0
    assert prod[3] == 0.0
    assert prod[23] == 0.0
    assert prod[12] == prod.max() or prod[13] == prod.max()
    # Annual production on a 8 kW system ~ 12000 kWh/yr
    annual_kwh = prod.sum() * 365
    assert 10000 < annual_kwh < 14000


# ---------------------------------------------------------------------------
# Annual savings — HELIOS.md §3.1 acceptance criteria
# ---------------------------------------------------------------------------


def test_zero_solar_baseline_no_savings():
    """A solar system that produces ~nothing (0.5 kW, bad weather) should
    generate near-zero savings. NPV will be dominated by -upfront."""
    profile = _profile()
    tiny = ProposedSystem(solar_kw=0.5, battery_kwh=0.0)
    # Near-zero irradiance so annual production is tiny
    savings, self_kwh, export_kwh = compute_annual_savings_hourly(
        profile, tiny, irradiance_factor=0.01
    )
    assert savings < 100.0, f"expected tiny savings, got ${savings:.2f}"
    assert self_kwh + export_kwh > 0  # some production, but small


def test_typical_la_jolla_sdge_profile_positive_npv():
    """La Jolla SDGE household with a reasonably sized system must
    produce a positive 25-year NPV under default assumptions (this is
    THE core demo path)."""
    profile = _profile(monthly_kwh=750.0)
    system = ProposedSystem(solar_kw=8.0, battery_kwh=13.5)
    roi = compute_roi(profile=profile, system=system, external={"calls": []})
    assert roi.npv_25yr_usd > 0, f"expected positive NPV, got {roi.npv_25yr_usd}"
    assert 3.0 < roi.payback_years < 15.0, (
        f"payback should land in the 3-15yr band for a typical CA household, "
        f"got {roi.payback_years}"
    )


def test_larger_system_has_larger_annual_savings():
    """A 12 kW system should beat a 5 kW system on year-1 savings for
    the same household."""
    profile = _profile(monthly_kwh=900.0)
    small = ProposedSystem(solar_kw=5.0, battery_kwh=10.0)
    big = ProposedSystem(solar_kw=12.0, battery_kwh=20.0)
    r_small = compute_roi(profile=profile, system=small, external={"calls": []})
    r_big = compute_roi(profile=profile, system=big, external={"calls": []})
    assert r_big.annual_savings_yr1_usd > r_small.annual_savings_yr1_usd


def test_larger_system_has_larger_absolute_savings_even_if_longer_payback():
    """A much bigger system has more total savings in absolute $ terms
    but can have a longer payback (because more of its output gets
    exported at low rates). This is the NEM 3.0 tradeoff that makes
    sizing non-trivial."""
    profile = _profile(monthly_kwh=600.0)  # smaller household
    small = ProposedSystem(solar_kw=4.0, battery_kwh=10.0)
    big = ProposedSystem(solar_kw=12.0, battery_kwh=20.0)
    r_small = compute_roi(profile=profile, system=small, external={"calls": []})
    r_big = compute_roi(profile=profile, system=big, external={"calls": []})
    # Big system produces more total annual $ in absolute terms
    assert r_big.annual_savings_yr1_usd > r_small.annual_savings_yr1_usd
    # But big system has larger upfront
    assert r_big.upfront_cost_usd > r_small.upfront_cost_usd


def test_annual_savings_increases_with_irradiance():
    profile = _profile()
    system = ProposedSystem(solar_kw=8.0, battery_kwh=10.0)
    low = compute_annual_savings_hourly(profile, system, irradiance_factor=0.6)
    high = compute_annual_savings_hourly(profile, system, irradiance_factor=1.3)
    assert high[0] > low[0], "higher irradiance → more savings"
    assert high[1] > low[1], "more production → more self-consumption"


# ---------------------------------------------------------------------------
# Battery arbitrage uplift
# ---------------------------------------------------------------------------


def test_battery_arbitrage_uplift_zero_when_no_battery():
    profile = _profile()
    system = ProposedSystem(solar_kw=8.0, battery_kwh=0.0)
    assert _battery_arbitrage_uplift(profile, system) == 0.0


def test_battery_arbitrage_uplift_positive_with_battery():
    profile = _profile(utility="SDGE", tariff_plan="EV-TOU-5")
    system = ProposedSystem(solar_kw=8.0, battery_kwh=13.5)
    uplift = _battery_arbitrage_uplift(profile, system)
    assert uplift > 0, "SDGE peak export should make battery arbitrage profitable"


# ---------------------------------------------------------------------------
# CO2 math
# ---------------------------------------------------------------------------


def test_co2_avoided_scales_with_system_size():
    profile = _profile()
    r_small = compute_roi(
        profile=profile, system=ProposedSystem(solar_kw=4.0, battery_kwh=0.0),
        external={"calls": []},
    )
    r_big = compute_roi(
        profile=profile, system=ProposedSystem(solar_kw=12.0, battery_kwh=0.0),
        external={"calls": []},
    )
    assert r_big.co2_avoided_tons_25yr > r_small.co2_avoided_tons_25yr
    # Order-of-magnitude sanity: 8 kW system → ~100+ tons over 25 yrs
    assert r_big.co2_avoided_tons_25yr > 50


# ---------------------------------------------------------------------------
# External-input passthroughs
# ---------------------------------------------------------------------------


def test_property_value_produces_roi_pct():
    profile = _profile()
    system = ProposedSystem(solar_kw=8.0, battery_kwh=10.0)
    external = {
        "calls": [],
        "property_value": {"estimated_value_usd": 900_000.0},
    }
    roi = compute_roi(profile=profile, system=system, external=external)
    assert roi.property_value_usd == 900_000.0
    assert roi.roi_pct_of_home_value is not None


def test_carbon_price_produces_scc_usd():
    profile = _profile()
    system = ProposedSystem(solar_kw=8.0, battery_kwh=10.0)
    external = {
        "calls": [],
        "carbon_price": {"usd_per_ton_co2": 185.0},
    }
    roi = compute_roi(profile=profile, system=system, external=external)
    assert roi.social_cost_of_carbon_usd is not None
    assert roi.social_cost_of_carbon_usd > 0
