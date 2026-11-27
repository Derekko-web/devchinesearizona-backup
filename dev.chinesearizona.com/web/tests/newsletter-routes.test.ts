import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

const validToken = 'b'.repeat(64);

function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      host: 'chinesearizona.com',
      'x-forwarded-for': '198.51.100.20, 203.0.113.7, 127.0.0.1',
      ...headers,
    },
    method: 'POST',
  });
}

function formRequest(url: string, fields: Record<string, string>) {
  return new NextRequest(url, {
    body: new URLSearchParams(fields).toString(),
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-forwarded-for': '203.0.113.7',
    },
    method: 'POST',
  });
}

async function loadSubscribeRoute(options: { allowed?: boolean; subscribe?: ReturnType<typeof vi.fn> } = {}) {
  const checkRateLimit = vi.fn(() => options.allowed ?? true);
  const subscribeToNewsletter = options.subscribe ?? vi.fn().mockResolvedValue('subscribed');

  vi.doMock('@/lib/rate-limit', () => ({ checkRateLimit }));
  vi.doMock('@/lib/newsletter', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/newsletter')>()),
    subscribeToNewsletter,
  }));

  const { POST } = await import('@/app/api/newsletter/subscribe/route');
  return { POST, checkRateLimit, subscribeToNewsletter };
}

async function loadUnsubscribeRoute(unsubscribe = vi.fn().mockResolvedValue(true)) {
  vi.doMock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(() => true) }));
  vi.doMock('@/lib/newsletter', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/newsletter')>()),
    unsubscribeFromNewsletter: unsubscribe,
  }));

  const { POST } = await import('@/app/api/newsletter/unsubscribe/route');
  return { POST, unsubscribe };
}

// Built from the same module instance the route imports, so `instanceof` holds.
function rejectWithNewsletterError(code: 'unavailable' | 'error', status: number) {
  return vi.fn().mockImplementation(async () => {
    const { NewsletterError } = await import('@/lib/newsletter');
    throw new NewsletterError(code, status);
  });
}

const subscribeUrl = 'http://127.0.0.1:3001/api/newsletter/subscribe';
const unsubscribeUrl = 'http://127.0.0.1:3001/api/newsletter/unsubscribe';

describe('newsletter subscribe route', () => {
  it('saves a sign-up with the site from the host, the page language and the source page', async () => {
    const { POST, subscribeToNewsletter, checkRateLimit } = await loadSubscribeRoute();

    const response = await POST(
      jsonRequest(subscribeUrl, { email: ' Reader@Example.com ', sourcePath: '/zh/news', website: '' }, { 'x-locale': 'zh' })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ code: 'subscribed', message: '訂閱成功，謝謝你的加入！' });
    expect(checkRateLimit).toHaveBeenCalledWith('newsletter-signup:203.0.113.7', 5, 600_000);
    expect(subscribeToNewsletter).toHaveBeenCalledWith({
      email: 'reader@example.com',
      sourcePath: '/zh/news',
      locale: 'zh',
      site: expect.objectContaining({ key: 'arizona' }),
    });
  });

  it('gives the same answer when the email is already on the list', async () => {
    const { POST } = await loadSubscribeRoute({ subscribe: vi.fn().mockResolvedValue('already_subscribed') });

    const response = await POST(jsonRequest(subscribeUrl, { email: 'reader@example.com' }));

    expect(response.status).toBe(200);
    expect((await response.json()).code).toBe('subscribed');
  });

  it('tags sign-ups from a city site with that site', async () => {
    const { POST, subscribeToNewsletter } = await loadSubscribeRoute();

    await POST(jsonRequest(subscribeUrl, { email: 'reader@example.com' }, { host: 'chineseaustin.com' }));

    expect(subscribeToNewsletter.mock.calls[0][0].site.key).toBe('austin');
  });

  it('returns 429 with a bilingual-ready code once the limit is reached', async () => {
    const { POST, subscribeToNewsletter } = await loadSubscribeRoute({ allowed: false });

    const response = await POST(jsonRequest(subscribeUrl, { email: 'reader@example.com' }));

    expect(response.status).toBe(429);
    expect((await response.json()).code).toBe('rate_limited');
    expect(subscribeToNewsletter).not.toHaveBeenCalled();
  });

  it('rejects a bad email or unreadable body with 400', async () => {
    const { POST, subscribeToNewsletter } = await loadSubscribeRoute();

    const badEmail = await POST(jsonRequest(subscribeUrl, { email: 'nope' }));
    expect(badEmail.status).toBe(400);
    expect((await badEmail.json()).code).toBe('invalid_email');

    const badBody = await POST(jsonRequest(subscribeUrl, '{not json'));
    expect(badBody.status).toBe(400);
    expect(subscribeToNewsletter).not.toHaveBeenCalled();
  });

  it('pretends to succeed for bots that fill the hidden field, and saves nothing', async () => {
    const { POST, subscribeToNewsletter } = await loadSubscribeRoute();

    const response = await POST(jsonRequest(subscribeUrl, { email: 'bot@example.com', website: 'http://spam.example' }));

    expect(response.status).toBe(200);
    expect((await response.json()).code).toBe('subscribed');
    expect(subscribeToNewsletter).not.toHaveBeenCalled();
  });

  it('passes through storage errors as their own code and status', async () => {
    const { POST } = await loadSubscribeRoute({ subscribe: rejectWithNewsletterError('unavailable', 503) });

    const response = await POST(jsonRequest(subscribeUrl, { email: 'reader@example.com' }));
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe('unavailable');
  });

  it('answers 500 for unexpected failures', async () => {
    const { POST } = await loadSubscribeRoute({ subscribe: vi.fn().mockRejectedValue(new Error('surprise')) });

    const response = await POST(jsonRequest(subscribeUrl, { email: 'reader@example.com' }));
    expect(response.status).toBe(500);
    expect((await response.json()).code).toBe('error');
  });
});

describe('newsletter unsubscribe route', () => {
  it('sends the confirm-page form back to the page with a done status', async () => {
    const { POST, unsubscribe } = await loadUnsubscribeRoute();

    const response = await POST(formRequest(unsubscribeUrl, { token: validToken }));

    expect(unsubscribe).toHaveBeenCalledWith(validToken);
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/newsletter/unsubscribe?status=done');
  });

  it('marks an unknown token as invalid', async () => {
    const { POST } = await loadUnsubscribeRoute(vi.fn().mockResolvedValue(false));

    const response = await POST(formRequest(unsubscribeUrl, { token: validToken }));
    expect(response.headers.get('location')).toBe('/newsletter/unsubscribe?status=invalid');
  });

  it('shows an error status when the database is down', async () => {
    const { POST } = await loadUnsubscribeRoute(vi.fn().mockRejectedValue(new Error('down')));

    const response = await POST(formRequest(unsubscribeUrl, { token: validToken }));
    expect(response.headers.get('location')).toBe('/newsletter/unsubscribe?status=error');
  });

  it('supports one-click unsubscribe from a mail app (token in the URL)', async () => {
    const { POST, unsubscribe } = await loadUnsubscribeRoute();

    const response = await POST(
      formRequest(`${unsubscribeUrl}?token=${validToken}`, { 'List-Unsubscribe': 'One-Click' })
    );

    expect(unsubscribe).toHaveBeenCalledWith(validToken);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ unsubscribed: true });
  });

  it('answers JSON callers with 404 for an unknown token', async () => {
    const { POST } = await loadUnsubscribeRoute(vi.fn().mockResolvedValue(false));

    const response = await POST(jsonRequest(unsubscribeUrl, { token: validToken }));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ unsubscribed: false });
  });

  it('answers JSON callers with the storage status when the database fails', async () => {
    const { POST } = await loadUnsubscribeRoute(rejectWithNewsletterError('unavailable', 503));

    const response = await POST(jsonRequest(unsubscribeUrl, { token: validToken }));
    expect(response.status).toBe(503);
  });
});
