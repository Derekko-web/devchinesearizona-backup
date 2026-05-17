import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Business } from '@/lib/types';

const originalEnTranslationCachePath = process.env.ARTICLE_EN_TRANSLATION_CACHE_PATH;
const originalZhTranslationCachePath = process.env.ARTICLE_ZH_TRANSLATION_CACHE_PATH;
const enTranslationCachePath = path.join(os.tmpdir(), 'business-localization-en-cache.json');
const zhTranslationCachePath = path.join(os.tmpdir(), 'business-localization-zh-cache.json');

function businessFixture(overrides: Partial<Business> = {}): Business {
  return {
    id: 'desert-calligraphy',
    slug: 'desert-calligraphy',
    name: { en: 'Desert Calligraphy Studio' },
    categorySlug: 'education',
    city: 'Phoenix',
    region: 'Greater Phoenix',
    address: '123 Grand Ave, Phoenix, AZ 85003',
    serviceAreaText: undefined,
    phone: '(602) 555-0100',
    email: 'hello@desertcalligraphy.com',
    website: 'https://desertcalligraphy.com',
    heroImage: undefined,
    gallery: [],
    shortDescription: { en: 'Trusted calligraphy classes for Phoenix families.' },
    description: { en: 'Trusted calligraphy classes for Phoenix families.' },
    services: [],
    languages: ['English'],
    searchAliases: [],
    verified: false,
    bilingual: true,
    newcomerFriendly: true,
    sponsored: false,
    featured: false,
    ownerProfileSlug: undefined,
    rating: 4.8,
    reviewCount: 12,
    lastUpdated: '2026-04-18T00:00:00.000Z',
    status: 'live',
    verificationState: 'unverified',
    hours: [],
    coordinates: undefined,
    ...overrides,
  };
}

function mockTranslationFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = new URL(String(input));
      const targetLanguage = url.searchParams.get('tl');
      const texts = (url.searchParams.get('q') ?? '').split('<<<CA_ZH_SPLIT>>>');
      const translated = texts
        .map((text) => (targetLanguage === 'en' ? `Translated: ${text}` : `翻譯：${text}`))
        .join('<<<CA_ZH_SPLIT>>>');

      return {
        ok: true,
        status: 200,
        json: async () => [[[translated]]],
      };
    })
  );
}

describe('business localization helpers', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();

    if (originalEnTranslationCachePath) {
      process.env.ARTICLE_EN_TRANSLATION_CACHE_PATH = originalEnTranslationCachePath;
    } else {
      delete process.env.ARTICLE_EN_TRANSLATION_CACHE_PATH;
    }

    if (originalZhTranslationCachePath) {
      process.env.ARTICLE_ZH_TRANSLATION_CACHE_PATH = originalZhTranslationCachePath;
    } else {
      delete process.env.ARTICLE_ZH_TRANSLATION_CACHE_PATH;
    }

    [enTranslationCachePath, zhTranslationCachePath].forEach((cachePath) => {
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
      }
    });
  });

  it('fills missing Chinese business descriptions from English source text', async () => {
    process.env.ARTICLE_EN_TRANSLATION_CACHE_PATH = enTranslationCachePath;
    process.env.ARTICLE_ZH_TRANSLATION_CACHE_PATH = zhTranslationCachePath;
    mockTranslationFetch();
    const { resolveLocalizedBusinessDetailText } = await import('@/lib/business-localization');

    const localized = await resolveLocalizedBusinessDetailText(businessFixture(), 'zh');

    expect(localized.shortDescription).toBe('翻譯：Trusted calligraphy classes for Phoenix families.');
    expect(localized.description).toBe('翻譯：Trusted calligraphy classes for Phoenix families.');
  });

  it('localizes business service area labels and service chips in Chinese mode', async () => {
    process.env.ARTICLE_EN_TRANSLATION_CACHE_PATH = enTranslationCachePath;
    process.env.ARTICLE_ZH_TRANSLATION_CACHE_PATH = zhTranslationCachePath;
    mockTranslationFetch();
    const { resolveLocalizedBusinessCardTextList, resolveLocalizedBusinessDetailText } = await import(
      '@/lib/business-localization'
    );
    const business = businessFixture({
      address: undefined,
      serviceAreaText: 'Phoenix Metro Area',
      services: [
        { en: 'Chinese-Speaking Realtor' },
        { en: 'Phoenix Metro Area' },
        { en: 'Investment Real Estate' },
      ],
    });

    const [localizedCard] = await resolveLocalizedBusinessCardTextList([business], 'zh');
    const localizedDetail = await resolveLocalizedBusinessDetailText(business, 'zh');

    expect(localizedCard?.localizedText.locationLabel).toBe('翻譯：Phoenix Metro Area');
    expect(localizedCard?.localizedText.serviceHighlights).toEqual([
      '翻譯：Chinese-Speaking Realtor',
      '翻譯：Phoenix Metro Area',
      '翻譯：Investment Real Estate',
    ]);
    expect(localizedDetail.locationLabel).toBe('翻譯：Phoenix Metro Area');
    expect(localizedDetail.services).toEqual([
      '翻譯：Chinese-Speaking Realtor',
      '翻譯：Phoenix Metro Area',
      '翻譯：Investment Real Estate',
    ]);
  });

  it('fills missing English business descriptions from Chinese source text', async () => {
    process.env.ARTICLE_EN_TRANSLATION_CACHE_PATH = enTranslationCachePath;
    process.env.ARTICLE_ZH_TRANSLATION_CACHE_PATH = zhTranslationCachePath;
    mockTranslationFetch();
    const { resolveLocalizedBusinessCardTextList, resolveLocalizedBusinessDetailText } = await import(
      '@/lib/business-localization'
    );
    const business = businessFixture({
      address: undefined,
      serviceAreaText: '鳳凰城大都會區',
      shortDescription: { en: '鳳凰城書法與水墨課程。' },
      description: { en: '鳳凰城書法與水墨課程。' },
      services: [{ en: '中文房地產顧問。' }],
    });

    const [localizedCard] = await resolveLocalizedBusinessCardTextList([business], 'en');
    const localizedDetail = await resolveLocalizedBusinessDetailText(business, 'en');

    expect(localizedCard?.localizedText.shortDescription).toBe('Translated: 鳳凰城書法與水墨課程。');
    expect(localizedCard?.localizedText.locationLabel).toBe('Translated: 鳳凰城大都會區');
    expect(localizedCard?.localizedText.serviceHighlights).toEqual(['Translated: 中文房地產顧問。']);
    expect(localizedDetail.description).toBe('Translated: 鳳凰城書法與水墨課程。');
    expect(localizedDetail.services).toEqual(['Translated: 中文房地產顧問。']);
  });
});
