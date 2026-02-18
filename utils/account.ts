import { Page, expect } from '@playwright/test';

/**
 * Account creation and onboarding helpers for E2E tests
 */

/**
 * Generate a unique test email using the pattern:
 * e2e-test-YYYYMMDD-HHMMSS@fractallabs.dev
 */
export function generateTestEmail(): string {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return `e2e-test-${dateStr}@fractallabs.dev`;
}

/**
 * Generate a random password for test accounts
 */
export function generateTestPassword(): string {
  return `TestPass${Date.now()}!`;
}

/**
 * Create a new account and complete minimum onboarding
 *
 * Steps:
 * 1. Enter email → triggers "new user" flow
 * 2. Enter name
 * 3. Select field/role
 * 4. Create password
 * 5. Skip TMAY question (don't answer to save AI credits)
 *
 * Returns the auth token from localStorage
 */
export async function createAccountWithOnboarding(
  page: Page,
  email: string,
  password: string
): Promise<{ token: string; userId: string }> {
  // Step 1: Enter email
  await page.goto('/enter-email');
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Continue' }).click();

  // Should see "We don't have an account" message or new user flow
  await expect(
    page
      .getByText("We don't have an account with this email")
      .or(page.getByText(/create.*account/i))
      .or(page.getByText('Welcome'))
      .or(page.getByRole('button', { name: /create/i }))
  ).toBeVisible({ timeout: 15000 });

  // Click "Create Account" or similar if visible
  const createAccountBtn = page.getByRole('button', { name: /create account/i });
  if (await createAccountBtn.isVisible().catch(() => false)) {
    await createAccountBtn.click();
  }

  // Step 2: Basic info - enter name
  // Wait for name input or onboarding screen
  const firstNameInput = page.getByLabel(/first name/i);
  const nameInput = page.getByLabel(/name/i).first();

  if (await firstNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await firstNameInput.fill('E2E');
    const lastNameInput = page.getByLabel(/last name/i);
    if (await lastNameInput.isVisible().catch(() => false)) {
      await lastNameInput.fill('Test');
    }
  } else if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await nameInput.fill('E2E Test');
  }

  // Click Continue/Next
  const continueBtn = page
    .getByRole('button', { name: /continue|next/i })
    .first();
  if (await continueBtn.isVisible().catch(() => false)) {
    await continueBtn.click();
  }

  // Step 3: Field/Role selection - select first available option
  await page.waitForTimeout(1000);
  const fieldOption = page.locator('[role="button"], [role="option"]').first();
  if (await fieldOption.isVisible({ timeout: 3000 }).catch(() => false)) {
    await fieldOption.click();
    await page.waitForTimeout(500);
    const nextBtn = page.getByRole('button', { name: /continue|next/i }).first();
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
    }
  }

  // Step 4: Create password
  const passwordInput = page.getByLabel(/password/i).first();
  await expect(passwordInput).toBeVisible({ timeout: 10000 });
  await passwordInput.fill(password);

  const confirmPasswordInput = page.getByLabel(/confirm password/i);
  if (await confirmPasswordInput.isVisible().catch(() => false)) {
    await confirmPasswordInput.fill(password);
  }

  // Submit password form
  const submitBtn = page.getByRole('button', { name: /create|sign up|continue/i }).first();
  await submitBtn.click();

  // Step 5: OTP verification (should be bypassed for @fractallabs.dev)
  // Wait for OTP screen or direct redirect
  await page.waitForTimeout(2000);

  const otpInput = page.getByLabel(/code|otp|verification/i);
  if (await otpInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Enter any code - should be bypassed for fractallabs.dev emails
    await otpInput.fill('123456');
    const verifyBtn = page.getByRole('button', { name: /verify|continue/i });
    if (await verifyBtn.isVisible().catch(() => false)) {
      await verifyBtn.click();
    }
  }

  // Wait for successful account creation / onboarding completion
  // Should redirect to home or practice question
  await expect(page).not.toHaveURL(/enter-email|create-account|verification-code/, {
    timeout: 20000,
  });

  // Skip TMAY question if presented - look for skip button or navigate away
  const skipBtn = page.getByRole('button', { name: /skip/i });
  if (await skipBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await skipBtn.click();
  }

  // Get auth token from localStorage
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  const userJson = await page.evaluate(() => localStorage.getItem('user_state'));

  if (!token) {
    throw new Error('Failed to get auth token after account creation');
  }

  const user = userJson ? JSON.parse(userJson) : null;
  const userId = user?.id || '';

  return { token, userId };
}

/**
 * Login with existing credentials
 */
export async function login(
  page: Page,
  email: string,
  password: string
): Promise<{ token: string }> {
  await page.goto('/enter-email');
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByLabel('Password')).toBeVisible({ timeout: 10000 });
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).not.toHaveURL(/enter-email|enter-password/, {
    timeout: 15000,
  });

  // Dismiss any modals
  const trialModalText = page.getByText('Your free trial has ended');
  if (await trialModalText.isVisible().catch(() => false)) {
    await page.mouse.click(10, 10);
    await page.waitForTimeout(500);
  }

  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  if (!token) {
    throw new Error('Failed to get auth token after login');
  }

  return { token };
}
