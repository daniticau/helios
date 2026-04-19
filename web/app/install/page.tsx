'use client';

// Mode A web flow: address → utility → ticker → result.

import { AnimatePresence, motion } from 'framer-motion';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { AddressStep } from '@/components/AddressStep';
import { Header } from '@/components/Header';
import { OrthogonalTicker } from '@/components/OrthogonalTicker';
import { ResultScreen } from '@/components/ResultScreen';
import { SiteFooter } from '@/components/SiteFooter';
import { UtilityStep } from '@/components/UtilityStep';
import { saveProfile } from '@/lib/savedProfile';
import { createClient, isSupabaseConfigured } from '@/lib/supabase';
import {
  DEMO_PROFILE,
  type OrthogonalCallLog,
  type ROIResult,
  type UserProfile,
} from '@/lib/types';

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
  const [calls, setCalls] = useState<OrthogonalCallLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const fromLogin = params?.get('from') === 'login';

  const closeStream = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);

  useEffect(() => closeStream, [closeStream]);

  const runRoi = useCallback(
    async (p: UserProfile) => {
      closeStream();
      setStep('running');
      setError(null);
      setCalls([]);
      setResult(null);
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (isSupabaseConfigured()) {
          const supabase = createClient();
          const { data } = await supabase.auth.getSession();
          if (data.session?.access_token) {
            headers['Authorization'] = `Bearer ${data.session.access_token}`;
          }
        }
        const startRes = await fetch('/api/roi/start', {
          method: 'POST',
          headers,
          body: JSON.stringify({ profile: p }),
        });
        if (!startRes.ok) {
          const text = await startRes.text();
          throw new Error(`${startRes.status}: ${text}`);
        }
        const { job_id } = (await startRes.json()) as { job_id: string };

        const es = new EventSource(`/api/roi/stream/${encodeURIComponent(job_id)}`);
        esRef.current = es;

        es.addEventListener('call', (ev) => {
          try {
            const log = JSON.parse((ev as MessageEvent).data) as OrthogonalCallLog;
            setCalls((prev) => [...prev, log]);
          } catch {
            // Malformed event — skip silently rather than killing the stream.
          }
        });

        es.addEventListener('result', (ev) => {
          try {
            const r = JSON.parse((ev as MessageEvent).data) as ROIResult;
            setResult(r);
            setStep('result');
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setStep('error');
          }
          closeStream();
        });

        es.addEventListener('error', (ev) => {
          // Two cases: (1) backend emitted an SSE 'error' event with data,
          // (2) connection-level failure (no data on the MessageEvent).
          const data = (ev as MessageEvent).data;
          if (data) {
            try {
              const parsed = JSON.parse(data) as { message?: string };
              setError(parsed.message ?? String(data));
            } catch {
              setError(String(data));
            }
            setStep('error');
            closeStream();
            return;
          }
          if (es.readyState === EventSource.CLOSED) {
            setError('stream closed before result arrived');
            setStep('error');
            closeStream();
          }
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStep('error');
      }
    },
    [closeStream]
  );

  const handleAddressContinue = (
    patch: Partial<UserProfile> & { address: string; lat: number; lng: number }
  ) => {
    setProfile((p) => ({ ...p, ...patch }));
    setStep('utility');
  };

  const handleUtilitySubmit = (patch: Partial<UserProfile>) => {
    const merged: UserProfile = { ...profile, ...patch } as UserProfile;
    setProfile(merged);
    // Persist so /live hydrates with this user's real profile next time.
    saveProfile(merged);
    runRoi(merged);
  };

  return (
    <div className="min-h-screen">
      <Header />

      <ProgressStrip step={step} />

      <main className="mx-auto max-w-[960px] px-6 py-10 sm:py-16">
        {fromLogin && step === 'address' && (
          <div
            className="mb-8 inline-flex items-center gap-2 rounded-sm border border-[color:var(--color-accent)]/30 bg-[color:var(--color-card)]/60 px-4 py-2 type-eyebrow type-eyebrow-accent"
          >
            <span
              className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)]"
              style={{ boxShadow: '0 0 5px rgba(245,215,110,0.8)' }}
            />
            signed in
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
              <OrthogonalTicker calls={calls} isRunning={true} live />
            </motion.section>
          )}

          {step === 'result' && result && (
            <ResultScreen
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
                  className="type-eyebrow"
                  style={{ color: 'var(--color-error)' }}
                >
                  backend fault
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
                className="rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-6 py-3 text-[12px] text-[color:var(--color-text)] hover:border-[color:var(--color-accent)]"
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
      <div className="mx-auto flex max-w-[1280px] items-center gap-4 overflow-x-auto scrollbar-hidden px-6 py-3">
        {STEP_ORDER.map((s, i) => {
          const active = i === currentIdx;
          const done = i < currentIdx;
          const numColor = active
            ? 'text-[color:var(--color-accent)]'
            : done
              ? 'text-[color:var(--color-text-muted)]'
              : 'text-[color:var(--color-text-dimmer)]';
          const labelColor = active
            ? 'text-[color:var(--color-text)]'
            : done
              ? 'text-[color:var(--color-text-muted)]'
              : 'text-[color:var(--color-text-dimmer)]';
          return (
            <div key={s} className="flex items-center gap-2">
              <span className={`text-[12px] tabular-nums ${numColor}`}>
                {i === 0 ? 'step 01' : `0${i + 1}`}
              </span>
              <span className={`text-[12px] ${labelColor}`}>
                {STEP_LABELS[s]}
              </span>
              {i < STEP_ORDER.length - 1 && (
                <span className="ml-1 text-[color:var(--color-text-dimmer)]">·</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------- running state hero -------

function RunningHero() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 type-eyebrow type-eyebrow-accent">
        <span
          className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)] anim-pulse-dot"
          style={{ boxShadow: '0 0 6px rgba(245,215,110,0.8)' }}
        />
        orchestrating
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
        demographics, installer reviews, carbon price. One unified SDK,
        parallel fan-out. Latencies below are the actual wire times.
      </p>
    </div>
  );
}

