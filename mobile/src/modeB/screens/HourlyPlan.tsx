// Hour-by-hour plan for the next 24 hours. Each card shows retail rate,
// export rate, recommended action, and solar forecast for that hour.
// Peak export windows are tinted with the accent overlay.

import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ForecastPoint, LiveAction } from '@/shared/types';

import { ACTION_META, COLORS, DEMO_PROFILE_EXISTING_OWNER } from '../constants';
import { useLiveRecommendation } from '../services/liveSync';

interface Props {
  onBack?: () => void;
}

// Derive a best-effort action for a future hour from retail/export rates +
// solar. Mirrors the priority rules in HELIOS.md §3.2.
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
            <Text style={styles.back}>Back</Text>
          </Pressable>
        )}
        <Text style={styles.title}>Next 24 hours</Text>
        <Text style={styles.subtitle}>Hour-by-hour guidance.</Text>
      </View>

      {!rec && <Text style={styles.loading}>Loading plan…</Text>}

      {rec && (
        <ScrollView contentContainerStyle={styles.body}>
          {rows.map(({ p, when, isPeak, action }) => {
            const meta = ACTION_META[action];
            return (
              <View
                key={p.hour_offset}
                style={[styles.card, isPeak && styles.cardPeak]}
              >
                <View style={styles.cardHead}>
                  <Text style={styles.hour}>{fmtHour(when)}</Text>
                  <View style={styles.actionCell}>
                    <View style={[styles.actionDot, { backgroundColor: meta.color }]} />
                    <Text
                      style={[styles.actionText, { color: meta.color }]}
                      numberOfLines={1}
                    >
                      {meta.verb}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardStats}>
                  <Text style={styles.stat}>
                    <Text style={styles.statLabel}>Retail </Text>
                    <Text style={styles.statValue}>${p.retail_rate.toFixed(2)}</Text>
                  </Text>
                  <Text
                    style={[
                      styles.stat,
                      { color: p.export_rate > 0.8 ? COLORS.accent : COLORS.text },
                    ]}
                  >
                    <Text style={styles.statLabel}>Export </Text>
                    <Text style={styles.statValue}>${p.export_rate.toFixed(2)}</Text>
                  </Text>
                  <Text style={[styles.stat, { color: COLORS.blue }]}>
                    <Text style={styles.statLabel}>Solar </Text>
                    <Text style={styles.statValue}>{p.solar_kw_forecast.toFixed(1)} kW</Text>
                  </Text>
                </View>
              </View>
            );
          })}

          {rec.next_peak_window && (
            <Text style={styles.legend}>
              Tinted cards are the forecast peak export window (starts{' '}
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
  back: { color: COLORS.accent, fontSize: 15, marginBottom: 8 },
  title: { color: COLORS.text, fontSize: 26, fontWeight: '700' },
  subtitle: { color: COLORS.textMuted, fontSize: 14, marginTop: 4 },
  loading: { color: COLORS.textMuted, textAlign: 'center', padding: 40 },
  body: { padding: 16, paddingBottom: 40, gap: 8 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  cardPeak: {
    backgroundColor: COLORS.peak,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hour: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  actionCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionDot: { width: 8, height: 8, borderRadius: 4 },
  actionText: { fontSize: 14, fontWeight: '600' },
  cardStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  stat: {
    color: COLORS.text,
    fontSize: 13,
    fontFamily: 'Menlo',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: COLORS.textDim,
    fontFamily: 'Menlo',
  },
  statValue: {
    fontWeight: '600',
  },
  legend: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 18,
  },
});
