import type { MetadataRoute } from 'next';

import { communityPosts, events, guides, profiles } from '@/data/platform-data';
import { getArticles } from '@/lib/content';
import { getDirectoryBusinessSlugs } from '@/lib/directory';
import { getHiddenArizonaEntries, getHiddenArizonaEntryPath } from '@/lib/hidden-arizona';
import { siteUrl } from '@/lib/seo';
import { withLocale } from '@/lib/routing';
import { locales } from '@/lib/types';

export const dynamic = 'force-dynamic';

const staticRoutes = [
  '/',
  '/directory',
  '/hidden-arizona',
  '/relocation-guide',
  '/community',
  '/community/news',
  '/add-business',
  '/dashboard',
  '/admin',
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const businessSlugs = await getDirectoryBusinessSlugs();
  const articles = getArticles();
  const hiddenArizonaEntries = getHiddenArizonaEntries();
  const dynamicRoutes = [
    ...businessSlugs.map((slug) => `/directory/business/${slug}`),
    ...hiddenArizonaEntries.map((entry) => getHiddenArizonaEntryPath(entry)),
    ...guides.map((guide) => `/relocation-guide/${guide.slug}`),
    ...articles.map((article) => `/community/news/${article.slug}`),
    ...events.map((event) => `/community/events/${event.slug}`),
    ...communityPosts.map((post) =>
      `/community/${post.type === 'classified' ? 'classifieds' : 'board'}/${post.slug}`
    ),
    ...profiles.map((profile) => `/profile/${profile.slug}`),
  ];

  const allRoutes = [...staticRoutes, ...dynamicRoutes];

  const localizedEntries = allRoutes.flatMap((path) =>
    locales.map((locale) => ({
      url: `${siteUrl}${withLocale(locale, path)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: path === '/' ? 1 : 0.7,
    }))
  );

  const xDefaultEntries = allRoutes.map((path) => ({
    url: `${siteUrl}${path === '/' ? '' : path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1 : 0.6,
  }));

  return [...xDefaultEntries, ...localizedEntries];
}
