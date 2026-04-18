// Widget preview screen — a faithful in-app mockup of what the home screen
// widget will look like. Per HELIOS.md §12 scope cuts, this is the fallback
// if `expo-apple-widgets` can't compile in time. Also used in the demo video.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { WidgetMedium } from '../components/WidgetMedium';
import { WidgetSmall } from '../components/WidgetSmall';
import { COLORS, DEMO_PROFILE_EXISTING_OWNER } from '../constants';
import { buildMockHouseholdState, useLiveRecommendation } from '../services/liveSync';

interface Props {
  onBack?: () => void;
}

export function WidgetPreview({ onBack }: Props) {
  const { query } = useLiveRecommendation(DEMO_PROFILE_EXISTING_OWNER);
  // Fall back to a synthesized recommendation if no data yet so the preview
  // is never blank — this screen must always look good for the demo.
  const state = buildMockHouseholdState();
  const rec =
    query.data ??
    // lazy-require to avoid a circular import — mockLiveRecommendation is a
    // cheap pure function so this is fine.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../services/mockLive').mockLiveRecommendation({
      profile: DEMO_PROFILE_EXISTING_OWNER,
      current_state: state,
    });

  return (
    <View style={styles.container}>
      {/* Fake iOS-y wallpaper backdrop so widgets read as home-screen. */}
      <View style={styles.wallpaper} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          {onBack && (
            <Pressable onPress={onBack} hitSlop={16}>
              <Text style={styles.back}>‹ Back</Text>
            </Pressable>
          )}
          <Text style={styles.title}>Home screen widgets</Text>
          <Text style={styles.subtitle}>
            Preview of the iOS home-screen widgets. Data refreshes every 60 seconds
            via the live recommendation poll.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Small · 2×2</Text>
          <View style={styles.widgetFrame}>
            <WidgetSmall rec={rec} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Medium · 4×2</Text>
          <View style={styles.widgetFrame}>
            <WidgetMedium rec={rec} />
          </View>
        </View>

        <View style={styles.sideBySide}>
          <Text style={styles.sectionLabel}>Side-by-side on the home screen</Text>
          <View style={styles.homeRow}>
            <WidgetSmall rec={rec} />
            <View style={{ width: 12 }} />
            <WidgetSmall rec={{ ...rec, action: 'HOLD', expected_hourly_gain_usd: 0 }} />
          </View>
        </View>

        <Text style={styles.caption}>
          Widgets use the same LiveRecommendation payload as the dashboard.
          Timeline refresh is scheduled by iOS when WidgetKit is available;
          the preview polls on the 60-second cycle shared with the app.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  wallpaper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#141414',
    opacity: 0.6,
  },
  scroll: { padding: 24, gap: 28, paddingBottom: 60 },
  header: { gap: 8, marginTop: 40 },
  back: { color: COLORS.accent, fontSize: 16, marginBottom: 8 },
  title: { color: COLORS.text, fontSize: 26, fontWeight: '700' },
  subtitle: { color: COLORS.textMuted, fontSize: 14, lineHeight: 20 },
  section: { gap: 10, alignItems: 'center' },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    alignSelf: 'flex-start',
  },
  widgetFrame: {
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 28,
    alignItems: 'center',
    width: '100%',
  },
  sideBySide: { gap: 10 },
  homeRow: { flexDirection: 'row', alignSelf: 'center' },
  caption: { color: COLORS.textDim, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
