const { createHash } = require('node:crypto');

const { createClient } = require('@supabase/supabase-js');

const {
  defaultStoreSnapshot,
  normalizeStore,
  readStore,
  writeStore,
} = require('./core.cjs');

const RADAR_LABEL = process.env.RADAR_REGION_NAME
  ? `${process.env.RADAR_REGION_NAME} Radar`
  : 'Arizona Radar';

function normalizeMode(value) {
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

function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function shouldUseSupabaseStore(options = {}) {
  if (options.useSupabase === false) {
    return false;
  }

  const mode = normalizeMode(process.env.RADAR_STORAGE_MODE);
  if (mode === 'file') {
    return false;
  }

  if (!hasSupabaseConfig()) {
    return false;
  }

  if (mode === 'supabase') {
    return true;
  }

  return process.env.NODE_ENV !== 'test';
}

function getSupabaseRealtimeOptions() {
  if (typeof globalThis.WebSocket === 'function') {
    return {};
  }

  try {
    return {
      realtime: {
        transport: require('ws'),
      },
    };
  } catch {
    return {};
  }
}

function getSupabaseClient() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      ...getSupabaseRealtimeOptions(),
    }
  );
}

function parseNonNegativeInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function getSupabaseAttemptCount() {
  return parseNonNegativeInteger(process.env.RADAR_SUPABASE_RETRIES, 2) + 1;
}

function getSupabaseRetryDelayMs() {
  return parseNonNegativeInteger(process.env.RADAR_SUPABASE_RETRY_DELAY_MS, 750);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function stringifyError(error) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  if (error && typeof error === 'object') {
    const parts = ['message', 'details', 'hint', 'code']
      .map((key) => error[key])
      .filter(Boolean);
    return parts.length > 0 ? parts.map(String).join(' ') : JSON.stringify(error);
  }

  return String(error || '');
}

function isRetryableSupabaseError(error) {
  return /fetch failed|und_err|socket|other side closed|timeout|timed out|etimedout|econnreset|econnrefused|eai_again|network/i.test(
    stringifyError(error)
  );
}

async function withSupabaseRetries(operation) {
  const attempts = getSupabaseAttemptCount();
  const retryDelayMs = getSupabaseRetryDelayMs();
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isRetryableSupabaseError(error)) {
        throw error;
      }
      if (retryDelayMs > 0) {
        await sleep(retryDelayMs * attempt);
      }
    }
  }

  throw lastError;
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );
}

function coerceUuid(value, fallbackSeed) {
  const normalized = String(value || '').trim();
  if (isUuid(normalized)) {
    return normalized;
  }

  const seed = normalized || fallbackSeed;
  const hash = hashValue(seed);
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `a${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-');
}

function splitParagraphs(value) {
  return String(value || '')
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function normalizeSourceLinks(value, sourceName) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      label: {
        en: String((entry.label && entry.label.en) || entry.source || sourceName || '').trim(),
        zh: String(
          (entry.label && (entry.label.zh || entry.label.en)) ||
            entry.source ||
            sourceName ||
            ''
        ).trim(),
      },
      url: String(entry.url || '').trim(),
      source: String(entry.source || sourceName || '').trim(),
    }))
    .filter((entry) => entry.url);
}

function mapRunRow(row) {
  return {
    id: String(row.id),
    worker: 'hermes',
    startedAt: String(row.started_at || ''),
    finishedAt: row.finished_at ? String(row.finished_at) : undefined,
    status: String(row.status || 'completed'),
    candidateCount: Number(row.candidate_count || 0),
    publishedCount: Number(row.published_count || 0),
    blockedCount: Number(row.blocked_count || 0),
    duplicateCount: Number(row.duplicate_count || 0),
    errorMessage: row.error_message ? String(row.error_message) : undefined,
    latestPublishedAt: row.latest_published_at ? String(row.latest_published_at) : undefined,
  };
}

function mapCandidateRow(row) {
  return {
    id: String(row.id),
    slug: String(row.slug),
    sourceSlug: String(row.source_slug || ''),
    sourceName: String(row.source_name || ''),
    sourceUrl: String(row.source_url || ''),
    canonicalUrl: String(row.canonical_url || ''),
    sourceType: String(row.source_type || 'local_media'),
    sourcePolicy: String(row.source_policy || 'summary_link'),
    lane: String(row.lane || 'community'),
    title: {
      en: String(row.title_en || ''),
      zh: String(row.title_zh || row.title_en || ''),
    },
    excerpt: {
      en: String(row.excerpt_en || ''),
      zh: String(row.excerpt_zh || row.excerpt_en || ''),
    },
    topicFingerprint: String(row.topic_fingerprint || ''),
    moderationState: String(row.moderation_state || 'queued'),
    firstSeenAt: String(row.first_seen_at || ''),
    lastSeenAt: String(row.last_seen_at || ''),
    sourcePublishedAt: row.source_published_at ? String(row.source_published_at) : undefined,
  };
}

function mapArticleRow(row) {
  const sourceName = String(row.source_name || '');
  const englishParagraphs = splitParagraphs(row.body_en);
  const chineseParagraphs = splitParagraphs(row.body_zh);

  return {
    id: String(row.id),
    candidateId: String(row.candidate_id || ''),
    slug: String(row.slug),
    lane: String(row.lane || 'community'),
    title: {
      en: String(row.title_en || ''),
      zh: String(row.title_zh || row.title_en || ''),
    },
    excerpt: {
      en: String(row.excerpt_en || ''),
      zh: String(row.excerpt_zh || row.excerpt_en || ''),
    },
    body: englishParagraphs.map((paragraph, index) => ({
      en: paragraph,
      zh: chineseParagraphs[index] || chineseParagraphs[0] || paragraph,
    })),
    heroImage: String(row.hero_image || ''),
    heroImagePolicy: String(row.hero_image_policy || 'fallback_only'),
    category: String(row.category || 'news'),
    freshnessTier: String(row.freshness_tier || 'weekly'),
    sourcePolicy: String(row.source_policy || 'summary_link'),
    sourceType: String(row.source_type || 'local_media'),
    sourceName,
    sourceUrl: String(row.source_url || ''),
    sourceLinks: normalizeSourceLinks(row.source_links, sourceName),
    relatedCategorySlugs: Array.isArray(row.related_category_slugs)
      ? row.related_category_slugs.map(String)
      : [],
    ctaBusinessSlugs: Array.isArray(row.cta_business_slugs)
      ? row.cta_business_slugs.map(String)
      : [],
    personaTargets: Array.isArray(row.persona_targets)
      ? row.persona_targets.map(String)
      : [],
    publishedAt: String(row.published_at || ''),
    updatedAt: String(row.updated_at || ''),
    lastCheckedAt: String(row.last_checked_at || ''),
    isPublished: Boolean(row.is_published),
    aiGeneratedSummary: Boolean(row.ai_generated_summary),
  };
}

async function readSupabaseStore() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return defaultStoreSnapshot();
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
          publishCap: Number(jobControlResult.data.publish_cap || 10),
          updatedAt: String(jobControlResult.data.updated_at || new Date().toISOString()),
        }
      : defaultStoreSnapshot().jobControl,
    sourceControls: (sourceControlsResult.data || []).map((row) => ({
      sourceSlug: String(row.source_slug),
      paused: Boolean(row.paused),
      updatedAt: String(row.updated_at || new Date().toISOString()),
    })),
    runs: (runsResult.data || []).map(mapRunRow),
    candidates: (candidatesResult.data || []).map(mapCandidateRow),
    articles: (articlesResult.data || []).map(mapArticleRow),
  });
}

function serializeBody(body, locale) {
  return (Array.isArray(body) ? body : [])
    .map((paragraph) => String((paragraph && (paragraph[locale] || paragraph.en)) || '').trim())
    .filter(Boolean)
    .join('\n\n');
}

function buildIdMaps(store) {
  const snapshot = normalizeStore(store);
  const candidateIds = new Map();
  const articleIds = new Map();
  const runIds = new Map();

  for (const candidate of snapshot.candidates) {
    candidateIds.set(
      candidate.id,
      coerceUuid(candidate.id, `${candidate.slug}:${candidate.canonicalUrl}`)
    );
  }

  for (const article of snapshot.articles) {
    articleIds.set(
      article.id,
      coerceUuid(article.id, `${article.slug}:${article.candidateId}`)
    );
  }

  for (const run of snapshot.runs) {
    runIds.set(run.id, coerceUuid(run.id, `${run.startedAt}:${run.finishedAt || ''}`));
  }

  return { candidateIds, articleIds, runIds };
}

async function writeSupabaseStore(store) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return normalizeStore(store);
  }

  const snapshot = normalizeStore(store);
  const { candidateIds, articleIds, runIds } = buildIdMaps(snapshot);

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
        id: candidateIds.get(candidate.id),
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
        id: articleIds.get(article.id),
        candidate_id: candidateIds.get(article.candidateId) || coerceUuid(article.candidateId, article.slug),
        slug: article.slug,
        lane: article.lane,
        title_en: article.title.en,
        title_zh: article.title.zh,
        excerpt_en: article.excerpt.en,
        excerpt_zh: article.excerpt.zh,
        body_en: serializeBody(article.body, 'en'),
        body_zh: serializeBody(article.body, 'zh'),
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
        id: runIds.get(run.id),
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

  return readSupabaseStore();
}

async function readStoreSnapshot(storePath, options = {}) {
  if (!shouldUseSupabaseStore(options)) {
    return readStore(storePath);
  }

  try {
    const persistedStore = await withSupabaseRetries(readSupabaseStore);
    try {
      writeStore(storePath, persistedStore);
    } catch (mirrorError) {
      console.error(`Unable to refresh local ${RADAR_LABEL} store mirror.`, mirrorError);
    }
    return persistedStore;
  } catch (error) {
    console.error(`Falling back to file-backed ${RADAR_LABEL} store.`, error);
    return readStore(storePath);
  }
}

async function writeStoreSnapshot(storePath, store, options = {}) {
  if (!shouldUseSupabaseStore(options)) {
    writeStore(storePath, store);
    return normalizeStore(store);
  }

  try {
    const persistedStore = await withSupabaseRetries(() => writeSupabaseStore(store));
    writeStore(storePath, persistedStore);
    return persistedStore;
  } catch (error) {
    console.error(`Falling back to file-backed ${RADAR_LABEL} store on write.`, error);
    writeStore(storePath, store);
    return normalizeStore(store);
  }
}

module.exports = {
  readStoreSnapshot,
  shouldUseSupabaseStore,
  writeStoreSnapshot,
};
