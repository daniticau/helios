// Browser-side Supabase client. Mounted once, used by any client component
// that needs auth state. Env vars are safe to expose (anon key).

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Placeholder mode: return a no-op-ish client so components render but
    // auth calls fail gracefully. This keeps `pnpm build` green without
    // Supabase provisioned (per deploy doc, user sets these before prod).
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-anon-key-not-valid'
    );
  }
  return createBrowserClient(url, anonKey);
}

export const isSupabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
