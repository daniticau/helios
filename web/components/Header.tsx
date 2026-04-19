'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export function Header() {
  const pathname = usePathname();
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
    <header className="border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/75 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-6 py-5">
        <Link href="/" className="group flex items-center gap-3" aria-label="helios home">
          <SunMark />
          <span
            className="type-display-small text-[color:var(--color-text)]"
            style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}
          >
            helios
          </span>
        </Link>

        <nav
          className="flex items-center gap-7"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <Link
            href="/install"
            className={`text-xs uppercase tracking-[0.14em] transition ${
              installActive
                ? 'text-[color:var(--color-accent)]'
                : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]'
            }`}
          >
            install
          </Link>
          <a
            href="https://github.com/daniticau/helios"
            target="_blank"
            rel="noreferrer"
            className="hidden text-xs uppercase tracking-[0.14em] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] sm:inline"
          >
            source
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
                className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-text-dim)] hover:text-[color:var(--color-accent)]"
              >
                sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className={`text-xs uppercase tracking-[0.14em] transition ${
                loginActive
                  ? 'text-[color:var(--color-accent)]'
                  : 'text-[color:var(--color-text)] hover:text-[color:var(--color-accent)]'
              }`}
            >
              sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function SunMark() {
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
