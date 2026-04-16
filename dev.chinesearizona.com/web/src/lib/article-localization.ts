import 'server-only';

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { Article, Locale, LocalizedText } from '@/lib/types';

const CJK_PATTERN = /[\u3400-\u9fff\u3040-\u30ff]/u;
const TRANSLATION_SPLIT_TOKEN = '<<<CA_TRANSLATION_SPLIT_TOKEN>>>';
const MAX_TRANSLATION_BATCH_CHAR_COUNT = 1200;
const TRANSLATION_CACHE_PATH = path.join(
  process.cwd(),
  'data',
  'article-ingest-staging',
  'english-translation-cache.json'
);

type TranslationCacheEntry = {
  sourceText: string;
  translatedText: string;
  updatedAt: string;
};

type TranslationCache = Record<string, TranslationCacheEntry>;

let translationCache: TranslationCache | null = null;
let translationCacheLoadPromise: Promise<TranslationCache> | null = null;
let translationCacheWriteQueue: Promise<void> = Promise.resolve();

function cacheKey(text: string): string {
  return createHash('sha1').update(text).digest('hex');
}

function normalizeEnglishValue(value: LocalizedText): string {
  return value.en.trim();
}

function normalizeChineseValue(value: LocalizedText): string {
  return (value.zh ?? value.en).trim();
}

function needsEnglishTranslation(value: LocalizedText): boolean {
  const english = normalizeEnglishValue(value);
  if (!english) {
    return false;
  }

  return CJK_PATTERN.test(english);
}

async function loadTranslationCache(): Promise<TranslationCache> {
  if (translationCache) {
    return translationCache;
  }

  if (!translationCacheLoadPromise) {
    translationCacheLoadPromise = (async () => {
      try {
        const payload = await fs.readFile(TRANSLATION_CACHE_PATH, 'utf-8');
        translationCache = JSON.parse(payload) as TranslationCache;
      } catch {
        translationCache = {};
      }

      return translationCache;
    })();
  }

  return translationCacheLoadPromise;
}

async function saveTranslationCache(cache: TranslationCache): Promise<void> {
  translationCache = cache;
  translationCacheWriteQueue = translationCacheWriteQueue.then(async () => {
    await fs.mkdir(path.dirname(TRANSLATION_CACHE_PATH), { recursive: true });
    await fs.writeFile(
      TRANSLATION_CACHE_PATH,
      JSON.stringify(cache, null, 2) + '\n',
      'utf-8'
    );
  });

  await translationCacheWriteQueue;
}

async function requestEnglishTranslationsBatch(texts: string[]): Promise<string[]> {
  const joined = texts.join(`\n${TRANSLATION_SPLIT_TOKEN}\n`);
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'auto');
  url.searchParams.set('tl', 'en');
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', joined);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'ChineseArizonaArticleSync/1.0',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Translation request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as unknown[];
  const translated = Array.isArray(payload?.[0])
    ? (payload[0] as Array<[string]>)
        .map((part) => (Array.isArray(part) && typeof part[0] === 'string' ? part[0] : ''))
        .join('')
    : joined;
  const parts = translated.split(TRANSLATION_SPLIT_TOKEN).map((part) => part.trim());

  if (parts.length !== texts.length) {
    throw new Error('Translation batch split mismatch.');
  }

  return parts;
}

async function requestEnglishTranslations(texts: string[]): Promise<string[]> {
  if (texts.length === 0) {
    return [];
  }

  try {
    return await requestEnglishTranslationsBatch(texts);
  } catch (error) {
    if (texts.length === 1) {
      console.error('English translation failed; falling back to original text.', error);
      return texts;
    }

    const midpoint = Math.ceil(texts.length / 2);
    const left = await requestEnglishTranslations(texts.slice(0, midpoint));
    const right = await requestEnglishTranslations(texts.slice(midpoint));
    return [...left, ...right];
  }
}

function chunkTextsForTranslation(texts: string[]): string[][] {
  const batches: string[][] = [];
  let currentBatch: string[] = [];
  let currentSize = 0;

  texts.forEach((text) => {
    const nextSize =
      currentSize + text.length + (currentBatch.length > 0 ? TRANSLATION_SPLIT_TOKEN.length + 2 : 0);

    if (currentBatch.length > 0 && nextSize > MAX_TRANSLATION_BATCH_CHAR_COUNT) {
      batches.push(currentBatch);
      currentBatch = [text];
      currentSize = text.length;
      return;
    }

    currentBatch.push(text);
    currentSize = nextSize;
  });

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

async function translateMissingEnglish(texts: string[]): Promise<Map<string, string>> {
  const cache = await loadTranslationCache();
  const uniqueTexts = Array.from(new Set(texts.filter(Boolean)));
  const pendingTexts = uniqueTexts.filter((text) => !cache[cacheKey(text)]);

  if (pendingTexts.length > 0) {
    const nextCache = { ...cache };
    const batches = chunkTextsForTranslation(pendingTexts);

    for (const batch of batches) {
      const translatedTexts = await requestEnglishTranslations(batch);

      batch.forEach((text, index) => {
        nextCache[cacheKey(text)] = {
          sourceText: text,
          translatedText: translatedTexts[index] || text,
          updatedAt: new Date().toISOString(),
        };
      });
    }

    if (batches.length > 0) {
      await saveTranslationCache(nextCache);
      translationCache = nextCache;
    }
  }

  const resolved = new Map<string, string>();
  const latestCache = await loadTranslationCache();

  uniqueTexts.forEach((text) => {
    resolved.set(text, latestCache[cacheKey(text)]?.translatedText || text);
  });

  return resolved;
}

export async function resolveLocalizedText(value: LocalizedText, locale: Locale): Promise<string> {
  if (locale === 'zh') {
    return normalizeChineseValue(value);
  }

  if (!needsEnglishTranslation(value)) {
    return normalizeEnglishValue(value);
  }

  const sourceText = normalizeChineseValue(value);
  if (!sourceText) {
    return normalizeEnglishValue(value);
  }

  const translated = await translateMissingEnglish([sourceText]);
  return translated.get(sourceText) || normalizeEnglishValue(value);
}

export async function resolveLocalizedTextList(
  values: LocalizedText[],
  locale: Locale
): Promise<string[]> {
  if (locale === 'zh') {
    return values.map((value) => normalizeChineseValue(value));
  }

  const sourceTextsToTranslate = values
    .filter((value) => needsEnglishTranslation(value))
    .map((value) => normalizeChineseValue(value))
    .filter(Boolean);
  const translatedTexts =
    sourceTextsToTranslate.length > 0
      ? await translateMissingEnglish(sourceTextsToTranslate)
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
  const [title, excerpt, ...body] = await resolveLocalizedTextList(
    [article.title, article.excerpt, ...article.body],
    locale
  );

  return {
    title,
    excerpt,
    body,
  };
}
