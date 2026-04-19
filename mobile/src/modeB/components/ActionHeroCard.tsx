// Giant current-action card — the hero number on the live dashboard.
// Color-coded by action state per HELIOS.md §9.WS4.

import { StyleSheet, Text, View } from 'react-native';

import type { LiveRecommendation } from '@/shared/types';

import { ACTION_META, COLORS } from '../constants';

interface Props {
  rec: LiveRecommendation;
}

export function ActionHeroCard({ rec }: Props) {
  const meta = ACTION_META[rec.action];
  const sign = rec.expected_hourly_gain_usd >= 0 ? '+' : '';
  const gainStr = `${sign}$${rec.expected_hourly_gain_usd.toFixed(2)}/hr`;

  return (
    <View style={[styles.card, { borderColor: meta.color }]}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: meta.color }]} />
        <Text style={styles.label}>Right now</Text>
      </View>

      <Text style={[styles.action, { color: meta.color }]}>
        {meta.label}
      </Text>

      <View style={styles.gainRow}>
        <Text style={[styles.gain, { color: meta.color }]}>{gainStr}</Text>
        <Text style={styles.gainSub}>expected</Text>
      </View>

      <Text style={styles.reasoning}>{rec.reasoning}</Text>

      <View style={styles.ratesRow}>
        <View style={styles.rateCell}>
          <Text style={styles.rateLabel}>Retail now</Text>
          <Text style={styles.rateValue}>${rec.retail_rate_now.toFixed(2)}/kWh</Text>
        </View>
        <View style={styles.rateCell}>
          <Text style={styles.rateLabel}>Export now</Text>
          <Text style={styles.rateValue}>${rec.export_rate_now.toFixed(2)}/kWh</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    gap: 12,
    borderWidth: 1.5,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { color: COLORS.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 },
  action: { fontSize: 26, fontWeight: '700', lineHeight: 32 },
  gainRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  gain: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  gainSub: { color: COLORS.textMuted, fontSize: 14, marginBottom: 10 },
  reasoning: { color: COLORS.text, fontSize: 15, lineHeight: 22, marginTop: 4 },
  ratesRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  rateCell: { flex: 1 },
  rateLabel: { color: COLORS.textDim, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  rateValue: { color: COLORS.text, fontSize: 18, fontWeight: '600', marginTop: 4 },
});
