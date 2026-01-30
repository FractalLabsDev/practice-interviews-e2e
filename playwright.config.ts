import { defineConfig, devices } from '@playwright/test';

/**
 * Practice Interviews E2E Test Configuration
 *
 * Environment URLs:
 * - Local:   http://localhost:3000
 * - Stage:   https://stage.practiceinterviews.com
 * - Prod:    https://app.practiceinterviews.com
 *
 * Usage:
 *   npm run test:e2e              # Run against stage (default)
 *   npm run test:e2e:local        # Run against localhost
 *   BASE_URL=<url> npm run test:e2e   # Custom URL
 */

const BASE_URL = process.env.BASE_URL || 'https://stage.practiceinterviews.com';

export default defineConfig({
  testDir: './tests',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI for more predictable results
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ...(process.env.CI ? [['github'] as const] : []),
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL for navigation
    baseURL: BASE_URL,

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Record video on failure
    video: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Viewport size
    viewport: { width: 1280, height: 720 },
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile viewports
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Folder for test artifacts such as screenshots, videos, traces
  outputDir: 'test-results/',

  // Timeout for each test
  timeout: 30000,

  // Expect timeout
  expect: {
    timeout: 5000,
  },

  // Run your local dev server before starting the tests (only for local development)
  ...(BASE_URL.includes('localhost')
    ? {
        webServer: {
          command: 'npm run start',
          cwd: '../practice-interviews-web',
          url: 'http://localhost:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
      }
    : {}),
});
