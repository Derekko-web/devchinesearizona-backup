import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('directory ad events route', () => {
  it('identifies the visitor by the address nginx appended, not one the client sent', async () => {
    const checkRateLimit = vi.fn(() => true);
    const recordDirectoryAdEvent = vi.fn().mockResolvedValue({ billed: true, recorded: true });

    vi.doMock('@/lib/rate-limit', () => ({ checkRateLimit }));
    vi.doMock('@/lib/directory-ads', () => ({ recordDirectoryAdEvent }));

    const { POST } = await import('@/app/api/directory/ads/events/route');
    // nginx uses $proxy_add_x_forwarded_for, so anything the client sends comes
    // first and the real remote address is always the last entry.
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
          'x-forwarded-for': '10.9.9.9, 192.0.2.55, 203.0.113.7',
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
