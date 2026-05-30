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
