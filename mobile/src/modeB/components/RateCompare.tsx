// Retail vs. export rate comparison. The same arbitrage signal the widget
// shows — surfaced prominently on the live dashboard so Mode B users get
// the "is now a good time?" answer without doing mental math.

import { StyleSheet, Text, View } from 'react-native';

import type { LiveAction } from '@/shared/types';

import { fonts, radius } from '../../modeA/theme';
import { COLORS } from '../constants';

interface Props {
  retailRate: number;
  exportRate: number;
  action: LiveAction;
}

const EXPORT_ACTIONS = new Set<LiveAction>([
  'EXPORT_SOLAR',
  'DISCHARGE_BATTERY_TO_GRID',
]);

function fmt(v: number): string {
  return `$${v.toFixed(2)}`;
}

export function RateCompare({ retailRate, exportRate, action }: Props) {
  const exportLeads = EXPORT_ACTIONS.has(action);
  const hero = exportLeads ? exportRate : retailRate;
  const compare = exportLeads ? retailRate : exportRate;
  const heroLabel = exportLeads ? 'export now' : 'retail now';
  const compareLabel = exportLeads ? 'vs. retail' : 'vs. export';

  const spread = hero - compare;
  const spreadPct = hero > 0 ? (spread / hero) * 100 : 0;
  const spreadColor = spread >= 0 ? COLORS.accent : COLORS.textMuted;

  const barPct = Math.max(
    0,
    Math.min(100, hero > 0 ? (compare / hero) * 100 : 0)
  );
  const spreadPrefix = spread >= 0 ? '+' : '−';

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>rate compare</Text>

      <View style={styles.mainRow}>
        <View style={styles.heroCol}>
          <Text style={styles.heroLabel}>{heroLabel}</Text>
          <View style={styles.heroValueRow}>
            <Text style={styles.heroValue}>{fmt(hero)}</Text>
            <Text style={styles.heroUnit}>/kWh</Text>
          </View>
        </View>

        <View style={styles.compareCol}>
          <Text style={styles.compareLabel}>{compareLabel}</Text>
          <Text style={styles.compareValue}>{fmt(compare)}</Text>
          <Text style={[styles.spread, { color: spreadColor }]}>
            {spreadPrefix}
            {fmt(Math.abs(spread))} · {spreadPrefix}
            {Math.abs(spreadPct).toFixed(0)}%
          </Text>
        </View>
      </View>

      <View style={styles.bars}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: '100%', backgroundColor: COLORS.accent }]} />
        </View>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${barPct}%`, backgroundColor: COLORS.textMuted },
            ]}
          />
        </View>
        <View style={styles.barLabels}>
          <Text style={styles.barLabel}>{heroLabel}</Text>
          <Text style={styles.barLabel}>{compareLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: radius.card,
    padding: 20,
    gap: 16,
  },
  eyebrow: {
    color: COLORS.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: fonts.mono,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
  },
  heroCol: {
    flex: 1,
    gap: 4,
  },
  heroLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: fonts.mono,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  heroValue: {
    color: COLORS.text,
    fontFamily: fonts.display,
    fontSize: 48,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  heroUnit: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: fonts.mono,
  },
  compareCol: {
    alignItems: 'flex-end',
    gap: 2,
    paddingBottom: 4,
  },
  compareLabel: {
    color: COLORS.textDim,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: fonts.mono,
  },
  compareValue: {
    color: COLORS.textMuted,
    fontSize: 20,
    fontFamily: fonts.mono,
    fontVariant: ['tabular-nums'],
  },
  spread: {
    fontSize: 12,
    fontFamily: fonts.mono,
    fontVariant: ['tabular-nums'],
  },
  bars: {
    gap: 6,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.cardAlt,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  barLabel: {
    color: COLORS.textDim,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: fonts.mono,
  },
});
