import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { buildResetPasswordPath } from '@/lib/auth';
import { resolveLocale } from '@/lib/i18n';
import { getRequestBaseUrl } from '@/lib/request-url';
import { getSupabasePublicKey, isSupabaseConfigured } from '@/lib/supabase';

function buildResetPasswordRedirectUrl(
  baseUrl: string,
  locale: ReturnType<typeof resolveLocale>,
  options: {
    emailError?: string;
    message?: string;
    nextPath?: string | null;
    tone?: 'success' | 'error' | 'info';
  }
) {
  const authUrl = new URL(buildResetPasswordPath(locale, options.nextPath), baseUrl);

  if (options.message) {
    authUrl.searchParams.set('message', options.message);
  }

  if (options.emailError) {
    authUrl.searchParams.set('email_error', options.emailError);
  }

  if (options.tone) {
    authUrl.searchParams.set('tone', options.tone);
  }

  return authUrl;
}

function redirectToResetPassword(authUrl: URL) {
  return NextResponse.redirect(authUrl, { status: 303 });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const baseUrl = getRequestBaseUrl(request);
  const locale = resolveLocale(String(formData.get('locale') ?? '') || undefined);
  const nextPath = String(formData.get('next') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();

  if (!isSupabaseConfigured()) {
    return redirectToResetPassword(
      buildResetPasswordRedirectUrl(baseUrl, locale, {
        nextPath,
        message:
          locale === 'zh'
            ? '尚未設定 Supabase Auth 環境值。'
            : 'Supabase Auth env vars are missing.',
        tone: 'error',
      })
    );
  }

  if (!email) {
    return redirectToResetPassword(
      buildResetPasswordRedirectUrl(baseUrl, locale, {
        nextPath,
        emailError: locale === 'zh' ? '請輸入 email。' : 'Enter an email.',
      })
    );
  }

  if (!isValidEmail(email)) {
    return redirectToResetPassword(
      buildResetPasswordRedirectUrl(baseUrl, locale, {
        nextPath,
        emailError: locale === 'zh' ? '請輸入有效的 email。' : 'Enter a valid email.',
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

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: new URL(buildResetPasswordPath(locale, nextPath), baseUrl).toString(),
  });

  if (error) {
    return redirectToResetPassword(
      buildResetPasswordRedirectUrl(baseUrl, locale, {
        nextPath,
        message: error.message,
        tone: 'error',
      })
    );
  }

  return redirectToResetPassword(
    buildResetPasswordRedirectUrl(baseUrl, locale, {
      nextPath,
      message:
        locale === 'zh'
          ? '如果這個 email 已存在，我們已寄出重設密碼連結。請檢查你的信箱。'
          : 'If that email exists, we sent a reset link. Check your inbox.',
      tone: 'success',
    })
  );
}
