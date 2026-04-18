// Hour-by-hour plan for the next 24 hours. Each row shows retail rate,
// export rate, recommended action, and solar forecast for that hour.
// Peak export windows are highlighted.

import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ForecastPoint, LiveAction } from '@/shared/types';

import { ACTION_META, COLORS, DEMO_PROFILE_EXISTING_OWNER } from '../constants';
import { useLiveRecommendation } from '../services/liveSync';

interface Props {
  onBack?: () => void;
}

// Derive a best-effort action for a future hour from retail/export rates +
// solar. The backend's `recommend_action` is for "now"; we don't have a
// full 24-hour plan on the wire yet, so we mirror the priority rules from
// HELIOS.md §3.2 client-side.
function actionFor(p: ForecastPoint, isPeak: boolean): LiveAction {
  if (p.export_rate > 0.9 || isPeak) return 'DISCHARGE_BATTERY_TO_GRID';
  if (p.solar_kw_forecast > 2 && p.export_rate < 0.2) return 'CHARGE_BATTERY_FROM_SOLAR';
  if (p.retail_rate < 0.18) return 'CHARGE_BATTERY_FROM_GRID';
  if (p.retail_rate > 0.4) return 'DISCHARGE_BATTERY_TO_HOUSE';
  if (p.solar_kw_forecast > 1) return 'EXPORT_SOLAR';
  return 'HOLD';
}

export function HourlyPlan({ onBack }: Props) {
  const { query } = useLiveRecommendation(DEMO_PROFILE_EXISTING_OWNER);
  const rec = query.data;

  const rows = useMemo(() => {
    if (!rec) return [];
    const peakStart = rec.next_peak_window
      ? new Date(rec.next_peak_window.start_iso).getTime()
      : null;

    return rec.forecast_24h.map((p) => {
      const when = new Date();
      when.setHours(when.getHours() + p.hour_offset, 0, 0, 0);
      const isPeak =
        peakStart !== null &&
        when.getTime() >= peakStart - 30 * 60_000 &&
        when.getTime() <= peakStart + 3 * 3_600_000;
      return { p, when, isPeak, action: actionFor(p, isPeak) };
    });
  }, [rec]);

  function fmtHour(d: Date): string {
    const h = d.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = ((h + 11) % 12) + 1;
    return `${h12} ${ampm}`;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={16}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
        )}
        <Text style={styles.title}>Next 24 hours</Text>
        <Text style={styles.subtitle}>Hour-by-hour recommended action</Text>
      </View>

      {!rec && <Text style={styles.loading}>Loading plan…</Text>}

      {rec && (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, { flex: 0.9 }]}>Hour</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Retail</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Export</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Solar</Text>
            <Text style={[styles.headerCell, { flex: 1.8, textAlign: 'right' }]}>Action</Text>
          </View>
          {rows.map(({ p, when, isPeak, action }) => {
            const meta = ACTION_META[action];
            return (
              <View
                key={p.hour_offset}
                style={[
                  styles.row,
                  isPeak && styles.rowPeak,
                ]}
              >
                <Text style={[styles.cell, { flex: 0.9, fontWeight: '600' }]}>
                  {fmtHour(when)}
                </Text>
                <Text style={[styles.cell, { flex: 1 }]}>${p.retail_rate.toFixed(2)}</Text>
                <Text
                  style={[
                    styles.cell,
                    { flex: 1, color: p.export_rate > 0.8 ? COLORS.accent : COLORS.text },
                  ]}
                >
                  ${p.export_rate.toFixed(2)}
                </Text>
                <Text style={[styles.cell, { flex: 1, color: COLORS.blue }]}>
                  {p.solar_kw_forecast.toFixed(1)} kW
                </Text>
                <View style={[styles.actionCell, { flex: 1.8 }]}>
                  <View style={[styles.actionDot, { backgroundColor: meta.color }]} />
                  <Text
                    style={[styles.actionText, { color: meta.color }]}
                    numberOfLines={1}
                  >
                    {meta.verb}
                  </Text>
                </View>
              </View>
            );
          })}

          {rec.next_peak_window && (
            <Text style={styles.legend}>
              Highlighted rows are the forecast peak export window (starts{' '}
              {new Date(rec.next_peak_window.start_iso).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
              , ${rec.next_peak_window.expected_rate.toFixed(2)}/kWh).
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
  },
  back: { color: COLORS.accent, fontSize: 16, marginBottom: 8 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  loading: { color: COLORS.textMuted, textAlign: 'center', padding: 40 },
  body: { padding: 16, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
  },
  headerCell: {
    color: COLORS.textDim,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 0.5,
  },
  rowPeak: { backgroundColor: COLORS.peak },
  cell: { color: COLORS.text, fontSize: 14 },
  actionCell: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end' },
  actionDot: { width: 8, height: 8, borderRadius: 4 },
  actionText: { fontSize: 13, fontWeight: '600' },
  legend: { color: COLORS.textDim, fontSize: 11, marginTop: 16, textAlign: 'center', lineHeight: 16 },
});
