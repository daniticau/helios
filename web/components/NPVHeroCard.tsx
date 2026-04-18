// Hero numbers: payback years (massive Fraunces) + 25yr NPV. The payoff
// after 20 seconds of fan-out — give it proper editorial weight.

import { motion } from 'framer-motion';

interface NPVHeroCardProps {
  paybackYears: number;
  npv25yrUsd: number;
  annualSavingsYr1: number;
}

function formatUsd(n: number): string {
  const sign = n < 0 ? '-' : '+';
  const abs = Math.abs(Math.round(n));
  return `${sign}$${abs.toLocaleString('en-US')}`;
}

export function NPVHeroCard({
  paybackYears,
  npv25yrUsd,
  annualSavingsYr1,
}: NPVHeroCardProps) {
  const paybackStr = paybackYears.toFixed(1);
  return (
    <motion.div
      initial={{ y: 22, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
      className="relative overflow-hidden rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/70"
      style={{
        backgroundImage:
          'linear-gradient(160deg, var(--color-card) 0%, var(--color-card-elevated) 70%, var(--color-bg-elevated) 100%), radial-gradient(circle at 95% -20%, rgba(245,215,110,0.18), transparent 55%)',
      }}
    >
      {/* sunburst decoration */}
      <div
        className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full border border-dashed border-[color:var(--color-accent)]/25 anim-sunbeam"
        style={{ animationDuration: '40s' }}
      />
      <div
        className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full border border-[color:var(--color-accent)]/15 anim-sunbeam"
        style={{ animationDuration: '26s', animationDirection: 'reverse' }}
      />

      <div className="relative px-7 py-9 sm:px-10 sm:py-12">
        {/* header strip */}
        <div
          className="flex items-center justify-between border-b border-[color:var(--color-hairline)] pb-4 text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-text-dim)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)]"
              style={{ boxShadow: '0 0 5px rgba(245,215,110,0.7)' }}
            />
            result · npv
          </span>
          <span>settled · t+20s</span>
        </div>

        {/* Payback */}
        <div className="mt-10 space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            break even in
          </div>
          <div className="flex items-end gap-3">
            <motion.span
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
              className="type-display-soft tabular-nums text-[color:var(--color-accent)]"
              style={{
                fontSize: 'clamp(96px, 18vw, 168px)',
                lineHeight: 0.82,
                fontVariationSettings: '"opsz" 144, "SOFT" 0',
                fontWeight: 700,
                letterSpacing: '-0.055em',
              }}
            >
              {paybackStr}
            </motion.span>
            <div className="mb-6 flex flex-col items-start">
              <span
                className="type-display-italic text-[color:var(--color-accent)]"
                style={{ fontSize: 32, fontWeight: 500 }}
              >
                years
              </span>
              <span
                className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-text-dim)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                to recover upfront
              </span>
            </div>
          </div>
        </div>

        {/* Divider with ticks */}
        <div className="my-9 flex items-center gap-2">
          <div className="h-px flex-1 bg-[color:var(--color-border)]" />
          <span
            className="text-[9px] uppercase tracking-[0.3em] text-[color:var(--color-text-dim)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            + 25 yr horizon
          </span>
          <div className="h-px flex-1 bg-[color:var(--color-border)]" />
        </div>

        {/* NPV */}
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            net present value · 25 yr
          </div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="tabular-nums text-[color:var(--color-text)]"
            style={{
              fontFamily: 'var(--font-display)',
              fontVariationSettings: '"opsz" 144, "SOFT" 40',
              fontSize: 'clamp(42px, 6vw, 76px)',
              fontWeight: 600,
              letterSpacing: '-0.035em',
              lineHeight: 1,
            }}
          >
            {formatUsd(npv25yrUsd)}
          </motion.div>
          <div
            className="mt-2 text-[12.5px] text-[color:var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            ≈ <span className="text-[color:var(--color-text)]">{formatUsd(annualSavingsYr1)}</span> / yr savings · year 1
          </div>
        </div>
      </div>
    </motion.div>
  );
}
