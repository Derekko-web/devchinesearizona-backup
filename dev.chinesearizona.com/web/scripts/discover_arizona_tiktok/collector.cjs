const fs = require('node:fs');
const path = require('node:path');

const cheerio = require('cheerio');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const TRAVEL_PAGE_URL = 'https://www.tiktok.com/travel/Arizona-22535865260516610';
const SOURCE_SURFACE = 'tiktok_arizona_travel';
const DEFAULT_MAX_SCROLLS = 6;
const CATEGORY_SPECS = [
  { label: 'Things to do', slug: 'things_to_do' },
  { label: 'Restaurants', slug: 'restaurants' },
  { label: 'Hotels', slug: 'hotels' },
  { label: 'Parks', slug: 'parks' },
  { label: 'Shopping', slug: 'shopping' },
];
const STALE_ELIGIBLE_STATUSES = new Set(['queued', 'review_ready', 'approved']);

function defaultOutputPath() {
  return path.join(ROOT, 'data', 'discover-arizona-staging', 'last-collector-run.json');
}

function parseArgs(argv) {
  const args = {
    command: 'run',
    headed: false,
    outputPath: defaultOutputPath(),
    maxScrolls: DEFAULT_MAX_SCROLLS,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === 'run') {
      args.command = 'run';
      continue;
    }
    if (value === '--headed') {
      args.headed = true;
      continue;
    }
    if (value === '--help' || value === '-h') {
      args.command = 'help';
      continue;
    }
    if (value.startsWith('--output-path=')) {
      args.outputPath = path.resolve(value.slice('--output-path='.length));
      continue;
    }
    if (value.startsWith('--max-scrolls=')) {
      const parsed = Number(value.slice('--max-scrolls='.length));
      if (Number.isFinite(parsed) && parsed > 0) {
        args.maxScrolls = Math.floor(parsed);
      }
    }
  }

  return args;
}

function printHelp() {
  process.stdout.write(
    [
      'Discover Arizona TikTok collector',
      '',
      'Usage:',
      '  node scripts/discover_arizona_tiktok/collector.cjs run [--headed] [--output-path=/abs/path.json] [--max-scrolls=6]',
      '',
      'Environment:',
      '  NEXT_PUBLIC_SUPABASE_URL',
      '  SUPABASE_SERVICE_ROLE_KEY',
      '',
    ].join('\n')
  );
}

function parseTikTokPostId(url) {
  const match = String(url).match(/\/video\/(\d+)/i);
  return match ? match[1] : null;
}

function parseTikTokCreatorHandle(url) {
  const match = String(url).match(/\/@([^/?]+)/i);
  return match ? match[1] : null;
}

function buildTikTokCreatorProfileUrl(handle) {
  return handle ? `https://www.tiktok.com/@${handle}` : null;
}

function normalizeVideoUrl(rawUrl, pageUrl) {
  if (!rawUrl) {
    return null;
  }

  let normalizedUrl;
  try {
    const resolved = new URL(rawUrl, pageUrl);
    if (!/(\.|^)tiktok\.com$/i.test(resolved.hostname)) {
      return null;
    }
    if (!/\/video\/\d+/i.test(resolved.pathname)) {
      return null;
    }
    normalizedUrl = `https://www.tiktok.com${resolved.pathname}`;
  } catch (_error) {
    return null;
  }

  return normalizedUrl;
}

function extractTikTokTravelCandidatesFromHtml({
  html,
  discoveredCategory,
  collectedAt,
  pageUrl = TRAVEL_PAGE_URL,
  collectorRunId = null,
}) {
  const candidateMap = new Map();
  const $ = cheerio.load(html);

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    const normalizedUrl = normalizeVideoUrl(href, pageUrl);
    if (!normalizedUrl) {
      return;
    }

    const postId = parseTikTokPostId(normalizedUrl);
    if (!postId) {
      return;
    }

    const creatorHandle = parseTikTokCreatorHandle(normalizedUrl);
    candidateMap.set(postId, {
      sourceUrl: normalizedUrl,
      postId,
      creatorHandle,
      creatorProfileUrl: buildTikTokCreatorProfileUrl(creatorHandle),
      discoveredCategories: [discoveredCategory],
      sourceSurface: SOURCE_SURFACE,
      firstSeenAt: collectedAt,
      lastSeenAt: collectedAt,
      queueStatus: 'queued',
      collectorRunId,
      collectorNotes: `Collected from TikTok Arizona travel category: ${discoveredCategory}`,
      missingRunCount: 0,
    });
  });

  const rawMatches = html.match(/https?:\/\/(?:www\.)?tiktok\.com\/@[^"'\\\s]+\/video\/\d+/gi) ?? [];
  for (const match of rawMatches) {
    const normalizedUrl = normalizeVideoUrl(match, pageUrl);
    if (!normalizedUrl) {
      continue;
    }
    const postId = parseTikTokPostId(normalizedUrl);
    if (!postId || candidateMap.has(postId)) {
      continue;
    }

    const creatorHandle = parseTikTokCreatorHandle(normalizedUrl);
    candidateMap.set(postId, {
      sourceUrl: normalizedUrl,
      postId,
      creatorHandle,
      creatorProfileUrl: buildTikTokCreatorProfileUrl(creatorHandle),
      discoveredCategories: [discoveredCategory],
      sourceSurface: SOURCE_SURFACE,
      firstSeenAt: collectedAt,
      lastSeenAt: collectedAt,
      queueStatus: 'queued',
      collectorRunId,
      collectorNotes: `Collected from TikTok Arizona travel category: ${discoveredCategory}`,
      missingRunCount: 0,
    });
  }

  return Array.from(candidateMap.values());
}

function mergeCategoryCandidates(candidates) {
  const merged = new Map();

  for (const candidate of candidates) {
    const existing = merged.get(candidate.postId);
    if (!existing) {
      merged.set(candidate.postId, {
        ...candidate,
        discoveredCategories: [...candidate.discoveredCategories].sort(),
      });
      continue;
    }

    merged.set(candidate.postId, {
      ...existing,
      sourceUrl: candidate.sourceUrl || existing.sourceUrl,
      creatorHandle: candidate.creatorHandle || existing.creatorHandle,
      creatorProfileUrl: candidate.creatorProfileUrl || existing.creatorProfileUrl,
      lastSeenAt: candidate.lastSeenAt,
      collectorRunId: candidate.collectorRunId || existing.collectorRunId,
      collectorNotes: candidate.collectorNotes || existing.collectorNotes,
      discoveredCategories: Array.from(
        new Set([...existing.discoveredCategories, ...candidate.discoveredCategories])
      ).sort(),
    });
  }

  return Array.from(merged.values());
}

function computeMissingCandidateUpdates(existingRows, seenPostIds, collectedAt) {
  return existingRows
    .filter((row) => row.source_surface === SOURCE_SURFACE)
    .filter((row) => !seenPostIds.has(row.post_id))
    .map((row) => {
      const nextMissingRunCount = Number(row.missing_run_count || 0) + 1;
      const shouldMarkStale =
        nextMissingRunCount >= 3 && STALE_ELIGIBLE_STATUSES.has(row.queue_status);

      return {
        id: row.id,
        missing_run_count: nextMissingRunCount,
        queue_status: shouldMarkStale ? 'stale' : row.queue_status,
        last_seen_at: row.last_seen_at || collectedAt,
      };
    });
}

function buildRestUrl(baseUrl, pathname, query = {}) {
  const url = new URL(pathname, `${baseUrl.replace(/\/$/, '')}/`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

async function requestJson(url, init) {
  const response = await fetch(url, init);
  const bodyText = await response.text();
  const body = bodyText ? JSON.parse(bodyText) : null;
  if (!response.ok) {
    throw new Error(body?.message || body?.error_description || body?.hint || `Supabase request failed: ${response.status}`);
  }

  return body;
}

async function fetchExistingCandidates(supabaseUrl, serviceRoleKey) {
  return requestJson(
    buildRestUrl(supabaseUrl, '/rest/v1/discover_video_candidates', {
      select:
        'id,post_id,source_url,creator_handle,creator_profile_url,discovered_categories,source_surface,first_seen_at,last_seen_at,queue_status,collector_run_id,collector_notes,missing_run_count',
      order: 'last_seen_at.desc',
    }),
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }
  );
}

async function upsertObservedCandidates({
  supabaseUrl,
  serviceRoleKey,
  observedCandidates,
  existingRows,
}) {
  const existingByPostId = new Map(existingRows.map((row) => [row.post_id, row]));
  const payload = observedCandidates.map((candidate) => {
    const existing = existingByPostId.get(candidate.postId);
    const discoveredCategories = Array.from(
      new Set([
        ...((existing?.discovered_categories || []).filter(Boolean)),
        ...candidate.discoveredCategories,
      ])
    ).sort();

    return {
      source_url: candidate.sourceUrl,
      post_id: candidate.postId,
      creator_handle: candidate.creatorHandle || null,
      creator_profile_url: candidate.creatorProfileUrl || null,
      discovered_categories: discoveredCategories,
      source_surface: SOURCE_SURFACE,
      first_seen_at: existing?.first_seen_at || candidate.firstSeenAt,
      last_seen_at: candidate.lastSeenAt,
      queue_status: existing?.queue_status || candidate.queueStatus,
      collector_run_id: candidate.collectorRunId || existing?.collector_run_id || null,
      collector_notes: candidate.collectorNotes || existing?.collector_notes || null,
      missing_run_count: 0,
    };
  });

  if (payload.length === 0) {
    return [];
  }

  return requestJson(
    buildRestUrl(supabaseUrl, '/rest/v1/discover_video_candidates', {
      on_conflict: 'post_id',
    }),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(payload),
    }
  );
}

async function applyMissingUpdates(supabaseUrl, serviceRoleKey, updates) {
  for (const update of updates) {
    await requestJson(
      buildRestUrl(supabaseUrl, '/rest/v1/discover_video_candidates', {
        id: `eq.${update.id}`,
        select: 'id',
      }),
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          missing_run_count: update.missing_run_count,
          queue_status: update.queue_status,
          last_seen_at: update.last_seen_at,
        }),
      }
    );
  }
}

function ensureCollectorEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for the Discover Arizona collector.'
    );
  }

  return { supabaseUrl, serviceRoleKey };
}

async function maybeClickCategory(page, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exactPattern = new RegExp(`^\\s*${escapedLabel}\\s*$`, 'i');
  const locators = [
    page.getByRole('tab', { name: exactPattern }),
    page.getByRole('button', { name: exactPattern }),
    page.getByRole('link', { name: exactPattern }),
    page.getByText(exactPattern),
  ];

  for (const locator of locators) {
    const target = locator.first();
    if ((await target.count()) === 0) {
      continue;
    }

    try {
      await target.click({ timeout: 3000 });
      await page.waitForTimeout(1200);
      return true;
    } catch (_error) {
      continue;
    }
  }

  return false;
}

async function maybeDismissCookieBanner(page) {
  const labels = ['Accept all', 'Accept', 'Allow all', 'Got it'];
  for (const label of labels) {
    const locator = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
    if ((await locator.count()) === 0) {
      continue;
    }
    try {
      await locator.click({ timeout: 1500 });
      await page.waitForTimeout(500);
      return;
    } catch (_error) {
      continue;
    }
  }
}

async function scrollForCandidates(page, maxScrolls) {
  let previousCount = 0;
  for (let index = 0; index < maxScrolls; index += 1) {
    const currentCount = await page.locator('a[href*="/video/"]').count();
    await page.mouse.wheel(0, 2200);
    await page.waitForTimeout(800);

    if (index > 1 && currentCount === previousCount) {
      break;
    }

    previousCount = currentCount;
  }
}

async function collectCandidatesForCategory(page, categorySpec, collectedAt, collectorRunId, maxScrolls) {
  const clicked = await maybeClickCategory(page, categorySpec.label);
  await scrollForCandidates(page, maxScrolls);

  const html = await page.content();
  const candidates = extractTikTokTravelCandidatesFromHtml({
    html,
    discoveredCategory: categorySpec.slug,
    collectedAt,
    pageUrl: page.url(),
    collectorRunId,
  });

  return {
    category: categorySpec.slug,
    clicked,
    candidateCount: candidates.length,
    candidates,
  };
}

function writeRunManifest(outputPath, payload) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function runCollector(options = {}) {
  const { supabaseUrl, serviceRoleKey } = ensureCollectorEnv();
  const collectedAt = new Date().toISOString();
  const collectorRunId = `discover-${collectedAt}`;
  let browser;

  try {
    browser = await chromium.launch({
      headless: options.headed ? false : true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to launch Playwright Chromium. This host likely needs browser system dependencies (for example via "npx playwright install-deps chromium"). Original error: ${message}`
    );
  }

  const manifest = {
    collectorRunId,
    collectedAt,
    sourceUrl: TRAVEL_PAGE_URL,
    categories: [],
    observedCount: 0,
    staleUpdatedCount: 0,
    wroteToSupabase: false,
    errors: [],
  };

  try {
    const context = await browser.newContext({
      locale: 'en-US',
      viewport: { width: 1440, height: 1200 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    await page.goto(TRAVEL_PAGE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await page.waitForTimeout(2500);
    await maybeDismissCookieBanner(page);

    const categoryRuns = [];
    for (const categorySpec of CATEGORY_SPECS) {
      try {
        const result = await collectCandidatesForCategory(
          page,
          categorySpec,
          collectedAt,
          collectorRunId,
          options.maxScrolls || DEFAULT_MAX_SCROLLS
        );
        manifest.categories.push({
          category: result.category,
          clicked: result.clicked,
          candidateCount: result.candidateCount,
        });
        categoryRuns.push(...result.candidates);
      } catch (error) {
        manifest.errors.push(
          error instanceof Error
            ? `${categorySpec.slug}: ${error.message}`
            : `${categorySpec.slug}: unknown error`
        );
      }
    }

    const observedCandidates = mergeCategoryCandidates(categoryRuns);
    manifest.observedCount = observedCandidates.length;

    if (observedCandidates.length === 0) {
      throw new Error(
        'The collector did not find any TikTok candidates. Skipping database updates to avoid marking live content stale.'
      );
    }

    const existingRows = await fetchExistingCandidates(supabaseUrl, serviceRoleKey);
    const seenPostIds = new Set(observedCandidates.map((candidate) => candidate.postId));
    const staleUpdates = computeMissingCandidateUpdates(existingRows, seenPostIds, collectedAt);

    await upsertObservedCandidates({
      supabaseUrl,
      serviceRoleKey,
      observedCandidates,
      existingRows,
    });
    await applyMissingUpdates(supabaseUrl, serviceRoleKey, staleUpdates);

    manifest.staleUpdatedCount = staleUpdates.length;
    manifest.wroteToSupabase = true;
    writeRunManifest(options.outputPath || defaultOutputPath(), manifest);

    await context.close();
    return manifest;
  } catch (error) {
    manifest.errors.push(error instanceof Error ? error.message : 'Unknown collector error.');
    writeRunManifest(options.outputPath || defaultOutputPath(), manifest);
    throw error;
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.command === 'help') {
    printHelp();
    return;
  }

  if (args.command !== 'run') {
    throw new Error(`Unsupported command: ${args.command}`);
  }

  const manifest = await runCollector({
    headed: args.headed,
    outputPath: args.outputPath,
    maxScrolls: args.maxScrolls,
  });

  process.stdout.write(
    `discover arizona collector complete: observed=${manifest.observedCount} stale_updates=${manifest.staleUpdatedCount} output=${args.outputPath}\n`
  );
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  CATEGORY_SPECS,
  DEFAULT_MAX_SCROLLS,
  SOURCE_SURFACE,
  STALE_ELIGIBLE_STATUSES,
  TRAVEL_PAGE_URL,
  computeMissingCandidateUpdates,
  defaultOutputPath,
  extractTikTokTravelCandidatesFromHtml,
  mergeCategoryCandidates,
  normalizeVideoUrl,
  parseTikTokCreatorHandle,
  parseTikTokPostId,
  runCollector,
};
