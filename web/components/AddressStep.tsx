'use client';

// Step 1: address capture. "Use demo address" is the frictionless-demo
// path for judges.

import { useState } from 'react';
import { DEMO_PROFILE, type UserProfile } from '@/lib/types';

interface AddressStepProps {
  initialAddress?: string;
  onContinue: (patch: Partial<UserProfile> & { address: string }) => void;
  onUseDemo: () => void;
}

export function AddressStep({ initialAddress, onContinue, onUseDemo }: AddressStepProps) {
  const [address, setAddress] = useState(initialAddress ?? '');
  const canContinue = address.trim().length > 3;

  return (
    <div className="space-y-10">
      <header className="space-y-5">
        <h2
          className="type-display-soft text-[color:var(--color-text)]"
          style={{ fontSize: 'clamp(38px, 5vw, 62px)', lineHeight: 1.0 }}
        >
          Where are we running{' '}
          <span className="type-display-italic text-[color:var(--color-accent)]">the numbers</span>?
        </h2>

        <p className="max-w-xl text-[16px] leading-[1.65] text-[color:var(--color-text-muted)]">
          Address resolves to your utility, solar irradiance, permit velocity, and
          local installer pricing. All ten lookups fan out in parallel when you
          continue.
        </p>
      </header>

      <div className="space-y-3">
        <label htmlFor="address" className="type-label">
          street address
        </label>
        <input
          id="address"
          type="text"
          autoComplete="street-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="9500 Gilman Dr, La Jolla, CA"
          className="w-full rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-5 py-4 text-[15px] text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-dim)] focus:border-[color:var(--color-accent)] focus:outline-none"
          style={{ fontFamily: 'var(--font-mono)' }}
        />
      </div>

      <button
        type="button"
        onClick={() => {
          setAddress(DEMO_PROFILE.address);
          onUseDemo();
        }}
        className="group inline-flex items-center gap-3 border border-[color:var(--color-hairline)] bg-[color:var(--color-card)]/60 px-4 py-2.5 text-left transition hover:border-[color:var(--color-accent)]/50 hover:bg-[color:var(--color-card)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-success)]"
          style={{ boxShadow: '0 0 5px rgba(135,214,125,0.8)' }}
        />
        <span className="text-[12px] text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-text)]">
          use the demo address (la jolla, sdge)
        </span>
      </button>

      <div className="pt-4">
        <button
          type="button"
          disabled={!canContinue}
          onClick={() => onContinue({ address: address.trim() })}
          className="group relative inline-flex w-full items-center justify-between overflow-hidden rounded-sm bg-[color:var(--color-accent)] px-7 py-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-bg)] transition disabled:cursor-not-allowed disabled:opacity-35"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span className="relative z-10">continue · step 02</span>
          <span className="relative z-10 text-lg">→</span>
          <span className="absolute inset-0 -translate-x-full bg-[color:var(--color-accent-warm)] transition-transform duration-500 group-enabled:group-hover:translate-x-0" />
        </button>
      </div>
    </div>
  );
}
