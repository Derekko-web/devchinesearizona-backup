import { appendSearch, withLocale } from '@/lib/routing';
import type { Locale } from '@/lib/types';

export type AuthPageKind = 'login' | 'join';

function isAuthPath(pathname: string): boolean {
  return (
    pathname === '/auth' ||
    pathname === '/auth/login' ||
    pathname === '/auth/join' ||
    pathname === '/auth/reset-password' ||
    pathname === '/en/auth' ||
    pathname === '/en/auth/login' ||
    pathname === '/en/auth/join' ||
    pathname === '/en/auth/reset-password' ||
    pathname === '/zh/auth' ||
    pathname === '/zh/auth/login' ||
    pathname === '/zh/auth/join' ||
    pathname === '/zh/auth/reset-password'
  );
}

function isLocalAuthHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

export function sanitizeAuthRedirect(path?: string | null): string | undefined {
  if (!path || !path.startsWith('/') || path.startsWith('//')) {
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
