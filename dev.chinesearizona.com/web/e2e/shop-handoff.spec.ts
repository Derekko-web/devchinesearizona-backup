import { expect, test, type Page } from '@playwright/test';

function trackUnsafeCheckoutRequests(page: Page) {
  const requests: string[] = [];

  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/api/shop/checkout' || url.hostname.endsWith('stripe.com')) {
      requests.push(request.url());
    }
  });

  return requests;
}

test.describe('shop signed-out handoff', () => {
  test('shows login prompts for item actions instead of mutating shop state', async ({ page }) => {
    const unsafeCheckoutRequests = trackUnsafeCheckoutRequests(page);

    await page.goto('/en/shop/item/macbook-air-m2-13-east-valley');

    await expect(page.getByRole('heading', { level: 1, name: 'MacBook Air M2 13-inch' })).toBeVisible();
    await expect(page.getByText('Log in to add this item to your watchlist')).toBeVisible();
    await expect(page.getByText('Log in to build your cart')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add to cart' })).toHaveCount(0);

    await page.getByRole('link', { name: 'Log in or sign up' }).first().click();

    await expect(page).toHaveURL(
      /\/en\/auth\/login\?next=%2Fen%2Fshop%2Fitem%2Fmacbook-air-m2-13-east-valley$/
    );
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    expect(unsafeCheckoutRequests).toEqual([]);
  });

  test('redirects signed-out checkout access to auth before checkout can start', async ({ page }) => {
    const unsafeCheckoutRequests = trackUnsafeCheckoutRequests(page);

    await page.goto('/en/shop/checkout');

    await expect(page).toHaveURL(/\/en\/auth\/login\?next=%2Fen%2Fshop%2Fcheckout$/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Join' })).toHaveAttribute(
      'href',
      '/en/auth/join?next=%2Fen%2Fshop%2Fcheckout'
    );
    expect(unsafeCheckoutRequests).toEqual([]);
  });
});
