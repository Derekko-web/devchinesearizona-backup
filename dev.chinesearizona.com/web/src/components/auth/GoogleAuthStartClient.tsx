'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { buildAuthCompleteUrl, buildAuthPath, getBrowserAuthBaseUrl, resolvePostAuthPath } from '@/lib/auth';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase';
import type { Locale } from '@/lib/types';

type StatusTone = 'error' | 'info';
type StatusState = {
  message: string;
  tone: StatusTone;
};

type GoogleAuthStartClientProps = {
  locale: Locale;
  initialNext?: string;
};

function statusClasses(tone: StatusTone): string {
  if (tone === 'error') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  return 'border-brand-200 bg-brand-50 text-brand-700';
}

export function GoogleAuthStartClient({ locale, initialNext }: GoogleAuthStartClientProps) {
  const redirectPath = resolvePostAuthPath(locale, initialNext);
  const [status, setStatus] = useState<StatusState>({
    message: locale === 'zh' ? '正在帶你前往 Google...' : 'Redirecting you to Google...',
    tone: 'info',
  });
  const authHref = useMemo(() => {
    return buildAuthPath(locale, redirectPath);
  }, [locale, redirectPath]);

  useEffect(() => {
    let isCancelled = false;

    async function startGoogleSignIn() {
      let client: ReturnType<typeof getSupabaseBrowserClient> = null;

      try {
        client = getSupabaseBrowserClient();
      } catch {
        client = null;
      }

      if (!client || !isSupabaseConfigured()) {
        if (!isCancelled) {
          setStatus({
            message:
              locale === 'zh'
                ? '尚未設定 Supabase Auth 環境值。請先加入 NEXT_PUBLIC_SUPABASE_URL，以及 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 或 NEXT_PUBLIC_SUPABASE_ANON_KEY。'
                : 'Supabase Auth env vars are missing. Add NEXT_PUBLIC_SUPABASE_URL plus NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY first.',
            tone: 'error',
          });
        }
        return;
      }

      const baseUrl = getBrowserAuthBaseUrl();

      if (!baseUrl) {
        if (!isCancelled) {
          setStatus({
            message:
              locale === 'zh'
                ? '目前無法判斷登入完成後應返回的位置。請返回上一頁再試一次。'
                : 'Unable to determine where to return after Google login. Please go back and try again.',
            tone: 'error',
          });
        }
        return;
      }

      const redirectTo = buildAuthCompleteUrl(baseUrl, locale, 'login', redirectPath);

      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (isCancelled) {
        return;
      }

      if (error || !data.url) {
        setStatus({
          message:
            error?.message ??
            (locale === 'zh'
              ? '目前無法啟動 Google 登入。請返回上一頁再試一次。'
              : 'Unable to start Google login right now. Please go back and try again.'),
          tone: 'error',
        });
        return;
      }

      window.location.assign(data.url);
    }

    void startGoogleSignIn();

    return () => {
      isCancelled = true;
    };
  }, [locale, redirectPath]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-600">
          {locale === 'zh' ? 'Google 登入' : 'Google login'}
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
          {locale === 'zh' ? '正在啟動 Google 登入' : 'Starting Google login'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {locale === 'zh'
            ? '這個頁面會在瀏覽器裡直接啟動 Supabase 的 Google OAuth 流程。'
            : 'This page starts the Supabase Google OAuth flow directly in the browser.'}
        </p>
        <p className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-medium ${statusClasses(status.tone)}`}>{status.message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={authHref}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            {locale === 'zh' ? '返回登入頁' : 'Back to login'}
          </Link>
          <Link
            href={redirectPath}
            className="inline-flex items-center justify-center rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            {locale === 'zh' ? '前往下一頁' : 'Go to next page'}
          </Link>
        </div>
      </div>
    </div>
  );
}
