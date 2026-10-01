import { expect, test } from '@playwright/test';

const APPS = [
  { name: 'BrewPoint Back-office', url: 'http://127.0.0.1:5173' },
  { name: 'BrewPoint POS', url: 'http://127.0.0.1:5174' },
  { name: 'BrewPoint Staff console', url: 'http://127.0.0.1:5175' },
];

test('the server health check answers 200', async ({ request }) => {
  const response = await request.get('http://127.0.0.1:3000/health');

  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ status: 'ok' });
});

for (const app of APPS) {
  test(`${app.name} renders its placeholder`, async ({ page }) => {
    await page.goto(app.url);

    await expect(page.getByRole('heading', { name: app.name })).toBeVisible();
    await expect(page.getByText(/^Version \d+\.\d+\.\d+ \(\w+\)$/)).toBeVisible();
    // formatPeso comes from packages/shared, so this proves the app is wired to it.
    await expect(page.getByText('Workspace check: ₱1,245.00')).toBeVisible();
  });
}
