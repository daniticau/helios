// "What it costs" — the money side. Installer quote (strikethrough),
// federal ITC, net upfront (accent), financing APR range.

import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, mono, radius, spacing } from '../theme';

interface Row {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  strike?: boolean;
}

function CostRow({ label, value, sub, accent, strike }: Row) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
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

interface Props {
  upfrontCostUsd: number;
  federalItcUsd: number;
  netUpfrontUsd: number;
  installerQuotesRange: [number, number];
  financingAprRange: [number, number];
}

function usd(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export function CostsCard({
  upfrontCostUsd,
  federalItcUsd,
  netUpfrontUsd,
  installerQuotesRange,
  financingAprRange,
}: Props) {
  const [quoteMin, quoteMax] = installerQuotesRange;
  const [financeMin, financeMax] = financingAprRange;
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>what it costs</Text>
      <CostRow
        label="Installer quote (est.)"
        sub={`range ${usd(quoteMin)} – ${usd(quoteMax)}`}
        value={usd(upfrontCostUsd)}
        strike
      />
      <CostRow label="Federal ITC (30%)" value={`-${usd(federalItcUsd)}`} />
      <View style={styles.divider} />
      <CostRow label="Net upfront" value={usd(netUpfrontUsd)} accent />
      <CostRow
        label="Financing APR"
        value={`${(financeMin * 100).toFixed(1)} – ${(financeMax * 100).toFixed(1)}%`}
      />
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
