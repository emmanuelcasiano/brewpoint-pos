import { expect, test } from '@playwright/test';

const VERSION = /^Version \d+\.\d+\.\d+ \(\w+\)$/;

test('the server health check answers 200', async ({ request }) => {
  const response = await request.get('http://127.0.0.1:3000/health');

  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ status: 'ok' });
});

// Each app opens on its sign-in screen. Reaching it means the app called the server through
// its /api proxy and was told nobody is signed in (or, on a register with no demo key, that
// it is not set up yet).

test('BrewPoint Back-office opens on its sign-in page', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173');

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByText('Back-office', { exact: true })).toBeVisible();
  await expect(page.getByText(VERSION)).toBeVisible();
});

test('BrewPoint Staff console opens on its sign-in page', async ({ page }) => {
  await page.goto('http://127.0.0.1:5175');

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByText('Staff console', { exact: true })).toBeVisible();
  await expect(page.getByText(VERSION)).toBeVisible();
});

test('BrewPoint POS opens on its PIN sign-in', async ({ page }) => {
  await page.goto('http://127.0.0.1:5174');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText(VERSION)).toBeVisible();
  await expect(page.getByText('Starting the register…')).toBeHidden();
});
