// Mode B — live arbitrage dashboard. Composes the hero action card, battery
// gauge, peak window banner, and forecast chart. Polls POST /api/live every
// 60s via useLiveRecommendation (see services/liveSync.ts).
//
// Navigation notes: WS3 owns App.tsx and will mount this as a tab. The inline
// buttons below route to /widget-preview and /hourly-plan through optional
// callback props so this screen stays portable across navigators.

import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ActionHeroCard } from '../components/ActionHeroCard';
import { BatteryGauge } from '../components/BatteryGauge';
import { ForecastChart } from '../components/ForecastChart';
import { PeakWindowBanner } from '../components/PeakWindowBanner';
import { COLORS, DEMO_PROFILE_EXISTING_OWNER } from '../constants';
import { useLiveRecommendation } from '../services/liveSync';
import { HourlyPlan } from './HourlyPlan';
import { Settings } from './Settings';
import { WidgetPreview } from './WidgetPreview';

type Route = 'dashboard' | 'widget' | 'hourly';

export function LiveDashboard() {
  const [profile, setProfile] = useState(DEMO_PROFILE_EXISTING_OWNER);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [route, setRoute] = useState<Route>('dashboard');

  const { query, state } = useLiveRecommendation(profile);

  if (route === 'widget') return <WidgetPreview onBack={() => setRoute('dashboard')} />;
  if (route === 'hourly') return <HourlyPlan onBack={() => setRoute('dashboard')} />;

  const rec = query.data;
  const isFirstLoad = query.isLoading && !rec;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.subtitle}>Live</Text>
            <Text style={styles.title}>{profile.address.split(',')[0]}</Text>
            <Text style={styles.meta}>
              {profile.solar_kw}kW solar · {profile.battery_kwh}kWh battery · {profile.utility}
            </Text>
          </View>
          <Pressable
            onPress={() => setSettingsOpen(true)}
            style={styles.gear}
            hitSlop={12}
          >
            <Text style={styles.gearText}>⚙</Text>
          </Pressable>
        </View>

        {isFirstLoad && (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Fetching live rates…</Text>
          </View>
        )}

        {query.isError && !rec && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Couldn't reach backend</Text>
            <Text style={styles.errorBody}>{query.error?.message}</Text>
            <Pressable style={styles.retryBtn} onPress={() => query.refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {rec && (
          <>
            {rec.next_peak_window && <PeakWindowBanner peak={rec.next_peak_window} />}

            <ActionHeroCard rec={rec} />

            <BatteryGauge
              state={state}
              action={rec.action}
              batteryKwh={profile.battery_kwh ?? 13.5}
            />

            <ForecastChart
              forecast={rec.forecast_24h}
              peak={rec.next_peak_window}
              currentTime={new Date(state.timestamp)}
            />

            <View style={styles.navRow}>
              <Pressable style={styles.navBtn} onPress={() => setRoute('widget')}>
                <Text style={styles.navBtnLabel}>View as widget</Text>
                <Text style={styles.navBtnArrow}>›</Text>
              </Pressable>
              <Pressable style={styles.navBtn} onPress={() => setRoute('hourly')}>
                <Text style={styles.navBtnLabel}>Hourly plan</Text>
                <Text style={styles.navBtnArrow}>›</Text>
              </Pressable>
            </View>

            <View style={styles.callsCard}>
              <Text style={styles.callsHeader}>Live data sources</Text>
              {rec.orthogonal_calls_made.map((c, i) => (
                <Text key={i} style={styles.callLine}>
                  {c.status === 'success' ? '✓' : c.status === 'cached' ? '•' : '✗'}  {c.api} — {c.purpose} ({c.latency_ms}ms)
                </Text>
              ))}
            </View>

            <Text style={styles.footerHint}>
              Auto-refreshes every 60 seconds. Pull down to refresh now.
            </Text>
          </>
        )}
      </ScrollView>

      <Settings
        visible={settingsOpen}
        profile={profile}
        onClose={() => setSettingsOpen(false)}
        onSave={setProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 16, gap: 16, paddingBottom: 60, paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 4 },
  subtitle: {
    color: COLORS.accent,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  meta: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
  gear: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearText: { color: COLORS.textMuted, fontSize: 20 },
  loadingCard: {
    backgroundColor: COLORS.card,
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { color: COLORS.textMuted, fontSize: 13 },
  errorCard: {
    backgroundColor: COLORS.card,
    padding: 20,
    borderRadius: 16,
    gap: 8,
    borderColor: COLORS.red,
    borderWidth: 1,
  },
  errorTitle: { color: COLORS.red, fontSize: 16, fontWeight: '700' },
  errorBody: { color: COLORS.textMuted, fontSize: 13 },
  retryBtn: {
    backgroundColor: COLORS.red,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  retryText: { color: COLORS.text, fontWeight: '600' },
  navRow: { flexDirection: 'row', gap: 12 },
  navBtn: {
    flex: 1,
    backgroundColor: COLORS.card,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navBtnLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  navBtnArrow: { color: COLORS.accent, fontSize: 20 },
  callsCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 14,
    gap: 4,
  },
  callsHeader: {
    color: COLORS.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  callLine: { color: '#9ec1ff', fontSize: 11, fontFamily: 'Menlo' },
  footerHint: { color: COLORS.textDim, fontSize: 11, textAlign: 'center', marginTop: 8 },
});
