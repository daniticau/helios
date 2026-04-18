// End-to-end for the install (Mode A) flow:
//   address → utility → running ticker → result screen.
// /api/roi is mocked at the browser network layer so no backend is needed.

import { expect, test } from '@playwright/test';
import { MOCK_ROI_RESULT, mockRoi } from './fixtures';

test.describe('install flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockRoi(page);
  });

  test('renders address step and demo button seeds the La Jolla profile', async ({ page }) => {
    await page.goto('/install');

    // Step 01 of 02 — address entry heading.
    await expect(
      page.getByRole('heading', { level: 2, name: /where are we running.*numbers/is })
    ).toBeVisible();

    const address = page.getByLabel(/street address/i);
    await expect(address).toBeVisible();

    // "Use demo address" button both fills the input and advances to step 2.
    await page.getByRole('button', { name: /use the demo address/i }).click();
    await expect(
      page.getByRole('heading', { level: 2, name: /your utility.*last bill/is })
    ).toBeVisible();
  });

  test('utility step has 4 named utilities, accepts numeric bill + kWh, and advances', async ({
    page,
  }) => {
    await page.goto('/install');
    await page.getByLabel(/street address/i).fill('9500 Gilman Dr, La Jolla, CA');
    // The primary continue button at the bottom of step 01.
    await page.getByRole('button', { name: /continue.*step 02/i }).click();

    // Confirm we're on step 2 before probing utilities.
    await expect(
      page.getByRole('heading', { level: 2, name: /your utility.*last bill/is })
    ).toBeVisible();

    // The 4 named utilities the task cares about. They render as short labels
    // (PG&E / SCE / SDG&E / LADWP). Regex-match the visible short form.
    const expected: Array<RegExp> = [/PG&E/, /^SCE$/, /SDG&E/, /LADWP/];
    for (const re of expected) {
      await expect(page.getByRole('button', { name: re }).first()).toBeVisible();
    }

    // Bill + kWh inputs strip non-numerics on entry.
    const bill = page.getByLabel(/monthly bill/i);
    await bill.fill('');
    await bill.type('abc290.5');
    await expect(bill).toHaveValue('290.5');

    const kwh = page.getByLabel(/monthly kwh/i);
    await kwh.fill('');
    await kwh.type('720');
    await expect(kwh).toHaveValue('720');

    // Submit triggers the POST to /api/roi (mocked). Watch for the request
    // so we can assert the payload includes a UserProfile envelope.
    const roiRequest = page.waitForRequest(
      (req) => req.url().includes('/api/roi') && req.method() === 'POST'
    );
    await page.getByRole('button', { name: /run the numbers/i }).click();
    const req = await roiRequest;
    const payload = JSON.parse(req.postData() ?? '{}');
    expect(payload).toHaveProperty('profile');
    expect(payload.profile).toMatchObject({
      address: expect.any(String),
      utility: expect.stringMatching(/PGE|SCE|SDGE|LADWP|OTHER/),
      monthly_bill_usd: 290.5,
      monthly_kwh: 720,
    });
  });

  test('after submit, ticker renders and result screen shows NPV + payback', async ({ page }) => {
    await page.goto('/install');

    // Shortest path: demo button seeds and advances straight to the utility step.
    await page.getByRole('button', { name: /use the demo address/i }).click();
    await expect(
      page.getByRole('heading', { level: 2, name: /your utility.*last bill/is })
    ).toBeVisible();

    await page.getByRole('button', { name: /run the numbers/i }).click();

    // Running state shows the "Ten APIs, in flight." heading and ticker.
    await expect(page.getByRole('heading', { level: 2, name: /ten apis.*in flight/is })).toBeVisible();

    // Result screen — payback years hero + NPV + recommended system kW.
    await expect(page.getByText(/break even in/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(MOCK_ROI_RESULT.payback_years.toFixed(1))).toBeVisible();
    // $48,200 formatted with comma; NPVHeroCard prepends "+" for positives.
    await expect(page.getByText(/\+\$48,200/)).toBeVisible();
    // Recommended system card renders the solar kW value (7.2).
    await expect(
      page.getByText(MOCK_ROI_RESULT.recommended_system.solar_kw.toFixed(1)).first()
    ).toBeVisible();
  });
});
