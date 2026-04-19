// Login page tests. The suite runs with Supabase env vars intentionally
// unset (see playwright.config.ts), so we exercise the placeholder branch.

import { expect, test } from '@playwright/test';

test.describe('login page', () => {
  test('renders sign-in header and the "not configured" placeholder', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { level: 1, name: /save your estimates/i })).toBeVisible();
    await expect(page.getByText(/access.*credentials/i)).toBeVisible();

    // Placeholder banner only appears when Supabase env vars are unset.
    await expect(page.getByText(/placeholder mode/i)).toBeVisible();
  });

  test('mode toggle switches between sign in and create account', async ({ page }) => {
    await page.goto('/login');

    const signInTab = page.getByRole('button', { name: /^sign in$/i });
    const signUpTab = page.getByRole('button', { name: /^create account$/i });

    await expect(signInTab).toHaveAttribute('aria-pressed', 'true');
    await expect(signUpTab).toHaveAttribute('aria-pressed', 'false');

    await signUpTab.click();
    await expect(signUpTab).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('form button[type="submit"]')).toContainText(/create account/i);
  });

  test('submitting the form in placeholder mode surfaces an inline error', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const email = page.getByLabel(/^email$/i);
    const password = page.getByLabel(/^password$/i);
    await email.waitFor({ state: 'visible' });

    await email.click();
    await email.pressSequentially('daniticau@example.com', { delay: 10 });
    await password.click();
    await password.pressSequentially('hunter2hunter2', { delay: 10 });
    await expect(email).toHaveValue('daniticau@example.com');

    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText(/auth not configured/i)).toBeVisible();

    const continueLink = page.getByRole('link', { name: /continue without signing in/i });
    await expect(continueLink).toHaveAttribute('href', '/install');
  });
});
