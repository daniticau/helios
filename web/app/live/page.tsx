'use client';

// /live — live dashboard for existing solar-owner households. Mirrors
// mobile Mode B: POST /api/live every refresh, render the current action,
// a retail-vs-export rate compare, the battery gauge, the peak window
// banner, the 24h forecast, and a compact ticker recap of data sources.

import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';

import { ActionHeroCard } from '@/components/ActionHeroCard';
import { BatteryGauge } from '@/components/BatteryGauge';
import { ForecastChart } from '@/components/ForecastChart';
import { Header } from '@/components/Header';
import { OrthogonalTicker } from '@/components/OrthogonalTicker';
import { PeakWindowBanner } from '@/components/PeakWindowBanner';
import { RateCompare } from '@/components/RateCompare';
import { SiteFooter } from '@/components/SiteFooter';
import { DEMO_PROFILE_EXISTING_OWNER } from '@/lib/demoProfile';
import { buildMockHouseholdState } from '@/lib/mockHouseholdState';
import { loadSavedProfile } from '@/lib/savedProfile';
import { createClient, isSupabaseConfigured } from '@/lib/supabase';
import type { HouseholdState, LiveRecommendation, UserProfile } from '@/lib/types';

const POLL_INTERVAL_MS = 60_000;

// If the saved profile doesn't declare solar/battery, fall back to the
// existing-owner demo sizing so the dashboard still has something to show.
function normalizeProfile(p: UserProfile): UserProfile {
  if (p.has_solar && p.solar_kw && p.has_battery && p.battery_kwh) return p;
  return {
    ...p,
    has_solar: true,
    solar_kw: p.solar_kw ?? DEMO_PROFILE_EXISTING_OWNER.solar_kw,
    has_battery: true,
    battery_kwh: p.battery_kwh ?? DEMO_PROFILE_EXISTING_OWNER.battery_kwh,
    battery_max_kw: p.battery_max_kw ?? DEMO_PROFILE_EXISTING_OWNER.battery_max_kw,
    tariff_plan: p.tariff_plan ?? DEMO_PROFILE_EXISTING_OWNER.tariff_plan,
  };
}

export default function LivePage() {
  const [profile, setProfile] = useState<UserProfile>(DEMO_PROFILE_EXISTING_OWNER);
  const [profileSource, setProfileSource] = useState<'saved' | 'demo'>('demo');

  useEffect(() => {
    const saved = loadSavedProfile();
    if (saved) {
      setProfile(normalizeProfile(saved));
      setProfileSource('saved');
    }
  }, []);
  const [state, setState] = useState<HouseholdState>(() =>
    buildMockHouseholdState()
  );
  const [rec, setRec] = useState<LiveRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const fetchLive = useCallback(async () => {
    setLoading(true);
    setError(null);
    const now = new Date();
    const current = buildMockHouseholdState(now);
    setState(current);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          headers['Authorization'] = `Bearer ${data.session.access_token}`;
        }
      }
      const res = await fetch('/api/live', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          profile,
          current_state: current,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text.slice(0, 200)}`);
      }
      const data = (await res.json()) as LiveRecommendation;
      setRec(data);
      setRefreshedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchLive();
  }, [fetchLive]);

  // 60s auto-refresh, paused while the tab is hidden. Matches the mobile
  // Mode B cadence (see mobile/src/modeB/services/liveSync.ts).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (interval !== null) return;
      interval = setInterval(fetchLive, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchLive]);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-[960px] px-6 py-10 sm:py-14">
        {/* Header strip */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="type-eyebrow type-eyebrow-accent">live</div>
            <h1
              className="mt-2 type-display-soft text-[color:var(--color-text)]"
              style={{
                fontSize: 'clamp(28px, 4vw, 44px)',
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
              }}
            >
              {profile.address.split(',')[0]}
            </h1>
            <div
              className="mt-1 text-[13px] text-[color:var(--color-text-muted)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {profile.solar_kw}kW solar · {profile.battery_kwh}kWh battery ·{' '}
              {profile.utility}
            </div>
            <div
              className="mt-1 text-[11px] text-[color:var(--color-text-dim)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {profileSource === 'saved'
                ? 'profile: from your last /install run'
                : 'profile: demo existing-owner · run /install to use your own'}
            </div>
          </div>

          <button
            type="button"
            onClick={fetchLive}
            disabled={loading}
            className="rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/70 px-4 py-2 text-[12px] text-[color:var(--color-text)] transition hover:border-[color:var(--color-accent)] disabled:opacity-50"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {loading ? 'refreshing…' : 'refresh'}
          </button>
        </div>

        {error && !rec && (
          <div
            className="mb-6 rounded-sm border px-5 py-4"
            style={{
              borderColor: 'var(--color-error)',
              backgroundColor: 'rgba(232, 74, 69, 0.08)',
            }}
          >
            <div className="type-eyebrow" style={{ color: 'var(--color-error)' }}>
              backend unreachable
            </div>
            <div
              className="mt-2 text-[13px] text-[color:var(--color-text)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {error}
            </div>
            <div className="mt-2 text-[12px] text-[color:var(--color-text-muted)]">
              Make sure the Python backend is running at the configured
              BACKEND_URL.
            </div>
          </div>
        )}

        {!rec && loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/50 px-6 py-12 text-center text-[14px] text-[color:var(--color-text-muted)]"
          >
            Fetching live rates…
          </motion.div>
        )}

        {rec && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {rec.next_peak_window && (
              <PeakWindowBanner peak={rec.next_peak_window} />
            )}

            <ActionHeroCard rec={rec} />

            <RateCompare
              retailRate={rec.retail_rate_now}
              exportRate={rec.export_rate_now}
              action={rec.action}
            />

            <div className="space-y-2">
              <div
                className="text-[11px] text-[color:var(--color-text-dim)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                simulated household telemetry · rates &amp; forecast are live
              </div>
              <BatteryGauge
                state={state}
                action={rec.action}
                batteryKwh={profile.battery_kwh ?? 13.5}
              />
            </div>

            <ForecastChart
              forecast={rec.forecast_24h}
              peak={rec.next_peak_window}
              currentTime={new Date(state.timestamp)}
            />

            {/* Data sources recap */}
            <div className="space-y-3">
              <div className="type-eyebrow">data sources</div>
              <div className="rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/40 p-3">
                <OrthogonalTicker
                  calls={rec.orthogonal_calls_made}
                  isRunning={false}
                  compact
                />
              </div>
            </div>

            {refreshedAt && (
              <div
                className="text-center text-[11px] text-[color:var(--color-text-dim)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                refreshed {refreshedAt.toLocaleTimeString()}
              </div>
            )}
          </motion.section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
