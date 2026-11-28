import { appendSearch, withLocale } from '@/lib/routing';
import { locales, type Locale } from '@/lib/types';

export type AuthPageKind = 'login' | 'join';

// Every page under /auth (login, join, reset-password, google, and anything
// added later), with or without a locale prefix. A sign-in page must never be a
// post-auth destination, or each sign-in link would nest the previous one in
// `next` and give crawlers an endless supply of new URLs.
const authPathPattern = new RegExp(`^/(?:(?:${locales.join('|')})/)?auth(?:/|$)`);

function isAuthPath(pathname: string): boolean {
  return authPathPattern.test(pathname);
}

function isLocalAuthHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

// Placeholder origin used only to check that a path stays on the same site.
const SAME_SITE_CHECK_ORIGIN = 'https://same-site.invalid';
// Browsers treat backslashes as slashes and drop tabs and newlines, so these
// can turn an innocent-looking path into a link to another host.
const unsafeRedirectCharacters = /[\\\u0000-\u001f\u007f]/;

export function sanitizeAuthRedirect(path?: string | null): string | undefined {
  if (!path || !path.startsWith('/') || path.startsWith('//') || unsafeRedirectCharacters.test(path)) {
    return undefined;
  }

  try {
    if (new URL(path, SAME_SITE_CHECK_ORIGIN).origin !== SAME_SITE_CHECK_ORIGIN) {
      return undefined;
    }
  } catch {
    return undefined;
  }

  return path;
}

export function resolvePostAuthPath(locale: Locale, nextPath?: string | null): string {
  const fallbackPath = withLocale(locale, '/');
  const sanitizedPath = sanitizeAuthRedirect(nextPath);

  if (!sanitizedPath) {
    return fallbackPath;
  }

  const pathname = sanitizedPath.split('?')[0]?.split('#')[0];
  if (isAuthPath(pathname)) {
    return fallbackPath;
  }

  return sanitizedPath;
}

export function buildAuthRoute(locale: Locale, kind: AuthPageKind, nextPath?: string | null): string {
  const authPath = withLocale(locale, `/auth/${kind}`);
  const sanitizedPath = sanitizeAuthRedirect(nextPath);
  const pathname = sanitizedPath?.split('?')[0]?.split('#')[0];

  if (!sanitizedPath || sanitizedPath === authPath || (pathname && isAuthPath(pathname))) {
    return authPath;
  }

  const params = new URLSearchParams({ next: sanitizedPath });
  return `${authPath}?${params.toString()}`;
}

export function buildAuthPath(locale: Locale, nextPath?: string | null): string {
  return buildAuthRoute(locale, 'login', nextPath);
}

export function buildJoinPath(locale: Locale, nextPath?: string | null): string {
  return buildAuthRoute(locale, 'join', nextPath);
}

export function buildResetPasswordPath(locale: Locale, nextPath?: string | null): string {
  const resetPath = withLocale(locale, '/auth/reset-password');
  const sanitizedPath = sanitizeAuthRedirect(nextPath);
  const pathname = sanitizedPath?.split('?')[0]?.split('#')[0];

  if (!sanitizedPath || sanitizedPath === resetPath || (pathname && isAuthPath(pathname))) {
    return resetPath;
  }

  const params = new URLSearchParams({ next: sanitizedPath });
  return `${resetPath}?${params.toString()}`;
}

export function normalizeAuthBaseUrl(baseUrl: string): string {
  const normalizedUrl = new URL(baseUrl);

  if (normalizedUrl.protocol === 'https:' && isLocalAuthHost(normalizedUrl.hostname)) {
    normalizedUrl.protocol = 'http:';
  }

  return normalizedUrl.origin;
}

export function getBrowserAuthBaseUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return normalizeAuthBaseUrl(window.location.origin);
}

export function buildPostAuthRedirectUrl(baseUrl: string, locale: Locale, nextPath?: string | null): string {
  return new URL(resolvePostAuthPath(locale, nextPath), normalizeAuthBaseUrl(baseUrl)).toString();
}

export function buildAuthCompletePath(locale: Locale, kind: AuthPageKind, nextPath?: string | null): string {
  const params = new URLSearchParams({ complete: '1' });
  const resolvedPath = resolvePostAuthPath(locale, nextPath);

  if (resolvedPath) {
    params.set('next', resolvedPath);
  }

  return appendSearch(withLocale(locale, `/auth/${kind}`), params.toString());
}

export function buildAuthCompleteUrl(baseUrl: string, locale: Locale, kind: AuthPageKind, nextPath?: string | null): string {
  return new URL(buildAuthCompletePath(locale, kind, nextPath), normalizeAuthBaseUrl(baseUrl)).toString();
}

export function buildGoogleAuthPath(locale: Locale, nextPath?: string | null): string {
  const params = new URLSearchParams();
  const resolvedPath = resolvePostAuthPath(locale, nextPath);

  if (resolvedPath) {
    params.set('next', resolvedPath);
  }

  return appendSearch(withLocale(locale, '/auth/google'), params.toString());
}

export function buildAuthCallbackPath(locale: Locale, nextPath?: string | null): string {
  const params = new URLSearchParams({ locale });
  const resolvedPath = resolvePostAuthPath(locale, nextPath);

  if (resolvedPath) {
    params.set('next', resolvedPath);
  }

  return `/api/auth/callback?${params.toString()}`;
}

export function buildAuthCallbackUrl(baseUrl: string, locale: Locale, nextPath?: string | null): string {
  return new URL(buildAuthCallbackPath(locale, nextPath), normalizeAuthBaseUrl(baseUrl)).toString();
}

// Shown after an email sign-up that still needs the confirmation link (#471).
// Confirmation emails may not reach every inbox, so it says what to do next.
// The signup API route uses the same wording for the no-JavaScript fallback.
export function pendingSignupMessage(locale: Locale): string {
  return locale === 'zh'
    ? '我們已寄出確認信。請打開信中的確認連結，再回到這裡登入。幾分鐘內沒收到？請查看垃圾郵件匣，或改用上方的「使用 Google 繼續」，不需要確認信。如果你先前已建立帳號，請直接登入。'
    : 'We sent you a confirmation email. Open it, click the link, then sign in here. No email after a few minutes? Check your spam folder, or use Continue with Google above, which needs no confirmation email. Already have an account? Sign in instead.';
}
