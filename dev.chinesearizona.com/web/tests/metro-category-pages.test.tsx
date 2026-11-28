import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildSitemap } from '@/app/sitemap';
import { isDirectoryAdEligiblePath } from '@/lib/directory-ads';
import {
  findMetroCategoryCity,
  getMetroCategorySummaries,
  slugifyCity,
  splitSponsoredListings,
} from '@/lib/metro-categories';
import { cityCategoryMetadata, metroCategoryMetadata } from '@/lib/page-metadata';
import { siteProfiles } from '@/lib/site-config';
import type { Business } from '@/lib/types';
import { HomePageView } from '@/views/home-page';
import { BusinessDetailPageView, CityCategoryPageView, MetroCategoryPageView } from '@/views/site-pages';

const sponsorState = vi.hoisted(() => ({ slugs: new Set<string>() }));

vi.mock('@/lib/directory', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/directory')>();
  return {
    ...actual,
    getDirectoryBusinesses: async (...args: Parameters<typeof actual.getDirectoryBusinesses>) => {
      const businesses = await actual.getDirectoryBusinesses(...args);
      return businesses.map((business) =>
        sponsorState.slugs.has(business.slug) ? { ...business, sponsored: true } : business
      );
    },
  };
});

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ alt, src, fill, ...props }: { alt: string; src: string; fill?: boolean; [key: string]: unknown }) => {
    void fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} src={String(src)} {...props} />;
  },
}));

vi.mock('@/components/forms/BusinessClaimForm', () => ({
  BusinessClaimForm: () => <form data-testid="business-claim-form" />,
}));

vi.mock('@/components/forms/ReportIssueForm', () => ({
  ReportIssueForm: () => <form data-testid="report-issue-form" />,
}));

afterEach(() => {
  sponsorState.slugs.clear();
});

async function renderMetro(locale: 'en' | 'zh', category: string, site = siteProfiles.arizona) {
  const rendered = await MetroCategoryPageView({ locale, category, site });
  return rendered ? renderToStaticMarkup(rendered) : null;
}

function sitemapUrls(entries: Awaited<ReturnType<typeof buildSitemap>>) {
  return entries.map((entry) => entry.url);
}

describe('metro category pages', () => {
  it('renders the Arizona realtor page in English with intro, listings, and city filters', async () => {
    const html = await renderMetro('en', 'real-estate');

    expect(html).toContain('Realtors &amp; Real Estate in Phoenix Metro &amp; Arizona');
    expect(html).toContain('大鳳凰城與亞利桑那房地產經紀');
    expect(html).toContain('4 listings across 3 cities');
    expect(html).toContain('Hedy Li');
    expect(html).toContain('Grace Tung');
    expect(html).toContain('href="/en/business/phoenix/real-estate"');
    expect(html).toContain('href="/en/business/gilbert/real-estate"');
    expect(html).toContain('href="/en/business/category/real-estate"');
    expect(html).toContain('"@type":"ItemList"');
  });

  it('renders the same page in Chinese with Chinese city names', async () => {
    const html = await renderMetro('zh', 'real-estate');

    expect(html).toContain('大鳳凰城與亞利桑那房地產經紀');
    expect(html).toContain('共 4 筆商家，分布於 3 個城市');
    expect(html).toContain('鳳凰城');
    expect(html).toContain('吉爾伯特');
    expect(html).toContain('href="/zh/business/phoenix/real-estate"');
    expect(html).toContain('贊助');
  });

  it('labels an open sponsored spot when nobody sponsors the category', async () => {
    const html = (await renderMetro('en', 'real-estate')) ?? '';

    expect(html).toContain('Sponsored');
    expect(html).toContain('贊助');
    expect(html).toContain('Sponsor this category');
    expect(html).toContain('href="/en/advertise?plan=sponsored-category#contact"');
  });

  it('moves sponsored listings into the labeled spot at the top without repeating them', async () => {
    sponsorState.slugs.add('charlotte-chang-peoria');
    const html = (await renderMetro('en', 'real-estate')) ?? '';
    const sponsoredSection = html.slice(html.indexOf('id="sponsored-category-spots"'), html.indexOf('All Realtors &amp; Real Estate'));

    expect(sponsoredSection).toContain('Charlotte Chang');
    expect(html.split('Charlotte Chang</a>').length - 1).toBe(1);
    expect(html.indexOf('Charlotte Chang</a>')).toBeLessThan(html.indexOf('Hedy Li</a>'));
    expect(html).not.toContain('Sponsor this category');
  });

  it('caps sponsored spots and keeps the rest in the organic list', () => {
    const listings = ['a', 'b', 'c', 'd', 'e'].map(
      (id, index) => ({ id, slug: id, sponsored: index < 4 }) as unknown as Business
    );
    const { sponsored, organic } = splitSponsoredListings(listings);

    expect(sponsored.map((business) => business.id)).toEqual(['a', 'b', 'c']);
    expect(organic.map((business) => business.id)).toEqual(['d', 'e']);
  });

  it('renders a category the Arizona config lists even before it has listings, and 404s unknown ones', async () => {
    const moving = await renderMetro('en', 'moving');

    expect(moving).toContain('Movers in Phoenix Metro &amp; Arizona');
    expect(moving).toContain('This category is still growing');
    expect(await renderMetro('en', 'not-a-category')).toBeNull();
    expect(await renderMetro('en', 'travel')).toBeNull();
  });

  it('builds city site pages from their own listings with no Arizona fallback', async () => {
    const austin = (await renderMetro('en', 'dining', siteProfiles.austin)) ?? '';
    const austinZh = (await renderMetro('zh', 'medical', siteProfiles.austin)) ?? '';
    const losAngeles = (await renderMetro('zh', 'dining', siteProfiles['los-angeles'])) ?? '';
    const sfBay = (await renderMetro('en', 'medical', siteProfiles['sf-bay'])) ?? '';

    expect(austin).toContain('Chinese Restaurants in Greater Austin');
    expect(austin).toContain('House of Three Gorges');
    expect(austin).toContain('href="/en/business/cedar-park/dining"');
    expect(austinZh).toContain('大奧斯汀地區醫師與診所');
    expect(austinZh).toContain('Austin Quan Yin');
    expect(losAngeles).toContain('大洛杉磯地區中餐廳與美食');
    expect(losAngeles).toContain('href="/zh/business/monterey-park/dining"');
    expect(losAngeles).toContain('蒙特利公園');
    expect(sfBay).toContain('Doctors &amp; Clinics in the SF Bay Area');
    expect(sfBay).toContain('Asian Health Services');

    for (const html of [austin, austinZh, losAngeles, sfBay]) {
      expect(html).not.toContain('Phoenix');
      expect(html).not.toContain('Hedy Li');
      expect(html).not.toContain('鳳凰城');
    }
  });

  it('only offers city sites the categories they configure', async () => {
    expect(await renderMetro('en', 'beauty-wellness', siteProfiles.austin)).toBeNull();
    expect(await renderMetro('en', 'home-services', siteProfiles['los-angeles'])).toBeNull();
  });
});

describe('metro category metadata and sitemap', () => {
  it('indexes metro pages with three or more listings and self-canonicalizes both languages', async () => {
    const en = await metroCategoryMetadata('en', 'real-estate');
    const zh = await metroCategoryMetadata('zh', 'real-estate');
    const moving = await metroCategoryMetadata('en', 'moving');

    expect(en?.title).toBe('Realtors & Real Estate in Phoenix Metro & Arizona | ChineseArizona');
    expect(en?.robots).toBeUndefined();
    expect(en?.alternates?.canonical).toBe('https://chinesearizona.com/business/category/real-estate');
    expect(zh?.title).toBe('大鳳凰城與亞利桑那房地產經紀 | ChineseArizona');
    expect(zh?.alternates?.canonical).toBe('https://chinesearizona.com/zh/business/category/real-estate');
    expect(moving?.robots).toEqual({ index: false, follow: false });
    expect(await metroCategoryMetadata('en', 'not-a-category')).toBeNull();
  });

  it('noindexes sparse city-by-category pages and indexes dense ones', async () => {
    const sparse = await cityCategoryMetadata('en', 'phoenix', 'real-estate');
    const dense = await cityCategoryMetadata('zh', 'mesa', 'dining');
    const spaced = await cityCategoryMetadata('en', 'monterey%20park', 'dining', siteProfiles['los-angeles']);

    expect(sparse?.robots).toEqual({ index: false, follow: false });
    expect(sparse?.title).toBe('Realtors & Real Estate in Phoenix, AZ | ChineseArizona');
    expect(dense?.robots).toBeUndefined();
    expect(dense?.title).toBe('梅薩中餐廳與美食 | ChineseArizona');
    expect(dense?.alternates?.canonical).toBe('https://chinesearizona.com/zh/business/mesa/dining');
    expect(spaced?.alternates?.canonical).toBe('https://chineselosangeles.com/business/monterey-park/dining');
  });

  it('adds indexable metro and dense city pages to the Arizona sitemap only', async () => {
    const urls = sitemapUrls(await buildSitemap());

    expect(urls).toContain('https://chinesearizona.com/business/category/real-estate');
    expect(urls).toContain('https://chinesearizona.com/zh/business/category/real-estate');
    expect(urls).toContain('https://chinesearizona.com/business/category/dining');
    expect(urls).toContain('https://chinesearizona.com/business/category/beauty-wellness');
    expect(urls).toContain('https://chinesearizona.com/business/mesa/dining');
    expect(urls).not.toContain('https://chinesearizona.com/business/category/moving');
    expect(urls).not.toContain('https://chinesearizona.com/business/phoenix/real-estate');
    expect(urls).not.toContain('https://chinesearizona.com/business/gilbert/real-estate');
  });

  it('builds city site category sitemap entries from city data', async () => {
    const austin = sitemapUrls(await buildSitemap(siteProfiles.austin));
    const losAngeles = sitemapUrls(await buildSitemap(siteProfiles['los-angeles']));

    expect(austin).toContain('https://chineseaustin.com/business/category/dining');
    expect(austin).toContain('https://chineseaustin.com/zh/business/category/medical');
    expect(austin).toContain('https://chineseaustin.com/business/cedar-park/dining');
    expect(austin).not.toContain('https://chineseaustin.com/business/category/real-estate');
    expect(austin).not.toContain('https://chineseaustin.com/business/category/beauty-wellness');
    expect(losAngeles).toContain('https://chineselosangeles.com/business/monterey-park/dining');
    expect(losAngeles).not.toContain('https://chineselosangeles.com/business/category/real-estate');
    expect([...austin, ...losAngeles].some((url) => url.includes('chinesearizona.com'))).toBe(false);
  });
});

describe('city category pages', () => {
  it('describes each city page with its own city, intro and listing count', async () => {
    const mesa = await cityCategoryMetadata('en', 'mesa', 'dining');
    const mesaZh = await cityCategoryMetadata('zh', 'mesa', 'dining');
    const chandler = await cityCategoryMetadata('en', 'chandler', 'dining');

    expect(mesa?.description).toBe(
      'Chinese restaurants, bakeries, bubble tea, and Asian grocery anchors across Mesa, AZ, from regional cooking to everyday takeout. Open a listing for hours, menus, and directions. 76 listings in Mesa.'
    );
    expect(mesaZh?.description).toContain('梅薩的中餐廳');
    expect(mesaZh?.description).toContain('梅薩共 76 筆商家。');
    expect(chandler?.description).not.toBe(mesa?.description);
  });

  it('adds breadcrumb and item list structured data with canonical URLs', async () => {
    const rendered = await CityCategoryPageView({ locale: 'zh', city: 'mesa', category: 'dining', site: siteProfiles.arizona });
    const html = rendered ? renderToStaticMarkup(rendered) : '';
    const blocks = Array.from(html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)).flatMap(
      (match) => JSON.parse(match[1])
    );
    const breadcrumb = blocks.find((block) => block['@type'] === 'BreadcrumbList');
    const itemList = blocks.find((block) => block['@type'] === 'ItemList');

    expect(breadcrumb.itemListElement.map((item: { item: string }) => item.item)).toEqual([
      'https://chinesearizona.com/zh',
      'https://chinesearizona.com/zh/business',
      'https://chinesearizona.com/zh/business/category/dining',
      'https://chinesearizona.com/zh/business/mesa/dining',
    ]);
    expect(itemList.numberOfItems).toBe(76);
    expect(itemList.itemListElement[0].url).toMatch(/^https:\/\/chinesearizona\.com\/zh\/business\//);
  });

  it('links back to the metro page and highlights the active city filter', async () => {
    const rendered = await CityCategoryPageView({ locale: 'en', city: 'mesa', category: 'dining', site: siteProfiles.arizona });
    const html = rendered ? renderToStaticMarkup(rendered) : '';

    expect(html).toContain('Chinese Restaurants in Mesa, AZ');
    expect(html).toContain('href="/en/business/category/dining"');
    expect(html).toMatch(/href="\/en\/business\/mesa\/dining" aria-current="page"/);
    expect(html).toContain('Showing 76 public listings');
  });

  it('resolves multi-word city slugs on city sites', async () => {
    const rendered = await CityCategoryPageView({
      locale: 'zh',
      city: 'monterey-park',
      category: 'dining',
      site: siteProfiles['los-angeles'],
    });
    const html = rendered ? renderToStaticMarkup(rendered) : '';

    expect(html).toContain('蒙特利公園中餐廳與美食');
    expect(html).toContain('一口福');
  });

  it('matches city slugs the same way ad campaign scopes do', async () => {
    const [summary] = (await getMetroCategorySummaries(siteProfiles['los-angeles'])).filter(
      (item) => item.category.slug === 'dining'
    );

    expect(slugifyCity(' Monterey Park ')).toBe('monterey-park');
    expect(findMetroCategoryCity(summary, 'Monterey%20Park')?.city).toBe('Monterey Park');
    expect(findMetroCategoryCity(summary, 'atlantis')).toBeUndefined();
  });
});

describe('links into metro category pages', () => {
  it('points the homepage Trusted Services tiles at metro pages', async () => {
    const arizona = renderToStaticMarkup(await HomePageView({ locale: 'en', site: siteProfiles.arizona }));
    const losAngeles = renderToStaticMarkup(await HomePageView({ locale: 'zh', site: siteProfiles['los-angeles'] }));

    expect(arizona).toContain('href="/en/business/category/real-estate"');
    expect(arizona).toContain('href="/en/business/category/home-services"');
    expect(losAngeles).toContain('href="/zh/business/category/medical"');
    // LA does not offer home services, so that tile keeps the filtered directory link.
    expect(losAngeles).toContain('href="/zh/business?category=home-services&amp;sort=featured"');
    expect(losAngeles).not.toContain('href="/zh/business/category/home-services"');
  });

  it('links business pages to their metro category page', async () => {
    const rendered = await BusinessDetailPageView({ locale: 'zh', slug: 'hedy-li-phoenix', site: siteProfiles.arizona });
    const html = rendered ? renderToStaticMarkup(rendered) : '';

    expect(html).toContain('href="/zh/business/category/real-estate"');
    expect(html).toContain('大鳳凰城與亞利桑那房地產經紀');
    expect(html).toContain('href="/zh/business/phoenix/real-estate"');
  });

  it('counts sponsored clicks on metro pages as eligible directory placements', () => {
    expect(isDirectoryAdEligiblePath('/en/business/category/real-estate')).toBe(true);
    expect(isDirectoryAdEligiblePath('/business/category/dining')).toBe(true);
  });
});

describe('category headings make no language claim about every listing (#480)', () => {
  it('keeps "Chinese-speaking" / 華語 / 華人 out of every category heading and intro', async () => {
    const [{ getMetroCategoryHeading, getMetroCategoryIntro }, { getDirectoryCategories }] = await Promise.all([
      import('@/lib/metro-categories'),
      import('@/lib/directory'),
    ]);

    for (const site of Object.values(siteProfiles)) {
      for (const category of await getDirectoryCategories(site)) {
        for (const locale of ['en', 'zh'] as const) {
          const text = `${getMetroCategoryHeading(category, locale)} ${getMetroCategoryIntro(category, site, locale)}`;
          expect(text, `${site.key}/${category.slug}/${locale}`).not.toMatch(/chinese-speaking|mandarin-speaking|華語|華人(地產|律師|在地|居家|搬家|旅遊|美容)/i);
        }
      }
    }

    const medical = (await getDirectoryCategories(siteProfiles.arizona)).find((category) => category.slug === 'medical');
    expect(medical).toBeDefined();
    expect(getMetroCategoryHeading(medical!, 'en')).toBe('Doctors & Clinics');
    expect(getMetroCategoryHeading(medical!, 'zh')).toBe('醫師與診所');
  });
});
