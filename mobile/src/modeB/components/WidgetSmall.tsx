// Small iOS widget mockup (~158x158). Rendered as RN components so it
// looks like a home screen widget for the demo. Per HELIOS.md §12, this
// is the fallback for `expo-apple-widgets` which is still experimental.

import { StyleSheet, Text, View } from 'react-native';

import type { LiveRecommendation } from '@/shared/types';

import { ACTION_META, COLORS } from '../constants';

interface Props {
  rec: LiveRecommendation;
}

export function WidgetSmall({ rec }: Props) {
  const meta = ACTION_META[rec.action];
  const sign = rec.expected_hourly_gain_usd >= 0 ? '+' : '';
  const dollars = `${sign}$${Math.abs(rec.expected_hourly_gain_usd).toFixed(2)}`;

  return (
    <View style={styles.widget}>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: meta.color }]} />
        <Text style={styles.app}>Helios</Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.verb, { color: meta.color }]}>{meta.verb}</Text>
        <Text style={styles.amount}>{dollars}</Text>
        <Text style={styles.per}>/hr</Text>
      </View>

      <Text style={styles.footer} numberOfLines={1}>
        Retail ${rec.retail_rate_now.toFixed(2)} · Exp ${rec.export_rate_now.toFixed(2)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  widget: {
    width: 158,
    height: 158,
    borderRadius: 22,
    backgroundColor: '#0f0f0f',
    padding: 14,
    justifyContent: 'space-between',
    // subtle stroke mimics iOS widget depth
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  app: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  body: { gap: 2 },
  verb: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  amount: { color: COLORS.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  per: { color: COLORS.textMuted, fontSize: 12, marginTop: -4 },
  footer: { color: COLORS.textDim, fontSize: 10 },
});
