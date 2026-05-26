import type { Metadata } from 'next';

import { appendSearch, withLocale } from '@/lib/routing';
import { defaultSiteProfile, type SiteProfile } from '@/lib/site-config';
import type { Locale } from '@/lib/types';

export const siteName = defaultSiteProfile.brandName;
export const siteDescription = defaultSiteProfile.description.en;
const defaultSiteUrl = defaultSiteProfile.url;

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

export function absoluteUrl(path: string, site?: SiteProfile): string {
  const normalized = path === '/' ? '' : path;
  return `${site?.url ?? siteUrl}${normalized}`;
}

export function resolveAbsoluteAssetUrl(url?: string | null, site?: SiteProfile): string | undefined {
  if (!url) {
    return undefined;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith('/')) {
    return absoluteUrl(url, site);
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

export function buildAlternates(path: string, locale: Locale, site?: SiteProfile) {
  return {
    canonical: absoluteUrl(canonicalPath(locale, path), site),
    languages: {
      en: absoluteUrl(path, site),
      zh: absoluteUrl(localizedPath('zh', path), site),
      'x-default': absoluteUrl(path, site),
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
  site?: SiteProfile;
};

export function buildMetadata({
  title,
  description,
  path,
  locale,
  noIndex = false,
  image,
  site,
}: MetadataInput): Metadata {
  const url = absoluteUrl(canonicalPath(locale, path), site);
  const resolvedImage = resolveAbsoluteAssetUrl(image, site);
  const ogImage = resolvedImage ? [resolvedImage] : undefined;

  return {
    title,
    description,
    alternates: buildAlternates(path, locale, site),
    openGraph: {
      title,
      description,
      url,
      siteName: site?.brandName ?? siteName,
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
