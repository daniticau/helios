// Line-item cost breakdown: upfront, ITC, net upfront, annual savings,
// CO2 + SCC $ value, ROI as % of home value.

import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, mono, radius, spacing } from '../theme';

interface BreakdownRowProps {
  label: string;
  value: string;
  accent?: boolean;
  sub?: string;
  strike?: boolean;
}

function BreakdownRow({ label, value, accent, sub, strike }: BreakdownRowProps) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        {sub && <Text style={styles.sub}>{sub}</Text>}
      </View>
      <Text
        style={[
          styles.value,
          accent && styles.valueAccent,
          strike && styles.valueStrike,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

interface BreakdownCardProps {
  upfrontCostUsd: number;
  federalItcUsd: number;
  netUpfrontUsd: number;
  annualSavingsYr1Usd: number;
  co2AvoidedTons25yr: number;
  socialCostOfCarbonUsd?: number;
  roiPctOfHomeValue?: number;
  installerQuotesRange: [number, number];
  financingAprRange: [number, number];
}

function formatUsd0(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export function BreakdownCard({
  upfrontCostUsd,
  federalItcUsd,
  netUpfrontUsd,
  annualSavingsYr1Usd,
  co2AvoidedTons25yr,
  socialCostOfCarbonUsd,
  roiPctOfHomeValue,
  installerQuotesRange,
  financingAprRange,
}: BreakdownCardProps) {
  const carbonDollarValue =
    socialCostOfCarbonUsd != null
      ? co2AvoidedTons25yr * socialCostOfCarbonUsd
      : null;

  const [financeMin, financeMax] = financingAprRange;
  const [quoteMin, quoteMax] = installerQuotesRange;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>the numbers</Text>
      <View style={styles.group}>
        <BreakdownRow
          label="Installer quote (est.)"
          sub={`range ${formatUsd0(quoteMin)} – ${formatUsd0(quoteMax)}`}
          value={formatUsd0(upfrontCostUsd)}
          strike
        />
        <BreakdownRow
          label="Federal ITC (30%)"
          value={`-${formatUsd0(federalItcUsd)}`}
        />
        <View style={styles.divider} />
        <BreakdownRow
          label="Net upfront"
          value={formatUsd0(netUpfrontUsd)}
          accent
        />
      </View>

      <View style={styles.group}>
        <BreakdownRow
          label="Year 1 savings"
          value={`+${formatUsd0(annualSavingsYr1Usd)}`}
        />
        <BreakdownRow
          label="Financing APR"
          value={`${(financeMin * 100).toFixed(1)} – ${(financeMax * 100).toFixed(1)}%`}
          sub="solar loan market range"
        />
        {roiPctOfHomeValue != null && (
          <BreakdownRow
            label="NPV as % of home value"
            value={`${roiPctOfHomeValue.toFixed(1)}%`}
          />
        )}
      </View>

      <View style={styles.group}>
        <BreakdownRow
          label="CO₂ avoided over 25 yrs"
          value={`${co2AvoidedTons25yr.toFixed(1)} tons`}
        />
        {carbonDollarValue != null && (
          <BreakdownRow
            label="At social cost of carbon"
            sub={`${formatUsd0(socialCostOfCarbonUsd!)}/ton`}
            value={`+${formatUsd0(carbonDollarValue)}`}
          />
        )}
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
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: mono,
    marginBottom: spacing.sm,
  },
  group: {
    gap: 2,
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    color: colors.text,
    fontSize: fontSizes.base,
  },
  sub: {
    color: colors.textDim,
    fontSize: fontSizes.xs,
    fontFamily: mono,
    marginTop: 1,
  },
  value: {
    color: colors.text,
    fontSize: fontSizes.base,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  valueAccent: {
    color: colors.accent,
    fontSize: fontSizes.md,
  },
  valueStrike: {
    color: colors.textDim,
    textDecorationLine: 'line-through',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
});
