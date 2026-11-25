import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

function clickRequest(body: unknown) {
  return new NextRequest('http://127.0.0.1:3001/api/directory/contact-clicks', {
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '198.51.100.20, 203.0.113.7, 127.0.0.1',
    },
    method: 'POST',
  });
}

async function loadRoute(allowed = true) {
  const checkRateLimit = vi.fn(() => allowed);
  const recordBusinessContactClick = vi.fn().mockResolvedValue({ recorded: true });

  vi.doMock('@/lib/rate-limit', () => ({ checkRateLimit }));
  vi.doMock('@/lib/business-leads', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/business-leads')>()),
    recordBusinessContactClick,
  }));

  const { POST } = await import('@/app/api/directory/contact-clicks/route');
  return { POST, checkRateLimit, recordBusinessContactClick };
}

describe('business contact clicks route', () => {
  it('records a click for the visitor address our proxies forwarded', async () => {
    const { POST, checkRateLimit, recordBusinessContactClick } = await loadRoute();

    const response = await POST(clickRequest({ businessSlug: 'elite-az-realty-team', action: 'call' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ recorded: true });
    expect(checkRateLimit).toHaveBeenCalledWith('contact-clicks:203.0.113.7', 60, 60_000);
    expect(recordBusinessContactClick).toHaveBeenCalledWith({
      businessSlug: 'elite-az-realty-team',
      action: 'call',
      visitorAddress: '203.0.113.7',
    });
  });

  it('accepts website and directions clicks', async () => {
    const { POST, recordBusinessContactClick } = await loadRoute();

    await POST(clickRequest({ businessSlug: 'elite-az-realty-team', action: 'website' }));
    await POST(clickRequest({ businessSlug: 'elite-az-realty-team', action: 'directions' }));

    expect(recordBusinessContactClick.mock.calls.map(([input]) => input.action)).toEqual(['website', 'directions']);
  });

  it('rejects unknown actions, bad slugs, and non-JSON bodies', async () => {
    const { POST, recordBusinessContactClick } = await loadRoute();

    expect((await POST(clickRequest({ businessSlug: 'elite-az-realty-team', action: 'email' }))).status).toBe(400);
    expect((await POST(clickRequest({ businessSlug: '../admin', action: 'call' }))).status).toBe(400);
    expect((await POST(clickRequest({ action: 'call' }))).status).toBe(400);
    expect((await POST(clickRequest('not json'))).status).toBe(400);
    expect(recordBusinessContactClick).not.toHaveBeenCalled();
  });

  it('returns 429 once a visitor clicks too fast', async () => {
    const { POST, recordBusinessContactClick } = await loadRoute(false);

    const response = await POST(clickRequest({ businessSlug: 'elite-az-realty-team', action: 'call' }));

    expect(response.status).toBe(429);
    expect(recordBusinessContactClick).not.toHaveBeenCalled();
  });
});
