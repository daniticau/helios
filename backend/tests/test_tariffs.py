"""Tests for backend.tariffs — CA utility TOU schedule lookups."""

from __future__ import annotations

from tariffs import (
    TARIFFS,
    resolve_tariff,
    tou_weighted_export,
    tou_weighted_retail,
)


def test_resolve_exact_sdge_plan() -> None:
    t = resolve_tariff("SDGE", "EV-TOU-5")
    assert t.utility == "SDGE"
    assert t.plan == "EV-TOU-5"
    assert len(t.retail_by_hour) == 24
    assert len(t.export_by_hour) == 24


def test_resolve_exact_pge_ev2a() -> None:
    t = resolve_tariff("PGE", "EV2-A")
    assert t.utility == "PGE"
    assert t.plan == "EV2-A"
    # 4-9pm should be peak rate $0.50
    for h in range(16, 21):
        assert t.retail_by_hour[h] == 0.50


def test_resolve_missing_plan_falls_back_to_first_pge() -> None:
    t = resolve_tariff("PGE", None)
    assert t.utility == "PGE"
    # Should match one of the known PGE tariffs.
    assert t.plan in {"EV2-A", "E-TOU-C"}


def test_resolve_unknown_plan_for_known_utility_falls_back_to_utility() -> None:
    t = resolve_tariff("PGE", "DOES-NOT-EXIST")
    assert t.utility == "PGE"


def test_resolve_unknown_utility_falls_back_to_pge_ev2a() -> None:
    t = resolve_tariff("unknown", None)
    # Final-stage fallback per tariffs.py is PGE/EV2-A.
    assert t.utility == "PGE"
    assert t.plan == "EV2-A"


def test_tou_weighted_retail_in_reasonable_range() -> None:
    avg = tou_weighted_retail("SDGE", "EV-TOU-5")
    assert 0.2 <= avg <= 0.5, f"expected 0.2-0.5 $/kWh, got {avg:.3f}"


def test_tou_weighted_retail_pge_in_reasonable_range() -> None:
    avg = tou_weighted_retail("PGE", "EV2-A")
    assert 0.2 <= avg <= 0.5, f"expected 0.2-0.5 $/kWh, got {avg:.3f}"


def test_tou_weighted_retail_fallback_matches_explicit_lookup() -> None:
    """Unknown plan + known utility yields the same weighting as an explicit lookup."""
    avg_unknown = tou_weighted_retail("SCE", "bogus-plan")
    avg_default = tou_weighted_retail("SCE", "TOU-D-PRIME")
    assert abs(avg_unknown - avg_default) < 1e-9


def test_tou_weighted_export_in_nem3_range() -> None:
    avg = tou_weighted_export("SDGE", "EV-TOU-5")
    # NEM 3.0 export avg is ~$0.10-0.50/kWh depending on month; our
    # static curve averages closer to $0.18-0.25.
    assert 0.1 <= avg <= 0.5, f"expected 0.1-0.5 $/kWh, got {avg:.3f}"


def test_export_rates_peak_in_evening() -> None:
    """NEM 3.0 avoided cost peaks in the 4-8pm window."""
    t = resolve_tariff("SDGE", "EV-TOU-5")
    evening = max(t.export_by_hour[16:21])
    midday = max(t.export_by_hour[10:14])
    assert evening > midday


def test_all_tariffs_have_24_hour_arrays() -> None:
    for key, tariff in TARIFFS.items():
        assert len(tariff.retail_by_hour) == 24, key
        assert len(tariff.export_by_hour) == 24, key
        # Every rate should be a non-negative float.
        assert all(r >= 0 for r in tariff.retail_by_hour), key
        assert all(r >= 0 for r in tariff.export_by_hour), key


def test_sdge_peak_hours_are_highest_in_day() -> None:
    t = resolve_tariff("SDGE", "EV-TOU-5")
    peak_max = max(t.retail_by_hour[16:21])
    offpeak_min = min(t.retail_by_hour[7:15])
    assert peak_max > offpeak_min
