import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { buildAuthPath, buildPostAuthRedirectUrl, sanitizeAuthRedirect } from '@/lib/auth';
import { resolveLocale } from '@/lib/i18n';
import { getRequestBaseUrl } from '@/lib/request-url';
import { writeSessionCookies } from '@/lib/server-auth';
import {
  getSupabaseAuthErrorMessage,
  getSupabasePublicKey,
  hasSupabaseAuthErrorMessage,
  isSupabaseConfigured,
} from '@/lib/supabase';

function buildAuthRedirectUrl(
  baseUrl: string,
  locale: ReturnType<typeof resolveLocale>,
  options: {
    emailError?: string;
    nextPath?: string | null;
    message?: string;
    passwordError?: string;
    tone?: 'success' | 'error' | 'info';
  }
) {
  const authUrl = new URL(buildAuthPath(locale), baseUrl);
  const nextPath = sanitizeAuthRedirect(options.nextPath);

  if (nextPath) {
    authUrl.searchParams.set('next', nextPath);
  }

  if (options.message) {
    authUrl.searchParams.set('message', options.message);
  }

  if (options.emailError) {
    authUrl.searchParams.set('email_error', options.emailError);
  }

  if (options.passwordError) {
    authUrl.searchParams.set('password_error', options.passwordError);
  }

  if (options.tone) {
    authUrl.searchParams.set('tone', options.tone);
  }

  return authUrl;
}

function redirectToAuth(authUrl: URL) {
  return NextResponse.redirect(authUrl, { status: 303 });
}

function isLikelyEmail(value: string): boolean {
  return value.includes('@');
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const baseUrl = getRequestBaseUrl(request);
  const locale = resolveLocale(String(formData.get('locale') ?? '') || undefined);
  const nextPath = String(formData.get('next') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return redirectToAuth(
      buildAuthRedirectUrl(baseUrl, locale, {
        nextPath,
        emailError: !email ? (locale === 'zh' ? '請輸入 email。' : 'Enter an email.') : undefined,
        passwordError: !password ? (locale === 'zh' ? '請輸入密碼。' : 'Enter a password.') : undefined,
      })
    );
  }

  if (!isLikelyEmail(email) || password.length < 6) {
    return redirectToAuth(
      buildAuthRedirectUrl(baseUrl, locale, {
        nextPath,
        emailError: !isLikelyEmail(email) ? (locale === 'zh' ? '請輸入有效的 email。' : 'Enter a valid email.') : undefined,
        passwordError:
          password.length < 6
            ? locale === 'zh'
              ? '密碼至少需要 6 個字元。'
              : 'Password must be at least 6 characters.'
            : undefined,
      })
    );
  }

  if (!isSupabaseConfigured()) {
    return redirectToAuth(
      buildAuthRedirectUrl(baseUrl, locale, {
        nextPath,
        message:
          locale === 'zh'
            ? '尚未設定 Supabase Auth 環境值。'
            : 'Supabase Auth env vars are missing.',
        tone: 'error',
      })
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    getSupabasePublicKey() as string,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  const result = await supabase.auth
    .signInWithPassword({
      email,
      password,
    })
    .catch((error: unknown) => ({ data: { session: null }, error }));
  const { data, error } = result;

  if (error || !data.session) {
    return redirectToAuth(
      buildAuthRedirectUrl(baseUrl, locale, {
        nextPath,
        message:
          hasSupabaseAuthErrorMessage(error, 'Invalid login credentials')
            ? locale === 'zh'
              ? '登入資訊不正確。請確認 email 與密碼，或改用 Google 登入。'
              : 'Your login details are incorrect. Check your email and password, or use Google login instead.'
            : getSupabaseAuthErrorMessage(
                error,
                locale,
                locale === 'zh'
                  ? '目前無法登入。請稍後再試。'
                  : 'Unable to log in right now. Please try again shortly.'
              ),
        tone: 'error',
      })
    );
  }

  const response = NextResponse.redirect(
    new URL(buildPostAuthRedirectUrl(baseUrl, locale, nextPath)),
    { status: 303 }
  );
  writeSessionCookies(response, data.session);
  return response;
}
