"""Hourly solar production forecaster.

Phase 0: clear-sky bell curve scaled by the weather irradiance. Phase 1
adds cloud-cover adjustment from the OpenWeather forecast array.
"""

from __future__ import annotations

import numpy as np

from .types import Weather24h


def forecast_production(
    lat: float, lng: float, weather_24h: Weather24h, system_kw: float
) -> np.ndarray:
    """Return hourly kWh production as a numpy array of shape (24,)."""
    hours = np.arange(24)
    # Bell centered at solar noon (local approx 12-13). Zero before 6, after 19.
    bell = np.zeros(24)
    for h in hours:
        if 6 <= h <= 19:
            phase = (h - 6) / 13.0
            bell[h] = max(0.0, 1 - ((phase - 0.5) * 2) ** 2)
    peak_kw = system_kw * (weather_24h.irradiance_kwh_m2_day / 5.5)
    cloud_factor = 1.0 - np.array(weather_24h.cloud_pct_by_hour) / 100.0
    return bell * peak_kw * cloud_factor
