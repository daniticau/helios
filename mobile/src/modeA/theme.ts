// Design tokens for Mode A — dark theme. Ported from web/app/globals.css
// so the mobile and web apps share one palette + typography. Any token
// added here should mirror its web counterpart (see web `@theme` block).

import { StyleSheet } from 'react-native';

export const colors = {
  bg: '#1a1a1a',
  bgDeep: '#0f0f10',
  bgElevated: '#23221e',
  card: '#1f1e1a',
  cardElevated: '#25241f',
  hairline: '#2a2824',
  border: '#2f2d27',
  borderSubtle: '#262420',

  text: '#f5f3ea',
  textMuted: '#a39f94',
  textDim: '#635f56',
  textDimmer: '#3d3a35',

  accent: '#f5d76e', // helios sun (gold)
  accentWarm: '#ffa940',
  accentDim: '#c4a94c',
  accentCool: '#8db4dc',

  success: '#87d67d',
  warning: '#e0a93a',
  error: '#e84a45',
  info: '#6f9fd3',
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

// Height of the custom animated tab bar. Screens should pad by
// `tabBarHeight + safeArea.bottom` at the bottom to avoid content overlap.
export const tabBarHeight = 84;

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

// Font families. Values match the Google Fonts package exports loaded in
// App.tsx via useFonts. `mono` stays as a named export for backwards
// compatibility with existing call sites.
export const fonts = {
  display: 'Fraunces_700Bold',
  displaySoft: 'Fraunces_600SemiBold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
  body: 'InterTight_400Regular',
  bodyMedium: 'InterTight_500Medium',
  bodySemibold: 'InterTight_600SemiBold',
} as const;

export const mono = fonts.mono;

// Shared label primitives. Replace ad-hoc eyebrows with these.
export const textStyles = StyleSheet.create({
  eyebrow: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: fonts.mono,
    fontWeight: '500',
  },
  eyebrowAccent: {
    color: colors.accent,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: fonts.mono,
    fontWeight: '500',
  },
  eyebrowDim: {
    color: colors.textDim,
    fontSize: 11.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: fonts.mono,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 13,
    letterSpacing: 0.4,
    fontWeight: '500',
    fontFamily: fonts.bodyMedium,
  },
});
