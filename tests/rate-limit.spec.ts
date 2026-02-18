import { test, expect, Page } from '@playwright/test';
import {
  createAccountWithOnboarding,
  generateTestEmail,
  generateTestPassword,
  login,
} from '../utils/account';
import { getAPIBaseURL } from '../utils/api';

/**
 * Rate Limit E2E Tests
 *
 * Tests the rate limiting behavior by:
 * 1. Creating a fresh test account
 * 2. Spamming cheap API endpoints to trigger 429
 * 3. Verifying toast appears and user is logged out
 * 4. Verifying other users (super admin) can still use the app
 *
 * Prerequisites:
 * - OTP bypass enabled for @fractallabs.dev emails
 * - E2E_SUPERADMIN_EMAIL and E2E_SUPERADMIN_PASSWORD env vars for concurrent user test
 */

// Super admin credentials for concurrent user test
const SUPERADMIN_EMAIL = process.env.E2E_SUPERADMIN_EMAIL;
const SUPERADMIN_PASSWORD = process.env.E2E_SUPERADMIN_PASSWORD;

/**
 * Spam cheap API endpoints to trigger rate limit
 * Uses /answers/count and /answers/user endpoints as they're virtually free
 */
async function spamRequestsUntil429(
  page: Page,
  userId: string,
  token: string,
  baseURL: string
): Promise<{ hitRateLimit: boolean; requestCount: number }> {
  let requestCount = 0;
  let hitRateLimit = false;

  // Make parallel batches of requests to hit the limit faster
  // Stage has 2000 limit, prod has 200 - we'll keep going until we hit 429
  const maxRequests = 250; // Should be enough for prod limit (200)
  const batchSize = 10;

  while (requestCount < maxRequests && !hitRateLimit) {
    const batch = [];
    for (let i = 0; i < batchSize; i++) {
      batch.push(
        page.request.get(`${baseURL}/api/v1/answers/count/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        page.request.get(`${baseURL}/api/v1/answers/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        page.request.get(
          `${baseURL}/api/v1/answers/distinct-question-types/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
      );
    }

    const responses = await Promise.all(batch);
    requestCount += batch.length;

    // Check if any response was 429
    for (const response of responses) {
      if (response.status() === 429) {
        hitRateLimit = true;
        break;
      }
    }

    // Log progress
    if (requestCount % 50 === 0) {
      console.log(`Sent ${requestCount} requests...`);
    }
  }

  return { hitRateLimit, requestCount };
}

test.describe('Rate Limit - Full Flow', () => {
  test('triggers 429, shows toast, and logs out user @rate-limit', async ({
    page,
    baseURL,
  }) => {
    const apiBaseURL = getAPIBaseURL(baseURL || 'https://stage.practiceinterviews.com');
    const testEmail = generateTestEmail();
    const testPassword = generateTestPassword();

    console.log(`Creating test account: ${testEmail}`);

    // Step 1: Create new account with onboarding
    const { token, userId } = await createAccountWithOnboarding(
      page,
      testEmail,
      testPassword
    );

    console.log(`Account created. User ID: ${userId}`);
    expect(token).toBeTruthy();
    expect(userId).toBeTruthy();

    // Step 2: Navigate to home to ensure we're in a logged-in state
    await page.goto('/home');
    await expect(page).toHaveURL(/home/);

    // Step 3: Spam API requests to trigger rate limit
    console.log('Spamming requests to trigger rate limit...');
    const { hitRateLimit, requestCount } = await spamRequestsUntil429(
      page,
      userId,
      token,
      apiBaseURL
    );

    console.log(`Sent ${requestCount} requests. Hit rate limit: ${hitRateLimit}`);

    // If we hit the rate limit, trigger one more request from the page context
    // to ensure the frontend intercepts the 429
    if (hitRateLimit) {
      // Trigger a frontend API call
      await page.reload();
    } else {
      // If we didn't hit rate limit (likely on stage with 2000 limit),
      // we can't fully test this - skip with a note
      test.skip(true, `Did not hit rate limit after ${requestCount} requests - likely on stage environment`);
    }

    // Step 4: Verify toast appears
    await expect(
      page.getByText(/rate limit|too many requests/i)
    ).toBeVisible({ timeout: 10000 });

    // Step 5: Verify user is logged out (redirected to login page)
    await expect(page).toHaveURL(/enter-email/, { timeout: 15000 });

    // Verify token is cleared from localStorage
    const tokenAfter = await page.evaluate(
      () => localStorage.getItem('auth_token')
    );
    expect(tokenAfter).toBeFalsy();

    console.log('Test passed: User was rate limited, shown toast, and logged out');
  });

  test('other users can still use the app during rate limit @rate-limit', async ({
    page,
    browser,
    baseURL,
  }) => {
    // Skip if superadmin credentials not configured
    test.skip(
      !SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD,
      'E2E_SUPERADMIN_EMAIL and E2E_SUPERADMIN_PASSWORD must be set'
    );

    const apiBaseURL = getAPIBaseURL(baseURL || 'https://stage.practiceinterviews.com');
    const testEmail = generateTestEmail();
    const testPassword = generateTestPassword();

    // Create a fresh test account
    console.log(`Creating test account: ${testEmail}`);
    const { token, userId } = await createAccountWithOnboarding(
      page,
      testEmail,
      testPassword
    );

    // Spam requests to trigger rate limit for test user
    console.log('Triggering rate limit for test user...');
    const { hitRateLimit, requestCount } = await spamRequestsUntil429(
      page,
      userId,
      token,
      apiBaseURL
    );

    if (!hitRateLimit) {
      test.skip(true, `Did not hit rate limit after ${requestCount} requests`);
    }

    // Create a new browser context for superadmin
    const superadminContext = await browser.newContext();
    const superadminPage = await superadminContext.newPage();

    try {
      // Login as superadmin in separate context
      console.log('Logging in as superadmin...');
      await login(superadminPage, SUPERADMIN_EMAIL!, SUPERADMIN_PASSWORD!);

      // Navigate to home
      await superadminPage.goto('/home');

      // Verify superadmin can access the app
      await expect(superadminPage.getByText(/Welcome/)).toBeVisible({
        timeout: 15000,
      });

      // Make an API request to verify it succeeds (not rate limited)
      const response = await superadminPage.request.get(
        `${apiBaseURL}/api/v2/users/me`,
        {
          headers: {
            Authorization: `Bearer ${await superadminPage.evaluate(
              () => localStorage.getItem('auth_token')
            )}`,
          },
        }
      );

      expect(response.status()).toBe(200);
      console.log('Superadmin can still use the app while test user is rate limited');
    } finally {
      await superadminContext.close();
    }
  });
});

test.describe('Rate Limit - Account Creation', () => {
  test('can create account with @fractallabs.dev email', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testPassword = generateTestPassword();

    console.log(`Testing account creation with: ${testEmail}`);

    // Create account - OTP should be bypassed
    const { token, userId } = await createAccountWithOnboarding(
      page,
      testEmail,
      testPassword
    );

    expect(token).toBeTruthy();
    console.log(`Account created successfully. User ID: ${userId}`);

    // Verify we're logged in
    await page.goto('/home');
    // Use first() to handle multiple "Welcome" text matches, or use a more specific selector
    await expect(page.getByText(/Welcome/).first()).toBeVisible({ timeout: 15000 });
  });
});
