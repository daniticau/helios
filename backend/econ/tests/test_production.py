"""Tests for econ.production — hourly solar forecast.

Covers the HELIOS.md §9.WS2 acceptance criteria:
- Midnight returns 0 kWh
- Noon returns peak
- 100% cloud cover returns 0
"""

from __future__ import annotations

import numpy as np

from econ import forecast_production
from econ.types import Weather24h


def _clear_weather(irradiance: float = 5.5) -> Weather24h:
    return Weather24h(
        irradiance_kwh_m2_day=irradiance,
        cloud_pct_by_hour=[0.0] * 24,
    )


def _fully_clouded_weather(irradiance: float = 5.5) -> Weather24h:
    return Weather24h(
        irradiance_kwh_m2_day=irradiance,
        cloud_pct_by_hour=[100.0] * 24,
    )


# ---------------------------------------------------------------------------
# Basic shape / boundary cases
# ---------------------------------------------------------------------------


def test_forecast_returns_shape_24():
    out = forecast_production(
        lat=32.88, lng=-117.23, weather_24h=_clear_weather(), system_kw=8.0
    )
    assert out.shape == (24,)


def test_midnight_returns_zero():
    out = forecast_production(
        lat=32.88, lng=-117.23, weather_24h=_clear_weather(), system_kw=8.0
    )
    assert out[0] == 0.0
    assert out[23] == 0.0
    # Also 1am, 2am, 3am...
    for h in range(0, 6):
        assert out[h] == 0.0, f"hour {h} should be zero (before sunrise)"
    # And very late
    for h in range(20, 24):
        assert out[h] == 0.0, f"hour {h} should be zero (after sunset)"


def test_noon_is_peak():
    out = forecast_production(
        lat=32.88, lng=-117.23, weather_24h=_clear_weather(), system_kw=8.0
    )
    peak_hour = int(np.argmax(out))
    assert peak_hour in (12, 13), f"peak should be near solar noon, got hour {peak_hour}"
    assert out[peak_hour] > 0


def test_full_cloud_cover_returns_zero():
    out = forecast_production(
        lat=32.88, lng=-117.23, weather_24h=_fully_clouded_weather(), system_kw=8.0
    )
    assert np.allclose(out, 0.0), f"100% cloud should produce no power, got {out}"


# ---------------------------------------------------------------------------
# Scaling with system size / irradiance
# ---------------------------------------------------------------------------


def test_bigger_system_produces_more():
    weather = _clear_weather()
    small = forecast_production(lat=32.88, lng=-117.23, weather_24h=weather, system_kw=4.0)
    big = forecast_production(lat=32.88, lng=-117.23, weather_24h=weather, system_kw=10.0)
    assert big.sum() > small.sum()
    # Roughly 2.5x since linear in system_kw
    ratio = big.sum() / small.sum()
    assert 2.3 < ratio < 2.7, f"expected ~2.5x, got {ratio:.2f}x"


def test_higher_irradiance_produces_more():
    low = forecast_production(
        lat=32.88, lng=-117.23, weather_24h=_clear_weather(3.0), system_kw=8.0
    )
    high = forecast_production(
        lat=32.88, lng=-117.23, weather_24h=_clear_weather(6.5), system_kw=8.0
    )
    assert high.sum() > low.sum()


def test_partial_cloud_cover_reduces_output():
    clear = forecast_production(
        lat=32.88, lng=-117.23, weather_24h=_clear_weather(), system_kw=8.0
    )
    partial = Weather24h(
        irradiance_kwh_m2_day=5.5,
        cloud_pct_by_hour=[50.0] * 24,
    )
    partial_out = forecast_production(
        lat=32.88, lng=-117.23, weather_24h=partial, system_kw=8.0
    )
    # ~50% reduction mid-day when 50% clouded
    assert partial_out[12] < clear[12]
    assert partial_out[12] > 0


def test_output_non_negative():
    """Production is a physical quantity — must be >= 0 everywhere."""
    weather = Weather24h(
        irradiance_kwh_m2_day=5.5,
        cloud_pct_by_hour=[c * 7.3 % 100 for c in range(24)],  # varied cloud
    )
    out = forecast_production(
        lat=32.88, lng=-117.23, weather_24h=weather, system_kw=8.0
    )
    assert (out >= 0).all()


def test_zero_system_kw_returns_zero():
    out = forecast_production(
        lat=32.88, lng=-117.23, weather_24h=_clear_weather(), system_kw=0.0
    )
    assert np.allclose(out, 0.0)
