import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { buildJoinPath, buildPostAuthRedirectUrl, sanitizeAuthRedirect } from '@/lib/auth';
import { resolveLocale } from '@/lib/i18n';
import { getRequestBaseUrl } from '@/lib/request-url';
import { writeSessionCookies } from '@/lib/server-auth';
import { getSupabasePublicKey, isSupabaseConfigured } from '@/lib/supabase';

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
  const authUrl = new URL(buildJoinPath(locale), baseUrl);
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

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const baseUrl = getRequestBaseUrl(request);
  const locale = resolveLocale(String(formData.get('locale') ?? '') || undefined);
  const nextPath = String(formData.get('next') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('fullName') ?? '').trim();

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

  if (!email || !password) {
    return redirectToAuth(
      buildAuthRedirectUrl(baseUrl, locale, {
        nextPath,
        emailError: !email ? (locale === 'zh' ? '請輸入 email。' : 'Enter an email.') : undefined,
        passwordError: !password ? (locale === 'zh' ? '請輸入密碼。' : 'Enter a password.') : undefined,
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

  const emailRedirectTo = buildPostAuthRedirectUrl(baseUrl, locale, nextPath);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: emailRedirectTo.toString(),
      data: fullName ? { full_name: fullName } : undefined,
    },
  });

  if (error) {
    return redirectToAuth(
      buildAuthRedirectUrl(baseUrl, locale, {
        nextPath,
        message: error.message,
        tone: 'error',
      })
    );
  }

  if (data.session) {
    const response = NextResponse.redirect(
      new URL(buildPostAuthRedirectUrl(baseUrl, locale, nextPath)),
      { status: 303 }
    );
    writeSessionCookies(response, data.session);
    return response;
  }

  return redirectToAuth(
    buildAuthRedirectUrl(baseUrl, locale, {
      nextPath,
      message:
        data.session || data.user?.email_confirmed_at
          ? locale === 'zh'
            ? '帳號已建立。請用同一組 email 與密碼登入。'
            : 'Account created. Log in with the same email and password to continue.'
          : locale === 'zh'
            ? '如果這個 email 是新的，請檢查信箱並點擊確認連結；如果你先前已建立帳號，請直接登入。'
            : 'If this email is new, check your email and click the confirmation link. If you already have an account, log in instead.',
      tone: 'success',
    })
  );
}
