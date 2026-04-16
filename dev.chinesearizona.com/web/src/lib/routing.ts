import { defaultLocale, isLocale } from '@/lib/i18n';
import type { Locale } from '@/lib/types';

export function withLocale(locale: Locale, path: string): string {
  if (!path.startsWith('/')) {
    return withLocale(locale, `/${path}`);
  }

  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

export function appendSearch(pathname: string, search?: string): string {
  if (!search) {
    return pathname;
  }

  const normalizedSearch = search.startsWith('?') ? search : `?${search}`;
  return `${pathname}${normalizedSearch}`;
}

export function stripLocaleFromPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return '/';
  }

  if (isLocale(segments[0])) {
    const stripped = `/${segments.slice(1).join('/')}`;
    return stripped === '/' ? '/' : stripped.replace(/\/$/, '') || '/';
  }

  return pathname === '' ? '/' : pathname;
}

export function localeFromPath(pathname: string): Locale {
  const [firstSegment] = pathname.split('/').filter(Boolean);
  return firstSegment && isLocale(firstSegment) ? firstSegment : defaultLocale;
}

export function switchLocaleInPathname(pathname: string, targetLocale: Locale, search?: string): string {
  return appendSearch(withLocale(targetLocale, stripLocaleFromPath(pathname)), search);
}
