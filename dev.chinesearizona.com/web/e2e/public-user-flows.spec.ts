import { expect, test, devices } from '@playwright/test';

test.describe('public navigation and localization', () => {
  test('desktop primary navigation moves between core public sections', async ({ page }) => {
    await page.goto('/en');

    await expect(page).toHaveTitle(/ChineseArizona/);
    await expect(
      page.getByRole('heading', { name: "Your Guide to Arizona's Chinese Community" })
    ).toBeVisible();

    const primaryNav = page.locator('nav').first();
    await primaryNav.getByRole('link', { name: 'Business 商家' }).click();
    await expect(page).toHaveURL(/\/en\/business$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Chinese Businesses' })).toBeVisible();

    await primaryNav.getByRole('link', { name: 'Community 社區' }).click();
    await expect(page).toHaveURL(/\/en\/community$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Find your people in Arizona.' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Chinese Schools' })).toBeVisible();
  });

  test('locale switching preserves the current directory filters', async ({ page }) => {
    await page.goto('/en/business?q=china%20chili&city=Phoenix&category=dining&sort=featured');

    await expect(page.getByRole('heading', { level: 1, name: 'Chinese Businesses' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'China Chili' })).toBeVisible();

    await page
      .getByRole('navigation', { name: 'Language switcher' })
      .getByRole('link', { name: 'Chinese' })
      .click();

    await expect(page.getByRole('heading', { level: 1, name: '華人商家' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'China Chili' })).toBeVisible();

    const switchedUrl = new URL(page.url());
    expect(switchedUrl.pathname).toBe('/zh/business');
    expect(switchedUrl.searchParams.get('q')).toBe('china chili');
    expect(switchedUrl.searchParams.get('city')).toBe('Phoenix');
    expect(switchedUrl.searchParams.get('category')).toBe('dining');
    expect(switchedUrl.searchParams.get('sort')).toBe('featured');
  });
});

test.describe('mobile navigation', () => {
  test.use({
    deviceScaleFactor: devices['iPhone 13'].deviceScaleFactor,
    hasTouch: devices['iPhone 13'].hasTouch,
    isMobile: devices['iPhone 13'].isMobile,
    userAgent: devices['iPhone 13'].userAgent,
    viewport: devices['iPhone 13'].viewport,
  });

  test('opens the mobile menu and navigates through visible menu links', async ({ page }) => {
    await page.goto('/en');

    const menuButton = page.getByRole('button', { name: 'Open menu' });
    await expect(menuButton).toBeVisible();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await menuButton.click();
    await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');

    const primaryNav = page.locator('nav').first();
    const mobileBusinessLink = primaryNav.getByRole('link', { name: 'Business 商家' }).last();
    await expect(mobileBusinessLink).toBeVisible();
    await mobileBusinessLink.click();

    await expect(page).toHaveURL(/\/en\/business$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Chinese Businesses' })).toBeVisible();
  });
});

test.describe('directory discovery', () => {
  test('searches, filters, and opens a business detail page', async ({ page }) => {
    await page.goto('/en/business');

    const filters = page.getByRole('complementary');
    await filters.getByLabel('Search').fill('china chili');
    await filters.getByLabel('City').selectOption('Phoenix');
    await filters.getByLabel('Category').selectOption('dining');
    await filters.getByRole('button', { name: 'Apply filters' }).click();

    await expect(page).toHaveURL(/\/en\/business\?/);
    await expect(page.getByText(/^Showing \d+-\d+ of \d+$/)).toBeVisible();

    const filteredUrl = new URL(page.url());
    expect(filteredUrl.searchParams.get('q')).toBe('china chili');
    expect(filteredUrl.searchParams.get('city')).toBe('Phoenix');
    expect(filteredUrl.searchParams.get('category')).toBe('dining');

    const chinaChiliListing = page.locator('article', {
      has: page.getByRole('heading', { level: 3, name: 'China Chili' }),
    });
    await expect(chinaChiliListing).toBeVisible();
    await expect(chinaChiliListing.getByText('302 E Flower St Phoenix, AZ 85012')).toBeVisible();

    await chinaChiliListing.getByRole('link', { name: 'View full profile' }).click();

    await expect(page).toHaveURL(/\/en\/business\/china-chili-phoenix$/);
    await expect(page.getByRole('heading', { level: 1, name: 'China Chili' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Call \(602\) 266-4463/ })).toHaveAttribute(
      'href',
      'tel:+16022664463'
    );
    await expect(page.getByRole('heading', { level: 2, name: 'About China Chili' })).toBeVisible();
    await expect(page.getByText('Log in to report an issue')).toBeVisible();
  });

  test('renders city-domain directory data from forwarded host headers', async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      extraHTTPHeaders: {
        'x-forwarded-host': 'www.chineseaustin.com',
        'x-forwarded-proto': 'https',
      },
    });

    try {
      const page = await context.newPage();
      await page.goto('/en/business');

      await expect(page.getByRole('link', { name: /ChineseAustin Austin bilingual guide/ })).toBeVisible();
      await expect(page.getByRole('heading', { level: 3, name: 'House of Three Gorges' })).toBeVisible();
      await expect(page.getByText('8557 Research Blvd Ste 144, Austin, TX 78758')).toBeVisible();
      await expect(page.getByRole('heading', { level: 3, name: 'China Chili' })).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});

test.describe('signed-out auth and form validation', () => {
  test('redirects protected dashboard access to login with the next path intact', async ({ page }) => {
    await page.goto('/en/dashboard');

    await expect(page).toHaveURL(/\/en\/auth\/login\?next=%2Fen%2Fdashboard$/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Join' })).toHaveAttribute(
      'href',
      '/en/auth/join?next=%2Fen%2Fdashboard'
    );
  });

  test('keeps add-business submission behind a signed-out account prompt', async ({ page }) => {
    await page.goto('/en/add-business?businessName=China%20Chili&businessSlug=china-chili-phoenix');

    await expect(page.getByRole('heading', { level: 1, name: 'Claim or add a business' })).toBeVisible();
    await expect(page.getByText('Account required')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Log in to claim or add a business' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Log in or sign up' })).toHaveAttribute(
      'href',
      /\/en\/auth\/login\?next=%2Fen%2Fadd-business/
    );
  });

  test('validates login form fields before attempting authentication', async ({ page }) => {
    await page.goto('/en/auth/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    await page.getByLabel('Email address').fill('not-an-email');
    await page.locator('#password').fill('123');
    await page.getByRole('button', { name: 'Sign in with email' }).click();

    await expect(page.getByText('Enter a valid email.')).toBeVisible();
    await expect(page.getByText('Password must be at least 6 characters.')).toBeVisible();

    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(page.getByRole('button', { name: 'Hide password' })).toBeVisible();
    await expect(page.locator('#password')).toHaveAttribute('type', 'text');
  });
});
