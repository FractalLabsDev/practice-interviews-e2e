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
 * Step 1: Navigate to sign-up flow from email entry
 * Enters email, clicks Continue, then clicks "Sign up instead"
 */
async function navigateToSignUp(page: Page, email: string): Promise<void> {
  await page.goto('/enter-email');
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Continue' }).click();

  // Wait for the "We don't have an account" error message to appear
  await expect(
    page.getByText("We don't have an account with this email")
  ).toBeVisible({ timeout: 15000 });

  // Click "Sign up instead" button to proceed with account creation
  const signUpInsteadBtn = page.getByRole('button', { name: /sign up instead/i });
  await expect(signUpInsteadBtn).toBeVisible({ timeout: 5000 });
  await signUpInsteadBtn.click();

  // Wait for navigation to onboarding basic info page
  await expect(page).toHaveURL(/onboarding-basic-info/, { timeout: 10000 });
}

/**
 * Step 2: Fill basic info (name and email) on onboarding-basic-info page
 * The page has two text fields: first name (placeholder) and email (placeholder)
 */
async function fillBasicInfo(page: Page, firstName: string, email: string): Promise<void> {
  // Wait for the onboarding basic info page
  await expect(page).toHaveURL(/onboarding-basic-info/, { timeout: 10000 });

  // Fill first name field (placeholder: "Enter your first name")
  const firstNameInput = page.getByPlaceholder(/enter your first name/i);
  await expect(firstNameInput).toBeVisible({ timeout: 10000 });
  await firstNameInput.fill(firstName);

  // Fill email field (placeholder: "Enter your email")
  // Wait a bit for email validation to complete
  const emailInput = page.getByPlaceholder(/enter your email/i);
  await expect(emailInput).toBeVisible({ timeout: 5000 });
  await emailInput.fill(email);
  
  // Wait for email validation to complete (check if email exists)
  await page.waitForTimeout(1000);

  // Click Continue button
  const continueBtn = page.getByRole('button', { name: /continue/i });
  await expect(continueBtn).toBeEnabled({ timeout: 5000 });
  await continueBtn.click();

  // Wait for navigation to create account page
  await expect(page).toHaveURL(/onboarding-create-account/, { timeout: 10000 });
}

/**
 * Step 3: Create password on onboarding-create-account page
 * The page has two password fields: "Create password" and "Confirm password"
 */
async function createPassword(page: Page, password: string): Promise<void> {
  // Wait for the create account page
  await expect(page).toHaveURL(/onboarding-create-account/, { timeout: 10000 });

  // Fill password field (label: "Create password")
  const passwordInput = page.getByLabel(/create password/i);
  await expect(passwordInput).toBeVisible({ timeout: 10000 });
  await passwordInput.fill(password);

  // Fill confirm password field (label: "Confirm password")
  const confirmPasswordInput = page.getByLabel(/confirm password/i);
  await expect(confirmPasswordInput).toBeVisible({ timeout: 5000 });
  await confirmPasswordInput.fill(password);

  // Wait a moment for form validation
  await page.waitForTimeout(500);

  // Click "Create account" button
  const createAccountBtn = page.getByRole('button', { name: /create account/i });
  await expect(createAccountBtn).toBeVisible({ timeout: 5000 });
  await expect(createAccountBtn).toBeEnabled({ timeout: 5000 });
  await createAccountBtn.click();

  // Wait for account creation API call to complete and navigation
  // The button shows "Creating account..." when loading, then navigates on success
  // Wait for navigation away from create-account page (should go to field/role)
  await expect(page).not.toHaveURL(/onboarding-create-account/, { timeout: 20000 });
  
  // Verify we're on the field/role page
  await expect(page).toHaveURL(/onboarding-field-role/, { timeout: 5000 });
}

/**
 * Step 4: Select field and role on onboarding-field-role page
 * First selects a field (chips), clicks Confirm, then selects a role (chips), clicks Confirm
 */
async function selectFieldAndRole(page: Page): Promise<void> {
  // Wait for the field/role selection page
  await expect(page).toHaveURL(/onboarding-field-role/, { timeout: 10000 });

  // Step 4a: Select a field
  // Wait for field selection UI to appear
  await expect(page.getByText(/what field are you interviewing/i)).toBeVisible({ 
    timeout: 10000 
  });

  // Find and click the first field chip
  // Fields are displayed as Chips (buttons) with text like "Software Engineering", "Product Management", etc.
  const fieldChips = page.locator('button, [role="button"]').filter({ 
    hasText: /software|product|data|design|sales|marketing|other/i 
  });
  
  const firstFieldChip = fieldChips.first();
  await expect(firstFieldChip).toBeVisible({ timeout: 10000 });
  await firstFieldChip.click();
  await page.waitForTimeout(500);

  // Click Confirm button for field selection
  const confirmFieldBtn = page.getByRole('button', { name: /^confirm$/i });
  await expect(confirmFieldBtn).toBeVisible({ timeout: 5000 });
  await confirmFieldBtn.click();

  // Wait for role selection UI to appear
  await expect(page.getByText(/what role specifically/i)).toBeVisible({ 
    timeout: 5000 
  });
  await page.waitForTimeout(500);

  // Step 4b: Select a role
  // Check if "Other" field was selected - if so, there will be a text input
  const customRoleInput = page.getByPlaceholder(/enter your role/i);
  if (await customRoleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Custom role input for "Other" field
    await customRoleInput.fill('Test Role');
    const confirmRoleBtn = page.getByRole('button', { name: /^confirm$/i });
    await expect(confirmRoleBtn).toBeVisible({ timeout: 5000 });
    await confirmRoleBtn.click();
  } else {
    // Select first role chip
    // Roles are also displayed as chips - find the first clickable chip
    const roleChips = page.locator('button, [role="button"]')
      .filter({ hasText: /.+/ })
      .filter({ hasNotText: /confirm|back/i });
    
    const firstRoleChip = roleChips.first();
    await expect(firstRoleChip).toBeVisible({ timeout: 5000 });
    await firstRoleChip.click();
    await page.waitForTimeout(500);

    // Click Confirm button for role selection
    const confirmRoleBtn = page.getByRole('button', { name: /^confirm$/i });
    await expect(confirmRoleBtn).toBeVisible({ timeout: 5000 });
    await confirmRoleBtn.click();
  }

  // Wait for navigation to verification code page
  await expect(page).toHaveURL(/enter-verification-code/, { timeout: 15000 });
}

/**
 * Step 5: Handle OTP verification (should be bypassed for @fractallabs.dev emails)
 * If OTP input appears, enter code and verify
 */
async function handleOTPVerification(page: Page): Promise<void> {
  // Wait for verification code page or check if already authenticated
  await page.waitForTimeout(2000);

  const otpInput = page.getByLabel(/verification code|code|otp/i);
  if (await otpInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    // Enter any code - should be bypassed for fractallabs.dev emails
    await otpInput.fill('123456');
    const verifyBtn = page.getByRole('button', { name: /verify|continue/i });
    if (await verifyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await verifyBtn.click();
    }
  }

  // Wait for successful authentication and navigation away from verification page
  await expect(page).not.toHaveURL(/enter-verification-code/, {
    timeout: 20000,
  });
}

/**
 * Step 6: Skip practice question if presented
 */
async function skipPracticeQuestion(page: Page): Promise<void> {
  // Look for skip button or practice question indicators
  const skipBtn = page.getByRole('button', { name: /skip/i });
  if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await skipBtn.click();
    await page.waitForTimeout(1000);
  }
}

/**
 * Create a new account and complete minimum onboarding
 *
 * Flow:
 * 1. Enter email → click "Sign up instead" → onboarding-basic-info
 * 2. Fill name + email → click Continue → onboarding-create-account
 * 3. Create password → click "Create account" → onboarding-field-role
 * 4. Select field → click Confirm → select role → click Confirm → enter-verification-code
 * 5. Handle OTP (bypassed for @fractallabs.dev) → onboarding-practice or home
 * 6. Skip practice question if needed
 *
 * Returns the auth token and user ID from localStorage
 */
export async function createAccountWithOnboarding(
  page: Page,
  email: string,
  password: string
): Promise<{ token: string; userId: string }> {
  const firstName = 'E2E Test';

  // Step 1: Navigate to sign-up flow
  await navigateToSignUp(page, email);

  // Step 2: Fill basic info (name and email)
  await fillBasicInfo(page, firstName, email);

  // Step 3: Create password
  await createPassword(page, password);

  // Step 4: Select field and role
  await selectFieldAndRole(page);

  // Step 5: Handle OTP verification
  await handleOTPVerification(page);

  // Step 6: Skip practice question if presented
  await skipPracticeQuestion(page);

  // Wait for successful account creation / onboarding completion
  // Should redirect to home or practice question
  await expect(page).not.toHaveURL(/enter-email|onboarding-basic-info|onboarding-create-account|enter-verification-code/, {
    timeout: 20000,
  });

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
