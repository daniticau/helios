'use client';

// Terminal status bar. Brand left, nav + auth right. Live local clock
// drifts between pages so it feels like instrumentation, not decoration.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

function useClock() {
  const [now, setNow] = useState<string>(() => formatClock(new Date()));
  useEffect(() => {
    const id = setInterval(() => setNow(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatClock(d: Date): string {
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function Header() {
  const pathname = usePathname();
  const clock = useClock();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [configured]);

  const handleSignOut = async () => {
    if (!configured) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  const initial =
    user?.email?.[0]?.toUpperCase() ??
    user?.user_metadata?.name?.[0]?.toUpperCase() ??
    '?';

  const installActive = pathname?.startsWith('/install');
  const loginActive = pathname?.startsWith('/login');

  return (
    <>
      {/* Upper instrument strip — clock + coordinates + signal */}
      <div
        className="relative border-b border-[color:var(--color-hairline)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-6 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-text-dim)]">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--color-success)]"
                style={{ boxShadow: '0 0 6px rgba(135, 214, 125, 0.8)' }}
              />
              <span className="text-[color:var(--color-text-muted)]">helios online</span>
            </span>
            <span className="hidden sm:inline">
              32.8801°N 117.2340°W <span className="text-[color:var(--color-text-dimmer)]">·</span> la jolla
            </span>
          </div>
          <div className="flex items-center gap-5">
            <span className="hidden md:inline">datahacks 2026 · orthogonal</span>
            <span className="tabular-nums text-[color:var(--color-text-muted)]">
              t<span className="text-[color:var(--color-accent)]">{clock}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Masthead */}
      <header className="border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-6 py-5">
          <Link href="/" className="group flex items-end gap-3" aria-label="helios home">
            <SunMark />
            <div className="flex flex-col leading-none">
              <span
                className="type-display-small text-[color:var(--color-text)]"
                style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}
              >
                helios
              </span>
              <span
                className="mt-1 text-[9px] uppercase tracking-[0.32em] text-[color:var(--color-text-dim)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                solar · economics · agent
              </span>
            </div>
          </Link>

          <nav
            className="flex items-center gap-7"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <Link
              href="/install"
              className={`text-xs uppercase tracking-[0.22em] transition ${
                installActive
                  ? 'text-[color:var(--color-accent)]'
                  : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]'
              }`}
            >
              ▸ install
            </Link>
            <a
              href="https://github.com/daniticau/helios"
              target="_blank"
              rel="noreferrer"
              className="hidden text-xs uppercase tracking-[0.22em] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] sm:inline"
            >
              ▸ source
            </a>

            {loading ? (
              <span className="h-7 w-16 rounded-sm bg-[color:var(--color-card)]" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <span
                  title={user.email ?? ''}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-card)] text-[11px] font-semibold text-[color:var(--color-accent)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {initial}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-text-dim)] hover:text-[color:var(--color-accent)]"
                >
                  sign out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className={`relative text-[11px] uppercase tracking-[0.28em] transition ${
                  loginActive
                    ? 'text-[color:var(--color-accent)]'
                    : 'text-[color:var(--color-text)] hover:text-[color:var(--color-accent)]'
                }`}
              >
                <span className="text-[color:var(--color-text-dim)]">[</span> sign in{' '}
                <span className="text-[color:var(--color-text-dim)]">]</span>
              </Link>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}

function SunMark() {
  // Concentric dashed rings + inner solid disc. Rotates very slowly.
  return (
    <div className="relative h-10 w-10 shrink-0" aria-hidden>
      <div
        className="absolute inset-0 rounded-full border border-dashed border-[color:var(--color-accent)]/50 anim-sunbeam"
        style={{ animationDuration: '60s' }}
      />
      <div
        className="absolute inset-1.5 rounded-full border border-[color:var(--color-accent)]/30 anim-sunbeam"
        style={{ animationDuration: '45s', animationDirection: 'reverse' }}
      />
      <div className="absolute inset-[12px] rounded-full bg-[color:var(--color-accent)] shadow-[0_0_12px_rgba(245,215,110,0.6)]" />
    </div>
  );
}
