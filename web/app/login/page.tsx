'use client';

// Email + password auth via Supabase. Users toggle between "sign in"
// and "create account". When Supabase isn't configured, surface a
// placeholder banner and keep handlers as inline-error no-ops.

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';

import { Header } from '@/components/Header';
import { SiteFooter } from '@/components/SiteFooter';
import { createClient, isSupabaseConfigured } from '@/lib/supabase';

type Mode = 'signin' | 'signup';
type Status = 'idle' | 'submitting' | 'confirm' | 'error';

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
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) {
      setError(
        'Auth not configured. Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.'
      );
      setStatus('error');
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return;
    if (mode === 'signup' && password.length < 8) {
      setError('Password must be at least 8 characters.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setError(null);
    try {
      const supabase = createClient();
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) throw error;
        router.replace(redirect);
        return;
      }
      // Sign up
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${redirect}`,
        },
      });
      if (error) throw error;
      // If email confirmation is disabled in Supabase, a session is
      // returned and we can route straight through. Otherwise the user
      // gets a confirmation email.
      if (data.session) {
        router.replace(redirect);
      } else {
        setStatus('confirm');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setStatus('idle');
    setError(null);
  };

  const submitting = status === 'submitting';
  const submitLabel = mode === 'signin' ? 'sign in' : 'create account';

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

              {/* Mode toggle */}
              <div
                className="mb-7 flex gap-2 rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-bg-deep)]/40 p-1"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <button
                  type="button"
                  onClick={() => mode !== 'signin' && toggleMode()}
                  aria-pressed={mode === 'signin'}
                  className={`flex-1 rounded-sm px-4 py-2 text-[12px] transition ${
                    mode === 'signin'
                      ? 'bg-[color:var(--color-card-elevated)] text-[color:var(--color-accent)]'
                      : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]'
                  }`}
                >
                  sign in
                </button>
                <button
                  type="button"
                  onClick={() => mode !== 'signup' && toggleMode()}
                  aria-pressed={mode === 'signup'}
                  className={`flex-1 rounded-sm px-4 py-2 text-[12px] transition ${
                    mode === 'signup'
                      ? 'bg-[color:var(--color-card-elevated)] text-[color:var(--color-accent)]'
                      : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]'
                  }`}
                >
                  create account
                </button>
              </div>

              {status === 'confirm' ? (
                <div
                  className="rounded-sm border border-[color:var(--color-success)]/40 bg-[color:var(--color-card)]/60 p-5"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  <div className="type-eyebrow" style={{ color: 'var(--color-success)' }}>
                    confirm your email
                  </div>
                  <div className="mt-2 text-[14px] text-[color:var(--color-text)]">
                    Check <span className="text-[color:var(--color-accent)]">{email}</span>{' '}
                    for a confirmation link, then sign in.
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="type-label block">
                      email
                    </label>
                    <input
                      id="email"
                      type="email"
                      aria-label="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="w-full rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-bg-deep)]/50 px-4 py-3.5 text-[14px] text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-dim)] focus:border-[color:var(--color-accent)] focus:outline-none"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="password" className="type-label block">
                      password
                    </label>
                    <input
                      id="password"
                      type="password"
                      aria-label="password"
                      required
                      minLength={mode === 'signup' ? 8 : undefined}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'min 8 characters' : '••••••••'}
                      className="w-full rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-bg-deep)]/50 px-4 py-3.5 text-[14px] text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-dim)] focus:border-[color:var(--color-accent)] focus:outline-none"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="group relative flex w-full items-center justify-between overflow-hidden rounded-sm bg-[color:var(--color-accent)] px-6 py-3.5 text-[12.5px] font-semibold text-[color:var(--color-bg)] disabled:opacity-40"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    <span className="relative z-10">
                      {submitting ? 'working…' : submitLabel}
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
                  className="text-[12px] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-accent)]"
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
