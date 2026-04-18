"""Hardcoded CA utility tariff schedules for Phase 0/1.

Stretch: replace with an Orthogonal ScrapeGraph lookup. For now, the big
four are encoded as hour-of-day → $/kWh lookup tables per HELIOS.md §7.3.
Export rates are a coarse NEM 3.0 ACC approximation.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Tariff:
    utility: str
    plan: str
    # 24-entry list: $/kWh retail for each hour 0-23
    retail_by_hour: list[float]
    # 24-entry list: $/kWh export under NEM 3.0 avoided cost
    export_by_hour: list[float]


def _build_retail(peak_usd: float, partial_usd: float, offpeak_usd: float,
                   peak_hours: range, partial_hours: list[int] | None = None) -> list[float]:
    partial_hours = partial_hours or []
    out = []
    for h in range(24):
        if h in peak_hours:
            out.append(peak_usd)
        elif h in partial_hours:
            out.append(partial_usd)
        else:
            out.append(offpeak_usd)
    return out


# Export rates: very rough NEM 3.0 ACC shape — high in evening, near-zero midday.
_NEM3_EXPORT = [0.05, 0.05, 0.04, 0.04, 0.04, 0.05,
                0.06, 0.07, 0.06, 0.05, 0.04, 0.03,
                0.03, 0.04, 0.06, 0.12, 0.35, 0.85,
                1.20, 1.05, 0.65, 0.30, 0.12, 0.08]


TARIFFS: dict[str, Tariff] = {
    "PGE/EV2-A": Tariff(
        utility="PGE",
        plan="EV2-A",
        retail_by_hour=_build_retail(
            peak_usd=0.50, partial_usd=0.35, offpeak_usd=0.25,
            peak_hours=range(16, 21),
            partial_hours=[15, 21, 22, 23],
        ),
        export_by_hour=_NEM3_EXPORT,
    ),
    "PGE/E-TOU-C": Tariff(
        utility="PGE",
        plan="E-TOU-C",
        retail_by_hour=_build_retail(
            peak_usd=0.48, partial_usd=0.32, offpeak_usd=0.28,
            peak_hours=range(16, 21),
        ),
        export_by_hour=_NEM3_EXPORT,
    ),
    "SCE/TOU-D-PRIME": Tariff(
        utility="SCE",
        plan="TOU-D-PRIME",
        retail_by_hour=_build_retail(
            peak_usd=0.43, partial_usd=0.30, offpeak_usd=0.25,
            peak_hours=range(16, 21),
        ),
        export_by_hour=_NEM3_EXPORT,
    ),
    "SDGE/EV-TOU-5": Tariff(
        utility="SDGE",
        plan="EV-TOU-5",
        retail_by_hour=_build_retail(
            peak_usd=0.55, partial_usd=0.35, offpeak_usd=0.26,
            peak_hours=range(16, 21),
            partial_hours=[0, 1, 2, 3, 4, 5],  # super-off-peak bundled in offpeak for simplicity
        ),
        export_by_hour=_NEM3_EXPORT,
    ),
}


def resolve_tariff(utility: str, plan: str | None = None) -> Tariff:
    if plan:
        key = f"{utility}/{plan}"
        if key in TARIFFS:
            return TARIFFS[key]
    # fallback: first tariff matching the utility
    for k, t in TARIFFS.items():
        if k.startswith(utility + "/"):
            return t
    return TARIFFS["PGE/EV2-A"]


def tou_weighted_retail(utility: str, plan: str | None = None) -> float:
    """Flat-weighted average of retail rate — quick proxy for annual R_retail."""
    t = resolve_tariff(utility, plan)
    return sum(t.retail_by_hour) / 24.0


def tou_weighted_export(utility: str, plan: str | None = None) -> float:
    t = resolve_tariff(utility, plan)
    return sum(t.export_by_hour) / 24.0
