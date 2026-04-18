"""24-hour greedy arbitrage recommender per HELIOS.md §3.2.

Phase 0: takes the current household state + external inputs (tariff,
weather) and returns a plausible LiveRecommendation. The greedy rules
follow the priority order in §3.2; LP formulation is a stretch goal.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from caiso import synth_lmp_24h
from schemas import (
    ForecastPoint,
    HouseholdState,
    LiveAction,
    LiveRecommendation,
    PeakWindow,
    UserProfile,
)
from tariffs import resolve_tariff


def _forecast_24h(profile: UserProfile, now: datetime) -> list[ForecastPoint]:
    tariff = resolve_tariff(profile.utility, profile.tariff_plan)
    export_curve = synth_lmp_24h(now)
    out = []
    for i in range(24):
        hour = (now.hour + i) % 24
        # Naive solar forecast: peak at noon, zero overnight.
        solar_kw = 0.0
        if 6 <= hour <= 19:
            phase = (hour - 6) / 13.0
            # symmetric bell
            solar_kw = (profile.solar_kw or 8.0) * max(0.0, 1 - ((phase - 0.5) * 2) ** 2)
        out.append(
            ForecastPoint(
                hour_offset=i,
                retail_rate=tariff.retail_by_hour[hour],
                export_rate=export_curve[i],
                solar_kw_forecast=round(solar_kw, 3),
            )
        )
    return out


def _choose_action(
    state: HouseholdState,
    forecast: list[ForecastPoint],
    profile: UserProfile,
) -> tuple[LiveAction, str, float]:
    now = forecast[0]
    retail = now.retail_rate
    export = now.export_rate
    solar = state.solar_kw_now
    load = state.load_kw_now
    soc = state.battery_soc_pct

    # Find the highest export rate in the next 12h.
    next_12 = forecast[1:13] if len(forecast) > 1 else []
    peak = max(next_12, key=lambda p: p.export_rate) if next_12 else None

    # Rule 2: export rate > retail (it's peak)
    if export > retail and soc > 15 and profile.has_battery:
        gain = (profile.battery_max_kw or 5.0) * export
        return (
            "DISCHARGE_BATTERY_TO_GRID",
            f"Export rate (${export:.2f}/kWh) exceeds retail — sell battery to grid.",
            gain,
        )

    # Rule 1 + 4: excess solar
    if solar > load:
        excess = solar - load
        if profile.has_battery and soc < 95:
            return (
                "CHARGE_BATTERY_FROM_SOLAR",
                f"Excess solar {excess:.1f} kW — store for the {peak.export_rate:.2f} peak "
                f"in {peak.hour_offset}h." if peak else f"Store excess solar ({excess:.1f} kW).",
                0.0,
            )
        return (
            "EXPORT_SOLAR",
            f"Battery full — export excess solar at ${export:.2f}/kWh.",
            excess * export,
        )

    # Rule 5: house load > solar, high retail, battery charged
    if load > solar and retail > 0.35 and profile.has_battery and soc > 20:
        gain = (load - solar) * retail
        return (
            "DISCHARGE_BATTERY_TO_HOUSE",
            f"House load > solar during ${retail:.2f}/kWh peak — pull from battery.",
            gain,
        )

    # Rule 6: off-peak, battery low, known peak coming
    if retail < 0.28 and profile.has_battery and soc < 40 and peak and peak.export_rate > 0.80:
        return (
            "CHARGE_BATTERY_FROM_GRID",
            f"Off-peak now (${retail:.2f}) — charge for ${peak.export_rate:.2f} peak.",
            -(load) * retail,
        )

    return ("HOLD", "No profitable action right now — serving load from solar.", 0.0)


def recommend_action(
    profile: UserProfile, state: HouseholdState, external: dict
) -> LiveRecommendation:
    now = state.timestamp.replace(tzinfo=None) if state.timestamp.tzinfo else state.timestamp
    forecast = _forecast_24h(profile, now)
    action, reasoning, gain = _choose_action(state, forecast, profile)

    # Peak window: next hour with export_rate > $0.80
    peak_window = None
    for fp in forecast:
        if fp.export_rate > 0.80:
            peak_window = PeakWindow(
                start_iso=now + timedelta(hours=fp.hour_offset),
                expected_rate=fp.export_rate,
            )
            break

    return LiveRecommendation(
        action=action,
        reasoning=reasoning,
        expected_hourly_gain_usd=round(gain, 2),
        retail_rate_now=forecast[0].retail_rate,
        export_rate_now=forecast[0].export_rate,
        next_peak_window=peak_window,
        forecast_24h=forecast,
        orthogonal_calls_made=external.get("calls", []),
    )
