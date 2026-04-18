"""System sizing recommender.

Given monthly kWh consumption, propose a solar + battery system that
covers typical daily usage with a roof constraint ceiling.
"""

from __future__ import annotations

from schemas import ProposedSystem


def recommend_system_size(
    monthly_kwh: float, roof_constraint_kw: float = 12.0
) -> ProposedSystem:
    """Suggest a solar+battery system sized to the household's annual load.

    Rule of thumb: cover ~110% of annual kWh (margin for shoulder months
    when production dips), bounded below at 3 kW (min viable install) and
    above at the roof constraint. Battery is sized to ~60% of a single
    average day's load, capped at 20 kWh (typical Powerwall ceiling).
    """
    # Target: cover ~110% of annual load (margin for shoulder months).
    annual_kwh = monthly_kwh * 12.0
    target_kw = (annual_kwh * 1.10) / 1500.0
    solar_kw = max(3.0, min(target_kw, roof_constraint_kw))

    # Battery: one average day of peak usage, capped at 20 kWh.
    battery_kwh = min(20.0, max(5.0, monthly_kwh / 30.0 * 0.6))

    return ProposedSystem(solar_kw=round(solar_kw, 1), battery_kwh=round(battery_kwh, 1))
