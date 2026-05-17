import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('directory ad checkout route', () => {
  it('passes the current request origin into checkout creation', async () => {
    const requireApiUser = vi.fn().mockResolvedValue({
      profile: { id: 'profile-1' },
      response: null,
      user: { email: 'owner@example.com' },
    });
    const withApiAuthSession = vi.fn((response: Response) => response);
    const createDirectoryAdCheckoutForProfile = vi.fn().mockResolvedValue({
      message: 'Sponsored placement checkout created.',
      mode: 'redirect',
      url: 'https://checkout.stripe.test/session_123',
    });

    vi.doMock('@/lib/api-auth', () => ({
      requireApiUser,
      withApiAuthSession,
    }));
    vi.doMock('@/lib/directory-ads', () => ({
      createDirectoryAdCheckoutForProfile,
    }));
    vi.doMock('@/lib/rate-limit', () => ({
      checkRateLimit: vi.fn(() => true),
    }));

    const { POST } = await import('@/app/api/directory/ads/checkout/route');
    const request = new NextRequest('https://preview.chinesearizona.com/api/directory/ads/checkout', {
      body: JSON.stringify({
        budgetCents: 10_000,
        businessSlug: 'lotus-market',
      }),
      headers: {
        'content-type': 'application/json',
        'x-locale': 'en',
      },
      method: 'POST',
    });

    const response = await POST(request);

    expect(createDirectoryAdCheckoutForProfile).toHaveBeenCalledWith({
      baseUrl: 'https://preview.chinesearizona.com',
      budgetCents: 10_000,
      businessSlug: 'lotus-market',
      locale: 'en',
      profileId: 'profile-1',
      userEmail: 'owner@example.com',
    });
    await expect(response.json()).resolves.toEqual({
      message: 'Sponsored placement checkout created.',
      mode: 'redirect',
      url: 'https://checkout.stripe.test/session_123',
    });
  });
});
