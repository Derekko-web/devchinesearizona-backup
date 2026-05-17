import { appendSearch, withLocale } from '@/lib/routing';
import type { Locale } from '@/lib/types';

export const ARIZONA_NEWS_PATH = '/arizona-news';
export const ARIZONA_NEWS_ARCHIVE_PATH = '/arizona-news/archive';

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
