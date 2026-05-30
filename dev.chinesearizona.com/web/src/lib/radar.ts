import 'server-only';

import fs from 'node:fs';
import path from 'node:path';

import austinRadarSourceManifestData from '@/data/austin-radar-source-manifest.json';
import losAngelesRadarSourceManifestData from '@/data/los-angeles-radar-source-manifest.json';
import radarSourceManifestData from '@/data/radar-source-manifest.json';
import { defaultSiteProfile, siteProfiles, type SiteKey, type SiteProfile } from '@/lib/site-config';
import { getSupabaseServiceClient, isSupabaseServiceConfigured } from '@/lib/supabase';
import type {
  Article,
  LocalizedText,
  PersonaTarget,
  RadarArticle,
  RadarCandidate,
  RadarHeroImagePolicy,
  RadarJobControl,
  RadarLane,
  RadarModerationState,
  RadarOverview,
  RadarRun,
  RadarRunStatus,
  RadarSourceControl,
  RadarSourceManifestEntry,
  ResourceLink,
  SourcePolicy,
  SourceType,
} from '@/lib/types';

type RadarStoreSnapshot = {
  version: number;
  jobControl: RadarJobControl;
  sourceControls: RadarSourceControl[];
  runs: RadarRun[];
  candidates: RadarCandidate[];
  articles: RadarArticle[];
};

type RadarAdminSnapshot = {
  overview: RadarOverview;
  sources: Array<RadarSourceManifestEntry & { candidateCount: number; paused: boolean }>;
  candidates: RadarCandidate[];
  articles: RadarArticle[];
  runs: RadarRun[];
};

type RadarSiteInput = SiteProfile | SiteKey | undefined;

type RadarStoreOptions = {
  site?: RadarSiteInput;
};

function resolveRadarSite(input?: RadarSiteInput): SiteProfile {
  const key = input && typeof input === 'object' ? input.key : input;
  if (key === 'austin') {
    return siteProfiles.austin;
  }
  if (key === 'los-angeles') {
    return siteProfiles['los-angeles'];
  }

  return defaultSiteProfile;
}

function isDefaultRadarSite(input?: RadarSiteInput): boolean {
  return resolveRadarSite(input).key === defaultSiteProfile.key;
}

function radarSeriesForSite(input?: RadarSiteInput): Article['series'] {
  const site = resolveRadarSite(input);
  if (site.key === 'austin') {
    return 'austin-radar';
  }
  if (site.key === 'los-angeles') {
    return 'local-radar';
  }

  return 'arizona-radar';
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeMode(value: string | undefined): 'file' | 'supabase' | 'auto' {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (normalized === 'file') {
    return 'file';
  }

  if (normalized === 'supabase') {
    return 'supabase';
  }

  return 'auto';
}

function siteEnvKey(site: SiteProfile): string {
  return site.key.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

function resolveRuntimePath(site: SiteProfile): string {
  const configuredPath = site.news.articleDataSource.path;
  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(/* turbopackIgnore: true */ process.cwd(), configuredPath);
  }

  return path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'radar-runtime', 'store.json');
}

function shouldUseSupabaseRadarStore(site?: RadarSiteInput): boolean {
  if (!isDefaultRadarSite(site)) {
    return false;
  }

  const mode = normalizeMode(process.env.RADAR_STORAGE_MODE);
  if (mode === 'file') {
    return false;
  }

  if (!isSupabaseServiceConfigured()) {
    return false;
  }

  if (mode === 'supabase') {
    return true;
  }

  return process.env.NODE_ENV !== 'test';
}

export function getRadarStorePath(siteInput?: RadarSiteInput): string {
  const site = resolveRadarSite(siteInput);
  const siteSpecificPath =
    process.env[`RADAR_STORE_PATH_${siteEnvKey(site)}`] ||
    (site.key === 'austin' ? process.env.AUSTIN_RADAR_STORE_PATH : undefined) ||
    (site.key === 'los-angeles' ? process.env.LOS_ANGELES_RADAR_STORE_PATH : undefined);

  if (siteSpecificPath) {
    return siteSpecificPath;
  }

  if (site.key === defaultSiteProfile.key && process.env.RADAR_STORE_PATH) {
    return process.env.RADAR_STORE_PATH;
  }

  return resolveRuntimePath(site);
}

function defaultJobControl(): RadarJobControl {
  return {
    paused: false,
    publishCap: 10,
    updatedAt: nowIso(),
  };
}

function defaultStore(): RadarStoreSnapshot {
  return {
    version: 1,
    jobControl: defaultJobControl(),
    sourceControls: [],
    runs: [],
    candidates: [],
    articles: [],
  };
}

function normalizeStore(input: Partial<RadarStoreSnapshot> | null | undefined): RadarStoreSnapshot {
  const fallback = defaultStore();

  return {
    version: 1,
    jobControl: {
      ...fallback.jobControl,
      ...(input?.jobControl ?? {}),
    },
    sourceControls: Array.isArray(input?.sourceControls) ? input.sourceControls : [],
    runs: Array.isArray(input?.runs) ? input.runs : [],
    candidates: Array.isArray(input?.candidates) ? input.candidates : [],
    articles: Array.isArray(input?.articles) ? input.articles : [],
  };
}

function isLocalizedText(value: unknown): value is LocalizedText {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'en' in (value as Record<string, unknown>) &&
      'zh' in (value as Record<string, unknown>)
  );
}

function normalizeLocalizedText(
  value: unknown,
  fallback: { en: string; zh: string } = { en: '', zh: '' }
): LocalizedText {
  if (isLocalizedText(value)) {
    const en = String(value.en || fallback.en).trim() || fallback.en;
    const zh = String(value.zh || value.en || fallback.zh || en).trim() || en;
    return { en, zh };
  }

  const text = String(value || fallback.en).trim();
  return {
    en: text || fallback.en,
    zh: text || fallback.zh || fallback.en,
  };
}

function splitParagraphs(value: string): string[] {
  return String(value || '')
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function normalizeBodyParagraphs(
  bodyEn: unknown,
  bodyZh: unknown
): LocalizedText[] {
  const englishParagraphs = splitParagraphs(String(bodyEn || ''));
  const chineseParagraphs = splitParagraphs(String(bodyZh || ''));

  return englishParagraphs.map((paragraph, index) => ({
    en: paragraph,
    zh: chineseParagraphs[index] || chineseParagraphs[0] || paragraph,
  }));
}

function normalizeSourceLinks(value: unknown, fallbackSourceName: string): ResourceLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => {
      const item = entry as Record<string, unknown>;
      return {
        label: normalizeLocalizedText(item.label, {
          en: String(item.source || fallbackSourceName),
          zh: String(item.source || fallbackSourceName),
        }),
        url: String(item.url || '').trim(),
        source: String(item.source || fallbackSourceName).trim() || fallbackSourceName,
      };
    })
    .filter((entry) => Boolean(entry.url));
}

const VALID_PERSONA_TARGETS = new Set<PersonaTarget>([
  'tsmc_newcomers',
  'local_families',
  'students',
  'business_owners',
]);

function normalizePersonaTargets(value: unknown): PersonaTarget[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => String(entry))
    .filter((entry): entry is PersonaTarget => VALID_PERSONA_TARGETS.has(entry as PersonaTarget));
}

function serializeBodyParagraphs(body: LocalizedText[], locale: 'en' | 'zh'): string {
  return body
    .map((paragraph) => String(paragraph[locale] || paragraph.en || '').trim())
    .filter(Boolean)
    .join('\n\n');
}

function sortRuns(runs: RadarRun[]): RadarRun[] {
  return runs
    .slice()
    .sort(
      (left, right) =>
        new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime()
    );
}

function sortCandidates(candidates: RadarCandidate[]): RadarCandidate[] {
  return candidates
    .slice()
    .sort(
      (left, right) =>
        new Date(right.lastSeenAt).getTime() - new Date(left.lastSeenAt).getTime()
    );
}

function sortArticles(articles: RadarArticle[]): RadarArticle[] {
  return articles
    .slice()
    .sort(
      (left, right) =>
        new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()
    );
}

function mapRunRow(row: Record<string, unknown>): RadarRun {
  return {
    id: String(row.id),
    worker: 'hermes',
    startedAt: String(row.started_at || row.startedAt || ''),
    finishedAt: row.finished_at ? String(row.finished_at) : row.finishedAt ? String(row.finishedAt) : undefined,
    status: String(row.status || 'completed') as RadarRunStatus,
    candidateCount: Number(row.candidate_count ?? row.candidateCount ?? 0),
    publishedCount: Number(row.published_count ?? row.publishedCount ?? 0),
    blockedCount: Number(row.blocked_count ?? row.blockedCount ?? 0),
    duplicateCount: Number(row.duplicate_count ?? row.duplicateCount ?? 0),
    errorMessage:
      typeof row.error_message === 'string'
        ? row.error_message
        : typeof row.errorMessage === 'string'
          ? row.errorMessage
          : undefined,
    latestPublishedAt:
      typeof row.latest_published_at === 'string'
        ? row.latest_published_at
        : typeof row.latestPublishedAt === 'string'
          ? row.latestPublishedAt
          : undefined,
  };
}

function mapCandidateRow(row: Record<string, unknown>): RadarCandidate {
  return {
    id: String(row.id),
    slug: String(row.slug),
    sourceSlug: String(row.source_slug ?? row.sourceSlug ?? ''),
    sourceName: String(row.source_name ?? row.sourceName ?? ''),
    sourceUrl: String(row.source_url ?? row.sourceUrl ?? ''),
    canonicalUrl: String(row.canonical_url ?? row.canonicalUrl ?? ''),
    sourceType: String(row.source_type ?? row.sourceType ?? 'local_media') as SourceType,
    sourcePolicy: String(row.source_policy ?? row.sourcePolicy ?? 'summary_link') as SourcePolicy,
    lane: String(row.lane || 'community') as RadarLane,
    title: {
      en: String(row.title_en ?? row.titleEn ?? ''),
      zh: String(row.title_zh ?? row.titleZh ?? row.title_en ?? row.titleEn ?? ''),
    },
    excerpt: {
      en: String(row.excerpt_en ?? row.excerptEn ?? ''),
      zh: String(row.excerpt_zh ?? row.excerptZh ?? row.excerpt_en ?? row.excerptEn ?? ''),
    },
    topicFingerprint: String(row.topic_fingerprint ?? row.topicFingerprint ?? ''),
    moderationState: String(
      row.moderation_state ?? row.moderationState ?? 'queued'
    ) as RadarModerationState,
    firstSeenAt: String(row.first_seen_at ?? row.firstSeenAt ?? ''),
    lastSeenAt: String(row.last_seen_at ?? row.lastSeenAt ?? ''),
    sourcePublishedAt:
      typeof row.source_published_at === 'string'
        ? row.source_published_at
        : typeof row.sourcePublishedAt === 'string'
          ? row.sourcePublishedAt
          : undefined,
  };
}

function mapArticleRow(row: Record<string, unknown>): RadarArticle {
  const sourceName = String(row.source_name ?? row.sourceName ?? '');

  return {
    id: String(row.id),
    candidateId: String(row.candidate_id ?? row.candidateId ?? ''),
    slug: String(row.slug),
    lane: String(row.lane || 'community') as RadarLane,
    title: {
      en: String(row.title_en ?? row.titleEn ?? ''),
      zh: String(row.title_zh ?? row.titleZh ?? row.title_en ?? row.titleEn ?? ''),
    },
    excerpt: {
      en: String(row.excerpt_en ?? row.excerptEn ?? ''),
      zh: String(row.excerpt_zh ?? row.excerptZh ?? row.excerpt_en ?? row.excerptEn ?? ''),
    },
    body: normalizeBodyParagraphs(row.body_en, row.body_zh),
    heroImage: String(row.hero_image ?? row.heroImage ?? ''),
    heroImagePolicy: String(
      row.hero_image_policy ?? row.heroImagePolicy ?? 'fallback_only'
    ) as RadarHeroImagePolicy,
    category: String(row.category || 'news') as Article['category'],
    freshnessTier: String(row.freshness_tier ?? row.freshnessTier ?? 'weekly') as Article['freshnessTier'],
    sourcePolicy: String(row.source_policy ?? row.sourcePolicy ?? 'summary_link') as SourcePolicy,
    sourceType: String(row.source_type ?? row.sourceType ?? 'local_media') as SourceType,
    sourceName,
    sourceUrl: String(row.source_url ?? row.sourceUrl ?? ''),
    sourceLinks: normalizeSourceLinks(row.source_links ?? row.sourceLinks, sourceName),
    relatedCategorySlugs: Array.isArray(row.related_category_slugs)
      ? row.related_category_slugs.map(String)
      : Array.isArray(row.relatedCategorySlugs)
        ? row.relatedCategorySlugs.map(String)
        : [],
    ctaBusinessSlugs: Array.isArray(row.cta_business_slugs)
      ? row.cta_business_slugs.map(String)
      : Array.isArray(row.ctaBusinessSlugs)
        ? row.ctaBusinessSlugs.map(String)
        : [],
    personaTargets: normalizePersonaTargets(row.persona_targets ?? row.personaTargets),
    publishedAt: String(row.published_at ?? row.publishedAt ?? ''),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? ''),
    lastCheckedAt: String(row.last_checked_at ?? row.lastCheckedAt ?? ''),
    isPublished: Boolean(row.is_published ?? row.isPublished),
    aiGeneratedSummary: Boolean(row.ai_generated_summary ?? row.aiGeneratedSummary),
  };
}

function buildOverviewFromStore(store: RadarStoreSnapshot, site?: RadarSiteInput): RadarOverview {
  const manifest = getRadarSourceManifest(site);
  const latestRun = sortRuns(store.runs)[0];
  const pausedSources = new Set(
    store.sourceControls
      .filter((control) => control.paused)
      .map((control) => control.sourceSlug)
  );
  const publishedArticles = sortArticles(store.articles).filter((article) => article.isPublished);
  const blockedCandidates = store.candidates.filter(
    (candidate) => candidate.moderationState === 'blocked'
  );
  const duplicateCandidates = store.candidates.filter(
    (candidate) => candidate.moderationState === 'duplicate'
  );
  const topNoisySources = manifest
    .map((source) => {
      const items = store.candidates.filter((candidate) => candidate.sourceSlug === source.slug);
      const blockedCount = items.filter((candidate) => candidate.moderationState === 'blocked').length;

      return {
        sourceSlug: source.slug,
        sourceName: source.name,
        itemCount: items.length,
        blockedCount,
        paused: pausedSources.has(source.slug),
      };
    })
    .sort((left, right) => {
      if (right.itemCount !== left.itemCount) {
        return right.itemCount - left.itemCount;
      }

      return right.blockedCount - left.blockedCount;
    })
    .slice(0, 6);

  return {
    runCount: store.runs.length,
    latestRun,
    latestPublishedAt: publishedArticles[0]?.publishedAt,
    publishedCount: publishedArticles.length,
    blockedCount: blockedCandidates.length,
    duplicateCount: duplicateCandidates.length,
    candidateCount: store.candidates.length,
    pausedSourceCount: pausedSources.size,
    jobControl: store.jobControl,
    topNoisySources,
  };
}

function buildAdminSnapshotFromStore(
  store: RadarStoreSnapshot,
  site?: RadarSiteInput
): RadarAdminSnapshot {
  const manifest = getRadarSourceManifest(site);
  const controlsBySlug = new Map(
    store.sourceControls.map((control) => [control.sourceSlug, control])
  );
  const candidates = sortCandidates(store.candidates).slice(0, 12);
  const articles = sortArticles(store.articles).slice(0, 12);
  const sources = manifest.map((source) => {
    const candidateCount = store.candidates.filter(
      (candidate) => candidate.sourceSlug === source.slug
    ).length;

    return {
      ...source,
      candidateCount,
      paused: controlsBySlug.get(source.slug)?.paused ?? false,
    };
  });

  return {
    overview: buildOverviewFromStore(store, site),
    sources,
    candidates,
    articles,
    runs: sortRuns(store.runs).slice(0, 8),
  };
}

export function readRadarStore(site?: RadarSiteInput): RadarStoreSnapshot {
  const storePath = getRadarStorePath(site);

  try {
    const payload = fs.readFileSync(storePath, 'utf8');
    return normalizeStore(JSON.parse(payload) as Partial<RadarStoreSnapshot>);
  } catch {
    return defaultStore();
  }
}

export function writeRadarStore(
  store: RadarStoreSnapshot,
  site?: RadarSiteInput
): RadarStoreSnapshot {
  const storePath = getRadarStorePath(site);
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  return store;
}

export function mutateRadarStore(
  mutate: (store: RadarStoreSnapshot) => RadarStoreSnapshot,
  options: RadarStoreOptions = {}
): RadarStoreSnapshot {
  const current = readRadarStore(options.site);
  const next = normalizeStore(mutate(current));
  return writeRadarStore(next, options.site);
}

async function readRadarStoreFromSupabase(): Promise<RadarStoreSnapshot> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return defaultStore();
  }

  const [
    jobControlResult,
    sourceControlsResult,
    runsResult,
    candidatesResult,
    articlesResult,
  ] = await Promise.all([
    supabase.from('radar_job_controls').select('*').eq('id', true).maybeSingle(),
    supabase.from('radar_source_controls').select('*').order('source_slug', { ascending: true }),
    supabase.from('radar_runs').select('*').order('started_at', { ascending: false }).limit(50),
    supabase.from('radar_candidates').select('*').order('last_seen_at', { ascending: false }),
    supabase.from('radar_articles').select('*').order('published_at', { ascending: false }),
  ]);

  const errors = [
    jobControlResult.error,
    sourceControlsResult.error,
    runsResult.error,
    candidatesResult.error,
    articlesResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw errors[0];
  }

  return normalizeStore({
    jobControl: jobControlResult.data
      ? {
          paused: Boolean(jobControlResult.data.paused),
          publishCap: Number(jobControlResult.data.publish_cap ?? 10),
          updatedAt: String(jobControlResult.data.updated_at ?? nowIso()),
        }
      : defaultJobControl(),
    sourceControls: (sourceControlsResult.data || []).map((row) => ({
      sourceSlug: String(row.source_slug),
      paused: Boolean(row.paused),
      updatedAt: String(row.updated_at ?? nowIso()),
    })),
    runs: (runsResult.data || []).map((row) => mapRunRow(row as Record<string, unknown>)),
    candidates: (candidatesResult.data || []).map((row) =>
      mapCandidateRow(row as Record<string, unknown>)
    ),
    articles: (articlesResult.data || []).map((row) =>
      mapArticleRow(row as Record<string, unknown>)
    ),
  });
}

export async function readRadarStoreAsync(
  options: RadarStoreOptions = {}
): Promise<RadarStoreSnapshot> {
  if (!shouldUseSupabaseRadarStore(options.site)) {
    return readRadarStore(options.site);
  }

  try {
    const persistedStore = await readRadarStoreFromSupabase();
    try {
      writeRadarStore(persistedStore, options.site);
    } catch (mirrorError) {
      console.error('Unable to refresh local radar store mirror.', mirrorError);
    }
    return persistedStore;
  } catch (error) {
    console.error('Falling back to file-backed radar store.', error);
    return readRadarStore(options.site);
  }
}

async function getRadarServiceClientOrThrow() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    throw new Error('Supabase service role is not configured for Arizona Radar.');
  }

  return supabase;
}

export function getRadarSourceManifest(site?: RadarSiteInput): RadarSourceManifestEntry[] {
  const resolvedSite = resolveRadarSite(site);
  return (
    resolvedSite.key === 'los-angeles'
      ? losAngelesRadarSourceManifestData
      : resolvedSite.key === 'austin'
      ? austinRadarSourceManifestData
      : radarSourceManifestData
  ) as RadarSourceManifestEntry[];
}

export function getRadarJobControl(options: RadarStoreOptions = {}): RadarJobControl {
  return readRadarStore(options.site).jobControl;
}

export async function getRadarJobControlAsync(
  options: RadarStoreOptions = {}
): Promise<RadarJobControl> {
  return (await readRadarStoreAsync(options)).jobControl;
}

export function getRadarSourceControls(options: RadarStoreOptions = {}): RadarSourceControl[] {
  return readRadarStore(options.site).sourceControls;
}

export async function getRadarSourceControlsAsync(
  options: RadarStoreOptions = {}
): Promise<RadarSourceControl[]> {
  return (await readRadarStoreAsync(options)).sourceControls;
}

export function isRadarSourcePaused(sourceSlug: string, options: RadarStoreOptions = {}): boolean {
  return getRadarSourceControls(options).some(
    (control) => control.sourceSlug === sourceSlug && control.paused
  );
}

export async function isRadarSourcePausedAsync(
  sourceSlug: string,
  options: RadarStoreOptions = {}
): Promise<boolean> {
  return (await getRadarSourceControlsAsync(options)).some(
    (control) => control.sourceSlug === sourceSlug && control.paused
  );
}

export function getRadarRuns(limit?: number, options: RadarStoreOptions = {}): RadarRun[] {
  const runs = sortRuns(readRadarStore(options.site).runs);
  return typeof limit === 'number' ? runs.slice(0, limit) : runs;
}

export async function getRadarRunsAsync(
  limit?: number,
  options: RadarStoreOptions = {}
): Promise<RadarRun[]> {
  const runs = sortRuns((await readRadarStoreAsync(options)).runs);
  return typeof limit === 'number' ? runs.slice(0, limit) : runs;
}

export function getRadarCandidates(options?: {
  lane?: RadarLane;
  includePublished?: boolean;
  limit?: number;
  site?: RadarSiteInput;
}): RadarCandidate[] {
  const candidates = sortCandidates(readRadarStore(options?.site).candidates)
    .filter((candidate) =>
      options?.includePublished ? true : candidate.moderationState !== 'published'
    )
    .filter((candidate) => (options?.lane ? candidate.lane === options.lane : true));

  return typeof options?.limit === 'number'
    ? candidates.slice(0, options.limit)
    : candidates;
}

export async function getRadarCandidatesAsync(options?: {
  lane?: RadarLane;
  includePublished?: boolean;
  limit?: number;
  site?: RadarSiteInput;
}): Promise<RadarCandidate[]> {
  const candidates = sortCandidates((await readRadarStoreAsync({ site: options?.site })).candidates)
    .filter((candidate) =>
      options?.includePublished ? true : candidate.moderationState !== 'published'
    )
    .filter((candidate) => (options?.lane ? candidate.lane === options.lane : true));

  return typeof options?.limit === 'number'
    ? candidates.slice(0, options.limit)
    : candidates;
}

export function getRadarArticles(options?: {
  lane?: RadarLane;
  includeUnpublished?: boolean;
  limit?: number;
  site?: RadarSiteInput;
}): RadarArticle[] {
  const articles = sortArticles(readRadarStore(options?.site).articles)
    .filter((article) => (options?.includeUnpublished ? true : article.isPublished))
    .filter((article) => (options?.lane ? article.lane === options.lane : true));

  return typeof options?.limit === 'number' ? articles.slice(0, options.limit) : articles;
}

export async function getRadarArticlesAsync(options?: {
  lane?: RadarLane;
  includeUnpublished?: boolean;
  limit?: number;
  site?: RadarSiteInput;
}): Promise<RadarArticle[]> {
  const articles = sortArticles((await readRadarStoreAsync({ site: options?.site })).articles)
    .filter((article) => (options?.includeUnpublished ? true : article.isPublished))
    .filter((article) => (options?.lane ? article.lane === options.lane : true));

  return typeof options?.limit === 'number' ? articles.slice(0, options.limit) : articles;
}

export function getRadarArticleBySlug(
  slug: string,
  options: RadarStoreOptions = {}
): RadarArticle | undefined {
  return readRadarStore(options.site).articles.find((article) => article.slug === slug);
}

export async function getRadarArticleBySlugAsync(
  slug: string,
  options: RadarStoreOptions = {}
): Promise<RadarArticle | undefined> {
  return (await readRadarStoreAsync(options)).articles.find((article) => article.slug === slug);
}

export function radarArticleToArticle(
  article: RadarArticle,
  options: RadarStoreOptions = {}
): Article {
  return {
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    heroImage: article.heroImage,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    category: article.category,
    body: article.body,
    series: radarSeriesForSite(options.site),
    freshnessTier: article.freshnessTier,
    sourcePolicy: article.sourcePolicy,
    relatedCategorySlugs: article.relatedCategorySlugs,
    ctaBusinessSlugs: article.ctaBusinessSlugs,
    personaTargets: article.personaTargets,
    sourceLinks: article.sourceLinks,
    sourceName: article.sourceName,
    sourceUrl: article.sourceUrl,
    sourceId: article.id,
    sourceType: article.sourceType,
    radarLane: article.lane,
    aiGeneratedSummary: article.aiGeneratedSummary,
    lastCheckedAt: article.lastCheckedAt,
    heroImagePolicy: article.heroImagePolicy,
    republishedWithPermission: article.sourcePolicy === 'republish_with_permission',
  };
}

export function getPublishedRadarArticlesAsArticles(
  limit?: number,
  options: RadarStoreOptions = {}
): Article[] {
  const articles = getRadarArticles({ site: options.site }).map((article) =>
    radarArticleToArticle(article, options)
  );
  return typeof limit === 'number' ? articles.slice(0, limit) : articles;
}

export async function getPublishedRadarArticlesAsArticlesAsync(
  limit?: number,
  options: RadarStoreOptions = {}
): Promise<Article[]> {
  const articles = (await getRadarArticlesAsync({ site: options.site })).map((article) =>
    radarArticleToArticle(article, options)
  );
  return typeof limit === 'number' ? articles.slice(0, limit) : articles;
}

export function getRadarOverview(options: RadarStoreOptions = {}): RadarOverview {
  return buildOverviewFromStore(readRadarStore(options.site), options.site);
}

export async function getRadarOverviewAsync(
  options: RadarStoreOptions = {}
): Promise<RadarOverview> {
  return buildOverviewFromStore(await readRadarStoreAsync(options), options.site);
}

export function getRadarAdminSnapshot(options: RadarStoreOptions = {}): RadarAdminSnapshot {
  return buildAdminSnapshotFromStore(readRadarStore(options.site), options.site);
}

export async function getRadarAdminSnapshotAsync(
  options: RadarStoreOptions = {}
): Promise<RadarAdminSnapshot> {
  return buildAdminSnapshotFromStore(await readRadarStoreAsync(options), options.site);
}

export function setRadarJobPaused(paused: boolean): RadarJobControl {
  return mutateRadarStore((store) => ({
    ...store,
    jobControl: {
      ...store.jobControl,
      paused,
      updatedAt: nowIso(),
    },
  })).jobControl;
}

export async function setRadarJobPausedAsync(paused: boolean): Promise<RadarJobControl> {
  if (!shouldUseSupabaseRadarStore()) {
    return setRadarJobPaused(paused);
  }

  const supabase = await getRadarServiceClientOrThrow();
  const current = await getRadarJobControlAsync();
  const updatedAt = nowIso();
  const { data, error } = await supabase
    .from('radar_job_controls')
    .upsert({
      id: true,
      paused,
      publish_cap: current.publishCap,
      updated_at: updatedAt,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return {
    paused: Boolean(data.paused),
    publishCap: Number(data.publish_cap ?? current.publishCap),
    updatedAt: String(data.updated_at ?? updatedAt),
  };
}

export function setRadarSourcePaused(sourceSlug: string, paused: boolean): RadarSourceControl {
  const updatedAt = nowIso();
  const store = mutateRadarStore((current) => {
    const otherControls = current.sourceControls.filter(
      (control) => control.sourceSlug !== sourceSlug
    );

    return {
      ...current,
      sourceControls: [
        ...otherControls,
        {
          sourceSlug,
          paused,
          updatedAt,
        },
      ].sort((left, right) => left.sourceSlug.localeCompare(right.sourceSlug)),
    };
  });

  return (
    store.sourceControls.find((control) => control.sourceSlug === sourceSlug) ?? {
      sourceSlug,
      paused,
      updatedAt,
    }
  );
}

export async function setRadarSourcePausedAsync(
  sourceSlug: string,
  paused: boolean
): Promise<RadarSourceControl> {
  if (!shouldUseSupabaseRadarStore()) {
    return setRadarSourcePaused(sourceSlug, paused);
  }

  const supabase = await getRadarServiceClientOrThrow();
  const updatedAt = nowIso();
  const { data, error } = await supabase
    .from('radar_source_controls')
    .upsert({
      source_slug: sourceSlug,
      paused,
      updated_at: updatedAt,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return {
    sourceSlug: String(data.source_slug),
    paused: Boolean(data.paused),
    updatedAt: String(data.updated_at ?? updatedAt),
  };
}

export function blockRadarCandidate(candidateId: string) {
  return mutateRadarStore((store) => ({
    ...store,
    candidates: store.candidates.map((candidate) =>
      candidate.id === candidateId
        ? {
            ...candidate,
            moderationState: 'blocked',
            lastSeenAt: nowIso(),
          }
        : candidate
    ),
    articles: store.articles.map((article) =>
      article.candidateId === candidateId
        ? {
            ...article,
            isPublished: false,
            updatedAt: nowIso(),
            lastCheckedAt: nowIso(),
          }
        : article
    ),
  }));
}

export async function blockRadarCandidateAsync(candidateId: string): Promise<void> {
  if (!shouldUseSupabaseRadarStore()) {
    blockRadarCandidate(candidateId);
    return;
  }

  const supabase = await getRadarServiceClientOrThrow();
  const timestamp = nowIso();
  const { error: candidateError } = await supabase
    .from('radar_candidates')
    .update({
      moderation_state: 'blocked',
      last_seen_at: timestamp,
    })
    .eq('id', candidateId);

  if (candidateError) {
    throw candidateError;
  }

  const { error: articleError } = await supabase
    .from('radar_articles')
    .update({
      is_published: false,
      updated_at: timestamp,
      last_checked_at: timestamp,
    })
    .eq('candidate_id', candidateId);

  if (articleError) {
    throw articleError;
  }
}

export function unpublishRadarArticle(articleId: string) {
  return mutateRadarStore((store) => {
    const article = store.articles.find((entry) => entry.id === articleId);

    return {
      ...store,
      articles: store.articles.map((entry) =>
        entry.id === articleId
          ? {
              ...entry,
              isPublished: false,
              updatedAt: nowIso(),
              lastCheckedAt: nowIso(),
            }
          : entry
      ),
      candidates: store.candidates.map((candidate) =>
        candidate.id === article?.candidateId
          ? {
              ...candidate,
              moderationState: 'unpublished',
              lastSeenAt: nowIso(),
            }
          : candidate
      ),
    };
  });
}

export async function unpublishRadarArticleAsync(articleId: string): Promise<void> {
  if (!shouldUseSupabaseRadarStore()) {
    unpublishRadarArticle(articleId);
    return;
  }

  const supabase = await getRadarServiceClientOrThrow();
  const timestamp = nowIso();
  const { data, error } = await supabase
    .from('radar_articles')
    .update({
      is_published: false,
      updated_at: timestamp,
      last_checked_at: timestamp,
    })
    .eq('id', articleId)
    .select('candidate_id')
    .single();

  if (error) {
    throw error;
  }

  if (data?.candidate_id) {
    const { error: candidateError } = await supabase
      .from('radar_candidates')
      .update({
        moderation_state: 'unpublished',
        last_seen_at: timestamp,
      })
      .eq('id', data.candidate_id);

    if (candidateError) {
      throw candidateError;
    }
  }
}

export async function backfillRadarStoreToSupabase(
  store: RadarStoreSnapshot
): Promise<RadarStoreSnapshot> {
  const supabase = await getRadarServiceClientOrThrow();
  const snapshot = normalizeStore(store);

  const { error: jobControlError } = await supabase.from('radar_job_controls').upsert({
    id: true,
    paused: snapshot.jobControl.paused,
    publish_cap: snapshot.jobControl.publishCap,
    updated_at: snapshot.jobControl.updatedAt,
  });
  if (jobControlError) {
    throw jobControlError;
  }

  if (snapshot.sourceControls.length > 0) {
    const { error: sourceControlsError } = await supabase
      .from('radar_source_controls')
      .upsert(
        snapshot.sourceControls.map((control) => ({
          source_slug: control.sourceSlug,
          paused: control.paused,
          updated_at: control.updatedAt,
        }))
      );
    if (sourceControlsError) {
      throw sourceControlsError;
    }
  }

  if (snapshot.candidates.length > 0) {
    const { error: candidatesError } = await supabase.from('radar_candidates').upsert(
      snapshot.candidates.map((candidate) => ({
        id: candidate.id,
        slug: candidate.slug,
        source_slug: candidate.sourceSlug,
        source_name: candidate.sourceName,
        source_url: candidate.sourceUrl,
        canonical_url: candidate.canonicalUrl,
        source_type: candidate.sourceType,
        source_policy: candidate.sourcePolicy,
        lane: candidate.lane,
        title_en: candidate.title.en,
        title_zh: candidate.title.zh,
        excerpt_en: candidate.excerpt.en,
        excerpt_zh: candidate.excerpt.zh,
        topic_fingerprint: candidate.topicFingerprint,
        moderation_state: candidate.moderationState,
        source_published_at: candidate.sourcePublishedAt,
        first_seen_at: candidate.firstSeenAt,
        last_seen_at: candidate.lastSeenAt,
      }))
    );
    if (candidatesError) {
      throw candidatesError;
    }
  }

  if (snapshot.articles.length > 0) {
    const { error: articlesError } = await supabase.from('radar_articles').upsert(
      snapshot.articles.map((article) => ({
        id: article.id,
        candidate_id: article.candidateId,
        slug: article.slug,
        lane: article.lane,
        title_en: article.title.en,
        title_zh: article.title.zh,
        excerpt_en: article.excerpt.en,
        excerpt_zh: article.excerpt.zh,
        body_en: serializeBodyParagraphs(article.body, 'en'),
        body_zh: serializeBodyParagraphs(article.body, 'zh'),
        hero_image: article.heroImage,
        hero_image_policy: article.heroImagePolicy,
        category: article.category,
        freshness_tier: article.freshnessTier,
        source_policy: article.sourcePolicy,
        source_type: article.sourceType,
        source_name: article.sourceName,
        source_url: article.sourceUrl,
        source_links: article.sourceLinks,
        related_category_slugs: article.relatedCategorySlugs,
        cta_business_slugs: article.ctaBusinessSlugs,
        persona_targets: article.personaTargets,
        published_at: article.publishedAt,
        updated_at: article.updatedAt,
        last_checked_at: article.lastCheckedAt,
        is_published: article.isPublished,
        ai_generated_summary: article.aiGeneratedSummary,
      }))
    );
    if (articlesError) {
      throw articlesError;
    }
  }

  if (snapshot.runs.length > 0) {
    const { error: runsError } = await supabase.from('radar_runs').upsert(
      snapshot.runs.map((run) => ({
        id: run.id,
        worker: run.worker,
        started_at: run.startedAt,
        finished_at: run.finishedAt,
        status: run.status,
        candidate_count: run.candidateCount,
        published_count: run.publishedCount,
        blocked_count: run.blockedCount,
        duplicate_count: run.duplicateCount,
        error_message: run.errorMessage,
        latest_published_at: run.latestPublishedAt,
      }))
    );
    if (runsError) {
      throw runsError;
    }
  }

  return readRadarStoreAsync();
}
