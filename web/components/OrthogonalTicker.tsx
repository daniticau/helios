'use client';

// Latency-staggered reveal of all 10 Orthogonal calls. Logic preserved from
// the mobile port — rows sort by real latency, reveal on a delay blended
// from latency fraction and rank, count-up counter resolves to the real
// value. Terminal-chrome restyle only.

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
  cached: 'var(--color-accent-cool)',
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
    const countDuration = 440;
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
        className={`text-[12.5px] tracking-[0.15em] text-[color:var(--color-text-dim)] ${
          isRunning ? 'caret-blink' : ''
        }`}
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {isRunning ? '· · ·' : '—'}
      </span>
    );
  }

  return (
    <span className="flex items-baseline justify-end gap-2">
      <span
        className="text-[9px] font-semibold uppercase tracking-[0.2em]"
        style={{ color: STATUS_COLOR[call.status], fontFamily: 'var(--font-mono)' }}
      >
        {STATUS_LABEL[call.status]}
      </span>
      <span
        className="tabular-nums text-[13px] text-[color:var(--color-text)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {display ?? 0}
        <span className="ml-0.5 text-[10.5px] text-[color:var(--color-text-dim)]">ms</span>
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
  const glow =
    resolved && status === 'success'
      ? '0 0 8px rgba(135,214,125,0.75)'
      : resolved && status === 'cached'
        ? '0 0 8px rgba(141,180,220,0.7)'
        : 'none';
  return (
    <div className="relative flex h-4 w-4 items-center justify-center">
      <motion.div
        initial={{ scale: 0.6, opacity: resolved ? 0 : 1 }}
        animate={
          resolved
            ? { scale: [0.6, 1.25, 1], opacity: 1 }
            : { opacity: isRunning ? [0.35, 1, 0.35] : 1 }
        }
        transition={
          resolved
            ? { delay: delayMs / 1000, duration: 0.4, times: [0, 0.45, 1] }
            : { repeat: Infinity, duration: 1.4, ease: 'easeInOut' }
        }
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: fill, boxShadow: glow }}
      />
      {resolved && status === 'success' && (
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.22 }}
          transition={{ delay: delayMs / 1000 + 0.05, duration: 0.35 }}
          className="absolute h-4 w-4 rounded-full"
          style={{ backgroundColor: fill }}
        />
      )}
    </div>
  );
}

function TickerRow({
  slot,
  index,
  hasData,
  isRunning,
  compact,
}: {
  slot: SlotState;
  index: number;
  hasData: boolean;
  isRunning: boolean;
  compact: boolean;
}) {
  return (
    <motion.div
      key={slot.key}
      initial={{ x: 36, opacity: 0 }}
      animate={hasData ? { x: 0, opacity: 1 } : { x: 0, opacity: 0.5 }}
      transition={{
        delay: hasData ? slot.revealDelayMs / 1000 : 0,
        duration: 0.48,
        ease: [0.25, 0.8, 0.25, 1],
      }}
      className={`group grid items-center gap-3 border-b border-[color:var(--color-hairline)] last:border-0 ${
        compact ? 'grid-cols-[16px_14px_1fr_auto] px-0 py-1' : 'grid-cols-[24px_16px_1fr_auto] px-2 py-3'
      }`}
    >
      <span
        className={`tabular-nums text-[color:var(--color-text-dim)] ${
          compact ? 'text-[9px]' : 'text-[10px]'
        }`}
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>

      <StatusDot
        resolved={hasData}
        status={slot.call?.status ?? null}
        isRunning={isRunning}
        delayMs={slot.revealDelayMs}
      />

      <div className="min-w-0">
        <div
          className={`${compact ? 'text-[12px]' : 'text-[13.5px]'} text-[color:var(--color-text)]`}
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {slot.api}
        </div>
        {!compact && (
          <div
            className="mt-0.5 text-[11px] text-[color:var(--color-text-dim)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {slot.purpose}
          </div>
        )}
      </div>

      <div className="min-w-[84px] text-right">
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

function TickerHeader({
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
    <div
      className="flex items-center justify-between gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-deep)]/40 px-4 py-2.5 text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-text-muted)]"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[color:var(--color-accent)]">orthogonal &gt;</span>
        <span>{isRunning ? 'fan-out in flight' : 'fan-out complete'}</span>
        {isRunning && (
          <span className="caret-blink text-[color:var(--color-accent)]">▌</span>
        )}
      </div>
      <div>
        <span className="text-[color:var(--color-text)]">
          {stats.resolved}/{total}
        </span>
        {stats.fastest != null && (
          <>
            <span className="mx-2 text-[color:var(--color-text-dimmer)]">·</span>
            <span className="text-[color:var(--color-text)]">{stats.fastest}ms</span>{' '}
            min
          </>
        )}
        {stats.slowest != null && (
          <>
            <span className="mx-2 text-[color:var(--color-text-dimmer)]">·</span>
            <span className="text-[color:var(--color-text)]">{stats.slowest}ms</span>{' '}
            max
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

  if (compact) {
    return (
      <div className="space-y-0">
        {slots.map((slot, i) => (
          <TickerRow
            key={slot.key}
            slot={slot}
            index={i}
            hasData={hasAnyData && slot.call !== null}
            isRunning={isRunning}
            compact
          />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/70 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]">
      <TickerHeader calls={calls} isRunning={isRunning} />
      <div className="px-2 py-1">
        {slots.map((slot, i) => (
          <TickerRow
            key={slot.key}
            slot={slot}
            index={i}
            hasData={hasAnyData && slot.call !== null}
            isRunning={isRunning}
            compact={false}
          />
        ))}
      </div>
      <div
        className="flex items-center justify-between border-t border-[color:var(--color-border)] bg-[color:var(--color-bg-deep)]/40 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-text-dim)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <span>$ helios fanout --live</span>
        <span>
          <span className="text-[color:var(--color-accent)]">·</span> streaming real latencies
        </span>
      </div>
    </div>
  );
}
