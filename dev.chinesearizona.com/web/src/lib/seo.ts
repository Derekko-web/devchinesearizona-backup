import type { Metadata } from 'next';

import { appendSearch, withLocale } from '@/lib/routing';
import type { Locale } from '@/lib/types';

export const siteName = 'ChineseArizona';
export const siteDescription =
  'A modern bilingual Arizona platform for trusted local businesses, newcomer resources, community events, and local Chinese-language discovery.';
const defaultSiteUrl = 'https://chinesearizona.com';

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local')
  );
}

function resolveSiteUrl(): string {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configuredSiteUrl) {
    return defaultSiteUrl;
  }

  try {
    const parsed = new URL(configuredSiteUrl);
    if (process.env.NODE_ENV !== 'development' && isLocalHostname(parsed.hostname)) {
      return defaultSiteUrl;
    }

    return parsed.origin;
  } catch {
    return defaultSiteUrl;
  }
}

export const siteUrl = resolveSiteUrl();

export function absoluteUrl(path: string): string {
  const normalized = path === '/' ? '' : path;
  return `${siteUrl}${normalized}`;
}

export function resolveAbsoluteAssetUrl(url?: string | null): string | undefined {
  if (!url) {
    return undefined;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith('/')) {
    return absoluteUrl(url);
  }

  return url;
}

function localizedPath(locale: Locale, path: string): string {
  const [pathname, search = ''] = path.split('?');
  return appendSearch(withLocale(locale, pathname || '/'), search);
}

function canonicalPath(locale: Locale, path: string): string {
  return locale === 'zh' ? localizedPath(locale, path) : path;
}

function normalizeVerificationToken(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function buildAlternates(path: string, locale: Locale) {
  return {
    canonical: absoluteUrl(canonicalPath(locale, path)),
    languages: {
      en: absoluteUrl(path),
      zh: absoluteUrl(localizedPath('zh', path)),
      'x-default': absoluteUrl(path),
    },
  };
}

export function buildSiteVerification(): Metadata['verification'] | undefined {
  const google = normalizeVerificationToken(process.env.GOOGLE_SITE_VERIFICATION);
  const yahoo = normalizeVerificationToken(process.env.YAHOO_SITE_VERIFICATION);
  const bing = normalizeVerificationToken(process.env.BING_SITE_VERIFICATION);

  if (!google && !yahoo && !bing) {
    return undefined;
  }

  return {
    google,
    yahoo,
    ...(bing
      ? {
          other: {
            'msvalidate.01': bing,
          },
        }
      : {}),
  };
}

type MetadataInput = {
  title: string;
  description: string;
  path: string;
  locale: Locale;
  noIndex?: boolean;
  image?: string;
};

export function buildMetadata({
  title,
  description,
  path,
  locale,
  noIndex = false,
  image,
}: MetadataInput): Metadata {
  const url = absoluteUrl(canonicalPath(locale, path));
  const resolvedImage = resolveAbsoluteAssetUrl(image);
  const ogImage = resolvedImage ? [resolvedImage] : undefined;

  return {
    title,
    description,
    alternates: buildAlternates(path, locale),
    openGraph: {
      title,
      description,
      url,
      siteName,
      locale: locale === 'zh' ? 'zh' : 'en_US',
      type: 'website',
      images: ogImage,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : undefined,
  };
}
