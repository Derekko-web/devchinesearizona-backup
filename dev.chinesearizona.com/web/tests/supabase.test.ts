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

  it('preserves normal Supabase validation errors', () => {
    expect(
      getSupabaseAuthErrorMessage(new Error('Invalid login credentials'), 'en', 'Fallback')
    ).toBe('Invalid login credentials');
  });
});
