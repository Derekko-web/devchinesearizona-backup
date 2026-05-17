import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnTranslationCachePath = process.env.ARTICLE_EN_TRANSLATION_CACHE_PATH;
const originalZhTranslationCachePath = process.env.ARTICLE_ZH_TRANSLATION_CACHE_PATH;
const enTranslationCachePath = path.join(os.tmpdir(), 'article-localization-en-cache.json');
const zhTranslationCachePath = path.join(os.tmpdir(), 'article-localization-zh-cache.json');

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

describe('article localization runtime behavior', () => {
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

  it('fetches English translations when the English slot contains Chinese copy', async () => {
    process.env.ARTICLE_EN_TRANSLATION_CACHE_PATH = enTranslationCachePath;
    process.env.ARTICLE_ZH_TRANSLATION_CACHE_PATH = zhTranslationCachePath;
    mockTranslationFetch();
    const { resolveLocalizedText } = await import('@/lib/article-localization');

    const text = {
      en: '這是一段新的即時測試文字，現在應該在 English 頁面即時翻譯。',
      zh: '這是一段新的即時測試文字，現在應該在 English 頁面即時翻譯。',
    };

    await expect(resolveLocalizedText(text, 'en')).resolves.toBe(`Translated: ${text.zh}`);
  });

  it('preserves normal English values without touching the translation cache path', async () => {
    process.env.ARTICLE_EN_TRANSLATION_CACHE_PATH = enTranslationCachePath;
    process.env.ARTICLE_ZH_TRANSLATION_CACHE_PATH = zhTranslationCachePath;
    const { resolveLocalizedTextList } = await import('@/lib/article-localization');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const values = await resolveLocalizedTextList(
      [
        { en: 'Trusted local directory', zh: '值得信賴的本地商家名錄' },
        { en: 'Community calendar', zh: '社區活動日曆' },
      ],
      'en'
    );

    expect(values).toEqual(['Trusted local directory', 'Community calendar']);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
