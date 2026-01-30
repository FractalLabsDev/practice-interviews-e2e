import { APIRequestContext } from '@playwright/test';

/**
 * API Helper utilities for E2E tests
 *
 * These helpers allow tests to interact with the backend API directly
 * for setup/teardown or validation without going through the UI.
 */

// API base URLs by environment
const API_URLS = {
  local: 'http://localhost:8000',
  stage: 'https://pi-backend-stage-b4ede4419365.herokuapp.com',
  prod: 'https://pi-backend-prod-cd0ba6433021.herokuapp.com',
} as const;

/**
 * Get the appropriate API base URL based on the frontend URL
 */
export function getAPIBaseURL(frontendURL: string): string {
  if (frontendURL.includes('localhost')) {
    return API_URLS.local;
  }
  if (frontendURL.includes('stage') || frontendURL.includes('vercel')) {
    return API_URLS.stage;
  }
  return API_URLS.prod;
}

/**
 * Check if the API is healthy
 */
export async function checkAPIHealth(
  request: APIRequestContext,
  baseURL: string
): Promise<boolean> {
  try {
    const response = await request.get(`${baseURL}/health`);
    return response.ok();
  } catch {
    return false;
  }
}

/**
 * Verify that an email exists in the system
 * Returns true if the email is registered, false if not
 */
export async function verifyEmailExists(
  request: APIRequestContext,
  baseURL: string,
  email: string
): Promise<boolean> {
  const response = await request.post(`${baseURL}/api/v2/auth/verify-email`, {
    data: {
      email,
      appName: 'PracticeInterviews',
    },
  });

  return response.status() === 200;
}

/**
 * Get user info (requires auth token)
 */
export async function getUserInfo(
  request: APIRequestContext,
  baseURL: string,
  token: string
): Promise<Record<string, unknown> | null> {
  const response = await request.get(`${baseURL}/api/v2/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.ok()) {
    return response.json();
  }
  return null;
}
