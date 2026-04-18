// Shared fixtures for Helios E2E tests.
// Keep the payload shape in sync with web/lib/types.ts::ROIResult.

import type { Page, Route } from '@playwright/test';

/** Realistic ROIResult stub so the UI has real numbers to render. */
export const MOCK_ROI_RESULT = {
  recommended_system: { solar_kw: 7.2, battery_kwh: 13.5 },
  upfront_cost_usd: 28_500,
  federal_itc_usd: 8_550,
  net_upfront_usd: 19_950,
  npv_25yr_usd: 48_200,
  payback_years: 6.8,
  annual_savings_yr1_usd: 2_940,
  co2_avoided_tons_25yr: 12.4,
  installer_quotes_range: [22_500, 31_200],
  financing_apr_range: [6.49, 8.99],
  tariff_summary: 'SDG&E EV-TOU-5 — peak 4-9pm $0.52/kWh; export ACC Mar avg $0.08/kWh.',
  orthogonal_calls_made: [
    { api: 'tariff', purpose: 'utility time-of-use plan', latency_ms: 612, status: 'success' },
    { api: 'weather', purpose: 'irradiance + 24h forecast', latency_ms: 428, status: 'success' },
    { api: 'pricing', purpose: 'installer quotes ($/W)', latency_ms: 1340, status: 'success' },
    { api: 'finance', purpose: 'solar loan APR range', latency_ms: 806, status: 'success' },
    { api: 'news', purpose: 'active rebates + policy', latency_ms: 1960, status: 'success' },
    { api: 'permits', purpose: 'ZenPower permit records', latency_ms: 14, status: 'cached' },
    { api: 'property_value', purpose: 'home value → ROI %', latency_ms: 1132, status: 'success' },
    { api: 'demographics', purpose: 'income-aware sizing', latency_ms: 774, status: 'success' },
    { api: 'reviews', purpose: 'local installer reviews', latency_ms: 1542, status: 'success' },
    { api: 'carbon_price', purpose: 'social cost of carbon', latency_ms: 518, status: 'success' },
  ],
  property_value_usd: 1_250_000,
  roi_pct_of_home_value: 3.86,
  zenpower_permits_in_zip: 137,
  zenpower_avg_system_kw: 7.8,
  social_cost_of_carbon_usd: 2_100,
};

/**
 * Intercept /api/roi at the browser network layer and reply with the mock.
 * Returns a promise that resolves to the intercepted Request for assertions.
 */
export async function mockRoi(
  page: Page,
  overrides: Partial<typeof MOCK_ROI_RESULT> = {}
): Promise<void> {
  await page.route('**/api/roi', async (route: Route) => {
    if (route.request().method() !== 'POST') {
      // Let non-POST fall through to the real proxy (for proxy.spec tests).
      return route.fallback();
    }
    // Small delay so the /install "running" state actually paints before
    // the mutation resolves — otherwise framer-motion transitions the ticker
    // out too fast for the "Ten APIs, in flight." heading to be observable.
    await new Promise((r) => setTimeout(r, 450));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...MOCK_ROI_RESULT, ...overrides }),
    });
  });
}
