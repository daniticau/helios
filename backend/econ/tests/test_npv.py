"""Smoke tests for compute_roi — Phase 0 just checks the shape is sane."""

from __future__ import annotations

from econ import compute_roi, recommend_system_size
from schemas import UserProfile


def _profile(monthly_kwh: float = 650.0) -> UserProfile:
    return UserProfile(
        address="9500 Gilman Dr, La Jolla, CA, 92093, US",
        lat=32.8801,
        lng=-117.2340,
        utility="SDGE",
        tariff_plan="EV-TOU-5",
        monthly_bill_usd=240.0,
        monthly_kwh=monthly_kwh,
        has_solar=False,
        has_battery=False,
    )


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
    from schemas import ProposedSystem

    big = ProposedSystem(solar_kw=12.0, battery_kwh=20.0)
    r_small = compute_roi(profile=profile, system=small, external={"calls": []})
    r_big = compute_roi(profile=profile, system=big, external={"calls": []})
    assert r_big.upfront_cost_usd > r_small.upfront_cost_usd
