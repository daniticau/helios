// "What it returns" — the payoff side. Y1 savings, NPV as % of home value,
// CO2 avoided in tons, dollar value at the social cost of carbon.

import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, mono, radius, spacing } from '../theme';

interface Row {
  label: string;
  value: string;
  sub?: string;
}

function ImpactRow({ label, value, sub }: Row) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

interface Props {
  annualSavingsYr1Usd: number;
  co2AvoidedTons25yr: number;
  socialCostOfCarbonUsd?: number;
  roiPctOfHomeValue?: number;
}

function usd(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export function ImpactCard({
  annualSavingsYr1Usd,
  co2AvoidedTons25yr,
  socialCostOfCarbonUsd,
  roiPctOfHomeValue,
}: Props) {
  const carbonDollarValue =
    socialCostOfCarbonUsd != null
      ? co2AvoidedTons25yr * socialCostOfCarbonUsd
      : null;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>what it returns</Text>
      <ImpactRow
        label="Year 1 savings"
        value={`+${usd(annualSavingsYr1Usd)}`}
      />
      {roiPctOfHomeValue != null ? (
        <ImpactRow
          label="NPV as % of home value"
          value={`${roiPctOfHomeValue.toFixed(1)}%`}
        />
      ) : null}
      <View style={styles.divider} />
      <ImpactRow
        label="CO₂ avoided over 25 yrs"
        value={`${co2AvoidedTons25yr.toFixed(1)} tons`}
      />
      {carbonDollarValue != null ? (
        <ImpactRow
          label="At social cost of carbon"
          sub={`${usd(socialCostOfCarbonUsd!)}/ton`}
          value={`+${usd(carbonDollarValue)}`}
        />
      ) : null}
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
    gap: 2,
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
    paddingVertical: 6,
  },
  label: {
    color: colors.text,
    fontSize: fontSizes.base,
  },
  sub: {
    color: colors.textDim,
    fontSize: 12,
    fontFamily: mono,
    marginTop: 2,
  },
  value: {
    color: colors.text,
    fontSize: fontSizes.base,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
});
