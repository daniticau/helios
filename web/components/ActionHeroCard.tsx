// Hero "right now" card for the /live dashboard. Verb + reasoning +
// expected hourly gain. Color derives from the action per ACTION_META.

import { motion } from 'framer-motion';

import { ACTION_META } from '@/lib/demoProfile';
import type { LiveRecommendation } from '@/lib/types';

interface Props {
  rec: LiveRecommendation;
}

function fmtGain(n: number): string {
  const sign = n >= 0 ? '+' : '−';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

export function ActionHeroCard({ rec }: Props) {
  const meta = ACTION_META[rec.action];

  return (
    <motion.div
      initial={{ y: 18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
      className="relative overflow-hidden rounded-sm border bg-[color:var(--color-card)]/70 px-6 py-7 sm:px-8 sm:py-9"
      style={{ borderColor: meta.color + '55' }}
    >
      {/* Subtle corner glow matching the action color */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full opacity-20"
        style={{
          background: `radial-gradient(circle at center, ${meta.color}55, transparent 65%)`,
        }}
      />

      <div className="relative space-y-4">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: meta.color,
              boxShadow: `0 0 6px ${meta.color}80`,
            }}
          />
          <span className="type-eyebrow">right now</span>
        </div>

        <h2
          className="type-display-soft text-[color:var(--color-text)]"
          style={{
            fontSize: 'clamp(40px, 6vw, 72px)',
            lineHeight: 0.95,
            letterSpacing: '-0.035em',
            color: meta.color,
            fontWeight: 600,
          }}
        >
          {meta.verb}
        </h2>

        <div className="flex items-baseline gap-3">
          <span
            className="tabular-nums"
            style={{
              fontFamily: 'var(--font-display)',
              fontVariationSettings: '"opsz" 144',
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 500,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              color: meta.color,
            }}
          >
            {fmtGain(rec.expected_hourly_gain_usd)}
          </span>
          <span
            className="text-[14px] text-[color:var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            / hr expected
          </span>
        </div>

        <p
          className="max-w-prose text-[14.5px] leading-[1.6] text-[color:var(--color-text-muted)]"
        >
          {rec.reasoning}
        </p>
      </div>
    </motion.div>
  );
}
