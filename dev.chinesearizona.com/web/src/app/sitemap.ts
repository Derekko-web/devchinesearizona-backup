import type { MetadataRoute } from 'next';

import { getNewsArticlePath } from '@/lib/arizona-news';
import { canServeArizonaOnlyContent } from '@/lib/arizona-only-routes';
import {
  getCommunityPosts,
  getCurrentArticlesAsync,
  getEvents,
  getGuides,
  shouldNoIndexCommunityPost,
} from '@/lib/content';
import { getPublishedDiscoverArticles, discoveryCategories } from '@/lib/discover-arizona';
import { getDirectoryBusinesses, shouldNoIndexDirectoryBusiness } from '@/lib/directory';
import { getHiddenArizonaEntries, getHiddenArizonaEntryPath } from '@/lib/hidden-arizona';
import { advertisePath } from '@/lib/advertise';
import {
  cityCategoryPath,
  getMetroCategorySummaries,
  isIndexableListingCount,
  metroCategoryPath,
} from '@/lib/metro-categories';
import { publisherPageSlugs } from '@/lib/publisher-pages';
import { absoluteUrl, buildAlternates } from '@/lib/seo';
import { withLocale } from '@/lib/routing';
import { getCurrentSiteProfile } from '@/lib/site-config.server';
import { defaultSiteProfile, hasLiveDirectoryData, type SiteProfile } from '@/lib/site-config';
import { locales } from '@/lib/types';

export const dynamic = 'force-dynamic';
const localizedSitemapLocales = locales.filter((locale) => locale !== 'en');

type SitemapEntry = MetadataRoute.Sitemap[number];

// A real change date or none at all: a lastmod that is always "now" teaches
// search engines to ignore it (finding 14).
function parseLastModified(...values: Array<string | undefined | null>): Date | undefined {
  const times = values
    .map((value) => (value ? Date.parse(value) : Number.NaN))
    .filter((time) => Number.isFinite(time));
  return times.length > 0 ? new Date(Math.max(...times)) : undefined;
}

// Hidden Arizona entries with almost no text of their own stay out (two lists hold ~100 characters).
const MIN_HIDDEN_ARIZONA_BODY_CHARACTERS = 300;

function buildSitemapEntry(
  url: string,
  path: string,
  lastModified: Date | undefined,
  priority: number,
  site: SiteProfile
): SitemapEntry {
  return {
    url,
    ...(lastModified ? { lastModified } : {}),
    changeFrequency: 'weekly',
    priority,
    alternates: {
      languages: buildAlternates(path, 'en', site).languages,
    },
  };
}

export async function buildSitemap(site: SiteProfile = defaultSiteProfile): Promise<MetadataRoute.Sitemap> {
  const canShowArizonaOnlyContent = canServeArizonaOnlyContent(site);
  const staticRoutes = [
    '/',
    '/business',
    ...(canShowArizonaOnlyContent
      ? ['/discover-arizona', '/hidden-arizona', '/relocation-guide']
      : []),
    site.news.routePath,
    site.news.archivePath,
    '/community',
    '/add-business',
    advertisePath,
    ...publisherPageSlugs.map((slug) => `/${slug}`),
  ];
  const [directoryBusinesses, articles, discoverArticles] = await Promise.all([
    hasLiveDirectoryData(site) ? getDirectoryBusinesses({}, { site, limit: 1000 }) : Promise.resolve([]),
    getCurrentArticlesAsync(undefined, site),
    canShowArizonaOnlyContent ? getPublishedDiscoverArticles() : Promise.resolve([]),
  ]);
  const hiddenArizonaEntries = (canShowArizonaOnlyContent ? getHiddenArizonaEntries() : []).filter(
    (entry) =>
      entry.body.reduce((total, block) => total + (block?.en?.length ?? 0), 0) >= MIN_HIDDEN_ARIZONA_BODY_CHARACTERS
  );
  const guides = canShowArizonaOnlyContent ? getGuides() : [];
  const events = canShowArizonaOnlyContent ? getEvents() : [];
  const communityPosts = canShowArizonaOnlyContent
    ? getCommunityPosts().filter((post) => !shouldNoIndexCommunityPost(post))
    : [];
  const lastModifiedByPath = new Map<string, Date>();
  const noteLastModified = (path: string, ...values: Array<string | undefined | null>) => {
    const date = parseLastModified(...values);
    const current = lastModifiedByPath.get(path);
    if (date && (!current || date > current)) {
      lastModifiedByPath.set(path, date);
    }
  };
  const indexableBusinesses = directoryBusinesses.filter((business) => !shouldNoIndexDirectoryBusiness(business));
  const businessRoutes = indexableBusinesses.map((business) => `/business/${business.slug}`);
  for (const business of directoryBusinesses) {
    // A category page changes when any listing on it does.
    noteLastModified(metroCategoryPath(business.categorySlug), business.lastUpdated);
    noteLastModified(cityCategoryPath(business.city, business.categorySlug), business.lastUpdated);
  }
  for (const business of indexableBusinesses) {
    noteLastModified(`/business/${business.slug}`, business.lastUpdated);
  }
  // Sparse category pages (one or two listings) are noindex, so they stay out of the sitemap too.
  const metroCategorySummaries = await getMetroCategorySummaries(site, directoryBusinesses);
  const categoryRoutes = metroCategorySummaries
    .filter((summary) => summary.indexable)
    .flatMap((summary) => [
      metroCategoryPath(summary.category.slug),
      ...summary.cities
        .filter((city) => isIndexableListingCount(city.count))
        .map((city) => cityCategoryPath(city.city, summary.category.slug)),
    ]);
  const dynamicRoutes = [
    ...categoryRoutes,
    ...businessRoutes,
    // Discover Arizona category pages with no published articles are near-empty.
    ...(canShowArizonaOnlyContent
      ? discoveryCategories
          .filter((category) => discoverArticles.some((article) => article.primaryCategory === category.slug))
          .map((category) => `/discover-arizona/${category.slug}`)
      : []),
    ...discoverArticles.map((article) => `/discover-arizona/${article.primaryCategory}/${article.slug}`),
    ...hiddenArizonaEntries.map((entry) => getHiddenArizonaEntryPath(entry)),
    ...guides.map((guide) => `/relocation-guide/${guide.slug}`),
    ...articles.map((article) => getNewsArticlePath(site, article.slug)),
    ...events.map((event) => `/community/events/${event.slug}`),
    ...communityPosts.map((post) =>
      `/community/${post.type === 'classified' ? 'classifieds' : 'board'}/${post.slug}`
    ),
  ];

  for (const article of discoverArticles) {
    noteLastModified(`/discover-arizona/${article.primaryCategory}/${article.slug}`, article.updatedAt, article.publishedAt);
    noteLastModified(`/discover-arizona/${article.primaryCategory}`, article.updatedAt, article.publishedAt);
  }
  for (const entry of hiddenArizonaEntries) {
    noteLastModified(getHiddenArizonaEntryPath(entry), entry.updatedAt, entry.publishedAt);
  }
  for (const guide of guides) {
    noteLastModified(`/relocation-guide/${guide.slug}`, guide.updatedAt, guide.publishedAt);
  }
  for (const article of articles) {
    noteLastModified(getNewsArticlePath(site, article.slug), article.updatedAt, article.publishedAt);
  }
  for (const post of communityPosts) {
    noteLastModified(`/community/${post.type === 'classified' ? 'classifieds' : 'board'}/${post.slug}`, post.updatedAt);
  }

  const allRoutes = Array.from(
    new Set([
      ...staticRoutes,
      ...dynamicRoutes,
    ])
  );

  const localizedEntries = allRoutes.flatMap((path) =>
    localizedSitemapLocales.map((locale) => ({
      ...buildSitemapEntry(
        absoluteUrl(withLocale(locale, path), site),
        path,
        lastModifiedByPath.get(path),
        path === '/' ? 1 : 0.7,
        site
      ),
    }))
  );

  const xDefaultEntries = allRoutes.map((path) =>
    buildSitemapEntry(absoluteUrl(path, site), path, lastModifiedByPath.get(path), path === '/' ? 1 : 0.6, site)
  );

  return [...xDefaultEntries, ...localizedEntries];
}

async function getSitemapSiteProfile(): Promise<SiteProfile> {
  try {
    return await getCurrentSiteProfile();
  } catch (error) {
    if (error instanceof Error && error.message.includes('outside a request scope')) {
      return defaultSiteProfile;
    }

    throw error;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap(await getSitemapSiteProfile());
}
