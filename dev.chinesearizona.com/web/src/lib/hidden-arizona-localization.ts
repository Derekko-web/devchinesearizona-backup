import 'server-only';

import { resolveLocalizedText, resolveLocalizedTextList } from '@/lib/article-localization';
import type { HiddenArizonaEntry, Locale, LocalizedText } from '@/lib/types';

export type HiddenArizonaLocalizedLabel = {
  value: string;
  label: string;
};

export type LocalizedHiddenArizonaCardText = {
  title: string;
  excerpt: string;
  cityLabel?: string;
  tags: string[];
};

export type LocalizedHiddenArizonaDetailText = {
  title: string;
  excerpt: string;
  body: string[];
  cityLabel?: string;
  tags: string[];
  knowBeforeYouGo: string[];
};

function plainLocalizedText(value: string): LocalizedText {
  return { en: value.trim() };
}

async function resolveLocalizedStringList(values: string[], locale: Locale): Promise<string[]> {
  const normalizedValues = values.map((value) => value.trim()).filter(Boolean);
  if (normalizedValues.length === 0) {
    return [];
  }

  return resolveLocalizedTextList(normalizedValues.map(plainLocalizedText), locale);
}

async function resolveLocalizedTagList(values: string[], locale: Locale): Promise<string[]> {
  const normalizedValues = values.map((value) => value.trim()).filter(Boolean);
  if (normalizedValues.length === 0) {
    return [];
  }

  const uniqueValues = Array.from(new Set(normalizedValues));
  const localizedEntries = await Promise.all(
    uniqueValues.map(async (value) => [value, await resolveLocalizedText(plainLocalizedText(value), locale)] as const)
  );
  const localizedByValue = new Map(localizedEntries);

  return normalizedValues.map((value) => localizedByValue.get(value) ?? value);
}

export async function resolveLocalizedHiddenArizonaFilterLabelList(
  values: string[],
  locale: Locale
): Promise<HiddenArizonaLocalizedLabel[]> {
  const labels = await resolveLocalizedStringList(values, locale);

  return values.map((value, index) => ({
    value,
    label: labels[index] ?? value,
  }));
}

export async function resolveLocalizedHiddenArizonaTagLabelList(
  values: string[],
  locale: Locale
): Promise<HiddenArizonaLocalizedLabel[]> {
  const labels = await resolveLocalizedTagList(values, locale);

  return values.map((value, index) => ({
    value,
    label: labels[index] ?? value,
  }));
}

export async function resolveLocalizedHiddenArizonaSummaryText(
  entry: HiddenArizonaEntry,
  locale: Locale
): Promise<Pick<LocalizedHiddenArizonaDetailText, 'title' | 'excerpt'>> {
  const [title, excerpt] = await resolveLocalizedTextList([entry.title, entry.excerpt], locale);

  return {
    title: title ?? entry.title.en,
    excerpt: excerpt ?? entry.excerpt.en,
  };
}

export async function resolveLocalizedHiddenArizonaTitleMap(
  entries: HiddenArizonaEntry[],
  locale: Locale
): Promise<Record<string, string>> {
  if (entries.length === 0) {
    return {};
  }

  const titles = await resolveLocalizedTextList(
    entries.map((entry) => entry.title),
    locale
  );

  return Object.fromEntries(
    entries.map((entry, index) => [entry.slug, titles[index] ?? entry.title.en])
  );
}

export async function resolveLocalizedHiddenArizonaCardTextList(
  entries: HiddenArizonaEntry[],
  locale: Locale
): Promise<Array<{ entry: HiddenArizonaEntry; localizedText: LocalizedHiddenArizonaCardText }>> {
  if (entries.length === 0) {
    return [];
  }

  const localizedTitleAndExcerpt = await resolveLocalizedTextList(
    entries.flatMap((entry) => [entry.title, entry.excerpt]),
    locale
  );
  const localizedCities = await resolveLocalizedStringList(
    entries.flatMap((entry) => (entry.kind === 'place' && entry.city?.trim() ? [entry.city.trim()] : [])),
    locale
  );
  const localizedTags = await resolveLocalizedTagList(
    entries.flatMap((entry) => entry.tags),
    locale
  );

  let textIndex = 0;
  let cityIndex = 0;
  let tagIndex = 0;

  return entries.map((entry) => {
    const title = localizedTitleAndExcerpt[textIndex++] ?? entry.title.en;
    const excerpt = localizedTitleAndExcerpt[textIndex++] ?? entry.excerpt.en;
    const cityLabel =
      entry.kind === 'place' && entry.city?.trim()
        ? localizedCities[cityIndex++] ?? entry.city.trim()
        : undefined;
    const tags = entry.tags.map((tag) => localizedTags[tagIndex++] ?? tag);

    return {
      entry,
      localizedText: {
        title,
        excerpt,
        cityLabel,
        tags,
      },
    };
  });
}

export async function resolveLocalizedHiddenArizonaDetailText(
  entry: HiddenArizonaEntry,
  locale: Locale
): Promise<LocalizedHiddenArizonaDetailText> {
  const detailValues = [
    entry.title,
    entry.excerpt,
    ...entry.body,
    ...(entry.kind === 'place' ? entry.knowBeforeYouGo ?? [] : []),
  ];
  const localizedValues = await resolveLocalizedTextList(detailValues, locale);
  const [localizedCity] = await resolveLocalizedStringList(
    entry.kind === 'place' && entry.city?.trim() ? [entry.city.trim()] : [],
    locale
  );
  const localizedTags = await resolveLocalizedTagList(entry.tags, locale);

  const title = localizedValues[0] ?? entry.title.en;
  const excerpt = localizedValues[1] ?? entry.excerpt.en;
  const bodyStartIndex = 2;
  const bodyEndIndex = bodyStartIndex + entry.body.length;

  return {
    title,
    excerpt,
    body: localizedValues.slice(bodyStartIndex, bodyEndIndex),
    cityLabel: localizedCity ?? entry.city,
    tags: entry.tags.map((tag, index) => localizedTags[index] ?? tag),
    knowBeforeYouGo:
      entry.kind === 'place'
        ? localizedValues.slice(bodyEndIndex, bodyEndIndex + (entry.knowBeforeYouGo?.length ?? 0))
        : [],
  };
}
