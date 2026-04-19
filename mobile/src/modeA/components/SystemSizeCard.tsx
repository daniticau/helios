// "Recommended: 8.5 kW solar + 13 kWh battery" plus a tiny system sketch.

import { StyleSheet, Text, View } from 'react-native';

import type { ProposedSystem } from '@/shared/types';
import { colors, fontSizes, mono, radius, spacing } from '../theme';

interface SystemSizeCardProps {
  system: ProposedSystem;
}

export function SystemSizeCard({ system }: SystemSizeCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>recommended system</Text>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={styles.value}>{system.solar_kw.toFixed(1)}</Text>
          <Text style={styles.unit}>kW solar</Text>
        </View>
        <View style={styles.plus}>
          <Text style={styles.plusText}>+</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.value}>{system.battery_kwh.toFixed(0)}</Text>
          <Text style={styles.unit}>kWh battery</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: mono,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    color: colors.accent,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    fontFamily: mono,
    letterSpacing: 0.8,
  },
  plus: {
    paddingHorizontal: spacing.sm,
  },
  plusText: {
    color: colors.border,
    fontSize: fontSizes.lg,
    fontWeight: '400',
  },
});
