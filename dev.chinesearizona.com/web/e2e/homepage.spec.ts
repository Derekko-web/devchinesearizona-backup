import { expect, test } from '@playwright/test';

test('serves the bilingual homepage and primary navigation', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/ChineseArizona/);
  await expect(page.getByRole('heading', { name: /Arizona's Chinese Community/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /^business$/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /community/i }).first()).toBeVisible();
});

test('serves the health endpoint through a real browser request', async ({ request }) => {
  const response = await request.get('/api/health');

  expect([200, 503]).toContain(response.status());
  expect(response.headers()['content-type']).toContain('application/json');
  const payload = await response.json();
  expect(payload).toMatchObject({
    checks: {
      app: {
        ok: true,
      },
    },
  });
  expect(typeof payload.ok).toBe('boolean');
});
