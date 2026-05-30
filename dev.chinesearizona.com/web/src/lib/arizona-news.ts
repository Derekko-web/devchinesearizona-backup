import { appendSearch, withLocale } from '@/lib/routing';
import { defaultSiteProfile, type SiteProfile } from '@/lib/site-config';
import type { Locale } from '@/lib/types';

export const ARIZONA_NEWS_PATH = '/arizona-news';
export const ARIZONA_NEWS_ARCHIVE_PATH = '/arizona-news/archive';

export function getNewsPath(site: SiteProfile = defaultSiteProfile, search?: string): string {
  return appendSearch(site.news.routePath, search);
}

export function getNewsArchivePath(site: SiteProfile = defaultSiteProfile, search?: string): string {
  return appendSearch(site.news.archivePath, search);
}

export function getNewsArticlePath(site: SiteProfile = defaultSiteProfile, slug: string): string {
  return `${site.news.routePath}/${slug}`;
}

export function getLocalizedNewsPath(
  locale: Locale,
  site: SiteProfile = defaultSiteProfile,
  search?: string
): string {
  return appendSearch(withLocale(locale, site.news.routePath), search);
}

export function getLocalizedNewsArchivePath(
  locale: Locale,
  site: SiteProfile = defaultSiteProfile,
  search?: string
): string {
  return appendSearch(withLocale(locale, site.news.archivePath), search);
}

export function getLocalizedNewsArticlePath(
  locale: Locale,
  site: SiteProfile = defaultSiteProfile,
  slug: string
): string {
  return withLocale(locale, getNewsArticlePath(site, slug));
}

export function getArizonaNewsPath(search?: string): string {
  return appendSearch(ARIZONA_NEWS_PATH, search);
}

export function getArizonaNewsArchivePath(search?: string): string {
  return appendSearch(ARIZONA_NEWS_ARCHIVE_PATH, search);
}

export function getArizonaNewsArticlePath(slug: string): string {
  return `${ARIZONA_NEWS_PATH}/${slug}`;
}

export function getLocalizedArizonaNewsPath(locale: Locale, search?: string): string {
  return appendSearch(withLocale(locale, ARIZONA_NEWS_PATH), search);
}

export function getLocalizedArizonaNewsArchivePath(locale: Locale, search?: string): string {
  return appendSearch(withLocale(locale, ARIZONA_NEWS_ARCHIVE_PATH), search);
}

export function getLocalizedArizonaNewsArticlePath(locale: Locale, slug: string): string {
  return withLocale(locale, getArizonaNewsArticlePath(slug));
}

function routeSegments(routePath: string): string[] {
  return routePath
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export type SiteNewsRouteMatch =
  | { kind: 'index' }
  | { kind: 'archive' }
  | { kind: 'article'; slug: string };

export function getSiteNewsPath(
  site: SiteProfile = defaultSiteProfile,
  search?: string
): string {
  return appendSearch(site.news.routePath, search);
}

export function getSiteNewsArchivePath(
  site: SiteProfile = defaultSiteProfile,
  search?: string
): string {
  return appendSearch(site.news.archivePath, search);
}

export function getSiteNewsArticlePath(
  site: SiteProfile = defaultSiteProfile,
  slug: string
): string {
  return `${site.news.routePath}/${slug}`.replace(/\/{2,}/g, '/');
}

export function getLocalizedSiteNewsPath(
  locale: Locale,
  site: SiteProfile = defaultSiteProfile,
  search?: string
): string {
  return appendSearch(withLocale(locale, site.news.routePath), search);
}

export function getLocalizedSiteNewsArchivePath(
  locale: Locale,
  site: SiteProfile = defaultSiteProfile,
  search?: string
): string {
  return appendSearch(withLocale(locale, site.news.archivePath), search);
}

export function getLocalizedSiteNewsArticlePath(
  locale: Locale,
  site: SiteProfile = defaultSiteProfile,
  slug: string
): string {
  return withLocale(locale, getSiteNewsArticlePath(site, slug));
}

export function matchSiteNewsRouteSegments(
  site: SiteProfile,
  segments: string[]
): SiteNewsRouteMatch | null {
  const baseSegments = routeSegments(site.news.routePath);
  const archiveSegments = routeSegments(site.news.archivePath);

  if (
    segments.length === baseSegments.length &&
    baseSegments.every((segment, index) => segments[index] === segment)
  ) {
    return { kind: 'index' };
  }

  if (
    segments.length === archiveSegments.length &&
    archiveSegments.every((segment, index) => segments[index] === segment)
  ) {
    return { kind: 'archive' };
  }

  if (
    segments.length === baseSegments.length + 1 &&
    baseSegments.every((segment, index) => segments[index] === segment)
  ) {
    const slug = segments[baseSegments.length];
    return slug ? { kind: 'article', slug } : null;
  }

  return null;
}
