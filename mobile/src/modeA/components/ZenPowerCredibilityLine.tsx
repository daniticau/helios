// The eligibility-dataset call-out. Required on the results screen per
// HELIOS.md §12 ("things we never cut") and §7.1. Positioned as a small
// credibility line so judges immediately see the ZenPower dataset was used.

import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, mono, radius, spacing } from '../theme';

interface ZenPowerCredibilityLineProps {
  permitsInZip?: number;
  avgSystemKw?: number;
}

export function ZenPowerCredibilityLine({
  permitsInZip,
  avgSystemKw,
}: ZenPowerCredibilityLineProps) {
  if (!permitsInZip || !avgSystemKw) return null;
  return (
    <View style={styles.wrap}>
      <View style={styles.accentBar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>zenpower permits · your zip</Text>
        <Text style={styles.text}>
          <Text style={styles.bright}>{permitsInZip}</Text> recent installs
          averaging <Text style={styles.bright}>{avgSystemKw.toFixed(1)} kW</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 2,
    paddingRight: spacing.md,
    paddingLeft: 0,
    alignItems: 'center',
    gap: spacing.sm,
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: colors.accent,
    marginLeft: 0,
  },
  label: {
    color: colors.textDim,
    fontSize: 11.5,
    letterSpacing: 1,
    fontFamily: mono,
    textTransform: 'uppercase',
  },
  text: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    marginTop: 2,
  },
  bright: {
    color: colors.text,
    fontWeight: '600',
  },
});
