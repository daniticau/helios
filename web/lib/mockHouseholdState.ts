// Deterministic household state driven by the wall clock. Ported from
// mobile/src/modeB/services/mockLive.ts so the web dashboard demos
// reproducibly without real battery telemetry.

import type { HouseholdState } from '@/lib/types';

function solarForHour(h: number, systemKw: number): number {
  if (h < 6 || h > 20) return 0;
  const center = 12.5;
  const sigma = 3.5;
  const gauss = Math.exp(-Math.pow(h - center, 2) / (2 * sigma * sigma));
  return Math.max(0, systemKw * gauss * 0.85);
}

export function buildMockHouseholdState(now: Date = new Date()): HouseholdState {
  const h = now.getHours() + now.getMinutes() / 60;

  // SoC cycles: low overnight, climbs through the sunny day, drains at peak.
  const socCycle = (() => {
    if (h < 6) return 20 + (h / 6) * 5;
    if (h < 10) return 25 + (h - 6) * 6;
    if (h < 15) return 55 + (h - 10) * 8;
    if (h < 17) return 95 - (h - 15) * 2;
    if (h < 20) return 91 - (h - 17) * 18;
    return 37 - (h - 20) * 2;
  })();

  const solarSystemKw = 8;
  const solar_kw_now = solarForHour(h, solarSystemKw);

  const baseLoad = 0.9;
  const morning = h >= 6 && h <= 9 ? Math.sin((h - 6) * (Math.PI / 3)) * 1.3 : 0;
  const evening =
    h >= 17 && h <= 22 ? Math.sin((h - 17) * (Math.PI / 5)) * 2.1 : 0;
  const load_kw_now = Math.max(0.3, baseLoad + morning + evening);

  return {
    battery_soc_pct: Math.max(5, Math.min(100, socCycle)),
    solar_kw_now: Math.max(0, solar_kw_now),
    load_kw_now,
    timestamp: now.toISOString(),
  };
}
