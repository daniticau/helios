"""24-hour greedy arbitrage recommender per HELIOS.md §3.2.

Phase 1 adds three improvements over the Phase 0 priority check:

1. **Lookahead.** If the battery is partially charged and the max export
   rate in the next 6h beats current export, reserve capacity rather
   than bleeding the battery to house now.
2. **Round-trip efficiency gate.** Rule 3 (charge-now, sell-later) only
   fires when ``charge_cost / eta_rt <= expected_discharge_price`` so
   we never buy power we'd lose money dispatching.
3. **Specific reasoning strings.** Every recommendation names the time
   and the $/kWh delta so the UI copy ("Charge now at $0.25, sell at
   6pm for $1.42 — net $0.81/kWh after 10% roundtrip loss") is
   informative enough to trust at a glance.
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

# Default assumed battery roundtrip efficiency when profile doesn't
# specify. Phase 0 types.BatterySpecs uses the same 0.9.
DEFAULT_ROUNDTRIP_EFF = 0.9
# Minimum edge required before we'll spin up a grid-charge cycle.
MIN_ARBITRAGE_MARGIN_USD = 0.05
# How far out to look for a better dispatch window (hours).
LOOKAHEAD_HOURS = 12
SHORT_LOOKAHEAD_HOURS = 6


def _hour_offset_to_clock(now: datetime, offset: int) -> str:
    """Render an hour offset as a human time, e.g. "6pm" or "3am"."""
    t = now + timedelta(hours=offset)
    h = t.hour
    suffix = "am" if h < 12 else "pm"
    display = h if 1 <= h <= 12 else (12 if h == 0 else h - 12)
    return f"{display}{suffix}"


def _forecast_24h(profile: UserProfile, now: datetime) -> list[ForecastPoint]:
    """Build a 24-hour forward forecast: retail, export, solar per hour.

    Export rate here is the NEM 3.0 avoided-cost tariff (what the user
    actually gets paid for an export), not the CAISO wholesale LMP.
    CAISO LMP is an informational input to the next ACC update but is
    not what the meter credits in real time.
    """
    tariff = resolve_tariff(profile.utility, profile.tariff_plan)
    # CAISO LMP is available for future extensions (forecasting ACC
    # refresh) but the export rate the user books against is NEM 3.0.
    _ = synth_lmp_24h(now)
    out = []
    for i in range(24):
        hour = (now.hour + i) % 24
        # Naive solar forecast: symmetric bell peaked at solar noon.
        solar_kw = 0.0
        if 6 <= hour <= 19:
            phase = (hour - 6) / 13.0
            solar_kw = (profile.solar_kw or 8.0) * max(0.0, 1 - ((phase - 0.5) * 2) ** 2)
        out.append(
            ForecastPoint(
                hour_offset=i,
                retail_rate=tariff.retail_by_hour[hour],
                export_rate=tariff.export_by_hour[hour],
                solar_kw_forecast=round(solar_kw, 3),
            )
        )
    return out


def _find_peak_window(
    forecast: list[ForecastPoint], horizon_hours: int
) -> ForecastPoint | None:
    """Return the forecast point with the highest export rate within
    the next ``horizon_hours`` hours (hour 0 = now, so start at 1)."""
    window = [fp for fp in forecast if 1 <= fp.hour_offset <= horizon_hours]
    if not window:
        return None
    return max(window, key=lambda p: p.export_rate)


def _choose_action(
    state: HouseholdState,
    forecast: list[ForecastPoint],
    profile: UserProfile,
    now: datetime,
    roundtrip_eff: float = DEFAULT_ROUNDTRIP_EFF,
) -> tuple[LiveAction, str, float]:
    """Return (action, reasoning, expected_hourly_gain_usd).

    Applies HELIOS.md §3.2 greedy priority rules with Phase 1 lookahead
    and roundtrip-efficiency gates.
    """
    current = forecast[0]
    retail = current.retail_rate
    export = current.export_rate
    solar = state.solar_kw_now
    load = state.load_kw_now
    soc = state.battery_soc_pct

    # Short- and long-horizon peaks for lookahead decisions
    short_peak = _find_peak_window(forecast, SHORT_LOOKAHEAD_HOURS)
    long_peak = _find_peak_window(forecast, LOOKAHEAD_HOURS)

    # Rule 2: if export rate already exceeds retail, dump battery to grid
    if export > retail and soc > 15 and profile.has_battery:
        gain = (profile.battery_max_kw or 5.0) * export
        return (
            "DISCHARGE_BATTERY_TO_GRID",
            f"Export rate (${export:.2f}/kWh) now exceeds retail (${retail:.2f}/kWh) — "
            f"sell battery to grid for ~${gain:.2f}/hr.",
            gain,
        )

    # Rule 1 + (complement of 4): surplus solar → battery or export
    if solar > load:
        excess = solar - load
        if profile.has_battery and soc < 95:
            reason = f"Storing {excess:.1f} kW surplus solar"
            if long_peak is not None and long_peak.export_rate > export + 0.05:
                peak_time = _hour_offset_to_clock(now, long_peak.hour_offset)
                reason += (
                    f" for the ${long_peak.export_rate:.2f}/kWh peak at {peak_time} "
                    f"(vs ${export:.2f}/kWh now)."
                )
            else:
                reason += f" (export is only ${export:.2f}/kWh right now)."
            return ("CHARGE_BATTERY_FROM_SOLAR", reason, 0.0)
        return (
            "EXPORT_SOLAR",
            f"Battery full — exporting {excess:.1f} kW solar at ${export:.2f}/kWh "
            f"(~${excess * export:.2f}/hr).",
            excess * export,
        )

    # Rule 5 with lookahead: house load > solar during retail peak —
    # normally we discharge battery to house, but if the export rate in
    # the next 6h beats retail by enough, reserve capacity to sell
    # instead.
    if load > solar and retail > 0.35 and profile.has_battery and soc > 20:
        if short_peak is not None and short_peak.export_rate > retail + 0.10:
            peak_time = _hour_offset_to_clock(now, short_peak.hour_offset)
            return (
                "HOLD",
                f"Paying ${retail:.2f}/kWh retail briefly — reserving battery for "
                f"${short_peak.export_rate:.2f}/kWh export at {peak_time} "
                f"(nets ${short_peak.export_rate - retail:.2f}/kWh more).",
                0.0,
            )
        gain = (load - solar) * retail
        return (
            "DISCHARGE_BATTERY_TO_HOUSE",
            f"House load {load:.1f} kW exceeds solar {solar:.1f} kW during "
            f"${retail:.2f}/kWh peak — pulling from battery (~${gain:.2f}/hr avoided).",
            gain,
        )

    # Rule 6: off-peak + low battery + known peak with sufficient margin.
    # Enforce the roundtrip-efficiency gate: charging cost / eta <=
    # expected sell price, plus a small margin so we're not trading for
    # pennies.
    if (
        retail < 0.28
        and profile.has_battery
        and soc < 40
        and long_peak is not None
        and long_peak.export_rate > 0.80
    ):
        effective_charge_cost = retail / roundtrip_eff
        net_margin = long_peak.export_rate - effective_charge_cost
        if net_margin >= MIN_ARBITRAGE_MARGIN_USD:
            peak_time = _hour_offset_to_clock(now, long_peak.hour_offset)
            loss_pct = round((1 - roundtrip_eff) * 100)
            return (
                "CHARGE_BATTERY_FROM_GRID",
                f"Charging from grid now (${retail:.2f}/kWh) to sell at {peak_time} "
                f"(${long_peak.export_rate:.2f}/kWh) — net ${net_margin:.2f}/kWh "
                f"after {loss_pct}% round-trip loss.",
                -load * retail,
            )

    return (
        "HOLD",
        f"No profitable action at ${retail:.2f}/kWh retail / ${export:.2f}/kWh export — "
        f"serving load from solar.",
        0.0,
    )


def recommend_action(
    profile: UserProfile, state: HouseholdState, external: dict
) -> LiveRecommendation:
    """Entry point: given the household state + tariff, recommend a
    single action and return the full LiveRecommendation envelope
    (action, reasoning, 24h forecast, next peak window).
    """
    now = state.timestamp.replace(tzinfo=None) if state.timestamp.tzinfo else state.timestamp
    forecast = _forecast_24h(profile, now)

    # Use battery spec roundtrip if we can infer it from profile; else default.
    roundtrip_eff = DEFAULT_ROUNDTRIP_EFF

    action, reasoning, gain = _choose_action(
        state, forecast, profile, now, roundtrip_eff=roundtrip_eff
    )

    # Peak window: next hour with export_rate > $0.80 for push-notif trigger
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
