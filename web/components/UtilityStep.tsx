'use client';

// Step 2: utility + bill + kWh. Four utility tiles + two numeric inputs.

import { useState } from 'react';
import { UTILITIES, type UserProfile, type UtilityCode } from '@/lib/types';

interface UtilityStepProps {
  initial: Partial<UserProfile>;
  onSubmit: (patch: Partial<UserProfile>) => void;
  onBack: () => void;
}

const UTILITY_SHORT: Record<UtilityCode, string> = {
  PGE: 'PG&E',
  SCE: 'SCE',
  SDGE: 'SDG&E',
  LADWP: 'LADWP',
  OTHER: 'OTHER',
};

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
    <div className="space-y-10">
      <header className="space-y-5">
        <h2
          className="type-display-soft text-[color:var(--color-text)]"
          style={{ fontSize: 'clamp(38px, 5vw, 62px)', lineHeight: 1.0 }}
        >
          Your utility,{' '}
          <span className="type-display-italic text-[color:var(--color-accent)]">and last bill.</span>
        </h2>

        <p className="max-w-xl text-[16px] leading-[1.65] text-[color:var(--color-text-muted)]">
          Utility picks your TOU plan, which determines retail and NEM 3.0 export
          rates. Monthly kWh anchors the system-size recommendation.
        </p>
      </header>

      <div className="space-y-3">
        <label className="type-label">utility</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {UTILITIES.map((u) => {
            const active = utility === u.code;
            return (
              <button
                key={u.code}
                type="button"
                // aria-label overrides the button's accessible name to the
                // short utility code, so screen readers announce "SCE" and
                // Playwright's `getByRole('button', { name: /^SCE$/ })`
                // matches cleanly.
                aria-label={UTILITY_SHORT[u.code]}
                aria-pressed={active}
                onClick={() => setUtility(u.code)}
                className={`group relative overflow-hidden border px-4 py-3.5 text-left transition ${
                  active
                    ? 'border-[color:var(--color-accent)] bg-[color:var(--color-card-elevated)] shadow-[inset_0_0_0_1px_rgba(245,215,110,0.25)]'
                    : 'border-[color:var(--color-border)] bg-[color:var(--color-card)]/60 hover:border-[color:var(--color-accent)]/40 hover:bg-[color:var(--color-card)]'
                }`}
              >
                <div
                  aria-hidden="true"
                  className={`text-[17px] font-semibold tracking-tight ${
                    active ? 'text-[color:var(--color-accent)]' : 'text-[color:var(--color-text)]'
                  }`}
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {UTILITY_SHORT[u.code]}
                </div>
                <div
                  aria-hidden="true"
                  className="mt-1 text-[11.5px] leading-tight text-[color:var(--color-text-muted)]"
                >
                  {u.label.replace(/^[A-Z&]+\s*(\(.+?\))?\s*/, '').trim() || u.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <NumberField
          id="bill"
          label="monthly bill (usd)"
          prefix="$"
          suffix=""
          value={monthlyBill}
          onChange={(v) => setMonthlyBill(v.replace(/[^0-9.]/g, ''))}
          placeholder="240"
        />
        <NumberField
          id="kwh"
          label="monthly kwh"
          prefix=""
          suffix="kWh"
          value={monthlyKwh}
          onChange={(v) => setMonthlyKwh(v.replace(/[^0-9.]/g, ''))}
          placeholder="650"
        />
      </div>

      <div className="flex items-center gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="group inline-flex items-center gap-2 border border-[color:var(--color-border)] bg-[color:var(--color-card)]/60 px-5 py-3.5 text-[12px] text-[color:var(--color-text-muted)] transition hover:border-[color:var(--color-accent)]/50 hover:text-[color:var(--color-text)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span>←</span>
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
          className="group relative flex flex-1 items-center justify-between overflow-hidden rounded-sm bg-[color:var(--color-accent)] px-6 py-3.5 text-[13px] font-semibold text-[color:var(--color-bg)] transition disabled:cursor-not-allowed disabled:opacity-35"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span className="relative z-10">run the numbers</span>
          <span className="relative z-10 text-lg">→</span>
          <span className="absolute inset-0 -translate-x-full bg-[color:var(--color-accent-warm)] transition-transform duration-500 group-enabled:group-hover:translate-x-0" />
        </button>
      </div>
    </div>
  );
}

function NumberField({
  id,
  label,
  prefix,
  suffix,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  prefix: string;
  suffix: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="type-label">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--color-accent)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {prefix}
          </span>
        )}
        <input
          id={id}
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)] py-4 text-[17px] text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-dim)] focus:border-[color:var(--color-accent)] focus:outline-none ${
            prefix ? 'pl-9' : 'pl-4'
          } ${suffix ? 'pr-14' : 'pr-4'}`}
          style={{ fontFamily: 'var(--font-mono)' }}
        />
        {suffix && (
          <span
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-[color:var(--color-text-dim)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
