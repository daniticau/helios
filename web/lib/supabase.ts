// Browser-side Supabase client. Mounted once, used by any client component
// that needs auth state. The publishable key is safe to expose to the
// browser — it's the new-format replacement for the legacy anon key.

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    // Placeholder mode: return a no-op-ish client so components render but
    // auth calls fail gracefully. This keeps `pnpm build` green without
    // Supabase provisioned (per deploy doc, user sets these before prod).
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'sb_publishable_placeholder_not_valid'
    );
  }
  return createBrowserClient(url, publishableKey);
}

export const isSupabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
