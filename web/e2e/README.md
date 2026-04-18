# Helios Web — E2E Tests

Playwright suite for the Next.js webapp. Covers the critical journeys:

| Spec | What it covers |
|---|---|
| `landing.spec.ts` | Landing page loads, hero headline, install CTA routes to `/install`, ticker viz renders, footer GitHub link. |
| `install.spec.ts` | Address → utility → result flow. Utility picker, numeric bill/kWh inputs, `/api/roi` POST payload shape, NPV + payback render on the result screen. |
| `login.spec.ts` | Placeholder banner when Supabase env vars unset, GitHub + magic-link controls, "continue without signing in" deep link. |
| `proxy.spec.ts` | `/api/roi` Next route handler: method restrictions and backend-unreachable error envelope. |

## Prerequisites

- Node 20+, pnpm 9+
- `cd web && pnpm install`
- `pnpm exec playwright install --with-deps chromium` (one-time; Chromium only)

No Python backend is required. No Supabase project is required.

## Run

```bash
cd web
pnpm test:e2e
```

The Playwright config auto-starts `pnpm dev` on port 3000, waits for it to be
live, and runs the suite with a single worker for deterministic ordering.

## Debug

```bash
# Headed run with the Playwright inspector / UI mode:
pnpm exec playwright test --ui

# Headed run of a single spec with slow-mo:
pnpm exec playwright test e2e/install.spec.ts --headed

# Regenerate the HTML report after a run:
pnpm exec playwright show-report
```

Traces are captured on retry and screenshots on failure (see
`playwright.config.ts`). They land in `test-results/` and `playwright-report/`.

## Mocking

- `/api/roi` POST responses are mocked in the browser via `page.route()`.
  See `e2e/fixtures.ts` for the canonical `ROIResult` stub (mirrors
  `web/lib/types.ts`).
- For `proxy.spec.ts`, `BACKEND_URL` is set to `http://127.0.0.1:9` so the
  proxy's `backend_unreachable` branch fires deterministically — no mock
  needed.
- Supabase env vars (`NEXT_PUBLIC_SUPABASE_*`) are set to empty strings by
  the config so the login page renders its "not configured" placeholder.

## CI notes

In CI (`CI=1`), retries go from 0 → 1 and the HTML reporter is enabled. Run
`playwright install chromium` before the test step.
