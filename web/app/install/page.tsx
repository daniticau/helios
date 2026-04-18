'use client';

// Mode A web flow: address → utility → ticker → result. Everything happens
// client-side (fully interactive) once the page mounts. The ROI POST goes
// through /api/roi which proxies to the Python backend.

import { AnimatePresence, motion } from 'framer-motion';
import { Suspense, useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { AddressStep } from '@/components/AddressStep';
import { BreakdownCard } from '@/components/BreakdownCard';
import { Header } from '@/components/Header';
import { NPVHeroCard } from '@/components/NPVHeroCard';
import { OrthogonalTicker } from '@/components/OrthogonalTicker';
import { UtilityStep } from '@/components/UtilityStep';
import { createClient, isSupabaseConfigured } from '@/lib/supabase';
import { DEMO_PROFILE, type ROIResult, type UserProfile } from '@/lib/types';

type Step = 'address' | 'utility' | 'running' | 'result' | 'error';

export default function InstallPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[color:var(--color-bg)]">
          <Header />
        </div>
      }
    >
      <InstallFlow />
    </Suspense>
  );
}

function InstallFlow() {
  const params = useSearchParams();
  const [step, setStep] = useState<Step>('address');
  const [profile, setProfile] = useState<UserProfile>(DEMO_PROFILE);
  const [result, setResult] = useState<ROIResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // If we came back from /login, show a small banner.
  const fromLogin = params?.get('from') === 'login';

  const runRoi = useCallback(
    async (p: UserProfile) => {
      setStep('running');
      setError(null);
      try {
        // Attach Bearer token when signed in — backend treats it as optional.
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (isSupabaseConfigured()) {
          const supabase = createClient();
          const { data } = await supabase.auth.getSession();
          if (data.session?.access_token) {
            headers['Authorization'] = `Bearer ${data.session.access_token}`;
          }
        }
        const res = await fetch('/api/roi', {
          method: 'POST',
          headers,
          body: JSON.stringify({ profile: p }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`${res.status}: ${text}`);
        }
        const json = (await res.json()) as ROIResult;
        setResult(json);
        setStep('result');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStep('error');
      }
    },
    []
  );

  const handleAddressContinue = (patch: Partial<UserProfile> & { address: string }) => {
    setProfile((p) => ({ ...p, ...patch }));
    setStep('utility');
  };

  const handleUseDemo = () => {
    setProfile(DEMO_PROFILE);
    setStep('utility');
  };

  const handleUtilitySubmit = (patch: Partial<UserProfile>) => {
    const merged: UserProfile = { ...profile, ...patch } as UserProfile;
    setProfile(merged);
    runRoi(merged);
  };

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)]">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-10 sm:py-16">
        {fromLogin && step === 'address' && (
          <div className="mb-6 rounded-lg border border-[color:var(--color-accent)]/40 bg-[color:var(--color-card)] px-4 py-2.5 font-mono text-xs text-[color:var(--color-accent)]">
            signed in. continue your estimate.
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'address' && (
            <motion.section
              key="address"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.32 }}
            >
              <AddressStep
                initialAddress={profile.address}
                onContinue={handleAddressContinue}
                onUseDemo={handleUseDemo}
              />
            </motion.section>
          )}

          {step === 'utility' && (
            <motion.section
              key="utility"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.32 }}
            >
              <UtilityStep
                initial={profile}
                onSubmit={handleUtilitySubmit}
                onBack={() => setStep('address')}
              />
            </motion.section>
          )}

          {step === 'running' && (
            <motion.section
              key="running"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-accent)]">
                  orchestrating
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-[color:var(--color-text)] sm:text-3xl">
                  Ten APIs in flight…
                </h2>
                <p className="text-sm text-[color:var(--color-text-muted)]">
                  Tariff, weather, permits, pricing, financing, news, property value,
                  demographics, reviews, and carbon price — one Orthogonal SDK,
                  parallel fan-out.
                </p>
              </div>
              <OrthogonalTicker calls={[]} isRunning={true} />
            </motion.section>
          )}

          {step === 'result' && result && (
            <ResultView
              result={result}
              profile={profile}
              onRunAgain={() => {
                setResult(null);
                setStep('address');
              }}
            />
          )}

          {step === 'error' && (
            <motion.section
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="rounded-xl border border-[color:var(--color-error)]/40 bg-[color:var(--color-card)] p-5">
                <div className="font-mono text-xs uppercase tracking-wider text-[color:var(--color-error)]">
                  backend error
                </div>
                <div className="mt-2 font-mono text-sm text-[color:var(--color-text)]">
                  {error}
                </div>
                <div className="mt-3 text-xs text-[color:var(--color-text-muted)]">
                  Check that the Python backend is running at the configured
                  BACKEND_URL.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep('address')}
                className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-5 py-3 text-sm text-[color:var(--color-text)]"
              >
                start over
              </button>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function ResultView({
  result,
  profile,
  onRunAgain,
}: {
  result: ROIResult;
  profile: UserProfile;
  onRunAgain: () => void;
}) {
  return (
    <motion.section
      key="result"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-accent)]">
          helios · mode a
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-success)]" />
          <span className="font-mono text-[10px] tracking-wider text-[color:var(--color-text-muted)]">
            settled
          </span>
        </div>
      </div>

      <NPVHeroCard
        paybackYears={result.payback_years}
        npv25yrUsd={result.npv_25yr_usd}
        annualSavingsYr1={result.annual_savings_yr1_usd}
      />

      <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-5">
        <div className="mb-1 font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
          recommended system
        </div>
        <div className="flex items-end gap-4">
          <div className="tabular-nums text-3xl font-bold text-[color:var(--color-text)]">
            {result.recommended_system.solar_kw.toFixed(1)}
            <span className="ml-1 text-lg text-[color:var(--color-text-muted)]">kW</span>
          </div>
          <div className="text-[color:var(--color-text-muted)]">+</div>
          <div className="tabular-nums text-3xl font-bold text-[color:var(--color-text)]">
            {result.recommended_system.battery_kwh.toFixed(1)}
            <span className="ml-1 text-lg text-[color:var(--color-text-muted)]">kWh</span>
          </div>
        </div>
        <div className="mt-2 text-sm text-[color:var(--color-text-muted)]">
          Sized to cover your {profile.monthly_kwh.toFixed(0)} kWh/mo load with battery
          capacity for peak-hour arbitrage.
        </div>
      </div>

      {result.zenpower_permits_in_zip != null && (
        <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-5">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
            zenpower dataset · credibility
          </div>
          <div className="mt-1 text-sm text-[color:var(--color-text)]">
            <span className="font-semibold">{result.zenpower_permits_in_zip}</span> recent
            installs in your ZIP averaging{' '}
            <span className="font-semibold">
              {result.zenpower_avg_system_kw?.toFixed(1)} kW
            </span>
            .
          </div>
        </div>
      )}

      <BreakdownCard
        upfrontCostUsd={result.upfront_cost_usd}
        federalItcUsd={result.federal_itc_usd}
        netUpfrontUsd={result.net_upfront_usd}
        annualSavingsYr1Usd={result.annual_savings_yr1_usd}
        co2AvoidedTons25yr={result.co2_avoided_tons_25yr}
        socialCostOfCarbonUsd={result.social_cost_of_carbon_usd}
        roiPctOfHomeValue={result.roi_pct_of_home_value}
        installerQuotesRange={result.installer_quotes_range}
        financingAprRange={result.financing_apr_range}
      />

      <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-5">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
          tariff
        </div>
        <div className="mt-1 font-mono text-sm leading-5 text-[color:var(--color-text)]">
          {result.tariff_summary}
        </div>
      </div>

      <div className="space-y-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
          what we looked up
        </div>
        <div className="font-mono text-xs text-[color:var(--color-text-dim)]">
          {result.orthogonal_calls_made.length} Orthogonal APIs fanned out in parallel
        </div>
        <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-3">
          <OrthogonalTicker
            calls={result.orthogonal_calls_made}
            isRunning={false}
            compact
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onRunAgain}
        className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card-elevated)] px-6 py-3.5 text-sm font-semibold text-[color:var(--color-text)]"
      >
        run again with different inputs
      </button>
    </motion.section>
  );
}
