// AgentRunning — the prize-winning screen. See HELIOS.md §11 (00:15-00:45).
//
// Fires the ROI mutation on mount, renders the OrthogonalTicker front and
// center. Once the ROIResult lands, navigates to ROIResult with the payload.
//
// Error state is inline with a retry: we don't kick the user back to onboarding
// because they've already entered their data and the mutation is idempotent.

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useProfileStore } from '@/shared/store';
import type { ROIResult } from '@/shared/types';

import { OrthogonalTicker } from '../components/OrthogonalTicker';
import { PrimaryButton } from '../components/PrimaryButton';
import { useROI } from '../hooks/useROI';
import type { ModeAScreenProps } from '../navigation';
import { colors, fontSizes, mono, radius, spacing } from '../theme';

// Rotating subtitle lines that cycle while the fan-out is in flight. Each
// line mirrors a concrete step in the orchestrator so the user feels like
// they're watching real work, not a spinner animation.
const RUNNING_LINES = [
  'computing your solar economics',
  'fanning out to ten data sources',
  'matching tariff plan, resolving irradiance',
  'pulling installer pricing + financing APRs',
  'scoring neighborhood permit velocity',
  'valuing avoided CO2 at the social cost of carbon',
];

/** Live stopwatch since `start`. rAF-driven so it reads every frame. */
function useElapsedSeconds(start: number | null): string {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (start === null) return;
    let raf = requestAnimationFrame(function loop() {
      setTick((n) => (n + 1) % 1_000_000);
      raf = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(raf);
  }, [start]);
  if (start === null) return '0.0';
  return ((Date.now() - start) / 1000).toFixed(1);
}

export function AgentRunning({ navigation }: ModeAScreenProps<'AgentRunning'>) {
  const profile = useProfileStore((s) => s.profile);
  const mut = useROI();
  const startedAt = useRef<number | null>(null);
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (!profile || mut.isPending || mut.isSuccess) return;
    startedAt.current = Date.now();
    mut.mutate({ profile });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    if (mut.isSuccess && mut.data && !navigatedRef.current) {
      navigatedRef.current = true;
      // Tiny settle delay so the user sees all rows land before nav.
      const t = setTimeout(() => {
        const result: ROIResult = mut.data;
        navigation.replace('ROIResult', { result });
      }, 1100);
      return () => clearTimeout(t);
    }
    return;
  }, [mut.isSuccess, mut.data, navigation]);

  const calls = mut.data?.orthogonal_calls_made ?? [];
  const elapsed = useElapsedSeconds(startedAt.current);

  const retry = () => {
    navigatedRef.current = false;
    startedAt.current = Date.now();
    if (profile) mut.mutate({ profile });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandDot} />
          <Text style={styles.brand}>helios agent</Text>
        </View>
        <View style={styles.elapsedRow}>
          <Text style={styles.elapsedLabel}>t+</Text>
          <Text style={styles.elapsedValue}>{elapsed}s</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Animated.View entering={FadeInUp.duration(480)}>
          <SubtitleCycler running={mut.isPending} finalLine="fan-out complete, settling" />
        </Animated.View>

        <Animated.View entering={FadeIn.delay(120).duration(520)} style={styles.tickerHolder}>
          <OrthogonalTicker calls={calls} isRunning={mut.isPending} />
        </Animated.View>

        {mut.isError && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.errorBlock}>
            <Text style={styles.errorTitle}>agent stalled</Text>
            <Text style={styles.errorBody}>
              {String(mut.error?.message ?? 'unknown error')}
            </Text>
            <PrimaryButton label="retry" onPress={retry} variant="secondary" />
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

function SubtitleCycler({
  running,
  finalLine,
}: {
  running: boolean;
  finalLine: string;
}) {
  const [idx, setIdx] = useState(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      opacity.value = withTiming(
        0,
        { duration: 260, easing: Easing.in(Easing.quad) },
        (finished) => {
          if (finished) {
            opacity.value = withTiming(1, {
              duration: 260,
              easing: Easing.out(Easing.quad),
            });
          }
        }
      );
      // Swap text when midway through the fade. Lands during the opacity dip.
      setTimeout(() => setIdx((i) => (i + 1) % RUNNING_LINES.length), 260);
    }, 1800);
    return () => clearInterval(interval);
  }, [running, opacity]);

  useEffect(() => {
    if (!running) {
      cancelAnimation(opacity);
      opacity.value = withTiming(1, { duration: 220 });
    }
  }, [running, opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const line = running ? RUNNING_LINES[idx] ?? RUNNING_LINES[0] : finalLine;

  return (
    <View style={styles.subtitleRow}>
      <Animated.Text style={[styles.subtitle, animStyle]}>{line}</Animated.Text>
      <BlinkingCaret running={running} />
    </View>
  );
}

function BlinkingCaret({ running }: { running: boolean }) {
  const op = useSharedValue(1);
  useEffect(() => {
    if (running) {
      op.value = withRepeat(
        withTiming(0, { duration: 520, easing: Easing.inOut(Easing.quad) }),
        -1,
        true
      );
    } else {
      cancelAnimation(op);
      op.value = withTiming(0, { duration: 160 });
    }
    return () => cancelAnimation(op);
  }, [running, op]);
  const style = useAnimatedStyle(() => ({ opacity: op.value }));
  return <Animated.Text style={[styles.caret, style]}>_</Animated.Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  brand: {
    color: colors.accent,
    fontSize: 12,
    letterSpacing: 1.2,
    fontFamily: mono,
    textTransform: 'uppercase',
  },
  elapsedRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  elapsedLabel: {
    color: colors.textDim,
    fontSize: fontSizes.xs,
    fontFamily: mono,
  },
  elapsedValue: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontFamily: mono,
    fontVariant: ['tabular-nums'],
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  subtitle: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '500',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  caret: {
    color: colors.accent,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    marginBottom: 2,
    fontFamily: mono,
  },
  tickerHolder: {
    // OrthogonalTicker renders its own card chrome.
  },
  errorBlock: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
    gap: spacing.sm,
  },
  errorTitle: {
    color: colors.error,
    fontWeight: '600',
    fontSize: fontSizes.base,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  errorBody: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontFamily: mono,
  },
});
