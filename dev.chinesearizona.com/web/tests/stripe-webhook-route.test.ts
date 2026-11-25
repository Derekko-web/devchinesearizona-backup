import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Stripe is configured to post to /api/shop/webhooks/stripe. The Shop is gone,
// but directory ad payments still arrive at that URL.
const WEBHOOK_URL = 'https://dev.chinesearizona.com/api/shop/webhooks/stripe';

const directoryAdEvent = {
  id: 'evt_test_directory_ad',
  type: 'checkout.session.completed',
  data: { object: { metadata: { checkout_kind: 'directory_ad' } } },
};

function mockStripe() {
  const constructEvent = vi.fn(() => directoryAdEvent);
  vi.doMock('@/lib/stripe', () => ({
    getStripeClient: () => ({ webhooks: { constructEvent } }),
    getStripeWebhookSecret: () => 'whsec_test',
  }));
  return constructEvent;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('Stripe webhook route', () => {
  it('delivers directory ad events posted to the existing webhook URL', async () => {
    const constructEvent = mockStripe();
    const handleDirectoryAdStripeEvent = vi.fn().mockResolvedValue(undefined);
    const handleShopStripeEvent = vi.fn().mockResolvedValue(undefined);
    vi.doMock('@/lib/directory-ads', () => ({ handleDirectoryAdStripeEvent }));
    vi.doMock('@/lib/shop-payments', () => ({ handleShopStripeEvent }));

    const { POST } = await import('@/app/api/shop/webhooks/stripe/route');
    const response = await POST(
      new NextRequest(WEBHOOK_URL, {
        body: '{"id":"evt_test_directory_ad"}',
        headers: { 'stripe-signature': 't=1,v1=test' },
        method: 'POST',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      received: true,
      type: 'checkout.session.completed',
    });
    expect(constructEvent).toHaveBeenCalledWith(
      '{"id":"evt_test_directory_ad"}',
      't=1,v1=test',
      'whsec_test'
    );
    expect(handleDirectoryAdStripeEvent).toHaveBeenCalledTimes(1);
    expect(handleDirectoryAdStripeEvent).toHaveBeenCalledWith(directoryAdEvent);
    expect(handleShopStripeEvent).not.toHaveBeenCalled();
  });

  it('rejects requests without a Stripe signature', async () => {
    mockStripe();
    const handleDirectoryAdStripeEvent = vi.fn();
    vi.doMock('@/lib/directory-ads', () => ({ handleDirectoryAdStripeEvent }));

    const { POST } = await import('@/app/api/shop/webhooks/stripe/route');
    const response = await POST(new NextRequest(WEBHOOK_URL, { body: '{}', method: 'POST' }));

    expect(response.status).toBe(400);
    expect(handleDirectoryAdStripeEvent).not.toHaveBeenCalled();
  });
});
