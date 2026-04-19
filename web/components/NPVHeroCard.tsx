// Hero numbers: payback years (massive Fraunces) + 25yr NPV. The payoff
// after 20 seconds of fan-out.

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
      {/* sunburst decoration — DO NOT remove */}
      <div
        className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full border border-dashed border-[color:var(--color-accent)]/25 anim-sunbeam"
        style={{ animationDuration: '40s' }}
      />
      <div
        className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full border border-[color:var(--color-accent)]/15 anim-sunbeam"
        style={{ animationDuration: '26s', animationDirection: 'reverse' }}
      />

      <div className="relative px-7 py-9 sm:px-10 sm:py-12">
        {/* Payback */}
        <div className="space-y-2">
          <div className="type-eyebrow">break even in</div>
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
                className="mt-1 text-[12px] text-[color:var(--color-text-dim)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                to recover upfront
              </span>
            </div>
          </div>
        </div>

        {/* Hairline divider */}
        <div className="my-9 h-px bg-[color:var(--color-accent)]/25" />

        {/* NPV */}
        <div className="space-y-2">
          <div className="type-eyebrow">net present value, 25 yr</div>
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
            className="mt-2 text-[13px] text-[color:var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            about <span className="text-[color:var(--color-text)]">{formatUsd(annualSavingsYr1)}</span> per year in year-one savings
          </div>
        </div>
      </div>
    </motion.div>
  );
}
