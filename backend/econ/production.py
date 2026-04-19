"""Hourly solar production forecaster.

Phase 0: clear-sky bell curve scaled by the weather irradiance. Phase 1
adds cloud-cover adjustment from the OpenWeather forecast array.
"""

from __future__ import annotations

import numpy as np

from .types import Weather24h

_HOURS = np.arange(24, dtype=float)
_DAYLIGHT_MASK = (_HOURS >= 6) & (_HOURS <= 19)
_PHASE = (_HOURS - 6.0) / 13.0
_CLEAR_SKY_BELL = np.where(
    _DAYLIGHT_MASK,
    np.maximum(0.0, 1.0 - ((_PHASE - 0.5) * 2.0) ** 2),
    0.0,
)


def forecast_production(
    lat: float, lng: float, weather_24h: Weather24h, system_kw: float
) -> np.ndarray:
    """Return hourly kWh production as a numpy array of shape (24,)."""
    # Bell centered at solar noon (local approx 12-13). Zero before 6, after 19.
    peak_kw = system_kw * (weather_24h.irradiance_kwh_m2_day / 5.5)
    cloud_factor = 1.0 - np.asarray(weather_24h.cloud_pct_by_hour, dtype=float) / 100.0
    return _CLEAR_SKY_BELL * peak_kw * cloud_factor
