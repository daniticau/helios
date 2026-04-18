"""Pure-Python economics engine for Helios.

Exports the four functions Workstream 1 imports. No network I/O, no
FastAPI dependency, no Orthogonal dependency.
"""

from __future__ import annotations

from .arbitrage import recommend_action
from .npv import compute_roi
from .production import forecast_production
from .sizing import recommend_system_size

__all__ = [
    "compute_roi",
    "forecast_production",
    "recommend_action",
    "recommend_system_size",
]
