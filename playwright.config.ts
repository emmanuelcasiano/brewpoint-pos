import { defineConfig, devices } from '@playwright/test';

const CI = Boolean(process.env.CI);

const APPS = [
  { filter: '@brewpoint/backoffice', port: 5173 },
  { filter: '@brewpoint/pos', port: 5174 },
  { filter: '@brewpoint/console', port: 5175 },
];

// Runs against production builds; `pnpm test:e2e` builds first.
export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? 'github' : 'list',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // The POS runs in Safari on a landscape iPad.
    { name: 'pos-ipad', use: { ...devices['iPad Pro 11 landscape'] }, grep: /BrewPoint POS/ },
  ],
  webServer: [
    {
      command: 'pnpm --filter @brewpoint/server start',
      url: 'http://127.0.0.1:3000/health',
      reuseExistingServer: !CI,
    },
    ...APPS.map(({ filter, port }) => ({
      command: `pnpm --filter ${filter} preview`,
      url: `http://127.0.0.1:${port}`,
      reuseExistingServer: !CI,
    })),
  ],
});
