// OrthogonalTicker — THE prize moment. See HELIOS.md §11 (00:15-00:45) and §17.
//
// Renders one row per Orthogonal API as it resolves. The backend returns all
// calls at once, so we simulate a staggered reveal sorted by actual latency —
// which is both *honest* (every latency shown is real) and *magical* (the
// pacing makes a parallel fan-out legible on camera).
//
// The aesthetic target is a terminal watching real work happen, not a loading
// spinner. Monospaced rows, solid status dots, latency counters ticking up to
// their real value during the reveal, and ease curves that settle instead of
// bouncing.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { OrthogonalCallLog, OrthogonalStatus } from '@/shared/types';
import { colors, fontSizes, mono, radius, spacing } from '../theme';

// The 10 calls HELIOS orchestrates. Order defines the on-screen slot order
// while pending; when the real response lands we override with call data
// (matched by api name, falling back by index).
export const EXPECTED_SLOTS: ReadonlyArray<{ api: string; purpose: string }> = [
  { api: 'tariff', purpose: 'utility time-of-use plan' },
  { api: 'weather', purpose: 'irradiance + 24h forecast' },
  { api: 'pricing', purpose: 'installer quotes ($/W)' },
  { api: 'finance', purpose: 'solar loan APR range' },
  { api: 'news', purpose: 'active rebates + policy' },
  { api: 'permits', purpose: 'ZenPower permit records' },
  { api: 'property_value', purpose: 'home value → ROI %' },
  { api: 'demographics', purpose: 'income-aware sizing' },
  { api: 'reviews', purpose: 'local installer reviews' },
  { api: 'carbon_price', purpose: 'social cost of carbon' },
];

interface OrthogonalTickerProps {
  /** Full stream once settled. Empty or partial while pending. */
  calls: readonly OrthogonalCallLog[];
  /** Drives shimmer on pending rows. Usually = mutation.isPending. */
  isRunning: boolean;
  /** Compact mode for the results screen summary. */
  compact?: boolean;
  /**
   * Live mode: rows enter as their `call` data arrives — no fake stagger.
   * Used during real SSE streaming where wire timing IS the timing.
   */
  live?: boolean;
  /**
   * If provided, error rows render a small "retry" affordance that
   * invokes this callback with the source's stable id. Usually wired
   * to `useROIStream().retrySource`.
   */
  onRetry?: (sourceId: string) => void;
  /** Source ids currently being re-fetched — rendered as pending. */
  retryingSources?: ReadonlySet<string>;
}

type SlotState = {
  key: string;
  api: string;
  purpose: string;
  call: OrthogonalCallLog | null;
  /** ms after `calls` arrives before this row reveals. */
  revealDelayMs: number;
};

const STATUS_LABEL: Record<OrthogonalStatus, string> = {
  success: 'OK',
  cached: 'CACHE',
  error: 'ERR',
};

const STATUS_COLOR: Record<OrthogonalStatus, string> = {
  success: colors.success,
  cached: colors.warning,
  error: colors.error,
};

// Pacing: total reveal duration scales with the slowest real latency so
// judges see the full parallel fan-out unfold, but we cap it so a hanging
// call doesn't kill the pacing. Real latencies determine ordering.
const TOTAL_REVEAL_MS_MIN = 2600;
const TOTAL_REVEAL_MS_MAX = 5200;
const ROW_STAGGER_MIN_MS = 140;

function buildSlots(
  calls: readonly OrthogonalCallLog[],
  live: boolean
): SlotState[] {
  // No calls yet → render EXPECTED_SLOTS as placeholder rows. Distinct api
  // values make keys safe.
  if (calls.length === 0) {
    return EXPECTED_SLOTS.map(({ api, purpose }) => ({
      key: api,
      api,
      purpose,
      call: null,
      revealDelayMs: 0,
    }));
  }

  // Backend sends `api` as a provider name ("Linkup", "Precip AI", …),
  // with multiple calls sharing the same provider. Prefer `source_id` for
  // key stability so retries reuse the existing row; fall back to index
  // for older logs that predate the source_id wire field.
  const baseSlots = calls.map((c, i) => ({
    key: c.source_id ? `src-${c.source_id}` : `${i}-${c.api}`,
    api: c.api,
    purpose: c.purpose,
    call: c,
  }));

  if (live) {
    return baseSlots.map((s) => ({ ...s, revealDelayMs: 0 }));
  }

  const sortedIndices = baseSlots
    .map((_, i) => i)
    .sort((a, b) => baseSlots[a]!.call.latency_ms - baseSlots[b]!.call.latency_ms);

  const maxLatency = baseSlots[sortedIndices[sortedIndices.length - 1]!]!.call.latency_ms;
  const minLatency = baseSlots[sortedIndices[0]!]!.call.latency_ms;
  const spanLatency = Math.max(1, maxLatency - minLatency);
  const totalReveal = Math.min(
    TOTAL_REVEAL_MS_MAX,
    Math.max(TOTAL_REVEAL_MS_MIN, maxLatency * 0.9)
  );

  const delayByIndex = new Map<number, number>();
  sortedIndices.forEach((origIdx, rank) => {
    const call = baseSlots[origIdx]!.call;
    const latencyFrac = (call.latency_ms - minLatency) / spanLatency;
    const rankFrac = sortedIndices.length > 1 ? rank / (sortedIndices.length - 1) : 0;
    const blended = 0.65 * latencyFrac + 0.35 * rankFrac;
    const delay = Math.max(rank * ROW_STAGGER_MIN_MS, blended * totalReveal);
    delayByIndex.set(origIdx, delay);
  });

  return baseSlots.map((s, i) => ({
    ...s,
    revealDelayMs: delayByIndex.get(i) ?? 0,
  }));
}

/** Renders one slot row, with entrance animation keyed on reveal state. */
function TickerRow({
  slot,
  hasData,
  isRunning,
  compact,
  onRetry,
  isRetrying,
}: {
  slot: SlotState;
  hasData: boolean;
  isRunning: boolean;
  compact: boolean;
  onRetry?: (sourceId: string) => void;
  isRetrying?: boolean;
}) {
  const translateX = useSharedValue(hasData ? 0 : 32);
  const opacity = useSharedValue(hasData ? 1 : 0);

  useEffect(() => {
    if (!hasData) {
      translateX.value = 32;
      opacity.value = 0;
      return;
    }
    // Slide in from the right, settle. Delay encodes the staggered reveal.
    translateX.value = 32;
    opacity.value = 0;
    translateX.value = withDelay(
      slot.revealDelayMs,
      withTiming(0, { duration: 460, easing: Easing.out(Easing.cubic) })
    );
    opacity.value = withDelay(
      slot.revealDelayMs,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) })
    );
  }, [hasData, slot.revealDelayMs, slot.call?.latency_ms, opacity, translateX]);

  const entranceStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  // While a retry is in flight, swap the row back to its pending visual
  // (pulsing dot + dots in the latency block) so the user sees progress.
  const effectiveHasData = hasData && !isRetrying;
  const effectiveIsRunning = isRunning || Boolean(isRetrying);

  return (
    <Animated.View style={[styles.row, compact && styles.rowCompact, entranceStyle]}>
      <StatusDot
        slot={slot}
        hasData={effectiveHasData}
        isRunning={effectiveIsRunning}
      />
      <View style={styles.rowText}>
        <Text style={[styles.api, compact && styles.apiCompact]}>{slot.api}</Text>
        {!compact && <Text style={styles.purpose}>{slot.purpose}</Text>}
      </View>
      <LatencyCounter
        call={slot.call}
        revealDelayMs={slot.revealDelayMs}
        hasData={effectiveHasData}
        isRunning={effectiveIsRunning}
        onRetry={onRetry}
        compact={compact}
      />
    </Animated.View>
  );
}

function StatusDot({
  slot,
  hasData,
  isRunning,
}: {
  slot: SlotState;
  hasData: boolean;
  isRunning: boolean;
}) {
  // Pending dot pulses softly. Resolved dot pops briefly on reveal.
  const pulse = useSharedValue(1);
  const popScale = useSharedValue(hasData ? 1 : 0.6);
  const resolved = hasData && slot.call;
  const status = slot.call?.status ?? null;

  useEffect(() => {
    if (!resolved && isRunning) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 180 });
    }
    return () => cancelAnimation(pulse);
  }, [isRunning, resolved, pulse]);

  useEffect(() => {
    if (!resolved) {
      popScale.value = 0.6;
      return;
    }
    popScale.value = 0.6;
    popScale.value = withDelay(
      slot.revealDelayMs,
      withSequence(
        withTiming(1.3, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) })
      )
    );
  }, [resolved, slot.revealDelayMs, popScale]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: resolved ? 1 : pulse.value,
    transform: [{ scale: popScale.value }],
  }));

  const fillColor = resolved && status ? STATUS_COLOR[status] : colors.textDim;

  return (
    <View style={styles.dotWrap}>
      <Animated.View style={[styles.dot, { backgroundColor: fillColor }, dotStyle]} />
      {resolved && status === 'success' && (
        <Animated.View
          style={[styles.dotGlow, { backgroundColor: fillColor }, dotStyle]}
        />
      )}
    </View>
  );
}

/**
 * Counts up from 0 → actual latency_ms across the entrance window.
 * Why counting: makes the latency feel *earned* by the row rather than
 * stamped on. Reveals settle on the real number the backend recorded.
 */
function LatencyCounter({
  call,
  revealDelayMs,
  hasData,
  isRunning,
  onRetry,
  compact,
}: {
  call: OrthogonalCallLog | null;
  revealDelayMs: number;
  hasData: boolean;
  isRunning: boolean;
  onRetry?: (sourceId: string) => void;
  compact?: boolean;
}) {
  const [display, setDisplay] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    if (!hasData || !call) {
      setDisplay(null);
      return;
    }
    const target = call.latency_ms;
    const countDuration = 420;
    let startTime: number | null = null;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime - revealDelayMs;
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, elapsed / countDuration);
      // ease-out: sqrt feels like decelerating to settle on the real value.
      const eased = 1 - (1 - t) * (1 - t);
      setDisplay(Math.round(eased * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [call, hasData, revealDelayMs]);

  if (!hasData || !call) {
    return (
      <View style={styles.latencyBlock}>
        <PendingDots isRunning={isRunning} />
      </View>
    );
  }

  const label = STATUS_LABEL[call.status];
  const labelColor = STATUS_COLOR[call.status];
  const canRetry =
    call.status === 'error' && onRetry && call.source_id && !compact;
  return (
    <View style={styles.latencyBlock}>
      {canRetry ? (
        <Pressable
          onPress={() => onRetry!(call.source_id!)}
          hitSlop={8}
          style={({ pressed }) => [styles.retryPill, pressed && styles.retryPillPressed]}
        >
          <Text style={styles.retryPillText}>retry</Text>
        </Pressable>
      ) : null}
      <Text style={[styles.latencyLabel, { color: labelColor }]}>{label}</Text>
      <Text style={styles.latency}>
        {display ?? 0}
        <Text style={styles.latencyUnit}>ms</Text>
      </Text>
    </View>
  );
}

function PendingDots({ isRunning }: { isRunning: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (isRunning) {
      t.value = withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        -1,
        false
      );
    } else {
      cancelAnimation(t);
      t.value = 0;
    }
    return () => cancelAnimation(t);
  }, [isRunning, t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.35 + 0.55 * t.value }));
  return (
    <Animated.Text style={[styles.latencyPending, style]}>
      {isRunning ? '...' : '—'}
    </Animated.Text>
  );
}

/**
 * Top-level stats bar: "3/10 resolved · 142ms fastest · 2.1s slowest".
 * Updates live as rows come in. Makes the parallel fan-out readable.
 */
function TickerSummary({
  calls,
  isRunning,
}: {
  calls: readonly OrthogonalCallLog[];
  isRunning: boolean;
}) {
  const stats = useMemo(() => {
    const resolved = calls.length;
    if (resolved === 0) {
      return { resolved, fastest: null as number | null, slowest: null as number | null };
    }
    const sorted = [...calls].sort((a, b) => a.latency_ms - b.latency_ms);
    return {
      resolved,
      fastest: sorted[0]!.latency_ms,
      slowest: sorted[sorted.length - 1]!.latency_ms,
    };
  }, [calls]);

  const total = EXPECTED_SLOTS.length;

  // Subtle running caret that blinks while the agent is working.
  const caret = useSharedValue(1);
  useEffect(() => {
    if (isRunning) {
      caret.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 520 }),
          withTiming(1, { duration: 520 })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(caret);
      caret.value = withTiming(0, { duration: 200 });
    }
    return () => cancelAnimation(caret);
  }, [isRunning, caret]);
  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.value }));

  return (
    <View style={styles.summary}>
      <View style={styles.summaryLeft}>
        <Text style={styles.summaryPrompt}>orthogonal &gt;</Text>
        <Text style={styles.summaryText}>
          {isRunning ? 'fan-out in flight' : 'fan-out complete'}
        </Text>
        <Animated.Text style={[styles.summaryCaret, caretStyle]}>▌</Animated.Text>
      </View>
      <View style={styles.summaryRight}>
        <Text style={styles.summaryStats}>
          <Text style={styles.summaryStatBright}>
            {stats.resolved}/{total}
          </Text>
          {stats.fastest !== null && (
            <>
              {'  ·  '}
              <Text style={styles.summaryStatBright}>{stats.fastest}ms</Text> min
            </>
          )}
          {stats.slowest !== null && (
            <>
              {'  ·  '}
              <Text style={styles.summaryStatBright}>{stats.slowest}ms</Text> max
            </>
          )}
        </Text>
      </View>
    </View>
  );
}

export function OrthogonalTicker({
  calls,
  isRunning,
  compact = false,
  live = false,
  onRetry,
  retryingSources,
}: OrthogonalTickerProps) {
  const slots = useMemo(() => buildSlots(calls, live), [calls, live]);
  const hasAnyData = calls.length > 0;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {!compact && <TickerSummary calls={calls} isRunning={isRunning} />}
      <View style={compact ? styles.listCompact : styles.list}>
        {slots.map((slot) => {
          const sourceId = slot.call?.source_id;
          const isRetrying = Boolean(
            sourceId && retryingSources && retryingSources.has(sourceId)
          );
          return (
            <TickerRow
              key={slot.key}
              slot={slot}
              hasData={hasAnyData && slot.call !== null}
              isRunning={isRunning}
              compact={compact}
              onRetry={onRetry}
              isRetrying={isRetrying}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  containerCompact: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryPrompt: {
    color: colors.accent,
    fontFamily: mono,
    fontSize: fontSizes.xs,
    letterSpacing: 1,
  },
  summaryText: {
    color: colors.textMuted,
    fontFamily: mono,
    fontSize: fontSizes.xs,
  },
  summaryCaret: {
    color: colors.accent,
    fontFamily: mono,
    fontSize: fontSizes.xs,
  },
  summaryStats: {
    color: colors.textMuted,
    fontFamily: mono,
    fontSize: fontSizes.xs,
  },
  summaryStatBright: {
    color: colors.text,
  },
  list: {
    gap: 2,
  },
  listCompact: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 4,
    gap: spacing.sm,
  },
  rowCompact: {
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  dotWrap: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGlow: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    opacity: 0.25,
  },
  rowText: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    minWidth: 0,
  },
  api: {
    color: colors.text,
    fontFamily: mono,
    fontSize: fontSizes.sm,
    letterSpacing: 0.2,
  },
  apiCompact: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  purpose: {
    color: colors.textDim,
    fontFamily: mono,
    fontSize: 11,
    marginTop: 1,
  },
  latencyBlock: {
    minWidth: 78,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: 6,
  },
  latencyLabel: {
    fontFamily: mono,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  latency: {
    color: colors.text,
    fontFamily: mono,
    fontSize: fontSizes.sm,
    fontVariant: ['tabular-nums'],
  },
  latencyUnit: {
    color: colors.textDim,
    fontSize: fontSizes.xs,
    fontFamily: mono,
  },
  latencyPending: {
    color: colors.textDim,
    fontFamily: mono,
    fontSize: fontSizes.sm,
    letterSpacing: 2,
  },
  retryPill: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: 'transparent',
  },
  retryPillPressed: {
    opacity: 0.7,
  },
  retryPillText: {
    color: colors.error,
    fontFamily: mono,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'lowercase',
    fontWeight: '600',
  },
});
