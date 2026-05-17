import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { HiddenArizonaPlace } from '@/lib/types';

const originalEnTranslationCachePath = process.env.ARTICLE_EN_TRANSLATION_CACHE_PATH;
const originalZhTranslationCachePath = process.env.ARTICLE_ZH_TRANSLATION_CACHE_PATH;
const enTranslationCachePath = path.join(os.tmpdir(), 'hidden-arizona-localization-en-cache.json');
const zhTranslationCachePath = path.join(os.tmpdir(), 'hidden-arizona-localization-zh-cache.json');

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

function buildSampleEntry(): HiddenArizonaPlace {
  return {
    slug: 'the-flying-v-cabin',
    kind: 'place',
    title: {
      en: 'The Flying V Cabin',
      zh: 'The Flying V Cabin',
    },
    excerpt: {
      en: 'A violent-feud landmark.',
      zh: 'A violent-feud landmark.',
    },
    body: [
      {
        en: 'Paragraph one.',
        zh: 'Paragraph one.',
      },
      {
        en: 'Paragraph two.',
        zh: 'Paragraph two.',
      },
    ],
    heroImage: null,
    gallery: [],
    tags: ['Outsider Architecture', 'Phoenix'],
    sourceName: 'Atlas Obscura',
    sourceUrl: 'https://example.com/atlas',
    sourceId: 'atlas-1',
    publishedAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
    republishedWithPermission: true,
    relatedLinks: [],
    city: 'Phoenix',
    address: '123 Desert Rd',
    coordinates: undefined,
    visitWebsite: undefined,
    directionsUrl: undefined,
    nearbyEntrySlugs: [],
    knowBeforeYouGo: [
      {
        en: 'Bring water.',
        zh: 'Bring water.',
      },
    ],
  };
}

describe('hidden arizona localization runtime behavior', () => {
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

  it('translates fallback filter labels and entry copy in zh mode', async () => {
    process.env.ARTICLE_EN_TRANSLATION_CACHE_PATH = enTranslationCachePath;
    process.env.ARTICLE_ZH_TRANSLATION_CACHE_PATH = zhTranslationCachePath;
    mockTranslationFetch();

    const {
      resolveLocalizedHiddenArizonaCardTextList,
      resolveLocalizedHiddenArizonaDetailText,
      resolveLocalizedHiddenArizonaFilterLabelList,
      resolveLocalizedHiddenArizonaSummaryText,
      resolveLocalizedHiddenArizonaTagLabelList,
      resolveLocalizedHiddenArizonaTitleMap,
    } = await import('@/lib/hidden-arizona-localization');
    const entry = buildSampleEntry();

    const [localizedCardEntries, localizedDetail, localizedFilters, localizedTagFilters, localizedSummary, localizedTitleMap] = await Promise.all([
      resolveLocalizedHiddenArizonaCardTextList([entry], 'zh'),
      resolveLocalizedHiddenArizonaDetailText(entry, 'zh'),
      resolveLocalizedHiddenArizonaFilterLabelList(['Phoenix'], 'zh'),
      resolveLocalizedHiddenArizonaTagLabelList(['Outsider Architecture'], 'zh'),
      resolveLocalizedHiddenArizonaSummaryText(entry, 'zh'),
      resolveLocalizedHiddenArizonaTitleMap([entry], 'zh'),
    ]);

    expect(localizedCardEntries[0]?.localizedText).toEqual({
      title: '翻譯：The Flying V Cabin',
      excerpt: '翻譯：A violent-feud landmark.',
      cityLabel: '翻譯：Phoenix',
      tags: ['翻譯：Outsider Architecture', '翻譯：Phoenix'],
    });
    expect(localizedDetail).toEqual({
      title: '翻譯：The Flying V Cabin',
      excerpt: '翻譯：A violent-feud landmark.',
      body: ['翻譯：Paragraph one.', '翻譯：Paragraph two.'],
      cityLabel: '翻譯：Phoenix',
      tags: ['翻譯：Outsider Architecture', '翻譯：Phoenix'],
      knowBeforeYouGo: ['翻譯：Bring water.'],
    });
    expect(localizedFilters).toEqual([{ value: 'Phoenix', label: '翻譯：Phoenix' }]);
    expect(localizedTagFilters).toEqual([{ value: 'Outsider Architecture', label: '翻譯：Outsider Architecture' }]);
    expect(localizedSummary).toEqual({
      title: '翻譯：The Flying V Cabin',
      excerpt: '翻譯：A violent-feud landmark.',
    });
    expect(localizedTitleMap).toEqual({
      'the-flying-v-cabin': '翻譯：The Flying V Cabin',
    });
  });
});
