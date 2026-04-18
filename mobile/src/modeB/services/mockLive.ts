// Dev-only mock for POST /api/live. Used when the backend isn't running
// so the UI can demo independently. Shape MUST match LiveRecommendation.
//
// The mock is time-of-day aware: it swings between actions as the clock
// moves so the dashboard feels alive during rehearsal.

import type {
  ForecastPoint,
  LiveAction,
  LiveRecommendation,
  LiveStateRequest,
  OrthogonalCallLog,
} from '@/shared/types';

// SDGE EV-TOU-5 simplified: peak 4-9pm, super-off-peak midnight-6am.
// Export rates under NEM 3.0 spike on hot summer evenings.
function retailRateForHour(h: number): number {
  if (h >= 16 && h < 21) return 0.58; // 4-9pm peak
  if (h >= 0 && h < 6) return 0.14; // super off-peak
  return 0.32; // shoulder
}

function exportRateForHour(h: number): number {
  // NEM 3.0 ACC: low midday, high evening peak.
  if (h >= 17 && h < 20) return 1.2 + Math.sin((h - 17) * Math.PI) * 0.35;
  if (h >= 16 && h < 21) return 0.75;
  if (h >= 10 && h < 15) return 0.05; // midday glut
  if (h >= 0 && h < 6) return 0.09;
  return 0.22;
}

function solarForHour(h: number, systemKw: number): number {
  // Bell curve centered at 12:30pm.
  if (h < 6 || h > 20) return 0;
  const center = 12.5;
  const sigma = 3.5;
  const gauss = Math.exp(-Math.pow(h - center, 2) / (2 * sigma * sigma));
  return Math.max(0, systemKw * gauss * 0.85);
}

function pickAction(h: number, soc: number): { action: LiveAction; gain: number; reason: string } {
  const retail = retailRateForHour(h);
  const exp = exportRateForHour(h);
  const solar = solarForHour(h, 8);

  // Peak export window (5-8pm): if battery has juice, sell.
  if (h >= 17 && h < 20 && soc > 25) {
    return {
      action: 'DISCHARGE_BATTERY_TO_GRID',
      gain: 1.42,
      reason: `Peak export rate $${exp.toFixed(2)}/kWh. Battery at ${soc.toFixed(0)}% — selling is worth ${(exp / retail).toFixed(1)}x more than holding.`,
    };
  }

  // Midday sun with battery not full: store it.
  if (solar > 2 && soc < 90) {
    return {
      action: 'CHARGE_BATTERY_FROM_SOLAR',
      gain: 0.0,
      reason: `Midday export rates are only $${exp.toFixed(2)}/kWh. Storing ${solar.toFixed(1)}kW of solar for the 5pm peak (forecast $1.20/kWh).`,
    };
  }

  // Midday with battery full: export.
  if (solar > 2 && soc >= 90) {
    return {
      action: 'EXPORT_SOLAR',
      gain: solar * exp,
      reason: `Battery full. Exporting ${solar.toFixed(1)}kW at $${exp.toFixed(2)}/kWh.`,
    };
  }

  // Super-off-peak overnight with low SoC: charge from grid.
  if (h < 6 && soc < 40) {
    return {
      action: 'CHARGE_BATTERY_FROM_GRID',
      gain: -0.42,
      reason: `Super-off-peak rate $${retail.toFixed(2)}/kWh. Charging now to arbitrage against tomorrow's $1.20/kWh peak.`,
    };
  }

  // Morning/evening moderate load: discharge battery to house.
  if ((h >= 6 && h < 16) || h >= 20) {
    if (soc > 15) {
      return {
        action: 'DISCHARGE_BATTERY_TO_HOUSE',
        gain: 0.64,
        reason: `Retail rate $${retail.toFixed(2)}/kWh. Covering house load from battery beats importing.`,
      };
    }
  }

  return {
    action: 'HOLD',
    gain: 0.0,
    reason: 'Rates neutral. Conserving battery for the next peak window.',
  };
}

export function mockLiveRecommendation(req: LiveStateRequest): LiveRecommendation {
  const now = new Date(req.current_state.timestamp);
  const h = now.getHours();
  const soc = req.current_state.battery_soc_pct;
  const systemKw = req.profile.solar_kw ?? 8;

  const { action, gain, reason } = pickAction(h, soc);

  // 24h forecast starting from current hour.
  const forecast_24h: ForecastPoint[] = [];
  for (let i = 0; i < 24; i++) {
    const fh = (h + i) % 24;
    forecast_24h.push({
      hour_offset: i,
      retail_rate: retailRateForHour(fh),
      export_rate: exportRateForHour(fh),
      solar_kw_forecast: solarForHour(fh, systemKw),
    });
  }

  // Next peak window: find the first future hour with export_rate > $0.80.
  let next_peak_window: LiveRecommendation['next_peak_window'];
  for (const p of forecast_24h) {
    if (p.export_rate > 0.8 && p.hour_offset > 0) {
      const start = new Date(now);
      start.setHours(start.getHours() + p.hour_offset, 0, 0, 0);
      next_peak_window = {
        start_iso: start.toISOString(),
        expected_rate: p.export_rate,
      };
      break;
    }
  }

  // Fake orthogonal_calls_made — these come from the backend but we seed
  // something for the UI if we're in mock-only mode.
  const orthogonal_calls_made: OrthogonalCallLog[] = [
    { api: 'CAISO OASIS', purpose: 'wholesale LMP', latency_ms: 182, status: 'success' },
    { api: 'OpenWeather (via Orthogonal)', purpose: '24h irradiance forecast', latency_ms: 304, status: 'cached' },
    { api: 'SDGE tariff', purpose: 'EV-TOU-5 hourly schedule', latency_ms: 88, status: 'cached' },
  ];

  return {
    action,
    reasoning: reason,
    expected_hourly_gain_usd: gain,
    retail_rate_now: retailRateForHour(h),
    export_rate_now: exportRateForHour(h),
    next_peak_window,
    forecast_24h,
    orthogonal_calls_made,
  };
}

// Synthesize a believable current household state. We don't have real battery
// telemetry for the demo — this drives the UI deterministically from the wall
// clock so rehearsals are reproducible.
export function buildMockHouseholdState(now: Date = new Date()): {
  battery_soc_pct: number;
  solar_kw_now: number;
  load_kw_now: number;
  timestamp: string;
} {
  const h = now.getHours() + now.getMinutes() / 60;

  // SoC cycles slowly: low overnight, climbs through sunny day, drains in peak.
  // This is a smooth surrogate — replace with real telemetry when hooked up.
  const socCycle = (() => {
    if (h < 6) return 20 + (h / 6) * 5; // slowly rising from grid charge
    if (h < 10) return 25 + (h - 6) * 6; // early-morning solar starts
    if (h < 15) return 55 + (h - 10) * 8; // midday climb
    if (h < 17) return 95 - (h - 15) * 2; // slight hold
    if (h < 20) return 91 - (h - 17) * 18; // peak discharge
    return 37 - (h - 20) * 2;
  })();

  const solarSystemKw = 8;
  const solar_kw_now = solarForHour(h, solarSystemKw);

  // House load: morning + evening peaks, midday valley.
  const baseLoad = 0.9;
  const morning = h >= 6 && h <= 9 ? Math.sin((h - 6) * (Math.PI / 3)) * 1.3 : 0;
  const evening = h >= 17 && h <= 22 ? Math.sin((h - 17) * (Math.PI / 5)) * 2.1 : 0;
  const load_kw_now = Math.max(0.3, baseLoad + morning + evening);

  return {
    battery_soc_pct: Math.max(5, Math.min(100, socCycle)),
    solar_kw_now: Math.max(0, solar_kw_now),
    load_kw_now,
    timestamp: now.toISOString(),
  };
}
