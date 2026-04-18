// Mode B constants — demo profile for the "existing owner" narrative
// and color tokens for action states.
// Per HELIOS.md §11 demo script, Tijuana hills, 8kW + Powerwall (13.5 kWh).

import type { LiveAction, UserProfile } from '@/shared/types';

export const DEMO_PROFILE_EXISTING_OWNER: UserProfile = {
  address: 'Tijuana Hills, 91910, CA, US',
  lat: 32.64,
  lng: -117.03,
  utility: 'SDGE',
  tariff_plan: 'EV-TOU-5',
  monthly_bill_usd: 180,
  monthly_kwh: 720,
  has_solar: true,
  solar_kw: 8,
  has_battery: true,
  battery_kwh: 13.5,
  battery_max_kw: 5,
};

// Dark theme tokens. Match App.tsx: bg #1a1a1a, card #242424, accent #f5d76e.
export const COLORS = {
  bg: '#1a1a1a',
  card: '#242424',
  cardAlt: '#2a2a2a',
  border: '#333',
  text: '#ffffff',
  textMuted: '#aaa',
  textDim: '#666',
  accent: '#f5d76e',
  // action state colors per workstream spec
  green: '#4ade80', // discharge-to-grid / money in
  yellow: '#fbbf24', // charge-from-grid
  gray: '#6b7280', // hold
  blue: '#60a5fa', // solar ops (export-solar, charge-from-solar)
  red: '#f87171', // errors / warnings
  peak: 'rgba(245, 215, 110, 0.18)', // peak window shade
} as const;

// Map LiveAction → (label, color, glyph) for UI.
export interface ActionMeta {
  label: string;
  color: string;
  glyph: string; // simple ascii/emoji-ish glyph for header visuals
  verb: string; // short imperative for widget
}

export const ACTION_META: Record<LiveAction, ActionMeta> = {
  DISCHARGE_BATTERY_TO_GRID: {
    label: 'Sell battery to grid',
    color: COLORS.green,
    glyph: '↗',
    verb: 'Sell Now',
  },
  DISCHARGE_BATTERY_TO_HOUSE: {
    label: 'Power house from battery',
    color: COLORS.green,
    glyph: '→',
    verb: 'Power Home',
  },
  CHARGE_BATTERY_FROM_GRID: {
    label: 'Charge battery from grid',
    color: COLORS.yellow,
    glyph: '↘',
    verb: 'Charging',
  },
  CHARGE_BATTERY_FROM_SOLAR: {
    label: 'Store solar in battery',
    color: COLORS.blue,
    glyph: '☀',
    verb: 'Storing Solar',
  },
  EXPORT_SOLAR: {
    label: 'Export solar to grid',
    color: COLORS.blue,
    glyph: '↗',
    verb: 'Exporting',
  },
  HOLD: {
    label: 'Hold — wait for better rates',
    color: COLORS.gray,
    glyph: '•',
    verb: 'Holding',
  },
};

export const POLL_INTERVAL_MS = 60_000;
