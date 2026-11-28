import { afterEach, describe, expect, it } from 'vitest';

import {
  getSupabaseAuthErrorMessage,
  getSupabaseAuthUnavailableMessage,
  getSupabasePublicKey,
  isSupabaseConfigured,
} from '@/lib/supabase';

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalPublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

afterEach(() => {
  if (originalUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  }

  if (originalPublishableKey === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalPublishableKey;
  }

  if (originalAnonKey === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
  }
});

describe('supabase config helpers', () => {
  it('prefers the publishable key when both public keys are present', () => {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_new';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'legacy_anon';

    expect(getSupabasePublicKey()).toBe('sb_publishable_new');
  });

  it('falls back to the legacy anon key when a publishable key is absent', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'legacy_anon';

    expect(getSupabasePublicKey()).toBe('legacy_anon');
  });

  it('treats either public key format as a valid auth configuration', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'legacy_anon';

    expect(isSupabaseConfigured()).toBe(true);

    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_new';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(isSupabaseConfigured()).toBe(true);
  });

  it('sanitizes transient Supabase outage responses before they reach users or logs', () => {
    expect(
      getSupabaseAuthErrorMessage(
        new Error('<html><h1>Cloudflare Error 522</h1></html>'),
        'en',
        'Fallback'
      )
    ).toBe(getSupabaseAuthUnavailableMessage('en'));
  });

  it('preserves Supabase validation errors it has no translation for', () => {
    expect(
      getSupabaseAuthErrorMessage(new Error('Signups not allowed for this instance'), 'en', 'Fallback')
    ).toBe('Signups not allowed for this instance');
  });
});

describe('localizeSupabaseAuthMessage (#469)', () => {
  it('turns the common Supabase Auth messages into plain English and Traditional Chinese', async () => {
    const { localizeSupabaseAuthMessage, getSupabaseAuthErrorMessage } = await import('@/lib/supabase');

    expect(localizeSupabaseAuthMessage('User already registered', 'zh')).toBe('這個 Email 已經註冊過了，請直接登入。');
    expect(localizeSupabaseAuthMessage('Email address "owner@test.example" is invalid', 'zh')).toContain('無法收信');
    expect(localizeSupabaseAuthMessage('Email address "owner@test.example" is invalid', 'en')).toContain('can’t receive mail');
    expect(localizeSupabaseAuthMessage('Password should be at least 6 characters.', 'zh')).toBe('密碼至少需要 6 個字元。');
    expect(localizeSupabaseAuthMessage('Email not confirmed', 'zh')).toContain('使用 Google 繼續');
    expect(localizeSupabaseAuthMessage('email rate limit exceeded', 'en')).toContain('Too many attempts');
    expect(localizeSupabaseAuthMessage('For security purposes, you can only request this after 42 seconds.', 'zh')).toBe(
      '為了帳號安全，請等 42 秒後再試。'
    );
    expect(localizeSupabaseAuthMessage('Something new from Supabase', 'zh')).toBe('Something new from Supabase');
    expect(getSupabaseAuthErrorMessage({ message: 'Invalid login credentials' }, 'zh', 'fallback')).toBe('Email 或密碼不正確。');
  });
});
