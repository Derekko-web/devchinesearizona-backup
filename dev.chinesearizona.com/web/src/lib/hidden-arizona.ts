import fs from 'node:fs';
import path from 'node:path';

import type {
  HiddenArizonaEntry,
  HiddenArizonaFilters,
  HiddenArizonaKind,
  HiddenArizonaPlace,
  LocalizedText,
  ResourceLink,
} from '@/lib/types';

const GENERATED_HIDDEN_ARIZONA_PATH = path.join(process.cwd(), 'src', 'data', 'generated-hidden-arizona.json');

const kindSegments: Record<HiddenArizonaKind, string> = {
  place: 'places',
  story: 'stories',
  list: 'lists',
  itinerary: 'itineraries',
};

type ImportedHiddenArizonaEntry = Omit<
  HiddenArizonaEntry,
  'heroImage' | 'relatedLinks'
> & {
  heroImage?: string | null;
  relatedLinks?: ResourceLink[] | null;
  city?: string | null;
  address?: string | null;
  coordinates?: HiddenArizonaPlace['coordinates'] | null;
  visitWebsite?: string | null;
  directionsUrl?: string | null;
  nearbyEntrySlugs?: string[] | null;
  knowBeforeYouGo?: LocalizedText[] | null;
};

let hiddenArizonaCache:
  | {
      entries: HiddenArizonaEntry[];
      mtimeMs: number;
    }
  | null = null;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeLocalizedText(value: LocalizedText): LocalizedText {
  return {
    en: value.en,
    zh: value.zh ?? value.en,
  };
}

function normalizeEntry(entry: ImportedHiddenArizonaEntry): HiddenArizonaEntry {
  const baseEntry: HiddenArizonaEntry = {
    slug: entry.slug,
    kind: entry.kind,
    title: normalizeLocalizedText(entry.title),
    excerpt: normalizeLocalizedText(entry.excerpt),
    body: entry.body.map(normalizeLocalizedText),
    heroImage: entry.heroImage ?? undefined,
    gallery: entry.gallery ?? [],
    tags: entry.tags ?? [],
    sourceName: entry.sourceName,
    sourceUrl: entry.sourceUrl,
    sourceId: entry.sourceId,
    publishedAt: entry.publishedAt,
    updatedAt: entry.updatedAt,
    republishedWithPermission: entry.republishedWithPermission,
    relatedLinks: entry.relatedLinks ?? [],
    city: entry.city ?? undefined,
    address: entry.address ?? undefined,
    coordinates: entry.coordinates ?? undefined,
    visitWebsite: entry.visitWebsite ?? undefined,
    directionsUrl: entry.directionsUrl ?? undefined,
    nearbyEntrySlugs: entry.nearbyEntrySlugs ?? undefined,
    knowBeforeYouGo: entry.knowBeforeYouGo?.map(normalizeLocalizedText) ?? undefined,
  };

  if (entry.kind !== 'place') {
    return baseEntry;
  }

  return {
    ...baseEntry,
    kind: 'place',
    city: entry.city ?? undefined,
    address: entry.address ?? undefined,
    coordinates: entry.coordinates ?? undefined,
    visitWebsite: entry.visitWebsite ?? undefined,
    directionsUrl: entry.directionsUrl ?? undefined,
    nearbyEntrySlugs: entry.nearbyEntrySlugs ?? [],
    knowBeforeYouGo: (entry.knowBeforeYouGo ?? []).map(normalizeLocalizedText),
  } satisfies HiddenArizonaPlace;
}

function readGeneratedEntries(): HiddenArizonaEntry[] {
  try {
    const stats = fs.statSync(GENERATED_HIDDEN_ARIZONA_PATH);
    if (hiddenArizonaCache?.mtimeMs === stats.mtimeMs) {
      return hiddenArizonaCache.entries;
    }

    const payload = fs.readFileSync(GENERATED_HIDDEN_ARIZONA_PATH, 'utf-8');
    const entries = (JSON.parse(payload) as ImportedHiddenArizonaEntry[]).map(normalizeEntry);
    hiddenArizonaCache = {
      entries,
      mtimeMs: stats.mtimeMs,
    };
    return entries;
  } catch (error) {
    if (hiddenArizonaCache) {
      return hiddenArizonaCache.entries;
    }

    console.error('Unable to load generated Hidden Arizona dataset.', error);
    return [];
  }
}

function matchesSearch(entry: HiddenArizonaEntry, query?: string): boolean {
  if (!query) {
    return true;
  }

  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    entry.title.en,
    entry.title.zh ?? '',
    entry.excerpt.en,
    entry.excerpt.zh ?? '',
    ...entry.body.map((paragraph) => `${paragraph.en} ${paragraph.zh ?? ''}`),
    ...entry.tags,
  ];

  if (entry.kind === 'place') {
    haystack.push(entry.city ?? '', entry.address ?? '');
    haystack.push(...(entry.knowBeforeYouGo ?? []).map((row) => `${row.en} ${row.zh ?? ''}`));
  }

  return haystack.join(' ').toLowerCase().includes(normalizedQuery);
}

function matchesCity(entry: HiddenArizonaEntry, city?: string): boolean {
  if (!city) {
    return true;
  }

  return entry.kind === 'place' && normalize(entry.city ?? '') === normalize(city);
}

function matchesTag(entry: HiddenArizonaEntry, tag?: string): boolean {
  if (!tag) {
    return true;
  }

  return entry.tags.some((item) => normalize(item) === normalize(tag));
}

function matchesKind(entry: HiddenArizonaEntry, kind?: HiddenArizonaFilters['kind']): boolean {
  if (!kind || kind === 'all') {
    return true;
  }

  return entry.kind === kind;
}

function sortEntries(left: HiddenArizonaEntry, right: HiddenArizonaEntry): number {
  const updatedDelta = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  if (updatedDelta !== 0) {
    return updatedDelta;
  }

  const publishedDelta = new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
  if (publishedDelta !== 0) {
    return publishedDelta;
  }

  const kindDelta = Number(right.kind === 'place') - Number(left.kind === 'place');
  if (kindDelta !== 0) {
    return kindDelta;
  }

  return left.title.en.localeCompare(right.title.en, 'en', { sensitivity: 'base' });
}

export function getHiddenArizonaEntries(
  filters: HiddenArizonaFilters = {},
  options: {
    limit?: number;
  } = {}
): HiddenArizonaEntry[] {
  const filtered = readGeneratedEntries()
    .filter((entry) => matchesKind(entry, filters.kind))
    .filter((entry) => matchesSearch(entry, filters.q))
    .filter((entry) => matchesCity(entry, filters.city))
    .filter((entry) => matchesTag(entry, filters.tag))
    .sort(sortEntries);

  if (options.limit) {
    return filtered.slice(0, options.limit);
  }

  return filtered;
}

export function getHiddenArizonaEntryBySlug(
  kind: HiddenArizonaKind,
  slug: string
): HiddenArizonaEntry | undefined {
  return readGeneratedEntries().find((entry) => entry.kind === kind && entry.slug === slug);
}

export function getHiddenArizonaFilterOptions() {
  const entries = readGeneratedEntries();
  const places = entries.filter((entry): entry is HiddenArizonaPlace => entry.kind === 'place');
  const definedCities = places
    .map((entry) => entry.city)
    .filter((value): value is string => Boolean(value));

  return {
    cities: Array.from(new Set(definedCities)).sort((left, right) =>
      left.localeCompare(right)
    ),
    tags: Array.from(new Set(entries.flatMap((entry) => entry.tags)))
      .sort((left, right) => left.localeCompare(right))
      .slice(0, 24),
  };
}

export function getHiddenArizonaFeaturedEntries(limit = 3): HiddenArizonaEntry[] {
  const places = getHiddenArizonaEntries({ kind: 'place' }).filter((entry) => Boolean(entry.heroImage));
  return places.slice(0, limit);
}

export function getHiddenArizonaRelatedEntries(entry: HiddenArizonaEntry, limit = 3): HiddenArizonaEntry[] {
  const allEntries = readGeneratedEntries();
  const prioritizedSlugs = entry.nearbyEntrySlugs ?? [];
  const directMatches = prioritizedSlugs
    .map((slug) => allEntries.find((candidate) => candidate.slug === slug))
    .filter((candidate): candidate is HiddenArizonaEntry => Boolean(candidate));

  if (directMatches.length >= limit) {
    return directMatches.slice(0, limit);
  }

  const fallback = allEntries
    .filter((candidate) => candidate.slug !== entry.slug)
    .filter((candidate) => candidate.kind === 'place')
    .filter((candidate) => candidate.tags.some((tag) => entry.tags.map(normalize).includes(normalize(tag))))
    .sort(sortEntries);

  return [...directMatches, ...fallback.filter((candidate) => !directMatches.some((item) => item.slug === candidate.slug))].slice(
    0,
    limit
  );
}

export function hiddenArizonaKindToSegment(kind: HiddenArizonaKind): string {
  return kindSegments[kind];
}

export function hiddenArizonaSegmentToKind(segment: string): HiddenArizonaKind | undefined {
  return (Object.entries(kindSegments).find(([, value]) => value === segment)?.[0] as HiddenArizonaKind | undefined);
}

export function getHiddenArizonaEntryPath(entry: HiddenArizonaEntry): string {
  return `/hidden-arizona/${hiddenArizonaKindToSegment(entry.kind)}/${entry.slug}`;
}

export function getHiddenArizonaMapPoints(entries: HiddenArizonaPlace[]) {
  const withCoordinates = entries.filter(
    (entry): entry is HiddenArizonaPlace & { coordinates: NonNullable<HiddenArizonaPlace['coordinates']> } =>
      Boolean(entry.coordinates)
  );

  if (withCoordinates.length === 0) {
    return {
      points: [] as Array<HiddenArizonaPlace & { x: number; y: number }>,
      hiddenCount: entries.length,
    };
  }

  const latitudes = withCoordinates.map((entry) => entry.coordinates.lat);
  const longitudes = withCoordinates.map((entry) => entry.coordinates.lng);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  const points = withCoordinates.map((entry) => {
    const latRange = maxLat - minLat || 1;
    const lngRange = maxLng - minLng || 1;
    const x = ((entry.coordinates.lng - minLng) / lngRange) * 100;
    const y = 100 - ((entry.coordinates.lat - minLat) / latRange) * 100;

    return {
      ...entry,
      x: Math.min(Math.max(x, 6), 94),
      y: Math.min(Math.max(y, 8), 92),
    };
  });

  return {
    points,
    hiddenCount: entries.length - points.length,
  };
}
