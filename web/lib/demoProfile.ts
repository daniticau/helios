// Existing-owner demo profile for the /live dashboard. Same Tijuana Hills
// household used in mobile Mode B so the pitch numbers stay consistent.

import type { LiveAction, UserProfile } from '@/lib/types';

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

// Action state → display metadata. Colors mirror mobile constants so the
// same action reads as the same color across platforms.
export interface ActionMeta {
  label: string;
  verb: string;
  color: string; // CSS color
}

export const ACTION_META: Record<LiveAction, ActionMeta> = {
  DISCHARGE_BATTERY_TO_GRID: {
    label: 'Sell battery to grid',
    verb: 'Selling',
    color: '#4ade80', // green
  },
  DISCHARGE_BATTERY_TO_HOUSE: {
    label: 'Power house from battery',
    verb: 'Powering home',
    color: '#4ade80',
  },
  CHARGE_BATTERY_FROM_GRID: {
    label: 'Charge battery from grid',
    verb: 'Charging',
    color: '#fbbf24', // yellow
  },
  CHARGE_BATTERY_FROM_SOLAR: {
    label: 'Store solar in battery',
    verb: 'Storing solar',
    color: '#60a5fa', // blue
  },
  EXPORT_SOLAR: {
    label: 'Export solar to grid',
    verb: 'Exporting',
    color: '#60a5fa',
  },
  HOLD: {
    label: 'Hold, wait for better rates',
    verb: 'Holding',
    color: '#6b7280', // gray
  },
};
