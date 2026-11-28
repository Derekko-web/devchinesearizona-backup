import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// After an email sign-up that still needs confirming, owners are told what to
// do if the confirmation email never arrives (#471).

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock('@supabase/supabase-js');
});

describe('pendingSignupMessage', () => {
  it('says a confirmation email was sent and offers Google and the spam folder, in both languages', async () => {
    const { pendingSignupMessage } = await import('@/lib/auth');

    const en = pendingSignupMessage('en');
    expect(en).toContain('We sent you a confirmation email');
    expect(en).toContain('spam folder');
    expect(en).toContain('Continue with Google');

    const zh = pendingSignupMessage('zh');
    expect(zh).toContain('我們已寄出確認信');
    expect(zh).toContain('垃圾郵件匣');
    expect(zh).toContain('使用 Google 繼續');
  });
});

describe('POST /api/auth/signup without JavaScript', () => {
  it('sends an unconfirmed sign-up back to the join page with that message, and never puts the email in the URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-key');
    const signUp = vi.fn().mockResolvedValue({
      data: { session: null, user: { id: 'u-1', email: 'owner@example.com', email_confirmed_at: null } },
      error: null,
    });
    vi.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { signUp } }) }));
    const { POST } = await import('@/app/api/auth/signup/route');
    const { pendingSignupMessage } = await import('@/lib/auth');

    const form = new FormData();
    form.set('email', 'owner@example.com');
    form.set('password', 'a-strong-password');
    form.set('locale', 'zh');
    form.set('next', '/zh/add-business?businessSlug=lotus-kitchen');
    const response = await POST(new NextRequest('http://127.0.0.1:3001/api/auth/signup', { method: 'POST', body: form }));

    expect(response.status).toBe(303);
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/zh/auth/join');
    expect(location.searchParams.get('message')).toBe(pendingSignupMessage('zh'));
    expect(location.searchParams.get('tone')).toBe('success');
    expect(location.searchParams.get('next')).toBe('/zh/add-business?businessSlug=lotus-kitchen');
    expect(location.toString()).not.toContain('owner%40example.com');
    expect(location.toString()).not.toContain('owner@example.com');
  });
});
