'use client';

import type { CSSProperties, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { buildAuthPath, buildResetPasswordPath, getBrowserAuthBaseUrl, resolvePostAuthPath } from '@/lib/auth';
import { persistServerSession } from '@/lib/client-auth';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase';
import type { Locale } from '@/lib/types';
import { useAuth } from './AuthProvider';

type StatusTone = 'error' | 'info' | 'success';
type StatusState = {
  message: string;
  tone: StatusTone;
};
type FieldName = 'email' | 'newPassword' | 'confirmPassword';
type FieldErrors = Partial<Record<FieldName, string>>;

type ResetPasswordPageClientProps = {
  locale: Locale;
  initialEmailError?: string;
  initialMessage?: string;
  initialNext?: string;
  initialTone?: StatusTone;
};

function statusClasses(tone: StatusTone): string {
  if (tone === 'error') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border-brand-200 bg-brand-50 text-brand-700';
}

function inputErrorStyle(hasError: boolean): CSSProperties | undefined {
  if (!hasError) {
    return undefined;
  }

  return {
    borderColor: '#e11d48',
    backgroundColor: '#fff1f2',
    color: '#881337',
    boxShadow: '0 0 0 2px #fecdd3',
  };
}

function updateFieldErrorState(current: FieldErrors, field: FieldName, message: string | null): FieldErrors {
  const existingMessage = current[field] ?? null;
  const nextMessage = message ?? null;

  if (existingMessage === nextMessage) {
    return current;
  }

  const next = { ...current };

  if (nextMessage) {
    next[field] = nextMessage;
    return next;
  }

  delete next[field];
  return next;
}

function validateEmailField(input: HTMLInputElement, locale: Locale): string | null {
  if (input.validity.valueMissing) {
    return locale === 'zh' ? '請輸入 email。' : 'Enter an email.';
  }

  if (input.validity.typeMismatch) {
    return locale === 'zh' ? '請輸入有效的 email。' : 'Enter a valid email.';
  }

  return null;
}

function validateNewPassword(value: string, locale: Locale): string | null {
  if (!value) {
    return locale === 'zh' ? '請輸入新密碼。' : 'Enter a new password.';
  }

  if (value.length < 6) {
    return locale === 'zh' ? '密碼至少需要 6 個字元。' : 'Password must be at least 6 characters.';
  }

  return null;
}

function validateConfirmPassword(confirmPassword: string, newPassword: string, locale: Locale): string | null {
  if (!confirmPassword) {
    return locale === 'zh' ? '請再次輸入新密碼。' : 'Confirm your new password.';
  }

  if (confirmPassword !== newPassword) {
    return locale === 'zh' ? '兩次輸入的密碼不一致。' : 'Passwords do not match.';
  }

  return null;
}

export function ResetPasswordPageClient({
  locale,
  initialEmailError,
  initialMessage,
  initialNext,
  initialTone,
}: ResetPasswordPageClientProps) {
  const router = useRouter();
  const { isLoading, user } = useAuth();
  const [isBusy, setIsBusy] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(() => {
    const nextFieldErrors: FieldErrors = {};

    if (initialEmailError) {
      nextFieldErrors.email = initialEmailError;
    }

    return nextFieldErrors;
  });
  const [status, setStatus] = useState<StatusState | null>(
    initialMessage
      ? {
          message: initialMessage,
          tone: initialTone ?? 'info',
        }
      : null
  );
  const redirectPath = resolvePostAuthPath(locale, initialNext);
  const loginHref = useMemo(() => buildAuthPath(locale, redirectPath), [locale, redirectPath]);

  const hardRedirect = useCallback(
    (path: string) => {
      if (typeof window === 'undefined') {
        router.replace(path);
        return;
      }

      window.location.replace(path);
    },
    [router]
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const hashParams = new URLSearchParams(currentUrl.hash.startsWith('#') ? currentUrl.hash.slice(1) : currentUrl.hash);
    const hasRecoveryState =
      currentUrl.searchParams.get('type') === 'recovery' ||
      hashParams.get('type') === 'recovery' ||
      Boolean(hashParams.get('access_token') && hashParams.get('refresh_token'));

    if (hasRecoveryState) {
      setIsRecoveryMode(true);
    }
  }, []);

  useEffect(() => {
    if (!isRecoveryMode || user || isLoading) {
      return;
    }

    setStatus((current) => {
      if (current?.tone === 'error') {
        return current;
      }

      return {
        message:
          locale === 'zh'
            ? '這個重設連結無效或已過期。請重新申請一次。'
            : 'This reset link is invalid or has expired. Please request a new one.',
        tone: 'error',
      };
    });
  }, [isLoading, isRecoveryMode, locale, user]);

  async function getBrowserClient() {
    let client: ReturnType<typeof getSupabaseBrowserClient> = null;

    try {
      client = getSupabaseBrowserClient();
    } catch {
      client = null;
    }

    if (!client || !isSupabaseConfigured()) {
      setStatus({
        message:
          locale === 'zh'
            ? '尚未設定 Supabase Auth 環境值。請先加入 NEXT_PUBLIC_SUPABASE_URL，以及 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 或 NEXT_PUBLIC_SUPABASE_ANON_KEY。'
            : 'Supabase Auth env vars are missing. Add NEXT_PUBLIC_SUPABASE_URL plus NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY first.',
        tone: 'error',
      });
      return null;
    }

    return client;
  }

  async function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const emailInput = form.elements.namedItem('email');

    if (!(emailInput instanceof HTMLInputElement)) {
      return;
    }

    const emailError = validateEmailField(emailInput, locale);
    if (emailError) {
      setFieldErrors({ email: emailError });
      setStatus(null);
      emailInput.focus();
      return;
    }

    const client = await getBrowserClient();
    if (!client) {
      return;
    }

    setIsBusy(true);
    setFieldErrors({});
    setStatus(null);

    try {
      const redirectTo =
        (() => {
          const baseUrl = getBrowserAuthBaseUrl();

          return baseUrl ? new URL(buildResetPasswordPath(locale, redirectPath), baseUrl).toString() : null;
        })();
      const { error } = await client.auth.resetPasswordForEmail(emailInput.value.trim(), {
        redirectTo: redirectTo ?? undefined,
      });

      if (error) {
        setStatus({
          message: error.message,
          tone: 'error',
        });
        return;
      }

      setStatus({
        message:
          locale === 'zh'
            ? '如果這個 email 已存在，我們已寄出重設密碼連結。請檢查你的信箱。'
            : 'If that email exists, we sent a reset link. Check your inbox.',
        tone: 'success',
      });
      form.reset();
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRecoverySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const newPasswordInput = form.elements.namedItem('newPassword');
    const confirmPasswordInput = form.elements.namedItem('confirmPassword');

    if (!(newPasswordInput instanceof HTMLInputElement) || !(confirmPasswordInput instanceof HTMLInputElement)) {
      return;
    }

    const nextFieldErrors: FieldErrors = {};
    const newPasswordError = validateNewPassword(newPasswordInput.value, locale);
    const confirmPasswordError = validateConfirmPassword(confirmPasswordInput.value, newPasswordInput.value, locale);

    if (newPasswordError) {
      nextFieldErrors.newPassword = newPasswordError;
    }

    if (confirmPasswordError) {
      nextFieldErrors.confirmPassword = confirmPasswordError;
    }

    if (nextFieldErrors.newPassword || nextFieldErrors.confirmPassword) {
      setFieldErrors(nextFieldErrors);
      setStatus(null);

      if (nextFieldErrors.newPassword) {
        newPasswordInput.focus();
      } else {
        confirmPasswordInput.focus();
      }
      return;
    }

    const client = await getBrowserClient();
    if (!client) {
      return;
    }

    setIsBusy(true);
    setFieldErrors({});
    setStatus(null);

    try {
      const { error } = await client.auth.updateUser({
        password: newPasswordInput.value,
      });

      if (error) {
        setStatus({
          message: error.message,
          tone: 'error',
        });
        return;
      }

      const { data } = await client.auth.getSession();
      if (data.session) {
        await persistServerSession(data.session);
      }

      setStatus({
        message: locale === 'zh' ? '密碼已更新，正在帶你回到站內。' : 'Your password has been updated. Taking you back now.',
        tone: 'success',
      });

      window.setTimeout(() => {
        hardRedirect(redirectPath);
      }, 450);
    } finally {
      setIsBusy(false);
    }
  }

  const isUpdatingPassword = isRecoveryMode && Boolean(user);
  const isResolvingRecovery = isRecoveryMode && !user && isLoading;

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.75rem] border border-white/60 bg-[linear-gradient(145deg,#edf5ff_0%,#f7ebe0_46%,#f4efe8_100%)] shadow-[0_35px_120px_rgba(84,62,38,0.16)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.88),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(244,187,145,0.25),transparent_30%)]" />
        <div className="absolute -left-16 top-10 h-52 w-52 rounded-full bg-[#9bb7eb]/25 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#f6c6b5]/35 blur-3xl" />

        <div className="relative px-6 py-8 sm:px-10 sm:py-12">
          <div className="rounded-[2.2rem] border border-white/75 bg-white/90 p-6 shadow-[0_20px_70px_rgba(65,49,31,0.14)] backdrop-blur sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#b08d72]">
              {isUpdatingPassword
                ? locale === 'zh'
                  ? '幾乎完成了'
                  : 'YOU ARE ALMOST THERE'
                : locale === 'zh'
                  ? '偶爾每個人都會遇到'
                  : 'WE ALL HAVE TO DO IT SOMETIMES'}
            </p>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#3b2a1a] sm:text-5xl">
              {isUpdatingPassword
                ? locale === 'zh'
                  ? '設定新的密碼'
                  : 'Set your new password'
                : locale === 'zh'
                  ? '重設你的密碼'
                  : 'Reset your password'}
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-[#6f5e4e]">
              {isUpdatingPassword
                ? locale === 'zh'
                  ? '輸入新的密碼後，我們會直接帶你回到剛剛的流程。'
                  : 'Choose a fresh password and we will send you right back into the flow you started.'
                : locale === 'zh'
                  ? '輸入你的 email，我們會寄出重設密碼連結給你。'
                  : 'Enter your email address and we will send you a password reset link.'}
            </p>

            {isRecoveryMode && !user ? (
              <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
                {isLoading
                  ? locale === 'zh'
                    ? '正在確認你的重設連結...'
                    : 'Confirming your recovery link...'
                  : locale === 'zh'
                    ? '如果連結已失效，請重新申請一次重設密碼。'
                    : 'If this link has expired, request a new reset email below.'}
              </div>
            ) : null}

            {isResolvingRecovery ? (
              <div className="mt-8 rounded-[1.75rem] border border-[#eadfd1] bg-white/75 p-6">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-1/2 animate-pulse rounded-full bg-[#c96e53]" />
                </div>
                <p className="mt-4 text-sm font-medium text-[#6f5e4e]">
                  {locale === 'zh' ? '正在準備你的密碼重設流程...' : 'Preparing your password reset flow...'}
                </p>
              </div>
            ) : isUpdatingPassword ? (
              <form onSubmit={handleRecoverySubmit} className="mt-8 space-y-5">
                <div>
                  <label htmlFor="newPassword" className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-[#4b3a2a]">
                    {locale === 'zh' ? '新密碼' : 'New password'}
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    disabled={isBusy}
                    onInput={(event) => {
                      setFieldErrors((current) =>
                        updateFieldErrorState(current, 'newPassword', validateNewPassword(event.currentTarget.value, locale))
                      );
                    }}
                    onBlur={(event) => {
                      setFieldErrors((current) =>
                        updateFieldErrorState(current, 'newPassword', validateNewPassword(event.currentTarget.value, locale))
                      );
                    }}
                    placeholder={locale === 'zh' ? '至少 6 個字元' : 'At least 6 characters'}
                    className={`w-full rounded-xl border bg-white px-4 py-3.5 text-base text-[#4b3a2a] outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 ${
                      fieldErrors.newPassword ? 'border-rose-500 focus:border-rose-500' : 'border-[#ccb49a] focus:border-[#b2743e]'
                    }`}
                    style={inputErrorStyle(Boolean(fieldErrors.newPassword))}
                  />
                  {fieldErrors.newPassword ? (
                    <p className="mt-1.5 pl-1 text-sm font-semibold text-rose-700">{fieldErrors.newPassword}</p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-[#4b3a2a]">
                    {locale === 'zh' ? '再次輸入新密碼' : 'Confirm new password'}
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    disabled={isBusy}
                    onInput={(event) => {
                      const newPasswordInput = event.currentTarget.form?.elements.namedItem('newPassword');
                      const newPasswordValue = newPasswordInput instanceof HTMLInputElement ? newPasswordInput.value : '';
                      setFieldErrors((current) =>
                        updateFieldErrorState(current, 'confirmPassword', validateConfirmPassword(event.currentTarget.value, newPasswordValue, locale))
                      );
                    }}
                    onBlur={(event) => {
                      const newPasswordInput = event.currentTarget.form?.elements.namedItem('newPassword');
                      const newPasswordValue = newPasswordInput instanceof HTMLInputElement ? newPasswordInput.value : '';
                      setFieldErrors((current) =>
                        updateFieldErrorState(current, 'confirmPassword', validateConfirmPassword(event.currentTarget.value, newPasswordValue, locale))
                      );
                    }}
                    placeholder={locale === 'zh' ? '再次輸入密碼' : 'Enter it again'}
                    className={`w-full rounded-xl border bg-white px-4 py-3.5 text-base text-[#4b3a2a] outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 ${
                      fieldErrors.confirmPassword ? 'border-rose-500 focus:border-rose-500' : 'border-[#ccb49a] focus:border-[#b2743e]'
                    }`}
                    style={inputErrorStyle(Boolean(fieldErrors.confirmPassword))}
                  />
                  {fieldErrors.confirmPassword ? (
                    <p className="mt-1.5 pl-1 text-sm font-semibold text-rose-700">{fieldErrors.confirmPassword}</p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-[#b2743e] px-5 py-3.5 text-base font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#9c6536] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {locale === 'zh' ? '更新我的密碼' : 'Update my password'}
                </button>
              </form>
            ) : (
              <form
                action="/api/auth/reset-password"
                method="post"
                noValidate
                onSubmit={handleRequestSubmit}
                className="mt-8 space-y-5"
              >
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="next" value={redirectPath} />

                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-[#4b3a2a]">
                    {locale === 'zh' ? 'Email 地址' : 'Email address'}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    disabled={isBusy}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'reset-email-error' : undefined}
                    onInput={(event) => {
                      setFieldErrors((current) => updateFieldErrorState(current, 'email', validateEmailField(event.currentTarget, locale)));
                    }}
                    onBlur={(event) => {
                      setFieldErrors((current) => updateFieldErrorState(current, 'email', validateEmailField(event.currentTarget, locale)));
                    }}
                    placeholder="you@example.com"
                    className={`w-full rounded-xl border bg-white px-4 py-3.5 text-base text-[#4b3a2a] outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 ${
                      fieldErrors.email ? 'border-rose-500 focus:border-rose-500' : 'border-[#ccb49a] focus:border-[#b2743e]'
                    }`}
                    style={inputErrorStyle(Boolean(fieldErrors.email))}
                  />
                  {fieldErrors.email ? (
                    <p id="reset-email-error" className="mt-1.5 pl-1 text-sm font-semibold text-rose-700">
                      {fieldErrors.email}
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-[#c96e53] px-5 py-3.5 text-base font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#b96148] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {locale === 'zh' ? '寄出重設密碼信' : 'Reset my password!'}
                </button>
              </form>
            )}

            {status ? (
              <p className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-medium ${statusClasses(status.tone)}`}>{status.message}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm font-medium text-[#7c6957]">
              <Link href={loginHref} className="text-[#8f6239] underline underline-offset-4 transition-colors hover:text-[#724a28]">
                {locale === 'zh' ? '返回登入' : 'Back to login'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
