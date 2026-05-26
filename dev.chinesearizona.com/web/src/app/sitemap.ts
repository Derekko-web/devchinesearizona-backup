import type { MetadataRoute } from 'next';

import {
  ARIZONA_NEWS_ARCHIVE_PATH,
  ARIZONA_NEWS_PATH,
  getArizonaNewsArticlePath,
} from '@/lib/arizona-news';
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
import { publisherPageSlugs } from '@/lib/publisher-pages';
import { isShopPublicLaunchReady } from '@/lib/shop-launch-server';
import { absoluteUrl, buildAlternates } from '@/lib/seo';
import { withLocale } from '@/lib/routing';
import { getPublicShopSitemapData } from '@/lib/shop-service';
import { locales } from '@/lib/types';

export const dynamic = 'force-dynamic';

const staticRoutes = [
  '/',
  '/business',
  '/discover-arizona',
  '/hidden-arizona',
  '/relocation-guide',
  ARIZONA_NEWS_PATH,
  ARIZONA_NEWS_ARCHIVE_PATH,
  '/community',
  '/add-business',
  ...publisherPageSlugs.map((slug) => `/${slug}`),
] as const;
const localizedSitemapLocales = locales.filter((locale) => locale !== 'en');

type SitemapEntry = MetadataRoute.Sitemap[number];

function buildSitemapEntry(
  url: string,
  path: string,
  generatedAt: Date,
  priority: number
): SitemapEntry {
  return {
    url,
    lastModified: generatedAt,
    changeFrequency: 'weekly',
    priority,
    alternates: {
      languages: buildAlternates(path, 'en').languages,
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [directoryBusinesses, articles, discoverArticles] = await Promise.all([
    getDirectoryBusinesses({}, { limit: 1000 }),
    getCurrentArticlesAsync(),
    getPublishedDiscoverArticles(),
  ]);
  const hiddenArizonaEntries = getHiddenArizonaEntries();
  const guides = getGuides();
  const events = getEvents();
  const communityPosts = getCommunityPosts().filter((post) => !shouldNoIndexCommunityPost(post));
  const shopReady = isShopPublicLaunchReady();
  const publicShopData = shopReady
    ? await getPublicShopSitemapData()
    : { listings: [], sellers: [] };
  const businessRoutes = directoryBusinesses
    .filter((business) => !shouldNoIndexDirectoryBusiness(business))
    .map((business) => `/business/${business.slug}`);
  const dynamicRoutes = [
    ...businessRoutes,
    ...discoveryCategories.map((category) => `/discover-arizona/${category.slug}`),
    ...discoverArticles.map((article) => `/discover-arizona/${article.primaryCategory}/${article.slug}`),
    ...hiddenArizonaEntries.map((entry) => getHiddenArizonaEntryPath(entry)),
    ...guides.map((guide) => `/relocation-guide/${guide.slug}`),
    ...articles.map((article) => getArizonaNewsArticlePath(article.slug)),
    ...events.map((event) => `/community/events/${event.slug}`),
    ...communityPosts.map((post) =>
      `/community/${post.type === 'classified' ? 'classifieds' : 'board'}/${post.slug}`
    ),
    ...publicShopData.listings.map((listing) => `/shop/item/${listing.slug}`),
    ...publicShopData.sellers.map((seller) => `/shop/seller/${seller.slug}`),
  ];

  const allRoutes = Array.from(
    new Set([
      ...staticRoutes,
      ...(shopReady ? ['/shop' as const] : []),
      ...dynamicRoutes,
    ])
  );
  const generatedAt = new Date();

  const localizedEntries = allRoutes.flatMap((path) =>
    localizedSitemapLocales.map((locale) => ({
      ...buildSitemapEntry(absoluteUrl(withLocale(locale, path)), path, generatedAt, path === '/' ? 1 : 0.7),
    }))
  );

  const xDefaultEntries = allRoutes.map((path) =>
    buildSitemapEntry(absoluteUrl(path), path, generatedAt, path === '/' ? 1 : 0.6)
  );

  return [...xDefaultEntries, ...localizedEntries];
}
