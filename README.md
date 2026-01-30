# Practice Interviews E2E Tests

End-to-end tests using [Playwright](https://playwright.dev/) for the Practice Interviews application.

## Setup

```bash
cd e2e
npm install
npx playwright install
```

## Running Tests

### Against Stage (default)
```bash
npm run test:e2e
```

### Against Local Development
```bash
# Make sure the frontend is running on localhost:3000
npm run test:e2e:local
```

### Against Production
```bash
npm run test:e2e:prod
```

### With UI Mode (interactive)
```bash
npm run test:e2e:ui
```

### Debug Mode
```bash
npm run test:e2e:debug
```

### Specific Browser Only
```bash
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

## Test Structure

```
e2e/
├── tests/           # Test specs
│   └── auth.spec.ts # Authentication flow tests
├── fixtures/        # Reusable test fixtures
│   └── auth.ts      # Auth-related fixtures
├── utils/           # Helper utilities
│   └── api.ts       # API interaction helpers
├── playwright.config.ts
└── package.json
```

## Environment Variables

For tests requiring authentication, set these environment variables:

| Variable | Description |
|----------|-------------|
| `E2E_TEST_EMAIL` | Test account email |
| `E2E_TEST_PASSWORD` | Test account password |
| `BASE_URL` | Override the base URL for tests |

In CI, these are set via GitHub Secrets.

## CI/CD

E2E tests run automatically on:
- Push to `main` or `dev` branches
- Pull requests to `main` or `dev`
- Manual trigger via GitHub Actions

After merging to `main`, a smoke test runs against production.

## Writing Tests

### Best Practices

1. **Use resilient selectors**: Prefer `getByRole()`, `getByLabel()`, `getByTestId()` over CSS selectors
2. **Test isolation**: Each test should be independent
3. **Avoid hard waits**: Use Playwright's auto-waiting and explicit assertions
4. **Keep tests focused**: One logical flow per test

### Example Test

```typescript
import { test, expect } from '@playwright/test';

test('user can complete action', async ({ page }) => {
  await page.goto('/some-page');

  await page.getByLabel('Input').fill('value');
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByText('Success')).toBeVisible();
});
```

## Viewing Reports

After running tests:

```bash
npm run test:report
```

This opens the HTML report in your browser with screenshots, traces, and videos of failures.

## Code Generation

Use Playwright's code generator to help write tests:

```bash
npm run test:codegen
```

This opens a browser where your actions are recorded as Playwright code.
