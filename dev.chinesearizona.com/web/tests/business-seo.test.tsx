import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  buildBusinessFallbackDescription,
  buildBusinessSeoTitle,
  getBusinessSchemaType,
  getBusinessTypeLabel,
  speaksChinese,
} from '@/lib/business-seo';
import { siteProfiles } from '@/lib/site-config';
import type { Business } from '@/lib/types';

type SeoBusiness = Pick<Business, 'name' | 'city' | 'categorySlug' | 'languages'>;

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

vi.mock('@/components/forms/ReportIssueForm', () => ({
  ReportIssueForm: ({ entitySlug }: { entitySlug: string }) => <div data-report-issue={entitySlug} />,
}));

const realtor: SeoBusiness = {
  name: { en: 'Hedy Li', zh: 'Hedy Li' },
  city: 'Phoenix',
  categorySlug: 'real-estate',
  languages: ['English', 'Mandarin'],
};

const clinic: SeoBusiness = {
  name: { en: 'Desert Clinic', zh: '沙漠診所' },
  city: 'Tucson',
  categorySlug: 'medical',
  languages: ['English'],
};

describe('business search titles', () => {
  it('names the category, city and Chinese-speaking service in English', () => {
    expect(buildBusinessSeoTitle(realtor, siteProfiles.arizona, 'en')).toBe(
      'Hedy Li – Chinese-Speaking Real Estate in Phoenix, AZ | ChineseArizona'
    );
  });

  it('uses the Chinese city name and 中文服務 on Chinese pages', () => {
    expect(buildBusinessSeoTitle(realtor, siteProfiles.arizona, 'zh')).toBe(
      'Hedy Li｜鳳凰城房地產・中文服務 | ChineseArizona'
    );
    expect(buildBusinessSeoTitle(clinic, siteProfiles.arizona, 'zh')).toBe('沙漠診所｜土桑醫療保健 | ChineseArizona');
  });

  it('never claims Chinese-speaking service the listing does not state', () => {
    expect(speaksChinese(clinic)).toBe(false);
    expect(buildBusinessSeoTitle(clinic, siteProfiles.arizona, 'en')).toBe(
      'Desert Clinic – Medical & Health Care in Tucson, AZ | ChineseArizona'
    );
    // "Traditional Chinese" is a written language (menus), not a spoken one.
    expect(speaksChinese({ languages: ['English', 'Traditional Chinese'] })).toBe(false);
    expect(speaksChinese({ languages: ['Cantonese'] })).toBe(true);
    expect(speaksChinese({ languages: [] })).toBe(false);
  });

  it('ignores the bilingual flag, which is a scraper default and not evidence', () => {
    const flaggedRestaurant = { ...clinic, categorySlug: 'dining', bilingual: true };
    expect(speaksChinese(flaggedRestaurant)).toBe(false);
    expect(buildBusinessSeoTitle(flaggedRestaurant, siteProfiles.arizona, 'en')).toBe(
      'Desert Clinic – Restaurant & Food in Tucson, AZ | ChineseArizona'
    );
  });

  it('handles a missing city and an unknown category', () => {
    expect(buildBusinessSeoTitle({ ...clinic, city: ' ' }, siteProfiles.arizona, 'en')).toBe(
      'Desert Clinic – Medical & Health Care | ChineseArizona'
    );
    expect(getBusinessTypeLabel('moving', 'zh')).toBe('搬家服務');
    expect(getBusinessTypeLabel('no-such-category', 'en')).toBe('Local Business');
  });

  it('writes a factual fallback description in each language', () => {
    expect(buildBusinessFallbackDescription(clinic, siteProfiles.arizona, 'en')).toBe(
      'Desert Clinic: medical & health care in Tucson, AZ. See the address, phone, hours, and languages spoken.'
    );
    expect(buildBusinessFallbackDescription(clinic, siteProfiles.arizona, 'zh')).toBe(
      '沙漠診所：土桑醫療保健。查看地址、電話、營業時間與服務語言。'
    );
  });

  it('maps categories to schema.org LocalBusiness subtypes', () => {
    expect(getBusinessSchemaType('real-estate')).toBe('RealEstateAgent');
    expect(getBusinessSchemaType('medical')).toBe('MedicalBusiness');
    expect(getBusinessSchemaType('dining')).toBe('FoodEstablishment');
    expect(getBusinessSchemaType('education')).toBe('LocalBusiness');
  });
});

describe('business page structured data', () => {
  function jsonLdBlocks(html: string) {
    return Array.from(html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)).map((match) =>
      JSON.parse(match[1])
    );
  }

  it('uses a specific business type, the canonical URL and a breadcrumb trail', async () => {
    const { BusinessDetailPageView } = await import('@/views/site-pages');

    const html = renderToStaticMarkup(await BusinessDetailPageView({ locale: 'en', slug: 'grace-tung-gilbert' }));
    const blocks = jsonLdBlocks(html);
    const business = blocks.find((block) => block['@type'] === 'RealEstateAgent');
    const breadcrumb = blocks.find((block) => block['@type'] === 'BreadcrumbList');

    expect(business?.url).toBe('https://chinesearizona.com/business/grace-tung-gilbert');
    expect(breadcrumb?.itemListElement.map((item: { item: string }) => item.item)).toEqual([
      'https://chinesearizona.com',
      'https://chinesearizona.com/business',
      'https://chinesearizona.com/business/category/real-estate',
      'https://chinesearizona.com/business/grace-tung-gilbert',
    ]);
  });

  it('points Chinese structured data at the /zh URLs with Chinese names', async () => {
    const { BusinessDetailPageView } = await import('@/views/site-pages');

    const html = renderToStaticMarkup(await BusinessDetailPageView({ locale: 'zh', slug: 'grace-tung-gilbert' }));
    const breadcrumb = jsonLdBlocks(html).find((block) => block['@type'] === 'BreadcrumbList');

    expect(breadcrumb?.itemListElement[0]).toMatchObject({ name: '首頁', item: 'https://chinesearizona.com/zh' });
    expect(breadcrumb?.itemListElement[2].item).toBe('https://chinesearizona.com/zh/business/category/real-estate');
  });
});
