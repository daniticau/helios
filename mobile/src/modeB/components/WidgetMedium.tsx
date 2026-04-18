// Medium iOS widget mockup (~338x158). Has room for a mini sparkline
// of the export rate forecast beside the hero number.

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { LiveRecommendation } from '@/shared/types';

import { ACTION_META, COLORS } from '../constants';

interface Props {
  rec: LiveRecommendation;
}

export function WidgetMedium({ rec }: Props) {
  const meta = ACTION_META[rec.action];
  const sign = rec.expected_hourly_gain_usd >= 0 ? '+' : '';
  const dollars = `${sign}$${Math.abs(rec.expected_hourly_gain_usd).toFixed(2)}`;

  const sparkWidth = 140;
  const sparkHeight = 48;
  const pts = rec.forecast_24h.slice(0, 12);
  const max = Math.max(0.5, ...pts.map((p) => p.export_rate));
  const path = pts
    .map((p, i) => {
      const x = (i / Math.max(1, pts.length - 1)) * sparkWidth;
      const y = sparkHeight - (p.export_rate / max) * sparkHeight;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const nextPeakLabel = (() => {
    if (!rec.next_peak_window) return 'No peak ahead';
    const when = new Date(rec.next_peak_window.start_iso);
    const mins = Math.round((when.getTime() - Date.now()) / 60_000);
    if (mins < 60) return `Peak in ${mins}m`;
    return `Peak in ${Math.floor(mins / 60)}h ${mins % 60}m`;
  })();

  return (
    <View style={styles.widget}>
      <View style={styles.left}>
        <View style={styles.header}>
          <View style={[styles.dot, { backgroundColor: meta.color }]} />
          <Text style={styles.app}>Helios</Text>
        </View>
        <Text style={[styles.verb, { color: meta.color }]}>{meta.verb}</Text>
        <Text style={styles.amount}>{dollars}<Text style={styles.per}>/hr</Text></Text>
        <Text style={styles.footer}>{nextPeakLabel}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.sparkLabel}>Export rate · next 12h</Text>
        <Svg width={sparkWidth} height={sparkHeight}>
          <Path d={path} stroke={COLORS.accent} strokeWidth={2} fill="none" />
        </Svg>
        <View style={styles.sparkAxis}>
          <Text style={styles.sparkTick}>now</Text>
          <Text style={styles.sparkTick}>+12h</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  widget: {
    width: 338,
    height: 158,
    borderRadius: 22,
    backgroundColor: '#0f0f0f',
    padding: 14,
    flexDirection: 'row',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  left: { flex: 1, justifyContent: 'space-between' },
  right: { flex: 1.1, justifyContent: 'space-between' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  app: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  verb: { fontSize: 13, fontWeight: '700' },
  amount: { color: COLORS.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  per: { color: COLORS.textMuted, fontSize: 14, fontWeight: '500' },
  footer: { color: COLORS.textDim, fontSize: 11 },
  sparkLabel: { color: COLORS.textDim, fontSize: 10 },
  sparkAxis: { flexDirection: 'row', justifyContent: 'space-between' },
  sparkTick: { color: COLORS.textDim, fontSize: 9 },
});
