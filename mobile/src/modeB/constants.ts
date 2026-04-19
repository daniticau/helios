// Mode B constants — first-run profile for the existing-owner dashboard
// and color tokens for action states. Palette mirrors modeA/theme.ts so
// both modes and the web app share a single visual language.

import { StyleSheet } from 'react-native';

import { fonts } from '../modeA/theme';
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

// Dark theme tokens. Match modeA/theme.ts colors exactly so cross-mode
// components render identically. Action-state shortcuts (green/yellow/
// blue/red/gray) are semantic aliases for the core palette.
export const COLORS = {
  bg: '#1a1a1a',
  card: '#1f1e1a',
  cardAlt: '#25241f',
  border: '#2f2d27',
  text: '#f5f3ea',
  textMuted: '#a39f94',
  textDim: '#635f56',
  accent: '#f5d76e',
  // action state colors (aliases over the core palette)
  green: '#87d67d',
  yellow: '#e0a93a',
  gray: '#6b7280',
  blue: '#8db4dc',
  red: '#e84a45',
  peak: 'rgba(245, 215, 110, 0.18)',
} as const;

// Map LiveAction → display metadata for UI.
export interface ActionMeta {
  label: string;
  color: string;
  verb: string; // short imperative for widget
}

export const ACTION_META: Record<LiveAction, ActionMeta> = {
  DISCHARGE_BATTERY_TO_GRID: {
    label: 'Sell battery to grid',
    color: COLORS.green,
    verb: 'Sell Now',
  },
  DISCHARGE_BATTERY_TO_HOUSE: {
    label: 'Power house from battery',
    color: COLORS.green,
    verb: 'Power Home',
  },
  CHARGE_BATTERY_FROM_GRID: {
    label: 'Charge battery from grid',
    color: COLORS.yellow,
    verb: 'Charging',
  },
  CHARGE_BATTERY_FROM_SOLAR: {
    label: 'Store solar in battery',
    color: COLORS.blue,
    verb: 'Storing Solar',
  },
  EXPORT_SOLAR: {
    label: 'Export solar to grid',
    color: COLORS.blue,
    verb: 'Exporting',
  },
  HOLD: {
    label: 'Hold, wait for better rates',
    color: COLORS.gray,
    verb: 'Holding',
  },
};

export const POLL_INTERVAL_MS = 60_000;

// Shared label primitives, mirrors mobile/src/modeA/theme.ts.
export const textStyles = StyleSheet.create({
  eyebrow: {
    color: COLORS.textMuted,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: fonts.mono,
    fontWeight: '500',
  },
  eyebrowAccent: {
    color: COLORS.accent,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: fonts.mono,
    fontWeight: '500',
  },
  eyebrowDim: {
    color: COLORS.textDim,
    fontSize: 11.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: fonts.mono,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    letterSpacing: 0.4,
    fontWeight: '500',
  },
});
