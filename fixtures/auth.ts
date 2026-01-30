import { test as base, expect } from '@playwright/test';

/**
 * Auth fixtures for E2E tests
 *
 * Provides pre-authenticated states and helper functions for auth-related tests.
 */

// Extend base test with auth fixtures
export const test = base.extend<{
  authenticatedPage: ReturnType<typeof base.extend>;
}>({
  // This fixture will be implemented when we need authenticated test scenarios
  // For now, it's a placeholder for future auth state management
  authenticatedPage: async ({ page }, use) => {
    // TODO: Implement session storage reuse for authenticated tests
    // This will save login time by reusing auth state across tests
    await use(page);
  },
});

export { expect };

/**
 * Login helper function for tests that need to authenticate
 */
export async function loginUser(
  page: ReturnType<typeof base.extend>['page'] extends Promise<infer T> ? T : never,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/enter-email');
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByLabel('Password')).toBeVisible({ timeout: 10000 });
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for successful navigation away from auth pages
  await expect(page).not.toHaveURL(/enter-email|enter-password/, { timeout: 15000 });
}
