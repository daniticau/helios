// Vertical battery gauge with SoC% + a single active-flow pill.
// Flow is inferred from the LiveAction + current solar/load readings.

import { StyleSheet, Text, View } from 'react-native';

import type { HouseholdState, LiveAction } from '@/shared/types';

import { radius } from '../../modeA/theme';
import { ACTION_META, COLORS } from '../constants';

interface Props {
  state: HouseholdState;
  action: LiveAction;
  batteryKwh: number;
}

// Primary flow + color per action. "Idle" means no grid/battery flip.
function primaryFlow(
  action: LiveAction,
  solar: number,
  load: number,
): { label: string; color: string } {
  switch (action) {
    case 'CHARGE_BATTERY_FROM_SOLAR':
      return { label: 'Solar → Battery', color: COLORS.blue };
    case 'EXPORT_SOLAR':
      return { label: 'Solar → Grid', color: COLORS.blue };
    case 'DISCHARGE_BATTERY_TO_HOUSE':
      return { label: 'Battery → House', color: COLORS.green };
    case 'DISCHARGE_BATTERY_TO_GRID':
      return { label: 'Battery → Grid', color: COLORS.green };
    case 'CHARGE_BATTERY_FROM_GRID':
      return { label: 'Grid → Battery', color: COLORS.yellow };
    case 'HOLD':
      if (load > solar + 0.1) return { label: 'Grid → House', color: COLORS.yellow };
      if (solar > 0.1) return { label: 'Solar → House', color: COLORS.blue };
      return { label: 'Idle', color: COLORS.textMuted };
    default:
      return { label: 'Idle', color: COLORS.textMuted };
  }
}

export function BatteryGauge({ state, action, batteryKwh }: Props) {
  const soc = state.battery_soc_pct;
  const meta = ACTION_META[action];
  const flow = primaryFlow(action, state.solar_kw_now, state.load_kw_now);

  const kwhStored = (batteryKwh * soc) / 100;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Battery</Text>

      <View style={styles.gaugeRow}>
        <View style={styles.gaugeWrap}>
          {/* vertical bar */}
          <View style={styles.bar}>
            <View style={styles.barCap} />
            <View style={styles.barBody}>
              <View
                style={[
                  styles.fill,
                  { height: `${Math.max(0, Math.min(100, soc))}%`, backgroundColor: meta.color },
                ]}
              />
            </View>
          </View>
          <Text style={[styles.soc, { color: meta.color }]}>{soc.toFixed(0)}%</Text>
          <Text style={styles.kwh}>{kwhStored.toFixed(1)} / {batteryKwh} kWh</Text>
        </View>

        <View style={styles.flowCol}>
          <Text style={styles.flowLabel}>flow</Text>
          <Text style={[styles.flowValue, { color: flow.color }]}>{flow.label}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Solar" value={`${state.solar_kw_now.toFixed(1)} kW`} color={COLORS.blue} />
        <Stat label="Load" value={`${state.load_kw_now.toFixed(1)} kW`} color={COLORS.text} />
      </View>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
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
  title: { color: COLORS.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 },
  gaugeRow: { flexDirection: 'row', gap: 24, alignItems: 'center' },
  gaugeWrap: { alignItems: 'center', gap: 8, width: 90 },
  bar: { alignItems: 'center', width: 48 },
  barCap: {
    width: 20,
    height: 6,
    backgroundColor: COLORS.border,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  barBody: {
    width: 48,
    height: 140,
    backgroundColor: COLORS.cardAlt,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: { width: '100%' },
  soc: { fontSize: 24, fontWeight: '700' },
  kwh: { color: COLORS.textDim, fontSize: 12 },
  flowCol: { flex: 1, gap: 6, justifyContent: 'center' },
  flowLabel: {
    color: COLORS.textDim,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  flowValue: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  stat: { flex: 1 },
  statLabel: { color: COLORS.textDim, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  statValue: { fontSize: 20, fontWeight: '600', marginTop: 4 },
});
