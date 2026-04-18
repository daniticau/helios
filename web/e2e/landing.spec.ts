// Landing page smoke tests. Covers the pitch hero + install CTA + footer.

import { expect, test } from '@playwright/test';

test.describe('landing page', () => {
  test('loads and renders hero + ticker + footer link', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    // Hero headline — the "twenty seconds." tagline is unique to the landing.
    const hero = page.getByRole('heading', { level: 1, name: /home solar.*twenty seconds/is });
    await expect(hero).toBeVisible();

    // Install CTA — the hero's "run on your address →" link into /install.
    const runCta = page.getByRole('link', { name: /run on your address/i }).first();
    await expect(runCta).toBeVisible();
    await expect(runCta).toHaveAttribute('href', '/install');

    // Ticker viz — identified by the "orthogonal · fan-out" instrument header.
    await expect(page.getByText(/orthogonal.*fan-out/i).first()).toBeVisible();
    // Expected API rows should appear on the page (ticker lists them).
    for (const api of ['tariff', 'weather', 'pricing', 'finance', 'permits']) {
      await expect(page.getByText(api, { exact: true }).first()).toBeVisible();
    }

    // Footer has a GitHub link. Footer includes the "github ↗" anchor.
    const githubLink = page.locator('footer').getByRole('link', { name: /github/i }).first();
    await expect(githubLink).toHaveAttribute('href', /github\.com\/.+helios/i);
  });

  test('install CTA navigates to /install', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /run on your address/i }).first().click();
    await expect(page).toHaveURL(/\/install$/);
    // Confirm the install flow rendered, not a blank page.
    await expect(page.getByText(/step 01.*02/i)).toBeVisible();
  });
});
