'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase';

export function SignInToSaveLink() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSignedIn(false);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (signedIn !== false) return null;

  return (
    <Link
      href="/login"
      className="inline-flex items-center gap-2 rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card-elevated)]/80 px-7 py-3.5 text-[13px] font-semibold text-[color:var(--color-text)] hover:border-[color:var(--color-accent)]"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      sign in to save
    </Link>
  );
}
