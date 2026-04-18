// Hero number: payback years + 25yr NPV. Mirrors mobile/NPVHeroCard.

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
  return (
    <motion.div
      initial={{ y: 18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.52, ease: [0.2, 0.7, 0.2, 1] }}
      className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-6 sm:p-8"
    >
      <div className="font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
        break even in
      </div>
      <div className="mt-1 flex items-end gap-2">
        <span className="tabular-nums text-[84px] font-bold leading-none tracking-tight text-[color:var(--color-accent)] sm:text-[112px]">
          {paybackYears.toFixed(1)}
        </span>
        <span className="mb-3 text-xl font-semibold tracking-tight text-[color:var(--color-accent)] sm:text-2xl">
          yrs
        </span>
      </div>
      <div className="my-5 h-px bg-[color:var(--color-border)]" />
      <div className="font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
        25-year net present value
      </div>
      <div className="mt-1 tabular-nums text-3xl font-bold tracking-tight text-[color:var(--color-text)] sm:text-5xl">
        {formatUsd(npv25yrUsd)}
      </div>
      <div className="mt-2 font-mono text-sm text-[color:var(--color-text-muted)]">
        ≈ {formatUsd(annualSavingsYr1)}/yr in year 1 savings
      </div>
    </motion.div>
  );
}
