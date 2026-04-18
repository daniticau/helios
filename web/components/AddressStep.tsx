'use client';

// Step 1 of the install flow. Captures the street address and advances.

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
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-text-dim)]">
          step 1 of 2
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[color:var(--color-text)] sm:text-4xl">
          Where are we running the numbers?
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-[color:var(--color-text-muted)]">
          Address tells us your utility, irradiance, permit velocity, and local installer
          pricing. All ten lookups fan out in parallel — keep going to see it happen.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="address"
          className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-text-muted)]"
        >
          street address
        </label>
        <input
          id="address"
          type="text"
          autoComplete="street-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="9500 Gilman Dr, La Jolla, CA"
          className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-4 py-3.5 text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-dim)] focus:border-[color:var(--color-accent)] focus:outline-none"
        />
      </div>

      <button
        type="button"
        onClick={() => {
          setAddress(DEMO_PROFILE.address);
          onUseDemo();
        }}
        className="group inline-flex items-center gap-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] px-3.5 py-2"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-success)]" />
        <span className="font-mono text-xs text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-text)]">
          use the demo address (La Jolla · SDGE)
        </span>
      </button>

      <div className="pt-2">
        <button
          type="button"
          disabled={!canContinue}
          onClick={() => onContinue({ address: address.trim() })}
          className="w-full rounded-xl bg-[color:var(--color-accent)] px-6 py-3.5 text-center text-base font-semibold text-[color:var(--color-bg)] transition disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105"
        >
          continue
        </button>
      </div>
    </div>
  );
}
