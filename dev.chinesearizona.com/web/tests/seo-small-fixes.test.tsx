import { describe, expect, it } from 'vitest';

import { buildSitemap } from '@/app/sitemap';
import { getDirectoryBusinesses, shouldNoIndexDirectoryBusiness } from '@/lib/directory';
import { getPublishedDiscoverArticles, discoveryCategories } from '@/lib/discover-arizona';
import { localeLangAttribute } from '@/lib/i18n';
import { PAGE_LOCALE_HEADER } from '@/lib/routing';
import { buildMetadata } from '@/lib/seo';
import { siteProfiles } from '@/lib/site-config';
import { proxy } from '@/proxy';
import { buildHomeJsonLd } from '@/views/home-page';

function request(url: string) {
  const parsed = new URL(url);
  return {
    headers: new Headers({ host: parsed.host, [PAGE_LOCALE_HEADER]: 'spoofed' }),
    method: 'GET',
    nextUrl: {
      pathname: parsed.pathname,
      search: parsed.search,
      protocol: parsed.protocol,
      host: parsed.host,
      clone: () => new URL(url),
    },
  };
}

describe('page language for crawlers', () => {
  it('tells the root layout the page language and ignores a client-sent value', () => {
    const zh = proxy(request('https://chinesearizona.com/zh/business') as never);
    const en = proxy(request('https://chinesearizona.com/business') as never);

    expect(zh.headers.get(`x-middleware-request-${PAGE_LOCALE_HEADER}`)).toBe('zh');
    expect(en.headers.get(`x-middleware-request-${PAGE_LOCALE_HEADER}`)).toBe('en');
    expect(localeLangAttribute('zh')).toBe('zh-Hant-TW');
  });

  it('marks Chinese Open Graph data as zh_TW', () => {
    const zh = buildMetadata({ title: 't', description: 'd', path: '/business', locale: 'zh' });
    const en = buildMetadata({ title: 't', description: 'd', path: '/business', locale: 'en' });

    expect(zh.openGraph).toMatchObject({ locale: 'zh_TW', alternateLocale: ['en_US'] });
    expect(en.openGraph).toMatchObject({ locale: 'en_US', alternateLocale: ['zh_TW'] });
  });
});

describe('home page structured data', () => {
  it('describes the publisher and the website in the page language', () => {
    const [organization, website] = buildHomeJsonLd(siteProfiles.arizona, 'zh');

    expect(organization).toMatchObject({
      '@type': 'Organization',
      name: 'ChineseArizona',
      url: 'https://chinesearizona.com',
      logo: 'https://chinesearizona.com/apple-touch-icon.png',
      email: 'hello@chinesearizona.com',
    });
    expect(website).toMatchObject({
      '@type': 'WebSite',
      url: 'https://chinesearizona.com/zh',
      inLanguage: 'zh-Hant-TW',
      publisher: { '@id': 'https://chinesearizona.com/#organization' },
    });
  });
});

describe('sitemap dates and thin pages', () => {
  it('uses real change dates, and none where there is no real date', async () => {
    const entries = await buildSitemap(siteProfiles.arizona);
    const byUrl = new Map(entries.map((entry) => [entry.url, entry]));
    const business = (await getDirectoryBusinesses({}, { site: siteProfiles.arizona, limit: 1000 })).find(
      (item) => !shouldNoIndexDirectoryBusiness(item) && Boolean(item.lastUpdated)
    )!;

    const businessEntry = byUrl.get(`https://chinesearizona.com/business/${business.slug}`);
    expect(businessEntry?.lastModified).toEqual(new Date(business.lastUpdated));
    expect(byUrl.get('https://chinesearizona.com')?.lastModified).toBeUndefined();
    expect(byUrl.get('https://chinesearizona.com/about')?.lastModified).toBeUndefined();
  });

  it('leaves out near-empty Hidden Arizona lists and Discover Arizona categories without articles', async () => {
    const urls = (await buildSitemap(siteProfiles.arizona)).map((entry) => entry.url);
    const articles = await getPublishedDiscoverArticles();

    expect(urls).not.toContain('https://chinesearizona.com/hidden-arizona/lists/10-ethical-animal-places-to-visit-in-2019');
    for (const category of discoveryCategories) {
      const hasArticles = articles.some((article) => article.primaryCategory === category.slug);
      expect(urls.includes(`https://chinesearizona.com/discover-arizona/${category.slug}`)).toBe(hasArticles);
    }
    expect(urls.some((url) => url.includes('/hidden-arizona/places/'))).toBe(true);
  });
});
