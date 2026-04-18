"""CAISO OASIS direct client for real-time wholesale LMP prices.

Used by Mode B to value export decisions. Phase 0 returns a synthesized
diurnal curve so the live endpoint is demoable without network access;
Phase 1 swaps in a real httpx call against oasis.caiso.com.
"""

from __future__ import annotations

import math
from datetime import datetime


def synth_lmp_24h(now: datetime | None = None) -> list[float]:
    """Synthesize a plausible 24hr LMP curve in $/kWh.

    Shape: low overnight, dip mid-day (solar glut), high late afternoon.
    Returns hourly values starting at `now`.
    """
    now = now or datetime.now()
    start_hour = now.hour
    out = []
    for i in range(24):
        hour = (start_hour + i) % 24
        # Baseline diurnal wave
        base = 0.08 + 0.05 * math.sin((hour - 6) / 24.0 * 2 * math.pi)
        # Mid-day solar glut: export rates plunge 10am-2pm
        if 10 <= hour <= 14:
            base = max(0.02, base - 0.05)
        # Peak window: 4-9pm spike
        if 16 <= hour <= 21:
            spike = 0.50 * math.exp(-((hour - 18.5) ** 2) / 3.0)
            base += spike
        out.append(round(base, 4))
    return out
