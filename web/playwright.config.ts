// Playwright config for the Helios webapp E2E suite.
// Runs against `pnpm dev` on :3000. Supabase env vars are intentionally left
// unset so login tests exercise the placeholder branch. /api/roi is mocked
// at the browser network layer via page.route, so no FastAPI backend is
// required to run this suite.

import { defineConfig, devices } from '@playwright/test';

// Using 3100 (not the default 3000) so an already-running `pnpm dev` at :3000
// — which would have different env vars — doesn't get accidentally reused
// by `reuseExistingServer`. The suite always boots its own server with the
// env this config dictates.
const PORT = Number(process.env.HELIOS_E2E_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;
const IS_CI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  // Deterministic ordering — a few of our tests share the same dev server
  // state (e.g. Supabase env). Running single-worker keeps them honest.
  workers: 1,
  fullyParallel: false,
  forbidOnly: IS_CI,
  retries: IS_CI ? 1 : 0,
  reporter: IS_CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Spin up the Next.js dev server for the suite. Clearing Supabase env
  // vars forces the "not configured" branch that login.spec.ts asserts.
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: BASE_URL,
    // Reuse only when the same env/port is already live. Safer to always
    // boot a fresh process so our env vars deterministically apply.
    reuseExistingServer: !IS_CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      // Force placeholder-mode for Supabase: empty strings are falsy in
      // `isSupabaseConfigured()`, which keeps login.spec on the placeholder
      // branch and prevents any outbound auth call.
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
      // Point /api/roi proxy at an unreachable sentinel. We mock /api/roi
      // via page.route for UI tests; proxy.spec hits the real route handler
      // and asserts the `backend_unreachable` envelope.
      BACKEND_URL: 'http://127.0.0.1:9',
    },
  },
});
