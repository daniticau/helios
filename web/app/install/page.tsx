'use client';

// Mode A web flow: address → utility → ticker → result. Terminal-chrome
// progress strip at the top, editorial hero at every step.

import { AnimatePresence, motion } from 'framer-motion';
import { Suspense, useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { AddressStep } from '@/components/AddressStep';
import { BreakdownCard } from '@/components/BreakdownCard';
import { Header } from '@/components/Header';
import { NPVHeroCard } from '@/components/NPVHeroCard';
import { OrthogonalTicker } from '@/components/OrthogonalTicker';
import { SiteFooter } from '@/components/SiteFooter';
import { UtilityStep } from '@/components/UtilityStep';
import { createClient, isSupabaseConfigured } from '@/lib/supabase';
import { DEMO_PROFILE, type ROIResult, type UserProfile } from '@/lib/types';

type Step = 'address' | 'utility' | 'running' | 'result' | 'error';

const STEP_LABELS: Record<Step, string> = {
  address: 'address',
  utility: 'utility',
  running: 'fan-out',
  result: 'result',
  error: 'fault',
};

const STEP_ORDER: Step[] = ['address', 'utility', 'running', 'result'];

export default function InstallPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
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

  const fromLogin = params?.get('from') === 'login';

  const runRoi = useCallback(async (p: UserProfile) => {
    setStep('running');
    setError(null);
    try {
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
  }, []);

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
    <div className="min-h-screen">
      <Header />

      <ProgressStrip step={step} />

      <main className="mx-auto max-w-[960px] px-6 py-10 sm:py-16">
        {fromLogin && step === 'address' && (
          <div
            className="mb-8 inline-flex items-center gap-2 rounded-sm border border-[color:var(--color-accent)]/30 bg-[color:var(--color-card)]/60 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[color:var(--color-accent)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)]"
              style={{ boxShadow: '0 0 5px rgba(245,215,110,0.8)' }}
            />
            signed in · continue estimate
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'address' && (
            <motion.section
              key="address"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.34 }}
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.34 }}
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
              className="space-y-8"
            >
              <RunningHero />
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
              <div className="rounded-sm border border-[color:var(--color-error)]/40 bg-[color:var(--color-card)]/80 p-6">
                <div
                  className="text-[10.5px] uppercase tracking-[0.3em] text-[color:var(--color-error)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  ⚠ fault · backend
                </div>
                <div
                  className="mt-3 text-[14px] leading-6 text-[color:var(--color-text)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {error}
                </div>
                <div className="mt-3 text-[12px] text-[color:var(--color-text-muted)]">
                  Check that the Python backend is running at the configured BACKEND_URL.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep('address')}
                className="rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-6 py-3 text-[12px] uppercase tracking-[0.24em] text-[color:var(--color-text)] hover:border-[color:var(--color-accent)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                ← start over
              </button>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <SiteFooter />
    </div>
  );
}

// ------- progress strip -------

function ProgressStrip({ step }: { step: Step }) {
  const currentIdx = STEP_ORDER.indexOf(step === 'error' ? 'running' : step);
  return (
    <div
      className="border-b border-[color:var(--color-hairline)] bg-[color:var(--color-bg-deep)]/40"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-6 py-2.5">
        <div className="flex items-center gap-5 overflow-x-auto scrollbar-hidden">
          {STEP_ORDER.map((s, i) => {
            const active = i === currentIdx;
            const done = i < currentIdx;
            return (
              <div key={s} className="flex items-center gap-2">
                <span
                  className={`text-[9.5px] tabular-nums ${
                    active
                      ? 'text-[color:var(--color-accent)]'
                      : done
                        ? 'text-[color:var(--color-text-muted)]'
                        : 'text-[color:var(--color-text-dimmer)]'
                  }`}
                >
                  0{i + 1}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-[0.24em] ${
                    active
                      ? 'text-[color:var(--color-text)]'
                      : done
                        ? 'text-[color:var(--color-text-muted)] line-through decoration-[color:var(--color-text-dimmer)]'
                        : 'text-[color:var(--color-text-dimmer)]'
                  }`}
                >
                  {STEP_LABELS[s]}
                </span>
                {i < STEP_ORDER.length - 1 && (
                  <span className="text-[color:var(--color-text-dimmer)]">─</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="hidden text-[9.5px] uppercase tracking-[0.22em] text-[color:var(--color-text-dim)] sm:block">
          mode A ·{' '}
          <span className="text-[color:var(--color-accent)]">install decision</span>
        </div>
      </div>
    </div>
  );
}

// ------- running state hero -------

function RunningHero() {
  return (
    <div className="space-y-5">
      <div
        className="flex items-center gap-3 text-[10.5px] uppercase tracking-[0.32em] text-[color:var(--color-accent)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)] anim-pulse-dot"
          style={{ boxShadow: '0 0 6px rgba(245,215,110,0.8)' }}
        />
        orchestrating · real time
      </div>
      <h2
        className="type-display-soft text-[color:var(--color-text)]"
        style={{ fontSize: 'clamp(36px, 5vw, 60px)', lineHeight: 1.02 }}
      >
        Ten APIs,{' '}
        <span className="type-display-italic text-[color:var(--color-accent)]">in flight.</span>
      </h2>
      <p className="max-w-xl text-[15px] leading-[1.6] text-[color:var(--color-text-muted)]">
        Tariff, weather, permits, pricing, financing, rebate news, property value,
        demographics, installer reviews, carbon price — one Orthogonal SDK,
        parallel fan-out. Latencies you see below are the actual wire times.
      </p>
    </div>
  );
}

// ------- result view -------

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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div
        className="flex items-center justify-between text-[10.5px] uppercase tracking-[0.3em]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <span className="text-[color:var(--color-text-muted)]">
          // mode A · install decision
        </span>
        <div className="flex items-center gap-2 rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/70 px-3 py-1">
          <span
            className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-success)]"
            style={{ boxShadow: '0 0 6px rgba(135,214,125,0.8)' }}
          />
          <span className="text-[color:var(--color-text-muted)]">settled</span>
        </div>
      </div>

      <NPVHeroCard
        paybackYears={result.payback_years}
        npv25yrUsd={result.npv_25yr_usd}
        annualSavingsYr1={result.annual_savings_yr1_usd}
      />

      {/* recommended system */}
      <div className="overflow-hidden rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/70">
        <div
          className="flex items-center justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-deep)]/40 px-5 py-2.5 text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-text-dim)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span className="text-[color:var(--color-accent)]">▸ recommended system</span>
          <span>sized · annual load</span>
        </div>
        <div className="px-5 py-6">
          <div className="flex flex-wrap items-end gap-5">
            <SystemFigure value={result.recommended_system.solar_kw.toFixed(1)} unit="kW" label="solar" />
            <span
              className="mb-3 text-[color:var(--color-text-dim)]"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 20 }}
            >
              +
            </span>
            <SystemFigure value={result.recommended_system.battery_kwh.toFixed(1)} unit="kWh" label="battery" />
          </div>
          <div
            className="mt-5 text-[12.5px] leading-6 text-[color:var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            covers{' '}
            <span className="text-[color:var(--color-text)]">
              {profile.monthly_kwh.toFixed(0)} kWh/mo
            </span>{' '}
            load · battery capacity for peak-hour NEM 3.0 arbitrage
          </div>
        </div>
      </div>

      {/* ZenPower credibility */}
      {result.zenpower_permits_in_zip != null && (
        <div className="relative overflow-hidden rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/50 px-5 py-4">
          <div
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-accent)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <span>▸ zenpower dataset</span>
            <span className="text-[color:var(--color-text-dim)]">// credibility</span>
          </div>
          <div
            className="mt-2 text-[14.5px] leading-6 text-[color:var(--color-text)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <span className="text-[color:var(--color-accent)]">
              {result.zenpower_permits_in_zip}
            </span>{' '}
            recent installs in your ZIP averaging{' '}
            <span className="text-[color:var(--color-accent)]">
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

      {/* Tariff */}
      <div className="rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/50 px-5 py-4">
        <div
          className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-accent)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          ▸ tariff
        </div>
        <div
          className="mt-2 text-[13px] leading-[1.6] text-[color:var(--color-text)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {result.tariff_summary}
        </div>
      </div>

      {/* Ticker recap */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div
            className="text-[10.5px] uppercase tracking-[0.3em] text-[color:var(--color-accent)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            ▸ what we looked up
          </div>
          <div
            className="text-[10.5px] uppercase tracking-[0.24em] text-[color:var(--color-text-dim)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {result.orthogonal_calls_made.length} orthogonal apis · parallel
          </div>
        </div>
        <div className="rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/40 p-3">
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
        className="group relative flex w-full items-center justify-between overflow-hidden rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card-elevated)]/80 px-6 py-4 text-[12.5px] uppercase tracking-[0.24em] text-[color:var(--color-text)] transition hover:border-[color:var(--color-accent)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <span>run again · different inputs</span>
        <span className="text-[color:var(--color-accent)]">→</span>
      </button>
    </motion.section>
  );
}

function SystemFigure({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <div className="flex items-end gap-2">
      <span
        className="tabular-nums text-[color:var(--color-text)]"
        style={{
          fontFamily: 'var(--font-display)',
          fontVariationSettings: '"opsz" 144',
          fontSize: 56,
          fontWeight: 600,
          letterSpacing: '-0.04em',
          lineHeight: 0.9,
        }}
      >
        {value}
      </span>
      <div className="mb-2 flex flex-col">
        <span
          className="text-[15px] text-[color:var(--color-accent)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {unit}
        </span>
        <span
          className="text-[9.5px] uppercase tracking-[0.24em] text-[color:var(--color-text-dim)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
