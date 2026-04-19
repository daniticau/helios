'use client';

// Magic link + GitHub OAuth via Supabase. When Supabase isn't configured,
// surface a placeholder banner but keep the layout present — auth handlers
// are no-ops.

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';

import { Header } from '@/components/Header';
import { SiteFooter } from '@/components/SiteFooter';
import { createClient, isSupabaseConfigured } from '@/lib/supabase';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <Header />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params?.get('redirect') ?? '/install?from=login';
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace(redirect);
    });
  }, [configured, redirect, router]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) {
      setError(
        'Auth not configured. Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.'
      );
      setStatus('error');
      return;
    }
    if (!email.trim()) return;
    setStatus('sending');
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}${redirect}`,
        },
      });
      if (error) throw error;
      setStatus('sent');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  };

  const handleGithub = async () => {
    if (!configured) {
      setError(
        'Auth not configured. Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.'
      );
      setStatus('error');
      return;
    }
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: `${window.location.origin}${redirect}` },
      });
      if (error) throw error;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="relative mx-auto flex max-w-[1280px] flex-col px-6 py-16 lg:flex-row lg:items-start lg:gap-20 lg:py-28">
        {/* LEFT — editorial */}
        <div className="lg:w-[44%] lg:sticky lg:top-28 lg:self-start">
          <div className="type-eyebrow type-eyebrow-accent">
            access · credentials
          </div>
          <h1
            className="mt-5 type-display-soft text-[color:var(--color-text)]"
            style={{ fontSize: 'clamp(44px, 6vw, 80px)', lineHeight: 1.02 }}
          >
            Save your{' '}
            <span className="type-display-italic text-[color:var(--color-accent)]">
              estimates.
            </span>
          </h1>
          <p className="mt-5 max-w-md text-[16px] leading-[1.65] text-[color:var(--color-text-muted)]">
            Anonymous runs always work, no signup required. Sign in to keep a
            history across web and mobile, save named scenarios, and share them.
          </p>
        </div>

        {/* RIGHT — credentials */}
        <div className="mt-12 w-full lg:mt-0 lg:flex-1">
          <div className="overflow-hidden rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/60 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.8)]">
            <div className="px-7 py-8 sm:px-10 sm:py-10">
              {!configured && (
                <div
                  className="mb-7 rounded-sm border border-[color:var(--color-warning)]/40 bg-[color:var(--color-bg-deep)]/50 px-4 py-3 text-[12px] text-[color:var(--color-warning)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  ⚠ placeholder mode. NEXT_PUBLIC_SUPABASE_* unset. See docs/DEPLOY.md.
                </div>
              )}

              {/* GitHub */}
              <button
                type="button"
                onClick={handleGithub}
                className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card-elevated)]/70 px-6 py-4 text-[12.5px] uppercase tracking-[0.18em] text-[color:var(--color-text)] transition hover:border-[color:var(--color-accent)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <svg className="relative z-10 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.484 17.523 2 12 2z"
                  />
                </svg>
                <span className="relative z-10">continue · github</span>
              </button>

              {/* divider */}
              <div className="my-7 flex items-center gap-3">
                <div className="h-px flex-1 bg-[color:var(--color-border)]" />
                <span
                  className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-text-dim)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  or
                </span>
                <div className="h-px flex-1 bg-[color:var(--color-border)]" />
              </div>

              {/* email */}
              {status === 'sent' ? (
                <div
                  className="rounded-sm border border-[color:var(--color-success)]/40 bg-[color:var(--color-card)]/60 p-5"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  <div className="type-eyebrow" style={{ color: 'var(--color-success)' }}>
                    magic link sent
                  </div>
                  <div className="mt-2 text-[14px] text-[color:var(--color-text)]">
                    Check <span className="text-[color:var(--color-accent)]">{email}</span>{' '}
                    for a link to sign in.
                  </div>
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-3">
                  {/* Label text is literally "email" so Playwright's
                      getByLabel(/^email$/) matches without whitespace noise. */}
                  <label htmlFor="email" className="type-label block">
                    email
                  </label>
                  <input
                    id="email"
                    type="email"
                    // Explicit aria-label guarantees the accessible name is
                    // exactly "email" regardless of how the visual label
                    // resolves through the a11y tree — so Playwright's
                    // getByLabel(/^email$/) is deterministic.
                    aria-label="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-bg-deep)]/50 px-4 py-3.5 text-[14px] text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-dim)] focus:border-[color:var(--color-accent)] focus:outline-none"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="group relative flex w-full items-center justify-between overflow-hidden rounded-sm bg-[color:var(--color-accent)] px-6 py-3.5 text-[12.5px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-bg)] disabled:opacity-40"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    <span className="relative z-10">
                      {status === 'sending' ? 'sending…' : 'send magic link'}
                    </span>
                    <span className="relative z-10 text-lg">→</span>
                    <span className="absolute inset-0 -translate-x-full bg-[color:var(--color-accent-warm)] transition-transform duration-500 group-enabled:group-hover:translate-x-0" />
                  </button>
                </form>
              )}

              {error && (
                <div
                  className="mt-5 rounded-sm border border-[color:var(--color-error)]/40 bg-[color:var(--color-card)]/60 p-3 text-[12px] text-[color:var(--color-error)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  ⚠ {error}
                </div>
              )}

              <div className="mt-10 flex items-center justify-end border-t border-[color:var(--color-hairline)] pt-5">
                <Link
                  href="/install"
                  className="text-[12px] uppercase tracking-[0.18em] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-accent)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  continue without signing in →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
