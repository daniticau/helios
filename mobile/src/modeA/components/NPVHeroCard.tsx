// Hero screenshot-worthy card. Single screen focal point on ROIResult.
// Payback years + 25-year NPV in oversized type. Everything else is below.

import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, fonts, fontSizes, mono, radius, spacing } from '../theme';

interface NPVHeroCardProps {
  paybackYears: number;
  npv25yrUsd: number;
  annualSavingsYr1: number;
}

function formatUsd(n: number): string {
  const sign = n < 0 ? '-' : '+';
  const abs = Math.abs(Math.round(n));
  return `${sign}$${abs.toLocaleString('en-US')}`;
}

export function NPVHeroCard({
  paybackYears,
  npv25yrUsd,
  annualSavingsYr1,
}: NPVHeroCardProps) {
  return (
    <Animated.View entering={FadeInDown.duration(520).springify()}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>break even in</Text>
        <View style={styles.paybackRow}>
          <Text style={styles.paybackNumber}>{paybackYears.toFixed(1)}</Text>
          <Text style={styles.paybackUnit}>yrs</Text>
        </View>
        <View style={styles.divider} />
        <Text style={styles.npvLabel}>25-year net present value</Text>
        <Text style={styles.npvValue}>{formatUsd(npv25yrUsd)}</Text>
        <Text style={styles.annualSavings}>
          about {formatUsd(annualSavingsYr1)}/yr in year-one savings
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: mono,
  },
  paybackRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  paybackNumber: {
    color: colors.accent,
    fontFamily: fonts.display,
    fontSize: 96,
    lineHeight: 98,
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
  },
  paybackUnit: {
    color: colors.accent,
    fontFamily: fonts.displaySoft,
    fontSize: fontSizes.xl,
    marginLeft: spacing.sm,
    marginBottom: 18,
    letterSpacing: -0.5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  npvLabel: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: mono,
  },
  npvValue: {
    color: colors.text,
    fontFamily: fonts.displaySoft,
    fontSize: fontSizes.hero - 6,
    letterSpacing: -1.5,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  annualSavings: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    marginTop: spacing.xs,
    fontFamily: mono,
  },
});
