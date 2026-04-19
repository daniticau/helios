// Giant current-action card — the hero number on the live dashboard.
// Color-coded by action state per HELIOS.md §9.WS4.

import { StyleSheet, Text, View } from 'react-native';

import type { LiveRecommendation } from '@/shared/types';

import { fonts, radius } from '../../modeA/theme';
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: radius.card,
    padding: 24,
    gap: 12,
    borderWidth: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: {
    color: COLORS.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: fonts.mono,
  },
  action: {
    fontFamily: fonts.displaySoft,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  gainRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  gain: {
    fontFamily: fonts.display,
    fontSize: 44,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  gainSub: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 10,
    fontFamily: fonts.mono,
  },
  reasoning: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
    fontFamily: fonts.body,
  },
});
