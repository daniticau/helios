// Vertical battery gauge with SoC% + current flow direction arrows.
// Flow is inferred from the LiveAction + current solar/load readings.

import { StyleSheet, Text, View } from 'react-native';

import type { HouseholdState, LiveAction } from '@/shared/types';

import { ACTION_META, COLORS } from '../constants';

interface Props {
  state: HouseholdState;
  action: LiveAction;
  batteryKwh: number;
}

// Semantic flow directions: which rows of arrows to light up.
interface FlowState {
  solarToBattery: boolean;
  solarToHouse: boolean;
  solarToGrid: boolean;
  batteryToHouse: boolean;
  batteryToGrid: boolean;
  gridToBattery: boolean;
  gridToHouse: boolean;
}

function flowsFor(action: LiveAction, solar: number, load: number): FlowState {
  const f: FlowState = {
    solarToBattery: false,
    solarToHouse: false,
    solarToGrid: false,
    batteryToHouse: false,
    batteryToGrid: false,
    gridToBattery: false,
    gridToHouse: false,
  };
  // Solar always serves house first if producing.
  if (solar > 0.1) f.solarToHouse = load > 0.1;

  switch (action) {
    case 'CHARGE_BATTERY_FROM_SOLAR':
      f.solarToBattery = true;
      break;
    case 'EXPORT_SOLAR':
      f.solarToGrid = true;
      break;
    case 'DISCHARGE_BATTERY_TO_HOUSE':
      f.batteryToHouse = true;
      if (solar < load) f.solarToHouse = solar > 0.1;
      break;
    case 'DISCHARGE_BATTERY_TO_GRID':
      f.batteryToGrid = true;
      break;
    case 'CHARGE_BATTERY_FROM_GRID':
      f.gridToBattery = true;
      if (load > 0.1) f.gridToHouse = true;
      break;
    case 'HOLD':
      if (load > solar) f.gridToHouse = load - solar > 0.1;
      break;
  }
  return f;
}

export function BatteryGauge({ state, action, batteryKwh }: Props) {
  const soc = state.battery_soc_pct;
  const meta = ACTION_META[action];
  const flows = flowsFor(action, state.solar_kw_now, state.load_kw_now);

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
          <FlowRow label="Solar → House" active={flows.solarToHouse} color={COLORS.blue} />
          <FlowRow label="Solar → Battery" active={flows.solarToBattery} color={COLORS.blue} />
          <FlowRow label="Solar → Grid" active={flows.solarToGrid} color={COLORS.blue} />
          <FlowRow label="Battery → House" active={flows.batteryToHouse} color={COLORS.green} />
          <FlowRow label="Battery → Grid" active={flows.batteryToGrid} color={COLORS.green} />
          <FlowRow label="Grid → Battery" active={flows.gridToBattery} color={COLORS.yellow} />
          <FlowRow label="Grid → House" active={flows.gridToHouse} color={COLORS.yellow} />
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Solar" value={`${state.solar_kw_now.toFixed(1)} kW`} color={COLORS.blue} />
        <Stat label="Load" value={`${state.load_kw_now.toFixed(1)} kW`} color={COLORS.text} />
      </View>
    </View>
  );
}

function FlowRow({ label, active, color }: { label: string; active: boolean; color: string }) {
  return (
    <View style={styles.flowRow}>
      <Text style={[styles.flowArrow, { color: active ? color : COLORS.textDim, opacity: active ? 1 : 0.3 }]}>
        {active ? '▶' : '·'}
      </Text>
      <Text style={[styles.flowLabel, { color: active ? COLORS.text : COLORS.textDim }]}>
        {label}
      </Text>
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
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  title: { color: COLORS.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
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
  kwh: { color: COLORS.textDim, fontSize: 11 },
  flowCol: { flex: 1, gap: 6 },
  flowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flowArrow: { fontSize: 14, width: 14 },
  flowLabel: { fontSize: 13 },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  stat: { flex: 1 },
  statLabel: { color: COLORS.textDim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 20, fontWeight: '600', marginTop: 4 },
});
