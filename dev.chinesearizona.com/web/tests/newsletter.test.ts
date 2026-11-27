import { beforeEach, describe, expect, it, vi } from 'vitest';

import { siteProfiles } from '@/lib/site-config';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

const validToken = 'a'.repeat(64);

async function loadNewsletter(rpc?: ReturnType<typeof vi.fn>) {
  vi.doMock('@/lib/supabase', () => ({
    getSupabaseServiceClient: () => (rpc ? { rpc } : null),
  }));

  return import('@/lib/newsletter');
}

describe('newsletter sign-up input', () => {
  it('trims and lower-cases the email and keeps only an on-site source path', async () => {
    const { parseNewsletterSignupInput } = await loadNewsletter();

    expect(parseNewsletterSignupInput({ email: '  Reader@Example.COM ', sourcePath: '/zh/business' })).toEqual({
      email: 'reader@example.com',
      sourcePath: '/zh/business',
    });
    expect(parseNewsletterSignupInput({ email: 'a@b.co', sourcePath: 'https://evil.example/x' }).sourcePath).toBeUndefined();
    expect(parseNewsletterSignupInput({ email: 'a@b.co', sourcePath: '//evil.example/x' }).sourcePath).toBeUndefined();
    expect(parseNewsletterSignupInput({ email: 'a@b.co', sourcePath: `/${'x'.repeat(400)}` }).sourcePath).toHaveLength(300);
  });

  it('rejects missing, malformed and overlong emails', async () => {
    const { parseNewsletterSignupInput, NewsletterError } = await loadNewsletter();

    for (const body of [null, {}, { email: 'not-an-email' }, { email: 'a@b' }, { email: `${'x'.repeat(250)}@b.co` }]) {
      expect(() => parseNewsletterSignupInput(body)).toThrow(NewsletterError);
    }
    try {
      parseNewsletterSignupInput({ email: 'nope' });
    } catch (error) {
      expect(error).toMatchObject({ code: 'invalid_email', status: 400 });
    }
  });

  it('stores the bilingual consent wording with the site brand', async () => {
    const { buildConsentText } = await loadNewsletter();

    const text = buildConsentText(siteProfiles.arizona);
    expect(text).toContain('By subscribing, you agree to get email updates from ChineseArizona.');
    expect(text).toContain('訂閱即表示你同意收到 ChineseArizona 的電子報');
  });

  it('accepts only hex unsubscribe tokens of a safe length', async () => {
    const { isValidUnsubscribeToken } = await loadNewsletter();

    expect(isValidUnsubscribeToken(validToken)).toBe(true);
    expect(isValidUnsubscribeToken('abc')).toBe(false);
    expect(isValidUnsubscribeToken(`${'a'.repeat(63)}Z`)).toBe(false);
    expect(isValidUnsubscribeToken(undefined)).toBe(false);
  });
});

describe('newsletter storage', () => {
  it('subscribes through the database function with the site, language and source page', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'subscribed', error: null });
    const { subscribeToNewsletter } = await loadNewsletter(rpc);

    await expect(
      subscribeToNewsletter({
        email: 'reader@example.com',
        site: siteProfiles.arizona,
        locale: 'zh',
        sourcePath: '/zh/news',
      })
    ).resolves.toBe('subscribed');

    expect(rpc).toHaveBeenCalledWith('newsletter_subscribe', {
      p_email: 'reader@example.com',
      p_site_key: 'arizona',
      p_locale: 'zh',
      p_source_path: '/zh/news',
      p_consent_text: expect.stringContaining('Unsubscribe anytime.'),
    });
  });

  it('reports a repeat sign-up as already subscribed, without an error', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'already_subscribed', error: null });
    const { subscribeToNewsletter } = await loadNewsletter(rpc);

    await expect(
      subscribeToNewsletter({ email: 'reader@example.com', site: siteProfiles.arizona, locale: 'en' })
    ).resolves.toBe('already_subscribed');
    expect(rpc.mock.calls[0][1].p_source_path).toBeNull();
  });

  it('fails with a 500 when the database errors or answers something unexpected', async () => {
    for (const result of [{ data: null, error: { message: 'boom' } }, { data: 'weird', error: null }]) {
      vi.resetModules();
      const { subscribeToNewsletter } = await loadNewsletter(vi.fn().mockResolvedValue(result));
      await expect(
        subscribeToNewsletter({ email: 'reader@example.com', site: siteProfiles.arizona, locale: 'en' })
      ).rejects.toMatchObject({ code: 'error', status: 500 });
    }
  });

  it('is unavailable (503) when the server has no database key', async () => {
    const { subscribeToNewsletter, unsubscribeFromNewsletter } = await loadNewsletter();

    await expect(
      subscribeToNewsletter({ email: 'reader@example.com', site: siteProfiles.arizona, locale: 'en' })
    ).rejects.toMatchObject({ code: 'unavailable', status: 503 });
    await expect(unsubscribeFromNewsletter(validToken)).rejects.toMatchObject({ code: 'unavailable', status: 503 });
  });

  it('unsubscribes by token and never queries for a malformed token', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const { unsubscribeFromNewsletter } = await loadNewsletter(rpc);

    await expect(unsubscribeFromNewsletter(validToken)).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith('newsletter_unsubscribe', { p_token: validToken });

    await expect(unsubscribeFromNewsletter("x' or 1=1")).resolves.toBe(false);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('returns false for an unknown token and throws on a database error', async () => {
    const unknown = await loadNewsletter(vi.fn().mockResolvedValue({ data: false, error: null }));
    await expect(unknown.unsubscribeFromNewsletter(validToken)).resolves.toBe(false);

    vi.resetModules();
    const failing = await loadNewsletter(vi.fn().mockResolvedValue({ data: null, error: { message: 'down' } }));
    await expect(failing.unsubscribeFromNewsletter(validToken)).rejects.toMatchObject({ code: 'error' });
  });
});
