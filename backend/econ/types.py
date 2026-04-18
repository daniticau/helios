"""Internal dataclasses for the econ engine."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Weather24h:
    irradiance_kwh_m2_day: float
    cloud_pct_by_hour: list[float]  # len 24


@dataclass(frozen=True)
class BatterySpecs:
    capacity_kwh: float
    max_kw: float
    roundtrip_eff: float = 0.9
