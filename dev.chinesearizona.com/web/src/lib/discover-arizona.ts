import 'server-only';

import { discoverSeedArticles, discoverSeedQueue } from '@/data/discover-seed';
import {
  discoveryCategories,
  isDiscoveryCategory,
  isDiscoveryQueueStatus,
} from '@/lib/discovery-taxonomy';
import { getSupabaseServiceClient } from '@/lib/supabase';
import type {
  DiscoverAdminQueueItem,
  DiscoverArticle,
  DiscoverVideoCandidate,
  DiscoveryCategory,
  DiscoveryQueueStatus,
  LocalizedText,
} from '@/lib/types';

export { discoveryCategories, discoveryQueueStatuses } from '@/lib/discovery-taxonomy';

type DiscoverVideoCandidateRow = {
  id: string;
  source_url: string;
  post_id: string;
  creator_handle: string | null;
  creator_profile_url: string | null;
  discovered_categories: string[] | null;
  source_surface: string;
  first_seen_at: string;
  last_seen_at: string;
  queue_status: string;
  collector_run_id: string | null;
  collector_notes: string | null;
  missing_run_count: number | null;
};

type DiscoverArticleRow = {
  id: string;
  candidate_id: string;
  slug: string;
  primary_category: string;
  title_en: string;
  title_zh: string;
  excerpt_en: string;
  excerpt_zh: string;
  body_en: string;
  body_zh: string;
  hero_image_url: string | null;
  city: string | null;
  region: string | null;
  tags: string[] | null;
  related_business_slugs: string[] | null;
  related_hidden_arizona_slugs: string[] | null;
  published_at: string | null;
  updated_at: string;
  is_featured: boolean | null;
  embed_enabled: boolean | null;
};

type DiscoverArticleInput = {
  candidateId: string;
  slug?: string;
  primaryCategory: DiscoveryCategory;
  titleEn: string;
  titleZh: string;
  excerptEn: string;
  excerptZh: string;
  bodyEn: string;
  bodyZh: string;
  heroImageUrl?: string;
  city?: string;
  region?: string;
  tags: string[];
  relatedBusinessSlugs: string[];
  relatedHiddenArizonaSlugs: string[];
  isFeatured: boolean;
  embedEnabled: boolean;
  queueStatus: DiscoveryQueueStatus;
};

const DISCOVER_HERO_IMAGE_OVERRIDES: Record<string, string> = {
  'https://cache.marriott.com/is/image/marriotts7prod/tx-flgsx-sky-rock-patio-37842%3AClassic-Hor?fit=constrain&wid=1336':
    'https://cache.marriott.com/is/image/marriotts7prod/tx-flgsx-sky-rock-patio-37842-77570%3AFeature-Hor?fit=constrain&wid=1920',
};

function normalizeCategory(value: string): DiscoveryCategory {
  return isDiscoveryCategory(value)
    ? value
    : 'things_to_do';
}

function normalizeQueueStatus(value: string): DiscoveryQueueStatus {
  return isDiscoveryQueueStatus(value)
    ? value
    : 'queued';
}

function splitBody(value: string, fallbackValue: string): LocalizedText[] {
  const englishParagraphs = value
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const fallbackParagraphs = fallbackValue
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return englishParagraphs.map((paragraph, index) => ({
    en: paragraph,
    zh: fallbackParagraphs[index] ?? fallbackParagraphs[0] ?? paragraph,
  }));
}

function joinBody(body: LocalizedText[], locale: 'en' | 'zh'): string {
  return body
    .map((paragraph) => {
      const value = locale === 'zh' ? paragraph.zh ?? paragraph.en : paragraph.en;
      return value.trim();
    })
    .filter(Boolean)
    .join('\n\n');
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function parseTikTokPostId(sourceUrl: string): string | null {
  const match = sourceUrl.match(/\/video\/(\d+)/i);
  return match?.[1] ?? null;
}

export function parseTikTokCreatorHandle(sourceUrl: string): string | undefined {
  const match = sourceUrl.match(/tiktok\.com\/@([^/?]+)/i);
  return match?.[1];
}

export function buildTikTokCreatorProfileUrl(handle?: string): string | undefined {
  if (!handle) {
    return undefined;
  }

  return `https://www.tiktok.com/@${handle}`;
}

export function buildTikTokEmbedUrl(postId: string): string {
  return `https://www.tiktok.com/player/v1/${postId}?controls=1&description=1`;
}

export function normalizeDiscoverHeroImageUrl(slug: string, heroImageUrl?: string | null): string | undefined {
  const normalizedValue = heroImageUrl?.trim();
  if (!normalizedValue) {
    return undefined;
  }

  return DISCOVER_HERO_IMAGE_OVERRIDES[normalizedValue] ?? normalizedValue;
}

function normalizeCandidate(row: DiscoverVideoCandidateRow): DiscoverVideoCandidate {
  return {
    id: row.id,
    sourceUrl: row.source_url,
    postId: row.post_id,
    creatorHandle: row.creator_handle ?? undefined,
    creatorProfileUrl: row.creator_profile_url ?? undefined,
    discoveredCategories: (row.discovered_categories ?? []).map(normalizeCategory),
    sourceSurface: row.source_surface,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    queueStatus: normalizeQueueStatus(row.queue_status),
    collectorRunId: row.collector_run_id ?? undefined,
    collectorNotes: row.collector_notes ?? undefined,
    missingRunCount: row.missing_run_count ?? 0,
  };
}

function normalizeArticle(row: DiscoverArticleRow, candidate: DiscoverVideoCandidate): DiscoverArticle {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    slug: row.slug,
    primaryCategory: normalizeCategory(row.primary_category),
    title: {
      en: row.title_en,
      zh: row.title_zh,
    },
    excerpt: {
      en: row.excerpt_en,
      zh: row.excerpt_zh,
    },
    body: splitBody(row.body_en, row.body_zh),
    heroImageUrl: normalizeDiscoverHeroImageUrl(row.slug, row.hero_image_url),
    city: row.city ?? undefined,
    region: row.region ?? undefined,
    tags: row.tags ?? [],
    relatedBusinessSlugs: row.related_business_slugs ?? [],
    relatedHiddenArizonaSlugs: row.related_hidden_arizona_slugs ?? [],
    publishedAt: row.published_at ?? undefined,
    updatedAt: row.updated_at,
    isFeatured: Boolean(row.is_featured),
    embedEnabled: Boolean(row.embed_enabled),
    postId: candidate.postId,
    sourceUrl: candidate.sourceUrl,
    creatorHandle: candidate.creatorHandle,
    creatorProfileUrl: candidate.creatorProfileUrl,
    queueStatus: candidate.queueStatus,
    sourceSurface: candidate.sourceSurface,
  };
}

function buildSeedQueue(): DiscoverAdminQueueItem[] {
  return discoverSeedQueue
    .slice()
    .sort(
      (left, right) =>
        new Date(right.candidate.lastSeenAt).getTime() - new Date(left.candidate.lastSeenAt).getTime()
    );
}

export function getDiscoveryCategory(slug: DiscoveryCategory) {
  return discoveryCategories.find((category) => category.slug === slug);
}

export async function getDiscoverAdminQueue(): Promise<DiscoverAdminQueueItem[]> {
  const serviceClient = getSupabaseServiceClient();
  if (!serviceClient) {
    return buildSeedQueue();
  }

  const [{ data: candidateRows, error: candidateError }, { data: articleRows, error: articleError }] = await Promise.all([
    serviceClient
      .from('discover_video_candidates')
      .select(
        'id, source_url, post_id, creator_handle, creator_profile_url, discovered_categories, source_surface, first_seen_at, last_seen_at, queue_status, collector_run_id, collector_notes, missing_run_count'
      )
      .order('last_seen_at', { ascending: false }),
    serviceClient
      .from('discover_articles')
      .select(
        'id, candidate_id, slug, primary_category, title_en, title_zh, excerpt_en, excerpt_zh, body_en, body_zh, hero_image_url, city, region, tags, related_business_slugs, related_hidden_arizona_slugs, published_at, updated_at, is_featured, embed_enabled'
      )
      .order('updated_at', { ascending: false }),
  ]);

  if (candidateError || articleError || !candidateRows) {
    console.error('Unable to load Discover Arizona admin queue.', candidateError ?? articleError);
    return buildSeedQueue();
  }

  const normalizedCandidates = (candidateRows as DiscoverVideoCandidateRow[]).map(normalizeCandidate);
  const candidateById = new Map(normalizedCandidates.map((candidate) => [candidate.id, candidate]));
  const normalizedArticles = (articleRows as DiscoverArticleRow[])
    .map((row) => {
      const candidate = candidateById.get(row.candidate_id);
      return candidate ? normalizeArticle(row, candidate) : null;
    })
    .filter((article): article is DiscoverArticle => Boolean(article));
  const articleByCandidateId = new Map(
    normalizedArticles.map((article) => [article.candidateId, article])
  );

  return normalizedCandidates.map((candidate) => ({
    candidate,
    article: articleByCandidateId.get(candidate.id),
  }));
}

export async function getPublishedDiscoverArticles(
  options: {
    category?: DiscoveryCategory;
    limit?: number;
    featuredOnly?: boolean;
  } = {}
): Promise<DiscoverArticle[]> {
  const serviceClient = getSupabaseServiceClient();
  const limit = options.limit ?? 0;

  if (!serviceClient) {
    const filteredSeed = discoverSeedArticles
      .filter((article) => article.queueStatus === 'published' && article.embedEnabled)
      .filter((article) => (options.category ? article.primaryCategory === options.category : true))
      .filter((article) => (options.featuredOnly ? article.isFeatured : true))
      .sort(
        (left, right) =>
          new Date(right.publishedAt ?? right.updatedAt).getTime() -
          new Date(left.publishedAt ?? left.updatedAt).getTime()
      );

    return limit > 0 ? filteredSeed.slice(0, limit) : filteredSeed;
  }

  let articleQuery = serviceClient
    .from('discover_articles')
    .select(
      'id, candidate_id, slug, primary_category, title_en, title_zh, excerpt_en, excerpt_zh, body_en, body_zh, hero_image_url, city, region, tags, related_business_slugs, related_hidden_arizona_slugs, published_at, updated_at, is_featured, embed_enabled'
    )
    .not('published_at', 'is', null)
    .eq('embed_enabled', true)
    .order('published_at', { ascending: false });

  if (options.category) {
    articleQuery = articleQuery.eq('primary_category', options.category);
  }

  if (options.featuredOnly) {
    articleQuery = articleQuery.eq('is_featured', true);
  }

  if (limit > 0) {
    articleQuery = articleQuery.limit(limit);
  }

  const { data: articleRows, error: articleError } = await articleQuery;
  if (articleError || !articleRows) {
    console.error('Unable to load Discover Arizona articles.', articleError);
    return [];
  }

  const candidateIds = Array.from(new Set((articleRows as DiscoverArticleRow[]).map((row) => row.candidate_id)));
  const { data: candidateRows, error: candidateError } = await serviceClient
    .from('discover_video_candidates')
    .select(
      'id, source_url, post_id, creator_handle, creator_profile_url, discovered_categories, source_surface, first_seen_at, last_seen_at, queue_status, collector_run_id, collector_notes, missing_run_count'
    )
    .in('id', candidateIds);

  if (candidateError || !candidateRows) {
    console.error('Unable to load Discover Arizona candidates.', candidateError);
    return [];
  }

  const candidateById = new Map(
    (candidateRows as DiscoverVideoCandidateRow[]).map((row) => {
      const candidate = normalizeCandidate(row);
      return [candidate.id, candidate];
    })
  );

  return (articleRows as DiscoverArticleRow[])
    .map((row) => {
      const candidate = candidateById.get(row.candidate_id);
      return candidate ? normalizeArticle(row, candidate) : null;
    })
    .filter((article): article is DiscoverArticle => Boolean(article));
}

export async function getDiscoverArticleBySlug(slug: string): Promise<DiscoverArticle | undefined> {
  const articles = await getPublishedDiscoverArticles();
  return articles.find((article) => article.slug === slug);
}

export async function getFeaturedDiscoverArticles(limit = 4): Promise<DiscoverArticle[]> {
  return getPublishedDiscoverArticles({ featuredOnly: true, limit });
}

export async function createOrRefreshDiscoverCandidate(input: {
  sourceUrl: string;
  discoveredCategories: DiscoveryCategory[];
  sourceSurface: string;
  queueStatus?: DiscoveryQueueStatus;
  collectorRunId?: string;
  collectorNotes?: string;
}): Promise<DiscoverVideoCandidate> {
  const serviceClient = getSupabaseServiceClient();
  if (!serviceClient) {
    throw new Error('Supabase service configuration is required to create discover candidates.');
  }

  const sourceUrl = input.sourceUrl.trim();
  const postId = parseTikTokPostId(sourceUrl);
  if (!postId) {
    throw new Error('The TikTok URL must include a valid post id.');
  }

  const creatorHandle = parseTikTokCreatorHandle(sourceUrl);
  const creatorProfileUrl = buildTikTokCreatorProfileUrl(creatorHandle);
  const now = new Date().toISOString();

  const { data: existingRow } = await serviceClient
    .from('discover_video_candidates')
    .select(
      'id, source_url, post_id, creator_handle, creator_profile_url, discovered_categories, source_surface, first_seen_at, last_seen_at, queue_status, collector_run_id, collector_notes, missing_run_count'
    )
    .eq('post_id', postId)
    .maybeSingle();

  const mergedCategories = Array.from(
    new Set([
      ...(existingRow?.discovered_categories ?? []).map(normalizeCategory),
      ...input.discoveredCategories,
    ])
  );

  const payload = {
    source_url: sourceUrl,
    post_id: postId,
    creator_handle: creatorHandle ?? null,
    creator_profile_url: creatorProfileUrl ?? null,
    discovered_categories: mergedCategories,
    source_surface: input.sourceSurface,
    first_seen_at: existingRow?.first_seen_at ?? now,
    last_seen_at: now,
    queue_status: input.queueStatus ?? normalizeQueueStatus(existingRow?.queue_status ?? 'queued'),
    collector_run_id: input.collectorRunId ?? existingRow?.collector_run_id ?? null,
    collector_notes: input.collectorNotes ?? existingRow?.collector_notes ?? null,
    missing_run_count: 0,
  };

  const mutation = existingRow
    ? serviceClient
        .from('discover_video_candidates')
        .update(payload)
        .eq('id', existingRow.id)
        .select(
          'id, source_url, post_id, creator_handle, creator_profile_url, discovered_categories, source_surface, first_seen_at, last_seen_at, queue_status, collector_run_id, collector_notes, missing_run_count'
        )
        .single()
    : serviceClient
        .from('discover_video_candidates')
        .insert(payload)
        .select(
          'id, source_url, post_id, creator_handle, creator_profile_url, discovered_categories, source_surface, first_seen_at, last_seen_at, queue_status, collector_run_id, collector_notes, missing_run_count'
        )
        .single();

  const { data, error } = await mutation;
  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to store the Discover Arizona candidate.');
  }

  return normalizeCandidate(data as DiscoverVideoCandidateRow);
}

export async function upsertDiscoverArticle(input: DiscoverArticleInput): Promise<DiscoverArticle> {
  const serviceClient = getSupabaseServiceClient();
  if (!serviceClient) {
    throw new Error('Supabase service configuration is required to save Discover Arizona articles.');
  }

  const { data: candidateRow, error: candidateError } = await serviceClient
    .from('discover_video_candidates')
    .select(
      'id, source_url, post_id, creator_handle, creator_profile_url, discovered_categories, source_surface, first_seen_at, last_seen_at, queue_status, collector_run_id, collector_notes, missing_run_count'
    )
    .eq('id', input.candidateId)
    .single();

  if (candidateError || !candidateRow) {
    throw new Error('The selected TikTok candidate could not be found.');
  }

  const { data: existingArticle } = await serviceClient
    .from('discover_articles')
    .select('id, published_at')
    .eq('candidate_id', input.candidateId)
    .maybeSingle();

  const now = new Date().toISOString();
  const payload = {
    candidate_id: input.candidateId,
    slug: slugify(input.slug?.trim() || input.titleEn),
    primary_category: input.primaryCategory,
    title_en: input.titleEn.trim(),
    title_zh: input.titleZh.trim(),
    excerpt_en: input.excerptEn.trim(),
    excerpt_zh: input.excerptZh.trim(),
    body_en: input.bodyEn.trim(),
    body_zh: input.bodyZh.trim(),
    hero_image_url: input.heroImageUrl?.trim() || null,
    city: input.city?.trim() || null,
    region: input.region?.trim() || null,
    tags: input.tags,
    related_business_slugs: input.relatedBusinessSlugs,
    related_hidden_arizona_slugs: input.relatedHiddenArizonaSlugs,
    published_at:
      input.queueStatus === 'published'
        ? existingArticle?.published_at ?? now
        : null,
    updated_at: now,
    is_featured: input.isFeatured,
    embed_enabled: input.embedEnabled,
  };

  const { data: articleRow, error: articleError } = await serviceClient
    .from('discover_articles')
    .upsert(payload, { onConflict: 'candidate_id' })
    .select(
      'id, candidate_id, slug, primary_category, title_en, title_zh, excerpt_en, excerpt_zh, body_en, body_zh, hero_image_url, city, region, tags, related_business_slugs, related_hidden_arizona_slugs, published_at, updated_at, is_featured, embed_enabled'
    )
    .single();

  if (articleError || !articleRow) {
    throw new Error(articleError?.message ?? 'Unable to save the Discover Arizona article.');
  }

  const { error: candidateUpdateError } = await serviceClient
    .from('discover_video_candidates')
    .update({
      queue_status: input.queueStatus,
      last_seen_at: now,
    })
    .eq('id', input.candidateId);

  if (candidateUpdateError) {
    throw new Error(candidateUpdateError.message);
  }

  const candidate = normalizeCandidate({
    ...(candidateRow as DiscoverVideoCandidateRow),
    queue_status: input.queueStatus,
    last_seen_at: now,
  });

  return normalizeArticle(articleRow as DiscoverArticleRow, candidate);
}

export function parseLineList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/\r?\n|,/g)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export function serializeDiscoverArticleBody(article: DiscoverArticle, locale: 'en' | 'zh'): string {
  return joinBody(article.body, locale);
}
