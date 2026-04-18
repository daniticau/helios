'use client';

// Step 2: utility picker + monthly bill. After submit, parent kicks the ROI
// request and pivots to the ticker view.

import { useState } from 'react';
import { UTILITIES, type UserProfile, type UtilityCode } from '@/lib/types';

interface UtilityStepProps {
  initial: Partial<UserProfile>;
  onSubmit: (patch: Partial<UserProfile>) => void;
  onBack: () => void;
}

export function UtilityStep({ initial, onSubmit, onBack }: UtilityStepProps) {
  const [utility, setUtility] = useState<UtilityCode>(initial.utility ?? 'SDGE');
  const [monthlyBill, setMonthlyBill] = useState<string>(
    initial.monthly_bill_usd ? String(initial.monthly_bill_usd) : '240'
  );
  const [monthlyKwh, setMonthlyKwh] = useState<string>(
    initial.monthly_kwh ? String(initial.monthly_kwh) : '650'
  );

  const billNum = Number(monthlyBill);
  const kwhNum = Number(monthlyKwh);
  const canSubmit = billNum > 0 && kwhNum > 0;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-text-dim)]">
          step 2 of 2
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[color:var(--color-text)] sm:text-4xl">
          Your utility and bill
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-[color:var(--color-text-muted)]">
          Utility decides your time-of-use plan, which decides retail and export rates.
          Monthly kWh anchors the system-size recommendation.
        </p>
      </div>

      <div className="space-y-2">
        <label className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-text-muted)]">
          utility
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {UTILITIES.map((u) => (
            <button
              key={u.code}
              type="button"
              onClick={() => setUtility(u.code)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                utility === u.code
                  ? 'border-[color:var(--color-accent)] bg-[color:var(--color-card-elevated)]'
                  : 'border-[color:var(--color-border)] bg-[color:var(--color-card)] hover:border-[color:var(--color-text-muted)]'
              }`}
            >
              <div className="font-mono text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
                {u.code.toLowerCase()}
              </div>
              <div className="mt-0.5 text-sm text-[color:var(--color-text)]">{u.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="bill"
            className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-text-muted)]"
          >
            monthly bill (usd)
          </label>
          <input
            id="bill"
            inputMode="numeric"
            value={monthlyBill}
            onChange={(e) => setMonthlyBill(e.target.value.replace(/[^0-9.]/g, ''))}
            className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-4 py-3.5 text-[color:var(--color-text)] focus:border-[color:var(--color-accent)] focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="kwh"
            className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-text-muted)]"
          >
            monthly kwh
          </label>
          <input
            id="kwh"
            inputMode="numeric"
            value={monthlyKwh}
            onChange={(e) => setMonthlyKwh(e.target.value.replace(/[^0-9.]/g, ''))}
            className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-4 py-3.5 text-[color:var(--color-text)] focus:border-[color:var(--color-accent)] focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-5 py-3 text-sm text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
        >
          back
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() =>
            onSubmit({
              utility,
              monthly_bill_usd: billNum,
              monthly_kwh: kwhNum,
            })
          }
          className="flex-1 rounded-xl bg-[color:var(--color-accent)] px-6 py-3.5 text-base font-semibold text-[color:var(--color-bg)] transition disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105"
        >
          run the numbers
        </button>
      </div>
    </div>
  );
}
