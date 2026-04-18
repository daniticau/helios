// Design tokens for Mode A — dark theme. See user global prefs:
// bg is dark gray (#1a1a1a), not pure black. Monospace for agent output.

import { Platform } from 'react-native';

export const colors = {
  bg: '#1a1a1a',
  bgElevated: '#222222',
  card: '#242424',
  cardElevated: '#2a2a2a',
  border: '#333333',
  borderSubtle: '#2a2a2a',

  text: '#f5f5f5',
  textMuted: '#9a9a9a',
  textDim: '#6a6a6a',

  accent: '#f5d76e', // helios sun
  accentDim: '#c4a94c',

  success: '#4ade80', // green
  warning: '#fbbf24', // amber
  error: '#f87171', // soft red
  info: '#60a5fa', // soft blue
  caret: '#f5d76e',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const fontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 28,
  xxl: 40,
  hero: 56,
} as const;

// Monospace stack tuned for each platform. Looks like a terminal.
export const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'Menlo',
});
