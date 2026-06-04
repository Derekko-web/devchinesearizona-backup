import { expect, test } from '@playwright/test';

test.describe('high-risk public and API routes', () => {
  test('keeps the auth session API safe for signed-out requests', async ({ request }) => {
    const signedOut = await request.get('/api/auth/session');

    expect(signedOut.status()).toBe(200);
    expect(signedOut.headers()['content-type']).toContain('application/json');
    expect(await signedOut.json()).toEqual({ user: null });

    const missingTokens = await request.post('/api/auth/session', {
      data: {
        accessToken: 'access-only',
      },
    });

    expect(missingTokens.status()).toBe(400);
    expect(await missingTokens.json()).toMatchObject({
      message: 'Missing session tokens.',
    });

    const clearSession = await request.delete('/api/auth/session');

    expect(clearSession.status()).toBe(200);
    expect(await clearSession.json()).toEqual({ ok: true });
  });

  test('serves the public business directory and detail route', async ({ request }) => {
    const directory = await request.get('/business');

    expect(directory.status()).toBe(200);
    const directoryHtml = await directory.text();
    expect(directoryHtml).toContain('ChineseArizona');
    expect(directoryHtml).toContain('/en/business/china-chili-phoenix');

    const detail = await request.get('/business/china-chili-phoenix');

    expect(detail.status()).toBe(200);
    const detailHtml = await detail.text();
    expect(detailHtml).toContain('China Chili');
    expect(detailHtml).toContain('Phoenix');
  });

  test('rejects unsigned Stripe webhook requests before processing', async ({ request }) => {
    const response = await request.post('/api/shop/webhooks/stripe', {
      data: {
        id: 'evt_unsigned',
        type: 'checkout.session.completed',
      },
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({
      message: 'Missing Stripe signature.',
    });
  });

  test('serves an Austin public route from forwarded city-domain headers', async ({ request }) => {
    const response = await request.get('/business', {
      headers: {
        'x-forwarded-host': 'www.chineseaustin.com',
        'x-forwarded-proto': 'https',
      },
    });

    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('ChineseAustin');
    expect(html).toContain('Austin');
  });
});
