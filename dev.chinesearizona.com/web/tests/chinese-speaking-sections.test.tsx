import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { businessCategories } from '@/data/platform-data';
import { siteProfiles } from '@/lib/site-config';
import type { Business, LanguageOption } from '@/lib/types';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ alt, src, fill: _fill, ...props }: { alt: string; src: string; fill?: boolean; [key: string]: unknown }) => {
    void _fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} src={String(src)} {...props} />;
  },
}));

const medical = businessCategories.find((category) => category.slug === 'medical')!;

async function clinics(languagesPerListing: LanguageOption[][]): Promise<Business[]> {
  const { getDirectoryBusinessBySlug } = await import('@/lib/directory');
  const base = (await getDirectoryBusinessBySlug('grace-tung-gilbert', { site: siteProfiles.arizona }))!;
  return languagesPerListing.map((languages, index) => ({
    ...base,
    id: `clinic-${index}`,
    slug: `clinic-${index}`,
    name: { en: `Clinic ${index}`, zh: `診所 ${index}` },
    categorySlug: 'medical',
    city: 'Mesa',
    languages,
    sponsored: false,
    paidPlans: [],
  }));
}

async function loadWithListings(listings: Business[]) {
  vi.resetModules();
  vi.doMock('@/lib/metro-categories', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/metro-categories')>();
    const summary = actual.summarizeMetroCategories(listings, [medical], siteProfiles.arizona)[0];
    return {
      ...actual,
      getMetroCategoryPageData: vi.fn(async () => ({ summary, listings, otherCategories: [] })),
    };
  });
  const [metadata, views] = await Promise.all([import('@/lib/page-metadata'), import('@/views/site-pages')]);
  return { ...metadata, ...views };
}

beforeEach(() => {
  vi.doUnmock('@/lib/metro-categories');
});

describe('Chinese-speaking helpers', () => {
  it('needs three listings that record a Chinese spoken language', async () => {
    const { hasChineseSpeakingSection, splitChineseSpeakingListings } = await import('@/lib/metro-categories');

    expect(hasChineseSpeakingSection(await clinics([['English', 'Mandarin'], ['Cantonese'], ['English']]))).toBe(false);
    expect(hasChineseSpeakingSection(await clinics([['Mandarin'], ['Cantonese'], ['Taiwanese'], ['English']]))).toBe(true);
    // "Traditional Chinese" is written, not spoken, and does not count.
    const written = await clinics([['Traditional Chinese'], ['Traditional Chinese'], ['Traditional Chinese']]);
    expect(hasChineseSpeakingSection(written)).toBe(false);
    expect(splitChineseSpeakingListings(written).others).toHaveLength(3);
  });

  it('says Chinese-speaking in titles only when asked to, and keeps the plain wording otherwise', async () => {
    const { getCityCategoryTitle, getMetroCategoryTitle } = await import('@/lib/metro-categories');
    const site = siteProfiles.arizona;

    expect(getMetroCategoryTitle(medical, site, 'en')).toBe('Doctors & Clinics in Phoenix Metro & Arizona');
    expect(getMetroCategoryTitle(medical, site, 'en', { chineseSpeaking: true })).toBe(
      'Chinese-Speaking Doctors & Clinics in Phoenix Metro & Arizona'
    );
    expect(getMetroCategoryTitle(medical, site, 'zh', { chineseSpeaking: true })).toBe('大鳳凰城與亞利桑那醫師與診所・中文服務');
    expect(getCityCategoryTitle(medical, 'Mesa', site, 'en')).toBe('Doctors & Clinics in Mesa, AZ');
    expect(getCityCategoryTitle(medical, 'Mesa', site, 'en', { chineseSpeaking: true })).toBe(
      'Chinese-Speaking Doctors & Clinics in Mesa, AZ'
    );
    expect(getCityCategoryTitle(medical, '梅薩', site, 'zh', { chineseSpeaking: true })).toBe('梅薩醫師與診所・中文服務');
  });
});

describe('category pages with enough Chinese-speaking listings', () => {
  it('list them first under their own heading and say so in the title and description', async () => {
    const listings = await clinics([['English'], ['English', 'Mandarin'], ['Cantonese'], ['Mandarin', 'Taiwanese']]);
    const { metroCategoryMetadata, cityCategoryMetadata, MetroCategoryPageView, CityCategoryPageView } =
      await loadWithListings(listings);

    const metro = await metroCategoryMetadata('en', 'medical', siteProfiles.arizona);
    expect(metro?.title).toBe('Chinese-Speaking Doctors & Clinics in Phoenix Metro & Arizona | ChineseArizona');
    expect(metro?.description).toContain('3 of them are Chinese-speaking.');
    const cityZh = await cityCategoryMetadata('zh', 'mesa', 'medical', siteProfiles.arizona);
    expect(cityZh?.title).toBe('梅薩醫師與診所・中文服務 | ChineseArizona');
    expect(cityZh?.description).toContain('其中 3 家提供中文服務。');

    const html = renderToStaticMarkup(
      (await MetroCategoryPageView({ locale: 'en', category: 'medical', site: siteProfiles.arizona }))!
    );
    expect(html).toContain('Chinese-speaking doctors &amp; clinics (3)');
    expect(html).toContain('Other listings (1)');
    // Chinese-speaking section first; the English-only clinic sits under "Other listings".
    const chineseAt = html.indexOf('Chinese-speaking doctors &amp; clinics (3)');
    const otherAt = html.indexOf('Other listings (1)');
    expect(chineseAt).toBeLessThan(otherAt);
    expect(html.indexOf('>Clinic 1<', chineseAt)).toBeLessThan(otherAt);
    expect(html.indexOf('>Clinic 0<', otherAt)).toBeGreaterThan(otherAt);

    const cityHtml = renderToStaticMarkup(
      (await CityCategoryPageView({ locale: 'zh', city: 'mesa', category: 'medical', site: siteProfiles.arizona }))!
    );
    expect(cityHtml).toContain('會說中文的醫師與診所（3）');
    expect(cityHtml).toContain('其他商家（1）');
  });

  it('keep the plain wording and one list below three', async () => {
    const listings = await clinics([['English'], ['English', 'Mandarin'], ['Cantonese'], ['English']]);
    const { metroCategoryMetadata, MetroCategoryPageView } = await loadWithListings(listings);

    const metro = await metroCategoryMetadata('en', 'medical', siteProfiles.arizona);
    expect(metro?.title).toBe('Doctors & Clinics in Phoenix Metro & Arizona | ChineseArizona');
    expect(metro?.description).not.toContain('Chinese-speaking');

    const html = renderToStaticMarkup(
      (await MetroCategoryPageView({ locale: 'en', category: 'medical', site: siteProfiles.arizona }))!
    );
    expect(html).not.toContain('Chinese-speaking doctors');
    expect(html).not.toContain('Other listings');
  });
});
