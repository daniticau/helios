'use client';

// Top nav. Shows the brand, a link into /install, and an auth avatar when
// the user is signed in. When Supabase isn't configured, the avatar slot
// renders a muted "sign in" link that won't break the build.

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

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[color:var(--color-accent)]" />
          <span className="text-sm font-bold tracking-[0.35em] lowercase text-[color:var(--color-accent)]">
            helios
          </span>
        </Link>

        <nav className="flex items-center gap-6 text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
          <Link
            href="/install"
            className={
              pathname?.startsWith('/install')
                ? 'text-[color:var(--color-accent)]'
                : 'hover:text-[color:var(--color-text)]'
            }
          >
            install
          </Link>
          <a
            href="https://github.com/daniticau/helios"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline hover:text-[color:var(--color-text)]"
          >
            github
          </a>
          {loading ? (
            <span className="h-8 w-8 rounded-full bg-[color:var(--color-card)]" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <span
                title={user.email ?? ''}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-card)] text-xs font-semibold text-[color:var(--color-accent)]"
              >
                {initial}
              </span>
              <button
                onClick={handleSignOut}
                className="font-mono text-[10px] text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)]"
              >
                sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-1.5 text-[10px] tracking-[0.25em] text-[color:var(--color-text)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
            >
              sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
