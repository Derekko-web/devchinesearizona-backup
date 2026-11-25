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

function buildSitemapEntry(
  url: string,
  path: string,
  generatedAt: Date,
  priority: number,
  site: SiteProfile
): SitemapEntry {
  return {
    url,
    lastModified: generatedAt,
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
  const hiddenArizonaEntries = canShowArizonaOnlyContent ? getHiddenArizonaEntries() : [];
  const guides = canShowArizonaOnlyContent ? getGuides() : [];
  const events = canShowArizonaOnlyContent ? getEvents() : [];
  const communityPosts = canShowArizonaOnlyContent
    ? getCommunityPosts().filter((post) => !shouldNoIndexCommunityPost(post))
    : [];
  const businessRoutes = directoryBusinesses
    .filter((business) => !shouldNoIndexDirectoryBusiness(business))
    .map((business) => `/business/${business.slug}`);
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
    ...(canShowArizonaOnlyContent
      ? discoveryCategories.map((category) => `/discover-arizona/${category.slug}`)
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

  const allRoutes = Array.from(
    new Set([
      ...staticRoutes,
      ...dynamicRoutes,
    ])
  );
  const generatedAt = new Date();

  const localizedEntries = allRoutes.flatMap((path) =>
    localizedSitemapLocales.map((locale) => ({
      ...buildSitemapEntry(
        absoluteUrl(withLocale(locale, path), site),
        path,
        generatedAt,
        path === '/' ? 1 : 0.7,
        site
      ),
    }))
  );

  const xDefaultEntries = allRoutes.map((path) =>
    buildSitemapEntry(absoluteUrl(path, site), path, generatedAt, path === '/' ? 1 : 0.6, site)
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
