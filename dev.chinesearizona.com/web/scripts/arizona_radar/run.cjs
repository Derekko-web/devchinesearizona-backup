#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const {
  applyDraftsToStore,
} = require('./core.cjs');
const {
  readStoreSnapshot,
  writeStoreSnapshot,
} = require('./storage.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_STORE_PATH = path.join(ROOT, 'data', 'radar-runtime', 'store.json');
const MANIFEST_PATH = path.join(ROOT, 'src', 'data', 'radar-source-manifest.json');

function parseArgs(argv) {
  const args = {
    command: 'run',
    fixturePath: process.env.RADAR_FIXTURE_PATH || '',
    draftMultiplier: Number(process.env.RADAR_DRAFT_MULTIPLIER || 2),
    hermesBin: process.env.HERMES_BIN || 'hermes',
    hermesTimeoutMs: Number(process.env.RADAR_HERMES_TIMEOUT_MS || 240000),
    lookbackHours: 24,
    maxItems: 10,
    sourceBatchSize: Number(process.env.RADAR_SOURCE_BATCH_SIZE || 0),
    sourceSlugs: process.env.RADAR_SOURCE_SLUGS || '',
    storePath: process.env.RADAR_STORE_PATH || DEFAULT_STORE_PATH,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === 'run') {
      args.command = 'run';
      continue;
    }
    if (value === '--help' || value === '-h') {
      args.command = 'help';
      continue;
    }
    if (value.startsWith('--fixture=')) {
      args.fixturePath = path.resolve(value.slice('--fixture='.length));
      continue;
    }
    if (value.startsWith('--hermes-bin=')) {
      args.hermesBin = value.slice('--hermes-bin='.length);
      continue;
    }
    if (value.startsWith('--draft-multiplier=')) {
      const parsed = Number(value.slice('--draft-multiplier='.length));
      if (Number.isFinite(parsed) && parsed >= 1) {
        args.draftMultiplier = parsed;
      }
      continue;
    }
    if (value.startsWith('--lookback-hours=')) {
      const parsed = Number(value.slice('--lookback-hours='.length));
      if (Number.isFinite(parsed) && parsed > 0) {
        args.lookbackHours = Math.floor(parsed);
      }
      continue;
    }
    if (value.startsWith('--hermes-timeout-ms=')) {
      const parsed = Number(value.slice('--hermes-timeout-ms='.length));
      if (Number.isFinite(parsed) && parsed > 0) {
        args.hermesTimeoutMs = Math.floor(parsed);
      }
      continue;
    }
    if (value.startsWith('--max-items=')) {
      const parsed = Number(value.slice('--max-items='.length));
      if (Number.isFinite(parsed) && parsed > 0) {
        args.maxItems = Math.floor(parsed);
      }
      continue;
    }
    if (value.startsWith('--source-batch-size=')) {
      const parsed = Number(value.slice('--source-batch-size='.length));
      if (Number.isFinite(parsed) && parsed >= 0) {
        args.sourceBatchSize = Math.floor(parsed);
      }
      continue;
    }
    if (value.startsWith('--source-slugs=')) {
      args.sourceSlugs = value.slice('--source-slugs='.length);
      continue;
    }
    if (value.startsWith('--store-path=')) {
      args.storePath = path.resolve(value.slice('--store-path='.length));
    }
  }

  return args;
}

function printHelp() {
  process.stdout.write(
    [
      'Arizona Radar worker',
      '',
      'Usage:',
      '  node scripts/arizona_radar/run.cjs run [--fixture=/abs/path.json] [--draft-multiplier=2] [--lookback-hours=24] [--hermes-timeout-ms=240000] [--max-items=10] [--source-batch-size=0] [--source-slugs=slug-a,slug-b] [--store-path=/abs/store.json]',
      '',
      'Environment:',
      '  HERMES_BIN=hermes',
      '  RADAR_DRAFT_MULTIPLIER=2',
      '  RADAR_FIXTURE_PATH=/abs/fixture.json',
      '  RADAR_STORE_PATH=/abs/store.json',
      '',
    ].join('\n')
  );
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, 'utf8');
  for (const line of contents.split(/\r?\n/g)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function parseSourceSlugFilter(value) {
  return Array.from(
    new Set(
      String(value || '')
        .split(',')
        .map((slug) => slug.trim())
        .filter(Boolean)
    )
  );
}

function parseFixturePayload(filePath) {
  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.drafts)) {
    return payload.drafts;
  }

  return [];
}

function extractJsonPayload(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return '[]';
  }

  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch (_error) {
    // fall through
  }

  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch && fencedMatch[1]) {
    return fencedMatch[1].trim();
  }

  const firstArrayIndex = trimmed.indexOf('[');
  const lastArrayIndex = trimmed.lastIndexOf(']');
  if (firstArrayIndex >= 0 && lastArrayIndex > firstArrayIndex) {
    return trimmed.slice(firstArrayIndex, lastArrayIndex + 1);
  }

  const firstObjectIndex = trimmed.indexOf('{');
  const lastObjectIndex = trimmed.lastIndexOf('}');
  if (firstObjectIndex >= 0 && lastObjectIndex > firstObjectIndex) {
    return trimmed.slice(firstObjectIndex, lastObjectIndex + 1);
  }

  return '[]';
}

function parseHermesOutput(text) {
  const parsed = JSON.parse(extractJsonPayload(text));
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && Array.isArray(parsed.items)) {
    return parsed.items;
  }
  if (parsed && Array.isArray(parsed.drafts)) {
    return parsed.drafts;
  }
  return [];
}

function buildHermesPrompt(manifest, maxItems, lookbackHours, options = {}) {
  const sourceMode = manifest.length === 0 ? 'open-web' : manifest.length === 1 ? 'seeded' : 'seeded-multi';
  const sourceList = manifest
    .map((source) => {
      return `- ${source.name} | ${source.url}`;
    })
    .join('\n');
  const prompt = [
    'You are preparing structured Arizona Radar drafts for ChineseArizona.',
    `Mode: ${sourceMode}. You are the autonomous operator for source discovery and article drafting.`,
    `Look back roughly ${lookbackHours} hours from now and return at most ${maxItems} Arizona-relevant items total.`,
    'Search the public web freely. Do not limit yourself to any preset source allowlist.',
    'You may use news sites, public social posts, government pages, company blogs, newsletters, event pages, community forums, and local publications, as long as the item is clearly about Arizona.',
    'Prioritize the newest useful Arizona items first, but if enough material exists in the time window, fill the requested count so the feed can sustain a steady publishing cadence.',
  ];

  if (sourceList) {
    prompt.push(
      '',
      'Optional starting points only. These are hints, not restrictions:',
      sourceList
    );
  }

  prompt.push(
    '',
    'Do the work yourself:',
    '- Search broadly across Arizona news, blogs, official sites, newsletters, public social platforms, and community posts.',
    '- Open specific article/detail pages when needed.',
    '- Prefer lightweight methods such as RSS feeds, direct HTML fetches, article metadata, and public pages you can read without graphical browser automation.',
    '- Decide which items are truly Arizona-relevant and recent enough.',
    '- Read enough of each source to produce a real rewrite, not a thin summary.',
    '- Capture the best specific article URL and article hero image when available.',
    '',
    'Output JSON only. No markdown. No commentary.',
    'Return either [] or an array of objects with this exact schema:',
    '[',
    '  {',
    '    "sourceName": "publisher, site, newsletter, or account name",',
    '    "sourceUrl": "specific article/post URL, not the section homepage",',
    '    "canonicalUrl": "specific article/post URL, not the section homepage",',
    '    "sourcePublishedAt": "ISO-8601 optional",',
    '    "titleEn": "short English headline",',
    '    "titleZh": "matching Traditional Chinese headline",',
    '    "excerptEn": "2-3 sentence English deck that captures the full angle of the story",',
    '    "excerptZh": "matching Traditional Chinese deck covering the same angle",',
    '    "bodyEn": ["3-6 substantial English paragraphs that fully rewrite the source in original words"],',
    '    "bodyZh": ["3-6 Traditional Chinese paragraphs aligned to the English rewrite"],',
    '    "heroImage": "https://source-image.example/hero.jpg optional for non-social sources",',
    '    "topicFingerprint": "stable short topic description"',
    '  }',
    ']',
    '',
    'Rules:',
    '- Every item must be clearly about Arizona and useful to Arizona residents, movers, or local business owners.',
    '- Provide both English and Traditional Chinese copy for the title, excerpt, and body. The Chinese version should faithfully match the English rewrite rather than adding new facts.',
    '- Reject anything that is not specifically tied to Arizona, Phoenix metro, Tucson, Mesa, Scottsdale, Tempe, Glendale, Chandler, Gilbert, Peoria, Surprise, Goodyear, Flagstaff, Yuma, Prescott, or another Arizona place.',
    '- Official/news/blog sources must become comprehensive rewrites, not short blurbs. Cover the full article in original words, including key facts, names, numbers, timeline, and why it matters in Arizona.',
    '- When useful, add concise Arizona-specific context or implications, but do not invent facts or unsupported claims.',
    '- If the source page exposes a clear article image or OG image and the source is not signal_only, include it in heroImage.',
    '- Public social sources must become signal_only trend summaries. Do not reuse captions, hashtags, quotes, embeds, or any third-party media URLs.',
    '- Do not fabricate filler. If there are fewer than the requested count, return fewer.',
    '- As soon as you have enough qualifying items, stop searching and return the JSON immediately.',
    '- Never use a section homepage as sourceUrl or canonicalUrl when a specific article page exists.',
    '- If a source has no qualifying item, skip it instead of guessing.',
  );

  if (options.retry) {
    prompt.push(
      '- The previous attempt returned zero items. Widen the search and look beyond any familiar sites before giving up.'
    );
  }

  return prompt.join('\n');
}

function collectDraftsWithHermes({
  hermesBin,
  hermesTimeoutMs,
  manifest,
  maxItems,
  lookbackHours,
  maxTurns = 8,
  promptOptions = {},
}) {
  const prompt = buildHermesPrompt(manifest, maxItems, lookbackHours, promptOptions);
  const result = spawnSync(
    hermesBin,
    ['chat', '-Q', '--yolo', '--max-turns', String(maxTurns), '-q', prompt],
    {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
      timeout: hermesTimeoutMs,
    }
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'Hermes failed.').trim());
  }

  return parseHermesOutput(result.stdout);
}

function dedupeDrafts(drafts) {
  const seen = new Set();
  const nextDrafts = [];

  for (const draft of drafts) {
    if (!draft || typeof draft !== 'object') {
      continue;
    }

    const key = String(
      draft.canonicalUrl ||
        draft.sourceUrl ||
        `${draft.sourceSlug || ''}:${draft.topicFingerprint || draft.titleEn || ''}`
    ).trim();
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    nextDrafts.push(draft);
  }

  return nextDrafts;
}

function collectDraftsWithHermesRetry({
  hermesBin,
  hermesTimeoutMs,
  manifest,
  maxItems,
  lookbackHours,
}) {
  return dedupeDrafts(
    collectDraftsWithHermes({
      hermesBin,
      hermesTimeoutMs,
      manifest,
      maxItems,
      lookbackHours,
      maxTurns: manifest.length <= 1 ? 12 : 14,
      promptOptions: { retry: true },
    })
  ).slice(0, maxItems);
}

function sourceIsPaused(store, sourceSlug) {
  return store.sourceControls.some((control) => control.sourceSlug === sourceSlug && control.paused);
}

function selectManifestBatch(manifest, batchSize, nowIso) {
  const normalizedSize = Number.isFinite(batchSize) ? Math.max(0, Math.floor(batchSize)) : 0;
  if (normalizedSize <= 0 || manifest.length <= normalizedSize) {
    return manifest;
  }

  const slot = Math.floor(new Date(nowIso).getTime() / (5 * 60 * 1000));
  const startIndex = ((slot * normalizedSize) % manifest.length + manifest.length) % manifest.length;

  return Array.from({ length: normalizedSize }, (_, offset) => {
    return manifest[(startIndex + offset) % manifest.length];
  });
}

function appendRun(store, run) {
  return {
    ...store,
    runs: [run, ...store.runs].slice(0, 50),
  };
}

function buildRunRecord(input) {
  return {
    id: input.id,
    worker: 'hermes',
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    status: input.status,
    candidateCount: input.candidateCount || 0,
    publishedCount: input.publishedCount || 0,
    blockedCount: input.blockedCount || 0,
    duplicateCount: input.duplicateCount || 0,
    errorMessage: input.errorMessage,
    latestPublishedAt: input.latestPublishedAt,
  };
}

async function runWorker(args) {
  loadEnvFile(path.join(ROOT, '.env.local'));
  const manifest = loadManifest();
  const startedAt = new Date().toISOString();
  const runId = `arizona-radar-${startedAt}`;
  const initialStore = await readStoreSnapshot(args.storePath);

  if (initialStore.jobControl.paused) {
    const pausedStore = appendRun(
      initialStore,
      buildRunRecord({
        id: runId,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: 'paused',
      })
    );
    await writeStoreSnapshot(args.storePath, pausedStore);
    return { status: 'paused', runId, storePath: args.storePath };
  }

  const requestedSourceSlugs = parseSourceSlugFilter(args.sourceSlugs);
  const filteredManifest = manifest
    .filter((source) =>
      requestedSourceSlugs.length > 0
        ? requestedSourceSlugs.includes(source.slug)
        : true
    )
    .filter((source) => !sourceIsPaused(initialStore, source.slug));
  const activeManifest =
    requestedSourceSlugs.length > 0
      ? filteredManifest
      : selectManifestBatch(filteredManifest, args.sourceBatchSize, startedAt);
  const publishCap = Math.min(initialStore.jobControl.publishCap || 10, args.maxItems);
  const draftTargetCount = Math.max(
    publishCap,
    Math.floor(
      publishCap *
        (Number.isFinite(args.draftMultiplier) ? Math.max(1, args.draftMultiplier) : 1)
    )
  );

  try {
    const drafts = args.fixturePath
      ? parseFixturePayload(args.fixturePath)
        : collectDraftsWithHermes({
          hermesBin: args.hermesBin,
          hermesTimeoutMs: args.hermesTimeoutMs,
          manifest: activeManifest,
          maxItems: draftTargetCount,
          lookbackHours: args.lookbackHours,
          maxTurns: activeManifest.length <= 1 ? 10 : 12,
        });
    const recoveredDrafts =
      !args.fixturePath && drafts.length === 0
        ? collectDraftsWithHermesRetry({
            hermesBin: args.hermesBin,
            hermesTimeoutMs: args.hermesTimeoutMs,
            manifest: activeManifest,
            maxItems: draftTargetCount,
            lookbackHours: args.lookbackHours,
          })
        : drafts;
    const filteredDrafts = dedupeDrafts(recoveredDrafts).filter((draft) => draft && typeof draft === 'object');
    const finishedAt = new Date().toISOString();
    const applied = applyDraftsToStore(initialStore, filteredDrafts, {
      manifest,
      publishCap,
      now: finishedAt,
    });
    const nextStore = appendRun(
      applied.store,
      buildRunRecord({
        id: runId,
        startedAt,
        finishedAt,
        status: 'completed',
        candidateCount: applied.summary.candidateCount,
        publishedCount: applied.summary.publishedCount,
        blockedCount: applied.summary.blockedCount,
        duplicateCount: applied.summary.duplicateCount,
        latestPublishedAt: applied.summary.latestPublishedAt,
      })
    );
    await writeStoreSnapshot(args.storePath, nextStore);

    return {
      status: 'completed',
      runId,
      storePath: args.storePath,
      ...applied.summary,
    };
  } catch (error) {
    const failedStore = appendRun(
      initialStore,
      buildRunRecord({
        id: runId,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      })
    );
    await writeStoreSnapshot(args.storePath, failedStore);
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.command === 'help') {
    printHelp();
    return;
  }

  const result = await runWorker(args);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
