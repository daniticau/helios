'use client';

// Supabase magic-link + GitHub OAuth login. When Supabase isn't configured
// (no env vars), we surface a placeholder message — nothing will call the
// auth endpoints so the page still renders for preview.

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';

import { Header } from '@/components/Header';
import { createClient, isSupabaseConfigured } from '@/lib/supabase';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[color:var(--color-bg)]">
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

  // If already signed in, bounce to the redirect target.
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
      setError('Auth not configured. Set NEXT_PUBLIC_SUPABASE_* in .env.local.');
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
      setError('Auth not configured. Set NEXT_PUBLIC_SUPABASE_* in .env.local.');
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
    <div className="min-h-screen bg-[color:var(--color-bg)]">
      <Header />
      <main className="mx-auto max-w-md px-6 py-20">
        <div className="space-y-2">
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-accent)]">
            sign in
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[color:var(--color-text)]">
            Save your estimates.
          </h1>
          <p className="text-sm text-[color:var(--color-text-muted)]">
            Anonymous runs work without signing in. Sign in to keep a history on
            both web and mobile.
          </p>
        </div>

        {!configured && (
          <div className="mt-6 rounded-lg border border-[color:var(--color-warning)]/40 bg-[color:var(--color-card)] px-4 py-3 font-mono text-xs text-[color:var(--color-warning)]">
            auth placeholder — SUPABASE env vars not set. See docs/DEPLOY.md.
          </div>
        )}

        <button
          type="button"
          onClick={handleGithub}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-5 py-3.5 text-sm font-semibold text-[color:var(--color-text)] hover:border-[color:var(--color-text-muted)]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.484 17.523 2 12 2z"
            />
          </svg>
          continue with github
        </button>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[color:var(--color-border)]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[color:var(--color-bg)] px-3 font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-text-dim)]">
              or email
            </span>
          </div>
        </div>

        {status === 'sent' ? (
          <div className="rounded-xl border border-[color:var(--color-success)]/40 bg-[color:var(--color-card)] p-5">
            <div className="font-mono text-xs uppercase tracking-wider text-[color:var(--color-success)]">
              magic link sent
            </div>
            <div className="mt-2 text-sm text-[color:var(--color-text)]">
              Check <span className="font-mono">{email}</span> for a link to sign in.
            </div>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-3">
            <label
              htmlFor="email"
              className="block font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-text-muted)]"
            >
              email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-4 py-3.5 text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-dim)] focus:border-[color:var(--color-accent)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-xl bg-[color:var(--color-accent)] px-6 py-3.5 text-sm font-semibold text-[color:var(--color-bg)] disabled:opacity-40 hover:brightness-105"
            >
              {status === 'sending' ? 'sending…' : 'send magic link'}
            </button>
          </form>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-[color:var(--color-error)]/40 bg-[color:var(--color-card)] p-3 font-mono text-xs text-[color:var(--color-error)]">
            {error}
          </div>
        )}

        <div className="mt-10 text-center font-mono text-xs text-[color:var(--color-text-dim)]">
          <Link href="/install" className="hover:text-[color:var(--color-text)]">
            continue without signing in →
          </Link>
        </div>
      </main>
    </div>
  );
}
