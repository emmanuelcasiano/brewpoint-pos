import { defineConfig, devices } from '@playwright/test';

const CI = Boolean(process.env.CI);
// The update-gallery-snapshots job runs only the gallery, without the server and its database.
const GALLERY_ONLY = process.env.E2E_SUITE === 'gallery';

const APPS = [
  { filter: '@brewpoint/backoffice', port: 5173 },
  { filter: '@brewpoint/pos', port: 5174 },
  { filter: '@brewpoint/console', port: 5175 },
];

const GALLERY = {
  command: 'pnpm --filter @brewpoint/ui preview',
  url: 'http://127.0.0.1:5176',
  reuseExistingServer: !CI,
};

const APP_SERVERS = [
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
];

const GALLERY_PROJECT = {
  name: 'gallery',
  use: { ...devices['Desktop Chrome'] },
  testMatch: 'gallery.spec.ts',
};

// Runs against production builds; `pnpm test:e2e` builds first.
export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? 'github' : 'list',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.001 } },
  projects: GALLERY_ONLY
    ? [GALLERY_PROJECT]
    : [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
          testIgnore: 'gallery.spec.ts',
        },
        // The POS runs in Safari on a landscape iPad.
        {
          name: 'pos-ipad',
          use: { ...devices['iPad Pro 11 landscape'] },
          grep: /BrewPoint POS/,
          testIgnore: 'gallery.spec.ts',
        },
        GALLERY_PROJECT,
      ],
  webServer: GALLERY_ONLY ? [GALLERY] : [...APP_SERVERS, GALLERY],
});
