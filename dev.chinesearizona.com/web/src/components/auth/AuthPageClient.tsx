'use client';

import type { CSSProperties, FormEvent, MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  buildAuthCompleteUrl,
  buildAuthPath,
  buildGoogleAuthPath,
  buildJoinPath,
  buildPostAuthRedirectUrl,
  buildResetPasswordPath,
  getBrowserAuthBaseUrl,
  resolvePostAuthPath,
  type AuthPageKind,
} from '@/lib/auth';
import { persistServerSession } from '@/lib/client-auth';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import type { Locale } from '@/lib/types';
import { useAuth } from './AuthProvider';

type AuthMode = 'signin' | 'signup';
type StatusTone = 'error' | 'info' | 'success';
type StatusState = {
  message: string;
  tone: StatusTone;
};
type FieldName = 'email' | 'password';
type FieldErrors = Partial<Record<FieldName, string>>;

type AuthPageClientProps = {
  locale: Locale;
  page?: AuthPageKind;
  initialNext?: string;
  initialMode?: string;
  initialComplete?: string;
  initialErrorDescription?: string;
  initialEmailError?: string;
  initialMessage?: string;
  initialPasswordError?: string;
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

function pendingSignupMessage(locale: Locale): string {
  return locale === 'zh'
    ? '如果這個 email 是新的，請檢查信箱中的確認連結；如果你先前已建立帳號，請直接登入。'
    : 'If this email is new, check your inbox for a confirmation link. If you already have an account, log in instead.';
}

function passwordLoginHint(locale: Locale): string {
  return locale === 'zh'
    ? '如果你原本是用 Google 建立帳號，請先用 Google 登入，再為這個帳號設定密碼。'
    : 'If you originally created this account with Google, log in with Google first and then set a password for the same account.';
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
  const value = input.value.trim();

  if (!value || input.validity.valueMissing) {
    return locale === 'zh' ? '請輸入 email。' : 'Enter an email.';
  }

  if (input.validity.typeMismatch || !value.includes('@')) {
    return locale === 'zh' ? '請輸入有效的 email。' : 'Enter a valid email.';
  }

  return null;
}

function validatePasswordField(input: HTMLInputElement, locale: Locale): string | null {
  if (input.validity.valueMissing) {
    return locale === 'zh' ? '請輸入密碼。' : 'Enter a password.';
  }

  if (input.validity.tooShort) {
    return locale === 'zh' ? '密碼至少需要 6 個字元。' : 'Password must be at least 6 characters.';
  }

  return null;
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

function getProviders(user: { app_metadata?: { providers?: unknown; provider?: unknown } } | null | undefined): string[] {
  const providers = user?.app_metadata?.providers;
  if (Array.isArray(providers)) {
    return providers.filter((provider): provider is string => typeof provider === 'string');
  }

  const provider = user?.app_metadata?.provider;
  return typeof provider === 'string' ? [provider] : [];
}

export function AuthPageClient({
  locale,
  page,
  initialNext,
  initialMode,
  initialComplete,
  initialErrorDescription,
  initialEmailError,
  initialMessage,
  initialPasswordError,
  initialTone,
}: AuthPageClientProps) {
  const router = useRouter();
  const { isConfigured, isLoading, session, signOut, user } = useAuth();
  const [isBusy, setIsBusy] = useState(false);
  const [passwordValue, setPasswordValue] = useState(() => {
    if (typeof document === 'undefined') {
      return '';
    }

    const input = document.getElementById('password');
    return input instanceof HTMLInputElement ? input.value : '';
  });
  const [showPassword, setShowPassword] = useState(() => {
    if (typeof document === 'undefined') {
      return false;
    }

    const input = document.getElementById('password');
    return input instanceof HTMLInputElement ? input.type === 'text' : false;
  });
  const [isClientReady, setIsClientReady] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(() => {
    const nextFieldErrors: FieldErrors = {};

    if (initialEmailError) {
      nextFieldErrors.email = initialEmailError;
    }

    if (initialPasswordError) {
      nextFieldErrors.password = initialPasswordError;
    }

    return nextFieldErrors;
  });
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const completedAuthCallbackRef = useRef(false);
  const [status, setStatus] = useState<StatusState | null>(
    initialErrorDescription
      ? {
          message: initialErrorDescription,
          tone: 'error',
        }
      : initialMessage
        ? {
            message: initialMessage,
            tone: initialTone ?? 'info',
          }
        : null
  );

  const redirectPath = resolvePostAuthPath(locale, initialNext);
  const authPage: AuthPageKind = page ?? (initialMode === 'signup' ? 'join' : 'login');
  const mode: AuthMode = authPage === 'join' ? 'signup' : 'signin';
  const isJoinPage = authPage === 'join';
  const userProviders = useMemo(() => getProviders(user), [user]);
  const canAddPassword = Boolean(user && !userProviders.includes('email'));
  const signInHref = useMemo(() => {
    return buildAuthPath(locale, redirectPath);
  }, [locale, redirectPath]);
  const signUpHref = useMemo(() => {
    return buildJoinPath(locale, redirectPath);
  }, [locale, redirectPath]);
  const resetPasswordHref = useMemo(() => {
    return buildResetPasswordPath(locale, redirectPath);
  }, [locale, redirectPath]);
  const googleAuthHref = useMemo(() => {
    return buildGoogleAuthPath(locale, redirectPath);
  }, [locale, redirectPath]);
  const loginFallbackAction = '/api/auth/login';
  const signupFallbackAction = '/api/auth/signup';

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
    setIsClientReady(true);
  }, []);

  useEffect(() => {
    if (!session || !initialComplete) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      hardRedirect(redirectPath);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hardRedirect, initialComplete, redirectPath, router, session]);

  useEffect(() => {
    if (!user || isBusy || initialComplete || canAddPassword) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      hardRedirect(redirectPath);
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [canAddPassword, hardRedirect, initialComplete, isBusy, redirectPath, user]);

  useEffect(() => {
    if (!initialComplete || completedAuthCallbackRef.current || typeof window === 'undefined') {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const hashParams = new URLSearchParams(currentUrl.hash.startsWith('#') ? currentUrl.hash.slice(1) : currentUrl.hash);
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const authCode = currentUrl.searchParams.get('code');
    const callbackError =
      currentUrl.searchParams.get('error_description') ??
      hashParams.get('error_description');

    if (!callbackError && !authCode && !(accessToken && refreshToken)) {
      return;
    }

    completedAuthCallbackRef.current = true;
    let isCancelled = false;

    async function finalizeAuthCallback() {
      let client: ReturnType<typeof getSupabaseBrowserClient> = null;

      try {
        client = getSupabaseBrowserClient();
      } catch {
        client = null;
      }

      if (!client || !isConfigured) {
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

      if (callbackError) {
        if (!isCancelled) {
          setStatus({
            message: callbackError,
            tone: 'error',
          });
        }
        return;
      }

      if (!isCancelled) {
        setIsBusy(true);
        setStatus({
          message: locale === 'zh' ? '正在完成登入...' : 'Finishing login...',
          tone: 'info',
        });
      }

      try {
        const {
          data: { session: existingSession },
        } = await client.auth.getSession();

        if (isCancelled) {
          return;
        }

        if (existingSession) {
          await persistServerSession(existingSession);
          hardRedirect(redirectPath);
          return;
        }

        if (authCode) {
          const { data, error } = await client.auth.exchangeCodeForSession(authCode);

          if (isCancelled) {
            return;
          }

          if (error || !data.session) {
            setStatus({
              message:
                error?.message ??
                (locale === 'zh'
                  ? '目前無法完成這次登入。請再試一次。'
                  : 'Unable to complete this login right now. Please try again.'),
              tone: 'error',
            });
            return;
          }

          await persistServerSession(data.session);
          hardRedirect(redirectPath);
          return;
        }

        if (accessToken && refreshToken) {
          const { data, error } = await client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (isCancelled) {
            return;
          }

          if (error || !data.session) {
            setStatus({
              message:
                error?.message ??
                (locale === 'zh'
                  ? '目前無法完成這次登入。請再試一次。'
                  : 'Unable to complete this login right now. Please try again.'),
              tone: 'error',
            });
            return;
          }

          await persistServerSession(data.session);
          hardRedirect(redirectPath);
        }
      } finally {
        if (!isCancelled) {
          setIsBusy(false);
        }
      }
    }

    void finalizeAuthCallback();

    return () => {
      isCancelled = true;
    };
  }, [hardRedirect, initialComplete, isConfigured, locale, redirectPath]);

  useEffect(() => {
    if (!initialComplete || session || isLoading || typeof window === 'undefined') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      hardRedirect(redirectPath);
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hardRedirect, initialComplete, isLoading, redirectPath, session]);

  function buildPostAuthUrl(): string | null {
    const baseUrl = getBrowserAuthBaseUrl();

    if (!baseUrl) {
      return null;
    }

    return buildPostAuthRedirectUrl(baseUrl, locale, redirectPath);
  }

  function buildOAuthCompleteUrl(): string | null {
    const baseUrl = getBrowserAuthBaseUrl();

    if (!baseUrl) {
      return null;
    }

    return buildAuthCompleteUrl(baseUrl, locale, authPage, redirectPath);
  }

  async function getBrowserClient() {
    let client: ReturnType<typeof getSupabaseBrowserClient> = null;

    try {
      client = getSupabaseBrowserClient();
    } catch {
      client = null;
    }

    if (!client || !isConfigured) {
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

  async function handleEmailSubmit(formData: FormData) {
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const fullName = String(formData.get('fullName') ?? '').trim();

    if (!email || !password) {
      const nextFieldErrors: FieldErrors = {};

      if (!email) {
        nextFieldErrors.email = locale === 'zh' ? '請輸入 email。' : 'Enter an email.';
      }

      if (!password) {
        nextFieldErrors.password = locale === 'zh' ? '請輸入密碼。' : 'Enter a password.';
      }

      setFieldErrors(nextFieldErrors);
      setStatus(null);
      return;
    }

    if (password.length < 6) {
      setFieldErrors({
        password: locale === 'zh' ? '密碼至少需要 6 個字元。' : 'Password must be at least 6 characters.',
      });
      setStatus(null);
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
      if (mode === 'signup') {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: buildPostAuthUrl() ?? undefined,
            data: fullName ? { full_name: fullName } : undefined,
          },
        });

        if (error) {
          setStatus({
            message: error.message,
            tone: 'error',
          });
          return;
        }

        if (data.session) {
          await persistServerSession(data.session);
          hardRedirect(redirectPath);
          return;
        }

        setStatus({
          message: pendingSignupMessage(locale),
          tone: 'success',
        });
        return;
      }

      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setStatus({
          message: error.message === 'Invalid login credentials' ? passwordLoginHint(locale) : error.message,
          tone: 'error',
        });
        return;
      }

      if (data.session) {
        await persistServerSession(data.session);
      }
      hardRedirect(redirectPath);
    } finally {
      setIsBusy(false);
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const emailInput = form.elements.namedItem('email');
    const passwordInput = form.elements.namedItem('password');
    const nextFieldErrors: FieldErrors = {};

    if (emailInput instanceof HTMLInputElement) {
      const emailError = validateEmailField(emailInput, locale);
      if (emailError) {
        nextFieldErrors.email = emailError;
      }
    }

    if (passwordInput instanceof HTMLInputElement) {
      const passwordError = validatePasswordField(passwordInput, locale);
      if (passwordError) {
        nextFieldErrors.password = passwordError;
      }
    }

    if (nextFieldErrors.email || nextFieldErrors.password) {
      setFieldErrors(nextFieldErrors);
      setStatus(null);

      const firstInvalidField: FieldName | undefined = nextFieldErrors.email ? 'email' : nextFieldErrors.password ? 'password' : undefined;
      if (firstInvalidField) {
        const firstInvalidInput = form.elements.namedItem(firstInvalidField);
        if (firstInvalidInput instanceof HTMLInputElement) {
          firstInvalidInput.focus();
        }
      }
      return;
    }

    setFieldErrors({});
    void handleEmailSubmit(new FormData(form));
  }

  async function handleSignOut() {
    setIsBusy(true);
    const error = await signOut();
    setIsBusy(false);

    if (error) {
      setStatus({
        message: error.message,
        tone: 'error',
      });
      return;
    }

    setStatus({
      message: locale === 'zh' ? '已登出。你可以切換到另一個帳號。' : 'Signed out. You can switch to another account now.',
      tone: 'info',
    });
    router.refresh();
  }

  function handlePasswordToggle(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    const passwordInput = passwordInputRef.current;
    const currentValue = passwordInput?.value ?? passwordValue;
    const selectionStart = passwordInput?.selectionStart ?? null;
    const selectionEnd = passwordInput?.selectionEnd ?? null;

    if (passwordInput) {
      setPasswordValue(currentValue);
    }

    setShowPassword((current) => !current);

    window.requestAnimationFrame(() => {
      const nextInput = passwordInputRef.current;
      if (!nextInput) {
        return;
      }

      nextInput.focus();

      if (selectionStart !== null && selectionEnd !== null) {
        nextInput.setSelectionRange(selectionStart, selectionEnd);
        return;
      }

      const cursorPosition = currentValue.length;
      nextInput.setSelectionRange(cursorPosition, cursorPosition);
    });
  }

  async function handleGoogleSignIn(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    const client = await getBrowserClient();
    if (!client) {
      return;
    }

    setIsBusy(true);
    setStatus({
      message: locale === 'zh' ? '正在帶你前往 Google...' : 'Redirecting you to Google...',
      tone: 'info',
    });

    try {
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: buildOAuthCompleteUrl() ?? buildPostAuthUrl() ?? undefined,
          skipBrowserRedirect: true,
        },
      });

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

      window.location.replace(data.url);
    } finally {
      setIsBusy(false);
    }
  }

  async function handlePasswordSetup(formData: FormData) {
    const client = await getBrowserClient();
    if (!client) {
      return;
    }

    const password = String(formData.get('newPassword') ?? '');
    if (password.length < 6) {
      setStatus({
        message: locale === 'zh' ? '新密碼至少需要 6 個字元。' : 'Your new password must be at least 6 characters long.',
        tone: 'error',
      });
      return;
    }

    setIsBusy(true);
    setStatus(null);

    try {
      const { error } = await client.auth.updateUser({ password });
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
            ? '這個帳號現在也可以用 email 與密碼登入了。'
            : 'This account can now log in with email and password too.',
        tone: 'success',
      });
    } finally {
      setIsBusy(false);
    }
  }

  if (user && !initialComplete) {
    return (
      <div className="rounded-[28px] border border-[#e2d0bf] bg-[#fffdfa] p-6 shadow-[0_26px_60px_-46px_rgba(74,49,27,0.55)] sm:p-8">
        <p className="text-sm font-semibold text-brand-700">{locale === 'zh' ? '登入成功' : 'Signed in'}</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-[#261b15] [font-family:var(--font-display)]">
          {locale === 'zh' ? '正在帶你回到原本流程' : 'Returning you to your workflow'}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#6b5748]">
          {locale === 'zh'
            ? `目前使用 ${user.email ?? '你的帳號'}。如果沒有自動跳轉，請點下方按鈕前往下一頁。`
            : `You are signed in as ${user.email ?? 'your account'}. If the redirect does not happen automatically, use the button below.`}
        </p>
        {canAddPassword ? (
          <div className="mt-5 rounded-[22px] border border-brand-100 bg-brand-50/70 p-4">
            <p className="text-sm font-semibold text-[#2d2119]">
              {locale === 'zh' ? '這個帳號目前只接上 Google 登入' : 'This account is currently connected through Google only'}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#5d4a3d]">
              {locale === 'zh'
                ? '如果你也想用 email 與密碼登入，現在可以直接為同一個帳號設定密碼。'
                : 'If you also want to use email and password, you can set a password for this same account right now.'}
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handlePasswordSetup(new FormData(event.currentTarget));
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label htmlFor="newPassword" className="mb-2 block text-sm font-semibold text-[#35271f]">
                  {locale === 'zh' ? '設定密碼' : 'Set password'}
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder={locale === 'zh' ? '至少 6 個字元' : 'At least 6 characters'}
                  disabled={isBusy}
                  className="w-full rounded-[16px] border border-[#d6c2af] bg-white px-4 py-3 text-sm text-[#33251d] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-[#f5eee5]"
                />
              </div>
              <button
                type="submit"
                disabled={isBusy}
                className="inline-flex items-center justify-center rounded-[16px] border border-[#d6c2af] bg-white px-5 py-2.5 text-sm font-semibold text-[#35271f] transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
              >
                {locale === 'zh' ? '儲存密碼' : 'Save password'}
              </button>
            </form>
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={redirectPath}
            className="inline-flex items-center justify-center rounded-[16px] bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_38px_-28px_rgba(102,33,22,0.85)] transition hover:-translate-y-0.5 hover:bg-brand-800 active:translate-y-px"
          >
            {locale === 'zh' ? '繼續前往下一步' : 'Continue'}
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isBusy}
            className="inline-flex items-center justify-center rounded-[16px] border border-[#d6c2af] bg-white px-5 py-2.5 text-sm font-semibold text-[#35271f] transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          >
            {locale === 'zh' ? '登出' : 'Sign out'}
          </button>
        </div>
        {status ? (
          <p className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium ${statusClasses(status.tone)}`}>{status.message}</p>
        ) : null}
      </div>
    );
  }

  if (initialComplete) {
    return (
      <div className="rounded-[28px] border border-[#e2d0bf] bg-[#fffdfa] p-6 shadow-[0_26px_60px_-46px_rgba(74,49,27,0.55)] sm:p-8">
        <p className="text-sm font-semibold text-brand-700">{locale === 'zh' ? '登入中' : 'Signing you in'}</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-[#261b15] [font-family:var(--font-display)]">
          {status?.tone === 'error'
            ? locale === 'zh'
              ? '這次登入沒有完成'
              : 'This sign-in did not finish'
            : locale === 'zh'
              ? '正在完成你的帳號登入'
              : 'Finishing your account sign-in'}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#6b5748]">
          {status?.message ??
            (locale === 'zh'
              ? '我們正在完成登入並把你送回剛剛的操作。這裡不需要額外點擊。'
              : 'We are finishing the sign-in and sending you back to the action you started. No extra click is needed here.')}
        </p>
        <div className="mt-6 grid gap-3">
          <div className="auth-skeleton-line h-3 w-3/4 rounded-full bg-brand-100" />
          <div className="auth-skeleton-line h-3 w-1/2 rounded-full bg-[#eadccc]" />
        </div>
        {status?.tone === 'error' ? (
          <div className="mt-5">
            <Link
              href={signInHref}
              className="inline-flex items-center justify-center rounded-[16px] border border-[#d6c2af] bg-white px-5 py-2.5 text-sm font-semibold text-[#35271f] transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700 active:translate-y-px"
            >
              {locale === 'zh' ? '返回登入頁' : 'Back to login'}
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      aria-busy={isBusy}
      className="rounded-[28px] border border-[#e2d0bf] bg-[#fffdfa] p-5 shadow-[0_30px_76px_-50px_rgba(74,49,27,0.62)] sm:p-6"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">
            {isJoinPage
              ? locale === 'zh'
                ? '建立帳號'
                : 'Create account'
              : locale === 'zh'
                ? '帳號登入'
                : 'Account login'}
          </p>
          <h2 className="mt-2 text-4xl font-semibold leading-tight tracking-tight text-[#261b15] [font-family:var(--font-display)]">
            {isJoinPage
              ? locale === 'zh'
                ? '加入'
                : 'Join'
              : locale === 'zh'
                ? '登入'
                : 'Sign in'}
          </h2>
        </div>
        <p className="max-w-[15rem] text-sm leading-6 text-[#6f5a4a] sm:text-right">
          {isJoinPage ? (
            <>
              {locale === 'zh' ? '已經有帳號？' : 'Already have an account?'}{' '}
              <Link href={signInHref} className="font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-900">
                {locale === 'zh' ? '登入' : 'Log in'}
              </Link>
            </>
          ) : (
            <>
              {locale === 'zh' ? '還沒有帳號？' : "Don't have an account?"}{' '}
              <Link href={signUpHref} className="font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-900">
                {locale === 'zh' ? '建立帳號' : 'Create account'}
              </Link>
            </>
          )}
        </p>
      </div>

      {!isConfigured ? (
        <div className="mt-5 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs leading-5 text-amber-900">
          {locale === 'zh'
            ? '這個環境尚未設定 Supabase Auth 公開環境值。'
            : 'Supabase Auth public env vars are missing in this environment.'}
        </div>
      ) : null}

      <a
        href={googleAuthHref}
        onClick={handleGoogleSignIn}
        aria-disabled={isBusy}
        className={`mt-5 inline-flex w-full items-center justify-center rounded-[16px] border border-[#d6c2af] bg-white px-5 py-3 text-base font-semibold text-[#2f241d] transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700 active:translate-y-px ${
          isBusy ? 'pointer-events-none cursor-not-allowed opacity-60' : ''
        }`}
      >
        {locale === 'zh' ? '使用 Google 繼續' : 'Continue with Google'}
      </a>

      <div className="mt-4 flex items-center gap-3 text-sm font-semibold text-[#8a7666]">
        <span className="h-px flex-1 bg-[#eadfd1]" />
        <span>{locale === 'zh' ? '或使用 email' : 'or use email'}</span>
        <span className="h-px flex-1 bg-[#eadfd1]" />
      </div>

      <form
        action={mode === 'signup' ? signupFallbackAction : loginFallbackAction}
        method="post"
        noValidate
        onSubmit={handleFormSubmit}
        className="mt-4 space-y-3"
      >
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="next" value={redirectPath} />
        {isJoinPage ? (
          <div>
            <label htmlFor="fullName" className="mb-2 block text-sm font-semibold text-[#35271f]">
              {locale === 'zh' ? '姓名' : 'Full name'}
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              placeholder={locale === 'zh' ? '王小明' : 'Grace Lin'}
              disabled={isBusy}
              className="w-full rounded-[16px] border border-[#d6c2af] bg-white px-4 py-3 text-base text-[#33251d] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-[#f5eee5]"
            />
            <p className="mt-1.5 text-xs leading-5 text-[#7b6658]">
              {locale === 'zh' ? '這會顯示在你的帳號資料中。' : 'This appears in your account profile.'}
            </p>
          </div>
        ) : null}

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#35271f]">
            {locale === 'zh' ? 'Email 地址' : 'Email address'}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            disabled={isBusy}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined}
            onInput={(event) => {
              const emailError = validateEmailField(event.currentTarget, locale);
              setFieldErrors((current) => updateFieldErrorState(current, 'email', emailError));
            }}
            onBlur={(event) => {
              const emailError = validateEmailField(event.currentTarget, locale);
              setFieldErrors((current) => updateFieldErrorState(current, 'email', emailError));
            }}
            className={`w-full rounded-[16px] border bg-white px-4 py-3 text-base text-[#33251d] outline-none transition focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-[#f5eee5] ${
              fieldErrors.email
                ? 'border-rose-500 focus:border-rose-500'
                : 'border-[#d6c2af] focus:border-brand-500'
            }`}
            style={inputErrorStyle(Boolean(fieldErrors.email))}
          />
          {fieldErrors.email ? (
            <p id="auth-email-error" aria-live="polite" className="mt-1.5 pl-1 text-sm font-semibold text-rose-700">
              {fieldErrors.email}
            </p>
          ) : (
            <p className="mt-1.5 text-xs leading-5 text-[#7b6658]">
              {locale === 'zh' ? '我們會用這個 email 處理登入與帳號通知。' : 'Used for login and account notices.'}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#35271f]">
            {locale === 'zh' ? '密碼' : 'Password'}
          </label>
          <div className="relative" data-auth-password-toggle-root data-auth-client-ready={isClientReady ? 'true' : 'false'}>
            <input
              ref={passwordInputRef}
              id="password"
              name="password"
              data-auth-password-field
              type={showPassword ? 'text' : 'password'}
              value={passwordValue}
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={locale === 'zh' ? '至少 6 個字元' : 'At least 6 characters'}
              disabled={isBusy}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'auth-password-error' : undefined}
              onInput={(event) => {
                const passwordError = validatePasswordField(event.currentTarget, locale);
                setPasswordValue(event.currentTarget.value);
                setFieldErrors((current) => updateFieldErrorState(current, 'password', passwordError));
              }}
              onBlur={(event) => {
                const passwordError = validatePasswordField(event.currentTarget, locale);
                setFieldErrors((current) => updateFieldErrorState(current, 'password', passwordError));
              }}
              className={`w-full rounded-[16px] border bg-white px-4 py-3 pr-20 text-base text-[#33251d] outline-none transition focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-[#f5eee5] ${
                fieldErrors.password
                  ? 'border-rose-500 focus:border-rose-500'
                  : 'border-[#d6c2af] focus:border-brand-500'
              }`}
              style={inputErrorStyle(Boolean(fieldErrors.password))}
            />
            <button
              type="button"
              disabled={isBusy}
              data-auth-password-toggle
              data-show-text={locale === 'zh' ? '顯示' : 'Show'}
              data-hide-text={locale === 'zh' ? '隱藏' : 'Hide'}
              data-show-label={locale === 'zh' ? '顯示密碼' : 'Show password'}
              data-hide-label={locale === 'zh' ? '隱藏密碼' : 'Hide password'}
              aria-controls="password"
              aria-pressed={showPassword}
              aria-label={
                showPassword
                  ? locale === 'zh'
                    ? '隱藏密碼'
                    : 'Hide password'
                  : locale === 'zh'
                    ? '顯示密碼'
                    : 'Show password'
              }
              onClick={handlePasswordToggle}
              className="absolute inset-y-0 right-0 z-10 cursor-pointer px-4 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {showPassword
                ? locale === 'zh'
                  ? '隱藏'
                  : 'Hide'
                : locale === 'zh'
                  ? '顯示'
                  : 'Show'}
            </button>
          </div>
          {fieldErrors.password ? (
            <p id="auth-password-error" aria-live="polite" className="mt-1.5 pl-1 text-sm font-semibold text-rose-700">
              {fieldErrors.password}
            </p>
          ) : (
            <p className="mt-1.5 text-xs leading-5 text-[#7b6658]">
              {locale === 'zh' ? '至少 6 個字元。' : 'At least 6 characters.'}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isBusy}
          className="inline-flex w-full items-center justify-center rounded-[16px] bg-brand-900 px-5 py-3 text-base font-semibold text-white shadow-[0_20px_42px_-30px_rgba(102,33,22,0.9)] transition hover:-translate-y-0.5 hover:bg-brand-800 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy
            ? locale === 'zh'
              ? '處理中...'
              : 'Working...'
            : isJoinPage
            ? locale === 'zh'
              ? '建立帳號'
              : 'Create account'
            : locale === 'zh'
              ? '以 Email 登入'
              : 'Log in with email'}
        </button>
      </form>

      {isJoinPage ? (
        <p className="mt-4 text-xs leading-5 text-[#7a6658]">
          {locale === 'zh'
            ? '建立帳號後，你就能使用商家、社群與 Shop 帳號工具。'
            : 'After account creation, business, community, and shop tools use the same profile.'}
        </p>
      ) : null}

      {status ? (
        <p className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium ${statusClasses(status.tone)}`}>{status.message}</p>
      ) : null}

      {!isJoinPage ? (
        <div className="mt-6 text-center">
            <Link
              href={resetPasswordHref}
              className="text-sm font-semibold text-brand-700 underline underline-offset-4 transition-colors hover:text-brand-900"
            >
            {locale === 'zh' ? '忘記密碼？' : 'Forgot your password?'}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
