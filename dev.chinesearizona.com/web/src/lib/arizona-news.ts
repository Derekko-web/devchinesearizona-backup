import { appendSearch, withLocale } from '@/lib/routing';
import { defaultSiteProfile, type SiteProfile } from '@/lib/site-config';
import type { Locale } from '@/lib/types';

export const ARIZONA_NEWS_PATH = '/arizona-news';
export const ARIZONA_NEWS_ARCHIVE_PATH = '/arizona-news/archive';

function normalizeBasePath(path: string): string {
  const normalized = `/${String(path || '').replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? ARIZONA_NEWS_PATH : normalized;
}

export function getNewsPath(site: SiteProfile = defaultSiteProfile, search?: string): string {
  return appendSearch(normalizeBasePath(site.news.routePath), search);
}

export function getNewsArchivePath(
  site: SiteProfile = defaultSiteProfile,
  search?: string
): string {
  return appendSearch(normalizeBasePath(site.news.archivePath), search);
}

export function getNewsArticlePath(
  site: SiteProfile = defaultSiteProfile,
  slug: string
): string {
  return `${normalizeBasePath(site.news.routePath)}/${slug}`;
}

export function getLocalizedNewsPath(
  locale: Locale,
  site: SiteProfile = defaultSiteProfile,
  search?: string
): string {
  return appendSearch(withLocale(locale, normalizeBasePath(site.news.routePath)), search);
}

export function getLocalizedNewsArchivePath(
  locale: Locale,
  site: SiteProfile = defaultSiteProfile,
  search?: string
): string {
  return appendSearch(withLocale(locale, normalizeBasePath(site.news.archivePath)), search);
}

export function getLocalizedNewsArticlePath(
  locale: Locale,
  site: SiteProfile = defaultSiteProfile,
  slug: string
): string {
  return withLocale(locale, getNewsArticlePath(site, slug));
}

export function getNewsRouteSegment(site: SiteProfile = defaultSiteProfile): string {
  return normalizeBasePath(site.news.routePath).replace(/^\//, '');
}

export function getArizonaNewsPath(search?: string): string {
  return getNewsPath(defaultSiteProfile, search);
}

export function getArizonaNewsArchivePath(search?: string): string {
  return getNewsArchivePath(defaultSiteProfile, search);
}

export function getArizonaNewsArticlePath(slug: string): string {
  return getNewsArticlePath(defaultSiteProfile, slug);
}

export function getLocalizedArizonaNewsPath(locale: Locale, search?: string): string {
  return getLocalizedNewsPath(locale, defaultSiteProfile, search);
}

export function getLocalizedArizonaNewsArchivePath(locale: Locale, search?: string): string {
  return getLocalizedNewsArchivePath(locale, defaultSiteProfile, search);
}

export function getLocalizedArizonaNewsArticlePath(locale: Locale, slug: string): string {
  return getLocalizedNewsArticlePath(locale, defaultSiteProfile, slug);
}
