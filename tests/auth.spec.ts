import { test, expect } from '@playwright/test';

/**
 * Auth Flow E2E Tests for Practice Interviews
 *
 * Tests are organized into two categories:
 * 1. UI tests - Don't require real credentials, test UI behavior only
 * 2. Auth flow tests - Require real test account credentials (set via env vars)
 *
 * Note: Tests requiring real accounts will be skipped if E2E_TEST_EMAIL
 * and E2E_TEST_PASSWORD environment variables are not set.
 */

// Test account credentials - MUST be set via environment variables for auth tests to run
const TEST_EMAIL = process.env.E2E_TEST_EMAIL;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;

// Helper to check if we have valid test credentials configured
const hasTestCredentials = !!TEST_EMAIL && !!TEST_PASSWORD;
const hasTestEmail = !!TEST_EMAIL;

test.describe('Authentication - UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/enter-email');
  });

  test('login page displays correctly', async ({ page }) => {
    // Check that the login page renders with expected elements
    await expect(page.getByRole('img', { name: 'logo' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  });

  test('shows validation error for invalid email format', async ({ page }) => {
    // Enter an invalid email
    await page.getByLabel('Email address').fill('invalid-email');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Should show a toast error for invalid email
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('shows feedback for non-existent email', async ({ page }) => {
    // Enter an email that definitely doesn't exist
    const randomEmail = `nonexistent-${Date.now()}@example.com`;
    await page.getByLabel('Email address').fill(randomEmail);
    await page.getByRole('button', { name: 'Continue' }).click();

    // Should show some indication that account doesn't exist
    // The UI shows "We don't have an account with this email" message
    await expect(
      page.getByText("We don't have an account with this email")
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Authentication - Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/enter-email');
  });

  test('existing user can proceed to password page', async ({ page }) => {
    test.skip(!hasTestEmail, 'E2E_TEST_EMAIL environment variable not set');

    // Enter the test email
    await page.getByLabel('Email address').fill(TEST_EMAIL!);
    await page.getByRole('button', { name: 'Continue' }).click();

    // Should navigate to password page (existing user)
    await expect(page.getByLabel('Password')).toBeVisible({ timeout: 10000 });
  });

  test('successful login flow navigates to home @smoke', async ({ page }) => {
    test.skip(!hasTestCredentials, 'E2E test credentials not configured');

    // Step 1: Enter email
    await page.getByLabel('Email address').fill(TEST_EMAIL!);
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 2: Wait for password page
    await expect(page.getByLabel('Password')).toBeVisible({ timeout: 10000 });

    // Step 3: Enter password and submit
    await page.getByLabel('Password').fill(TEST_PASSWORD!);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Step 4: Handle trial expired modal if it appears
    // The modal shows "Your free trial has ended, but don't stop practicing!"
    const trialModalTitle = page.getByText('Your free trial has ended', { exact: false });
    const isModalVisible = await trialModalTitle.isVisible().catch(() => false);
    if (isModalVisible) {
      // Close the modal by pressing ESC
      await page.keyboard.press('Escape');
      // Wait for modal to close
      await expect(trialModalTitle).not.toBeVisible({ timeout: 3000 });
    }

    // Step 5: Verify we reach the home page or dashboard
    // Use a more specific locator - the welcome heading (h4 element)
    // This avoids strict mode violations from multiple "Welcome" or "Practice" text matches
    // The error shows the heading is: <h4>Welcome, E2E Test!</h4>
    await expect(
      page.locator('h4').filter({ hasText: /Welcome.*E2E Test/i }).first()
    ).toBeVisible({ timeout: 15000 });

    // Verify URL is no longer on auth pages
    await expect(page).not.toHaveURL(/enter-email|enter-password/);
  });

  test('shows error for incorrect password', async ({ page }) => {
    test.skip(!hasTestEmail, 'E2E_TEST_EMAIL environment variable not set');

    // Enter valid email
    await page.getByLabel('Email address').fill(TEST_EMAIL!);
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for password page
    await expect(page.getByLabel('Password')).toBeVisible({ timeout: 10000 });

    // Enter wrong password
    await page.getByLabel('Password').fill('definitely-wrong-password-123!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should show an error toast
    // Use a more specific locator for the toast body that's actually visible
    // The toast body has role="alert" and contains the error message
    await expect(
      page.getByRole('alert').filter({ hasText: /Invalid|incorrect|wrong|error/i })
    ).toBeVisible({ timeout: 5000 });
  });

  test('can access forgot password flow', async ({ page }) => {
    test.skip(!hasTestEmail, 'E2E_TEST_EMAIL environment variable not set');

    // Enter email first
    await page.getByLabel('Email address').fill(TEST_EMAIL!);
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for password page
    await expect(page.getByLabel('Password')).toBeVisible({ timeout: 10000 });

    // Click forgot password
    await page.getByRole('button', { name: /forgot your password/i }).click();

    // Should navigate to forgot password verification code page
    await expect(page).toHaveURL(/enter-forgot-password-verification-code/);
  });

  test('pressing Enter submits the email form', async ({ page }) => {
    test.skip(!hasTestEmail, 'E2E_TEST_EMAIL environment variable not set');

    // Enter email and press Enter instead of clicking button
    await page.getByLabel('Email address').fill(TEST_EMAIL!);
    await page.getByLabel('Email address').press('Enter');

    // Should proceed to password page
    await expect(page.getByLabel('Password')).toBeVisible({ timeout: 10000 });
  });

  test('pressing Enter submits the password form', async ({ page }) => {
    test.skip(!hasTestCredentials, 'E2E test credentials not configured');

    // Go through email step
    await page.getByLabel('Email address').fill(TEST_EMAIL!);
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for password page
    await expect(page.getByLabel('Password')).toBeVisible({ timeout: 10000 });

    // Enter password and press Enter
    await page.getByLabel('Password').fill(TEST_PASSWORD!);
    await page.getByLabel('Password').press('Enter');

    // Should navigate away from auth
    await expect(page).not.toHaveURL(/enter-password/, { timeout: 15000 });
  });
});

test.describe('NACE Route', () => {
  test('NACE route is accessible', async ({ page }) => {
    await page.goto('/nace');

    // The /nace route may redirect to the landing page or show the NACE-specific email entry
    // depending on the environment and app configuration.
    // We just verify the page loads without errors and shows some expected UI.
    await expect(
      page
        .getByLabel('Email address')
        .or(page.getByRole('button', { name: 'Get started' }))
    ).toBeVisible({ timeout: 10000 });
  });
});
