import type { Metadata } from 'next';

import { withLocale } from '@/lib/routing';
import type { Locale } from '@/lib/types';

export const siteName = 'ChineseArizona';
export const siteDescription =
  'A modern bilingual Arizona platform for trusted local businesses, newcomer resources, community events, and local Chinese-language discovery.';
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dev.chinesearizona.com';

export function absoluteUrl(path: string): string {
  const normalized = path === '/' ? '' : path;
  return `${siteUrl}${normalized}`;
}

export function buildAlternates(path: string) {
  return {
    canonical: absoluteUrl(path),
    languages: {
      en: absoluteUrl(withLocale('en', path)),
      'zh': absoluteUrl(withLocale('zh', path)),
    },
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
  const url = absoluteUrl(withLocale(locale, path));
  const ogImage = image ? [image] : undefined;

  return {
    title,
    description,
    alternates: buildAlternates(path),
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
