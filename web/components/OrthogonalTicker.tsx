'use client';

// Web port of mobile/src/modeA/components/OrthogonalTicker.tsx.
// Renders one row per Orthogonal API with a staggered reveal keyed on the
// real latency_ms returned by the backend. The pacing is the pitch: judges
// literally watch 10 paid APIs resolve in parallel in under 20s.

import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { OrthogonalCallLog, OrthogonalStatus } from '@/lib/types';

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

const STATUS_LABEL: Record<OrthogonalStatus, string> = {
  success: 'OK',
  cached: 'CACHE',
  error: 'ERR',
};

const STATUS_COLOR: Record<OrthogonalStatus, string> = {
  success: 'var(--color-success)',
  cached: 'var(--color-warning)',
  error: 'var(--color-error)',
};

const TOTAL_REVEAL_MS_MIN = 2600;
const TOTAL_REVEAL_MS_MAX = 5200;
const ROW_STAGGER_MIN_MS = 140;

interface OrthogonalTickerProps {
  calls: readonly OrthogonalCallLog[];
  isRunning: boolean;
  compact?: boolean;
}

type SlotState = {
  key: string;
  api: string;
  purpose: string;
  call: OrthogonalCallLog | null;
  revealDelayMs: number;
};

function buildSlots(calls: readonly OrthogonalCallLog[]): SlotState[] {
  const byApi = new Map<string, OrthogonalCallLog>();
  for (const c of calls) byApi.set(c.api, c);

  const baseSlots: Array<Omit<SlotState, 'revealDelayMs'>> = EXPECTED_SLOTS.map(
    ({ api, purpose }) => ({
      key: api,
      api,
      purpose,
      call: byApi.get(api) ?? null,
    })
  );
  for (const c of calls) {
    if (!EXPECTED_SLOTS.some((s) => s.api === c.api)) {
      baseSlots.push({ key: c.api, api: c.api, purpose: c.purpose, call: c });
    }
  }

  const resolved = baseSlots
    .filter((s) => s.call !== null)
    .map((s) => s.call!)
    .sort((a, b) => a.latency_ms - b.latency_ms);

  if (resolved.length === 0) {
    return baseSlots.map((s) => ({ ...s, revealDelayMs: 0 }));
  }

  const maxLatency = resolved[resolved.length - 1]!.latency_ms;
  const minLatency = resolved[0]!.latency_ms;
  const spanLatency = Math.max(1, maxLatency - minLatency);
  const totalReveal = Math.min(
    TOTAL_REVEAL_MS_MAX,
    Math.max(TOTAL_REVEAL_MS_MIN, maxLatency * 0.9)
  );

  const delayByApi = new Map<string, number>();
  resolved.forEach((call, idx) => {
    const latencyFrac = (call.latency_ms - minLatency) / spanLatency;
    const rankFrac = resolved.length > 1 ? idx / (resolved.length - 1) : 0;
    const blended = 0.65 * latencyFrac + 0.35 * rankFrac;
    const delay = Math.max(idx * ROW_STAGGER_MIN_MS, blended * totalReveal);
    delayByApi.set(call.api, delay);
  });

  return baseSlots.map((s) => ({
    ...s,
    revealDelayMs: s.call ? delayByApi.get(s.call.api) ?? 0 : totalReveal + 200,
  }));
}

function LatencyCounter({
  call,
  revealDelayMs,
  hasData,
  isRunning,
}: {
  call: OrthogonalCallLog | null;
  revealDelayMs: number;
  hasData: boolean;
  isRunning: boolean;
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
      <span
        className={`font-mono text-sm tracking-[0.2em] text-[color:var(--color-text-dim)] ${
          isRunning ? 'caret-blink' : ''
        }`}
      >
        {isRunning ? '...' : '—'}
      </span>
    );
  }

  return (
    <span className="flex items-baseline justify-end gap-1.5">
      <span
        className="font-mono text-[9px] font-semibold tracking-wider"
        style={{ color: STATUS_COLOR[call.status] }}
      >
        {STATUS_LABEL[call.status]}
      </span>
      <span className="font-mono text-sm tabular-nums text-[color:var(--color-text)]">
        {display ?? 0}
        <span className="font-mono text-xs text-[color:var(--color-text-dim)]">ms</span>
      </span>
    </span>
  );
}

function StatusDot({
  resolved,
  status,
  isRunning,
  delayMs,
}: {
  resolved: boolean;
  status: OrthogonalStatus | null;
  isRunning: boolean;
  delayMs: number;
}) {
  const fill = resolved && status ? STATUS_COLOR[status] : 'var(--color-text-dim)';
  return (
    <div className="relative flex h-3.5 w-3.5 items-center justify-center">
      <motion.div
        initial={{ scale: 0.6, opacity: resolved ? 0 : 1 }}
        animate={
          resolved
            ? { scale: [0.6, 1.3, 1], opacity: 1 }
            : { opacity: isRunning ? [0.35, 1, 0.35] : 1 }
        }
        transition={
          resolved
            ? { delay: delayMs / 1000, duration: 0.4, times: [0, 0.45, 1] }
            : { repeat: Infinity, duration: 1.4, ease: 'easeInOut' }
        }
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: fill }}
      />
      {resolved && status === 'success' && (
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.22 }}
          transition={{ delay: delayMs / 1000 + 0.05, duration: 0.35 }}
          className="absolute h-3.5 w-3.5 rounded-full"
          style={{ backgroundColor: fill }}
        />
      )}
    </div>
  );
}

function TickerRow({
  slot,
  hasData,
  isRunning,
  compact,
}: {
  slot: SlotState;
  hasData: boolean;
  isRunning: boolean;
  compact: boolean;
}) {
  return (
    <motion.div
      key={slot.key}
      initial={{ x: 32, opacity: 0 }}
      animate={hasData ? { x: 0, opacity: 1 } : { x: 0, opacity: 0.7 }}
      transition={{
        delay: hasData ? slot.revealDelayMs / 1000 : 0,
        duration: 0.46,
        ease: [0.25, 0.8, 0.25, 1],
      }}
      className={`flex items-center gap-3 px-1 ${compact ? 'py-1' : 'py-2.5'}`}
    >
      <StatusDot
        resolved={hasData}
        status={slot.call?.status ?? null}
        isRunning={isRunning}
        delayMs={slot.revealDelayMs}
      />
      <div className="min-w-0 flex-1">
        <div
          className={`font-mono ${
            compact ? 'text-xs text-[color:var(--color-text-muted)]' : 'text-sm text-[color:var(--color-text)]'
          }`}
        >
          {slot.api}
        </div>
        {!compact && (
          <div className="mt-0.5 font-mono text-[11px] text-[color:var(--color-text-dim)]">
            {slot.purpose}
          </div>
        )}
      </div>
      <div className="min-w-[78px] text-right">
        <LatencyCounter
          call={slot.call}
          revealDelayMs={slot.revealDelayMs}
          hasData={hasData}
          isRunning={isRunning}
        />
      </div>
    </motion.div>
  );
}

function TickerSummary({
  calls,
  isRunning,
}: {
  calls: readonly OrthogonalCallLog[];
  isRunning: boolean;
}) {
  const stats = useMemo(() => {
    if (calls.length === 0) {
      return { resolved: 0, fastest: null as number | null, slowest: null as number | null };
    }
    const sorted = [...calls].sort((a, b) => a.latency_ms - b.latency_ms);
    return {
      resolved: calls.length,
      fastest: sorted[0]!.latency_ms,
      slowest: sorted[sorted.length - 1]!.latency_ms,
    };
  }, [calls]);
  const total = EXPECTED_SLOTS.length;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[color:var(--color-border)] pb-2 mb-2">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs tracking-wider text-[color:var(--color-accent)]">
          orthogonal &gt;
        </span>
        <span className="font-mono text-xs text-[color:var(--color-text-muted)]">
          {isRunning ? 'fan-out in flight' : 'fan-out complete'}
        </span>
        {isRunning && (
          <span className="caret-blink font-mono text-xs text-[color:var(--color-accent)]">▌</span>
        )}
      </div>
      <div className="font-mono text-xs text-[color:var(--color-text-muted)]">
        <span className="text-[color:var(--color-text)]">
          {stats.resolved}/{total}
        </span>
        {stats.fastest != null && (
          <>
            {'  ·  '}
            <span className="text-[color:var(--color-text)]">{stats.fastest}ms</span> min
          </>
        )}
        {stats.slowest != null && (
          <>
            {'  ·  '}
            <span className="text-[color:var(--color-text)]">{stats.slowest}ms</span> max
          </>
        )}
      </div>
    </div>
  );
}

export function OrthogonalTicker({
  calls,
  isRunning,
  compact = false,
}: OrthogonalTickerProps) {
  const slots = useMemo(() => buildSlots(calls), [calls]);
  const hasAnyData = calls.length > 0;

  return (
    <div
      className={
        compact
          ? ''
          : 'rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-4'
      }
    >
      {!compact && <TickerSummary calls={calls} isRunning={isRunning} />}
      <div className={compact ? 'space-y-0' : 'space-y-0'}>
        {slots.map((slot) => (
          <TickerRow
            key={slot.key}
            slot={slot}
            hasData={hasAnyData && slot.call !== null}
            isRunning={isRunning}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}
