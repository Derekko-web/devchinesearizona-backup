import { NextRequest } from 'next/server';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

function checkoutRequest(body: unknown, locale = 'en') {
  return new NextRequest('https://chinesearizona.com/api/directory/listing-plans/checkout', {
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.9, 127.0.0.1',
      'x-locale': locale,
    },
    method: 'POST',
  });
}

async function loadRoute({
  allowed = true,
  checkout = vi.fn(),
  profile = { id: 'profile-1' } as { id: string } | null,
} = {}) {
  const checkRateLimit = vi.fn(() => allowed);
  vi.doMock('@/lib/api-auth', () => ({
    requireApiUser: vi.fn().mockResolvedValue({ profile, response: null, user: { email: 'owner@example.com' } }),
    withApiAuthSession: vi.fn((response: Response) => response),
  }));
  vi.doMock('@/lib/rate-limit', () => ({ checkRateLimit }));
  vi.doMock('@/lib/listing-plans', async () => {
    const actual = await vi.importActual<typeof import('@/lib/listing-plans')>('@/lib/listing-plans');
    return { ListingPlanError: actual.ListingPlanError, createListingPlanCheckoutForProfile: checkout };
  });
  const { POST } = await import('@/app/api/directory/listing-plans/checkout/route');
  return { POST, checkRateLimit, checkout };
}

describe('listing plan checkout route', () => {
  it('starts checkout for the signed-in owner and rate limits by visitor address', async () => {
    const checkout = vi.fn().mockResolvedValue({
      message: 'Plan checkout created.',
      mode: 'redirect',
      url: 'https://checkout.stripe.test/cs_1',
    });
    const { POST, checkRateLimit } = await loadRoute({ checkout });

    const response = await POST(
      checkoutRequest({ businessSlug: 'lotus-kitchen', interval: 'year', planId: 'enhanced-listing' })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ url: 'https://checkout.stripe.test/cs_1' });
    expect(checkout).toHaveBeenCalledWith({
      baseUrl: 'https://chinesearizona.com',
      businessSlug: 'lotus-kitchen',
      interval: 'year',
      locale: 'en',
      planId: 'enhanced-listing',
      profileId: 'profile-1',
      userEmail: 'owner@example.com',
    });
    expect(checkRateLimit).toHaveBeenCalledWith('listing-plan-checkout:203.0.113.9', 12, 60_000);
  });

  it('rejects missing details, bad JSON and too many attempts', async () => {
    const { POST, checkout } = await loadRoute();
    expect((await POST(checkoutRequest({ businessSlug: 'lotus-kitchen' }))).status).toBe(400);
    expect((await POST(checkoutRequest('not json'))).status).toBe(400);
    expect(checkout).not.toHaveBeenCalled();

    vi.resetModules();
    const limited = await loadRoute({ allowed: false });
    const response = await limited.POST(
      checkoutRequest({ businessSlug: 'lotus-kitchen', interval: 'year', planId: 'enhanced-listing' }, 'zh')
    );
    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({ message: '操作太頻繁，請稍候再試。' });
  });

  it('passes plan errors through with their status and hides unexpected ones', async () => {
    const { ListingPlanError } = await vi.importActual<typeof import('@/lib/listing-plans')>('@/lib/listing-plans');
    const soldOut = vi.fn().mockRejectedValue(new ListingPlanError('All 3 sponsored spots are taken.', 409));
    const { POST } = await loadRoute({ checkout: soldOut });
    const body = { businessSlug: 'lotus-kitchen', interval: 'month', planId: 'sponsored-category' };

    const conflict = await POST(checkoutRequest(body));
    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toEqual({ message: 'All 3 sponsored spots are taken.' });

    vi.resetModules();
    const boom = await loadRoute({ checkout: vi.fn().mockRejectedValue(new Error('stripe exploded')) });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const failed = await boom.POST(checkoutRequest(body));
    expect(failed.status).toBe(500);
    await expect(failed.json()).resolves.toEqual({
      message: 'Unable to start plan checkout right now. Please try again later.',
    });
  });

  it('answers 503 when the account has no business profile', async () => {
    const { POST } = await loadRoute({ profile: null });
    const response = await POST(
      checkoutRequest({ businessSlug: 'lotus-kitchen', interval: 'year', planId: 'enhanced-listing' })
    );
    expect(response.status).toBe(503);
  });
});

describe('ListingPlanPanel', () => {
  const liveBusiness = { slug: 'lotus-kitchen', status: 'live' as const, verificationState: 'claimed' as const };

  it('shows founding prices, an active term with a renew button, and a sold-out category', async () => {
    const { ListingPlanPanel } = await import('@/components/directory/ListingPlanPanel');
    const html = renderToStaticMarkup(
      <ListingPlanPanel
        available
        business={liveBusiness}
        locale="en"
        states={[
          { planId: 'enhanced-listing', activeUntil: '2027-11-26T12:00:00.000Z', foundingPrice: true, soldOut: false },
          { planId: 'sponsored-category', foundingPrice: false, soldOut: true },
        ]}
      />
    );

    expect(html).toContain('Active until Nov 26, 2027');
    // Enhanced is described by what only it gives; Verified comes from the free claim (#472).
    expect(html).toContain('Your logo and up to 12 photos');
    expect(html).toContain('A done-for-you bilingual write-up is included with a founding year.');
    expect(html).not.toMatch(/verified badge/i);
    expect(html).toContain('Renew 1 year · $99');
    expect(html).toContain('$199');
    expect(html).toContain('Founding price (first 10 businesses, kept on renewal)');
    expect(html).toContain('All 3 sponsored spots in this category are taken right now.');
    expect(html).toContain('Buy 1 month · $59');
    expect(html).toContain('Buy 1 year · $590');
    // Sold-out buttons are disabled; the Enhanced renew button is not.
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });

  it('explains why buying is closed in Chinese', async () => {
    const { ListingPlanPanel } = await import('@/components/directory/ListingPlanPanel');
    const unavailable = renderToStaticMarkup(
      <ListingPlanPanel available={false} business={liveBusiness} locale="zh" states={[]} />
    );
    expect(unavailable).toContain('線上購買方案尚未在此環境開放');
    expect(unavailable).toContain('購買 1 年 · $199');
    expect(unavailable.match(/disabled=""/g)).toHaveLength(3);

    const unclaimed = renderToStaticMarkup(
      <ListingPlanPanel
        available
        mockMode
        business={{ ...liveBusiness, verificationState: 'unverified' }}
        locale="zh"
        states={[]}
      />
    );
    expect(unclaimed).toContain('只有已認領且已上線的商家可以購買方案');
    expect(unclaimed).toContain('本機測試模式');
  });
});

describe('AdminListingPlansPanel', () => {
  it('lists paid plans with founding and queued markers', async () => {
    const { AdminListingPlansPanel } = await import('@/components/directory/AdminListingPlansPanel');
    const html = renderToStaticMarkup(
      <AdminListingPlansPanel
        locale="en"
        plans={[
          {
            id: 'p-1',
            businessSlug: 'lotus-kitchen',
            businessName: 'Lotus Kitchen',
            planId: 'sponsored-category',
            interval: 'month',
            amountCents: 2950,
            founding: true,
            scopeCategory: 'restaurants',
            startsAt: '2026-12-20T00:00:00.000Z',
            endsAt: '2027-01-20T00:00:00.000Z',
            live: false,
          },
        ]}
      />
    );

    expect(html).toContain('Paid listing plans');
    expect(html).toContain('href="/business/lotus-kitchen"');
    expect(html).toContain('Sponsored category spot');
    expect(html).toContain('restaurants');
    expect(html).toContain('Founding');
    expect(html).toContain('$29.50');
    expect(html).toContain('(queued)');

    const empty = renderToStaticMarkup(<AdminListingPlansPanel locale="zh" plans={[]} />);
    expect(empty).toContain('目前沒有付費方案');
  });
});
