// Login page tests. The suite runs with Supabase env vars intentionally
// unset (see playwright.config.ts), so we exercise the placeholder branch.

import { expect, test } from '@playwright/test';

test.describe('login page', () => {
  test('renders sign-in header and the "not configured" placeholder', async ({ page }) => {
    await page.goto('/login');

    // Top copy — "access · credentials" eyebrow + h1 "Save your estimates."
    await expect(page.getByRole('heading', { level: 1, name: /save your estimates/i })).toBeVisible();
    await expect(page.getByText(/access.*credentials/i)).toBeVisible();

    // Placeholder banner only appears when Supabase env vars are unset.
    await expect(page.getByText(/placeholder mode/i)).toBeVisible();
  });

  test('GitHub button is clickable and surfaces inline error in placeholder mode', async ({
    page,
  }) => {
    await page.goto('/login');
    // The button label reads "continue · github" in the terminal aesthetic.
    const githubBtn = page.getByRole('button', { name: /continue.*github/i });
    await expect(githubBtn).toBeVisible();
    await githubBtn.click();
    // Clicking without configured Supabase should show an inline error.
    await expect(page.getByText(/auth not configured/i)).toBeVisible();
  });

  test('magic link form accepts an email and "continue without signing in" routes to /install', async ({
    page,
  }) => {
    await page.goto('/login');
    // Wait for hydration before interacting — in Next 15 dev mode a fresh
    // route navigation occasionally drops Playwright's first input event on
    // the floor, leaving a controlled React input empty after .fill().
    await page.waitForLoadState('networkidle');

    const email = page.getByLabel(/^email$/i);
    await email.waitFor({ state: 'visible' });
    // pressSequentially fires per-keystroke events which React's synthetic
    // event system picks up reliably, unlike the single bulk assign that
    // .fill() performs.
    await email.click();
    await email.pressSequentially('daniticau@example.com', { delay: 10 });
    await expect(email).toHaveValue('daniticau@example.com');

    const continueLink = page.getByRole('link', { name: /continue without signing in/i });
    await expect(continueLink).toHaveAttribute('href', '/install');
  });
});
