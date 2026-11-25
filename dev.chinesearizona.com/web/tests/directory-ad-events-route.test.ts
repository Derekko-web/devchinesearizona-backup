import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('directory ad events route', () => {
  it('identifies the visitor by the address our proxies forwarded, not one the client sent', async () => {
    const checkRateLimit = vi.fn(() => true);
    const recordDirectoryAdEvent = vi.fn().mockResolvedValue({ billed: true, recorded: true });

    vi.doMock('@/lib/rate-limit', () => ({ checkRateLimit }));
    vi.doMock('@/lib/directory-ads', () => ({ recordDirectoryAdEvent }));

    const { POST } = await import('@/app/api/directory/ads/events/route');
    // Traefik sets the real remote address, then nginx appends Traefik's own
    // loopback address, so the visitor is the rightmost non-internal entry.
    const response = await POST(
      new NextRequest('http://127.0.0.1:3001/api/directory/ads/events', {
        body: JSON.stringify({
          businessId: 'business-1',
          campaignId: 'campaign-1',
          eventType: 'click',
          pagePath: '/en/directory',
          sessionId: 'session-a',
        }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '198.51.100.20, 203.0.113.7, 127.0.0.1',
        },
        method: 'POST',
      })
    );

    expect(response.status).toBe(200);
    expect(recordDirectoryAdEvent).toHaveBeenCalledWith(
      expect.objectContaining({ visitorAddress: '203.0.113.7' })
    );
    expect(checkRateLimit).toHaveBeenCalledWith('directory-ad-events:203.0.113.7', 180, 60_000);
  });
});
