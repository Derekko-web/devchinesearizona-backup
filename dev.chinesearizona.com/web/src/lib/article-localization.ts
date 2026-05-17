import 'server-only';

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { Article, Locale, LocalizedText } from '@/lib/types';

const CJK_PATTERN = /[\u3400-\u9fff\u3040-\u30ff]/u;
const ENGLISH_TRANSLATION_CACHE_PATH =
  process.env.ARTICLE_EN_TRANSLATION_CACHE_PATH ??
  path.join(
    process.cwd(),
    'data',
    'article-ingest-staging',
    'english-translation-cache.json'
  );
const CHINESE_TRANSLATION_CACHE_PATH =
  process.env.ARTICLE_ZH_TRANSLATION_CACHE_PATH ??
  path.join(
    process.cwd(),
    'data',
    'article-ingest-staging',
    'chinese-translation-cache.json'
  );
const TRANSLATION_SEPARATOR = '<<<CA_ZH_SPLIT>>>';
const TRANSLATION_BATCH_MAX_CHARS = 1600;

type TranslationCacheState = {
  cache: TranslationCache | null;
  loadPromise: Promise<TranslationCache> | null;
  path: string;
};

const englishTranslationState: TranslationCacheState = {
  cache: null,
  loadPromise: null,
  path: ENGLISH_TRANSLATION_CACHE_PATH,
};

const chineseTranslationState: TranslationCacheState = {
  cache: null,
  loadPromise: null,
  path: CHINESE_TRANSLATION_CACHE_PATH,
};

type TranslationResponsePayload = Array<Array<[string, ...unknown[]]>>;

type TranslationCacheEntry = {
  sourceText: string;
  translatedText: string;
  updatedAt: string;
};

type TranslationCache = Record<string, TranslationCacheEntry>;

const articleTextCache = new Map<
  string,
  Promise<{
    title: string;
    excerpt: string;
    body: string[];
  }>
>();

function cacheKey(text: string): string {
  return createHash('sha1').update(text).digest('hex');
}

function normalizeEnglishValue(value: LocalizedText): string {
  return value.en.trim();
}

function normalizeChineseValue(value: LocalizedText): string {
  return (value.zh ?? value.en).trim();
}

function needsChineseTranslation(value: LocalizedText): boolean {
  const english = normalizeEnglishValue(value);
  if (!english || CJK_PATTERN.test(english)) {
    return false;
  }

  const chinese = value.zh?.trim();
  return !chinese || chinese === english;
}

function needsEnglishTranslation(value: LocalizedText): boolean {
  const english = normalizeEnglishValue(value);
  if (!english) {
    return false;
  }

  return CJK_PATTERN.test(english);
}

async function loadTranslationCacheState(state: TranslationCacheState): Promise<TranslationCache> {
  if (state.cache) {
    return state.cache;
  }

  if (!state.loadPromise) {
    state.loadPromise = (async () => {
      try {
        const payload = await fs.readFile(state.path, 'utf-8');
        state.cache = JSON.parse(payload) as TranslationCache;
      } catch {
        state.cache = {};
      }

      return state.cache;
    })();
  }

  return state.loadPromise;
}

async function saveTranslationCacheState(state: TranslationCacheState): Promise<void> {
  if (!state.cache) {
    return;
  }

  await fs.mkdir(path.dirname(state.path), { recursive: true });
  await fs.writeFile(state.path, `${JSON.stringify(state.cache, null, 2)}\n`, 'utf-8');
}

async function fetchChineseTranslationBatch(texts: string[]): Promise<string[]> {
  if (texts.length === 0) {
    return [];
  }

  const query = encodeURIComponent(texts.join(TRANSLATION_SEPARATOR));
  const response = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-TW&dt=t&q=${query}`,
    {
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error(`Chinese translation request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as TranslationResponsePayload;
  const translated = (Array.isArray(payload?.[0]) ? payload[0] : [])
    .map((segment) => (Array.isArray(segment) && typeof segment[0] === 'string' ? segment[0] : ''))
    .join('');
  const parts = translated.split(TRANSLATION_SEPARATOR).map((part) => part.trim());

  if (parts.length !== texts.length) {
    throw new Error('Chinese translation batch split mismatch.');
  }

  return parts;
}

async function fetchEnglishTranslationBatch(texts: string[]): Promise<string[]> {
  if (texts.length === 0) {
    return [];
  }

  const query = encodeURIComponent(texts.join(TRANSLATION_SEPARATOR));
  const response = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${query}`,
    {
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error(`English translation request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as TranslationResponsePayload;
  const translated = (Array.isArray(payload?.[0]) ? payload[0] : [])
    .map((segment) => (Array.isArray(segment) && typeof segment[0] === 'string' ? segment[0] : ''))
    .join('');
  const parts = translated.split(TRANSLATION_SEPARATOR).map((part) => part.trim());

  if (parts.length !== texts.length) {
    throw new Error('English translation batch split mismatch.');
  }

  return parts;
}

async function resolveChineseTranslations(texts: string[]): Promise<Map<string, string>> {
  const cache = await loadTranslationCacheState(chineseTranslationState);
  const uniqueTexts = Array.from(new Set(texts.filter(Boolean)));
  const missingTexts = uniqueTexts.filter((text) => !cache[cacheKey(text)]);

  if (missingTexts.length > 0) {
    const translatedTexts: string[] = [];
    let batch: string[] = [];
    let batchLength = 0;

    try {
      for (const text of missingTexts) {
        const projectedLength = batchLength + text.length + TRANSLATION_SEPARATOR.length;
        if (batch.length > 0 && projectedLength > TRANSLATION_BATCH_MAX_CHARS) {
          translatedTexts.push(...(await fetchChineseTranslationBatch(batch)));
          batch = [];
          batchLength = 0;
        }

        batch.push(text);
        batchLength += text.length + TRANSLATION_SEPARATOR.length;
      }

      if (batch.length > 0) {
        translatedTexts.push(...(await fetchChineseTranslationBatch(batch)));
      }

      missingTexts.forEach((text, index) => {
        cache[cacheKey(text)] = {
          sourceText: text,
          translatedText: translatedTexts[index] ?? text,
          updatedAt: new Date().toISOString(),
        };
      });

      await saveTranslationCacheState(chineseTranslationState);
    } catch {
      // Leave missing values uncached so future requests can retry translation.
    }
  }

  const resolved = new Map<string, string>();
  uniqueTexts.forEach((text) => {
    resolved.set(text, cache[cacheKey(text)]?.translatedText || text);
  });

  return resolved;
}

async function resolveEnglishTranslations(texts: string[]): Promise<Map<string, string>> {
  const cache = await loadTranslationCacheState(englishTranslationState);
  const uniqueTexts = Array.from(new Set(texts.filter(Boolean)));
  const missingTexts = uniqueTexts.filter((text) => !cache[cacheKey(text)]);

  if (missingTexts.length > 0) {
    const translatedTexts: string[] = [];
    let batch: string[] = [];
    let batchLength = 0;

    try {
      for (const text of missingTexts) {
        const projectedLength = batchLength + text.length + TRANSLATION_SEPARATOR.length;
        if (batch.length > 0 && projectedLength > TRANSLATION_BATCH_MAX_CHARS) {
          translatedTexts.push(...(await fetchEnglishTranslationBatch(batch)));
          batch = [];
          batchLength = 0;
        }

        batch.push(text);
        batchLength += text.length + TRANSLATION_SEPARATOR.length;
      }

      if (batch.length > 0) {
        translatedTexts.push(...(await fetchEnglishTranslationBatch(batch)));
      }

      missingTexts.forEach((text, index) => {
        cache[cacheKey(text)] = {
          sourceText: text,
          translatedText: translatedTexts[index] ?? text,
          updatedAt: new Date().toISOString(),
        };
      });

      await saveTranslationCacheState(englishTranslationState);
    } catch {
      // Leave missing values uncached so future requests can retry translation.
    }
  }

  const resolved = new Map<string, string>();
  uniqueTexts.forEach((text) => {
    resolved.set(text, cache[cacheKey(text)]?.translatedText || text);
  });

  return resolved;
}

export async function resolveLocalizedText(value: LocalizedText, locale: Locale): Promise<string> {
  if (locale === 'zh') {
    if (!needsChineseTranslation(value)) {
      return normalizeChineseValue(value);
    }

    const english = normalizeEnglishValue(value);
    const translated = await resolveChineseTranslations([english]);
    return translated.get(english) || normalizeChineseValue(value);
  }

  if (!needsEnglishTranslation(value)) {
    return normalizeEnglishValue(value);
  }

  const sourceText = normalizeChineseValue(value);
  if (!sourceText) {
    return normalizeEnglishValue(value);
  }

  const translated = await resolveEnglishTranslations([sourceText]);
  return translated.get(sourceText) || normalizeEnglishValue(value);
}

export async function resolveLocalizedTextList(
  values: LocalizedText[],
  locale: Locale
): Promise<string[]> {
  if (locale === 'zh') {
    const sourceTextsToTranslate = values
      .filter((value) => needsChineseTranslation(value))
      .map((value) => normalizeEnglishValue(value))
      .filter(Boolean);
    const translatedTexts =
      sourceTextsToTranslate.length > 0
        ? await resolveChineseTranslations(sourceTextsToTranslate)
        : new Map<string, string>();

    return values.map((value) => {
      if (!needsChineseTranslation(value)) {
        return normalizeChineseValue(value);
      }

      const english = normalizeEnglishValue(value);
      return translatedTexts.get(english) || normalizeChineseValue(value);
    });
  }

  const sourceTextsToTranslate = values
    .filter((value) => needsEnglishTranslation(value))
    .map((value) => normalizeChineseValue(value))
    .filter(Boolean);
  const translatedTexts =
    sourceTextsToTranslate.length > 0
      ? await resolveEnglishTranslations(sourceTextsToTranslate)
      : new Map<string, string>();

  return values.map((value) => {
    if (!needsEnglishTranslation(value)) {
      return normalizeEnglishValue(value);
    }

    const sourceText = normalizeChineseValue(value);
    return translatedTexts.get(sourceText) || normalizeEnglishValue(value);
  });
}

export async function resolveArticleText(
  article: Article,
  locale: Locale
): Promise<{
  title: string;
  excerpt: string;
  body: string[];
}> {
  const articleValues = [article.title, article.excerpt, ...article.body];
  const shouldBypassArticleCache = articleValues.some((value) =>
    locale === 'zh' ? needsChineseTranslation(value) : needsEnglishTranslation(value)
  );
  const cacheKey = [
    locale,
    article.slug,
    article.updatedAt ?? article.publishedAt,
    article.body.length,
  ].join(':');
  const cached = shouldBypassArticleCache ? null : articleTextCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const pending = (async () => {
    const [title, excerpt, ...body] = await resolveLocalizedTextList(
      [article.title, article.excerpt, ...article.body],
      locale
    );

    return {
      title,
      excerpt,
      body,
    };
  })();

  if (shouldBypassArticleCache) {
    return pending;
  }

  articleTextCache.set(cacheKey, pending);

  try {
    return await pending;
  } catch (error) {
    articleTextCache.delete(cacheKey);
    throw error;
  }
}
