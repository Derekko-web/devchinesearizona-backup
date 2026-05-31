#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const dns = require('node:dns').promises;
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const cheerio = require('cheerio');

const {
  applyDraftsToStore,
  normalizeCanonicalUrl,
} = require('./core.cjs');
const {
  readStoreSnapshot,
  writeStoreSnapshot,
} = require('./storage.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_VPS_RUNTIME_ROOT = '/var/www/runtime-data/dev.chinesearizona.com/web';

function resolveDefaultRuntimePath(relativePath) {
  if (process.env.CHINESEARIZONA_RUNTIME_DATA_ROOT) {
    return path.join(process.env.CHINESEARIZONA_RUNTIME_DATA_ROOT, relativePath);
  }

  if (ROOT === '/var/www/dev.chinesearizona.com/web') {
    return path.join(DEFAULT_VPS_RUNTIME_ROOT, relativePath);
  }

  return path.join(ROOT, relativePath);
}

const SITE_CONFIGS = {
  arizona: {
    key: 'arizona',
    brandName: 'ChineseArizona',
    defaultSourceName: 'Arizona Source',
    feedPromptTitle: 'Rewrite these Arizona Radar RSS items into full, original ChineseArizona articles.',
    openWebPromptTitle: 'You are preparing structured Arizona Radar drafts for ChineseArizona.',
    regionName: 'Arizona',
    regionRelevance:
      'Arizona, Phoenix metro, Tucson, Mesa, Scottsdale, Tempe, Glendale, Chandler, Gilbert, Peoria, Surprise, Goodyear, Flagstaff, Yuma, Prescott, or another Arizona place',
    runIdPrefix: 'arizona-radar',
    storePath: resolveDefaultRuntimePath(path.join('data', 'radar-runtime', 'store.json')),
    manifestPath: path.join(ROOT, 'src', 'data', 'radar-source-manifest.json'),
    useSupabase: true,
    summaryOnly: false,
  },
  austin: {
    key: 'austin',
    brandName: 'ChineseAustin',
    defaultSourceName: 'Austin Source',
    feedPromptTitle:
      'Summarize these Austin Radar RSS items into original ChineseAustin summary/link articles.',
    openWebPromptTitle: 'You are preparing structured Austin Radar drafts for ChineseAustin.',
    regionName: 'Austin',
    regionNameZh: '奥斯汀',
    regionRelevance:
      'Austin, Round Rock, Cedar Park, Pflugerville, Georgetown, Leander, Travis County, Williamson County, Central Texas, or another Austin-area place',
    summarySearchScope:
      'Austin and Central Texas news, official sites, newsletters, public social platforms, community posts, local blogs, business openings, transit, housing, and Austin-area sources',
    summaryRelevanceLabel: 'Austin/Central Texas-relevant',
    summaryRetryScope: 'Austin/Central Texas',
    runIdPrefix: 'austin-radar',
    storePath: resolveDefaultRuntimePath(
      path.join('data', 'sites', 'austin', 'radar-runtime', 'store.json')
    ),
    manifestPath: path.join(ROOT, 'src', 'data', 'austin-radar-source-manifest.json'),
    useSupabase: false,
    summaryOnly: true,
  },
  'los-angeles': {
    key: 'los-angeles',
    brandName: 'ChineseLosAngeles',
    defaultSourceName: 'Los Angeles Source',
    feedPromptTitle:
      'Summarize these Los Angeles Radar RSS items into short, original ChineseLosAngeles source-linked articles.',
    openWebPromptTitle:
      'You are preparing structured Los Angeles Radar drafts for ChineseLosAngeles.',
    regionName: 'Los Angeles',
    regionRelevance:
      'Los Angeles, San Gabriel Valley, Alhambra, Arcadia, Monterey Park, Pasadena, Rosemead, San Marino, Rowland Heights, Irvine, Orange County, LAX, or another Southern California place that directly affects Los Angeles readers',
    summarySearchScope:
      'Los Angeles and Southern California news, official sites, newsletters, public social platforms, community posts, local blogs, business openings, transit, housing, LAX, and San Gabriel Valley sources',
    summaryRelevanceLabel: 'Los Angeles/Southern California-relevant',
    summaryRetryScope: 'Los Angeles/Southern California',
    runIdPrefix: 'los-angeles-radar',
    storePath: resolveDefaultRuntimePath(
      path.join('data', 'sites', 'los-angeles', 'radar-runtime', 'store.json')
    ),
    manifestPath: path.join(ROOT, 'src', 'data', 'los-angeles-radar-source-manifest.json'),
    useSupabase: false,
    summaryOnly: true,
  },
  'sf-bay': {
    key: 'sf-bay',
    brandName: 'ChineseSFBay',
    defaultSourceName: 'SF Bay Source',
    feedPromptTitle:
      'Summarize these SF Bay Radar RSS items into original ChineseSFBay summary/link articles.',
    openWebPromptTitle: 'You are preparing structured SF Bay Radar drafts for ChineseSFBay.',
    regionName: 'SF Bay',
    regionNameZh: '灣區',
    regionRelevance:
      'San Francisco, Oakland, Berkeley, San Jose, Santa Clara, Sunnyvale, Cupertino, Fremont, Milpitas, Daly City, the Peninsula, South Bay, East Bay, North Bay, or another San Francisco Bay Area place',
    summarySearchScope:
      'San Francisco Bay Area news, official sites, newsletters, public social platforms, community posts, local blogs, business openings, transit, housing, SFO, OAK, SJC, Peninsula, South Bay, East Bay, and North Bay sources',
    summaryRelevanceLabel: 'SF Bay/Bay Area-relevant',
    summaryRetryScope: 'SF Bay/Bay Area',
    runIdPrefix: 'sf-bay-radar',
    storePath: resolveDefaultRuntimePath(path.join('data', 'sf-bay-radar-runtime', 'store.json')),
    manifestPath: path.join(ROOT, 'src', 'data', 'sf-bay-radar-source-manifest.json'),
    useSupabase: false,
    summaryOnly: true,
  },
};

function normalizeSiteKey(value) {
  const normalized = String(value || 'arizona').trim().toLowerCase();
  if (normalized === 'la' || normalized === 'los_angeles') {
    return 'los-angeles';
  }
  if (normalized === 'atx') {
    return 'austin';
  }
  if (
    normalized === 'sfbay' ||
    normalized === 'sf_bay' ||
    normalized === 'bay-area' ||
    normalized === 'bay_area' ||
    normalized === 'san-francisco' ||
    normalized === 'san_francisco'
  ) {
    return 'sf-bay';
  }

  return SITE_CONFIGS[normalized] ? normalized : 'arizona';
}

function getSiteConfig(siteKey) {
  const baseConfig = SITE_CONFIGS[normalizeSiteKey(siteKey)];
  return {
    ...baseConfig,
    brandName: process.env.RADAR_BRAND_NAME || baseConfig.brandName,
    regionName: process.env.RADAR_REGION_NAME || baseConfig.regionName,
    regionNameZh: process.env.RADAR_REGION_NAME_ZH || baseConfig.regionNameZh,
    regionRelevance: process.env.RADAR_REGION_PLACES || baseConfig.regionRelevance,
    manifestPath: process.env.RADAR_SOURCE_MANIFEST_PATH
      ? path.resolve(process.env.RADAR_SOURCE_MANIFEST_PATH)
      : baseConfig.manifestPath,
    summaryOnly: parseBoolean(process.env.RADAR_SUMMARY_ONLY, baseConfig.summaryOnly),
  };
}

function resolveStorePath(siteKey) {
  const siteConfig = getSiteConfig(siteKey);
  const envKey = siteConfig.key.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const siteSpecificPath =
    process.env[`RADAR_STORE_PATH_${envKey}`] ||
    (siteConfig.key === 'austin' ? process.env.AUSTIN_RADAR_STORE_PATH : undefined) ||
    (siteConfig.key === 'los-angeles' ? process.env.LOS_ANGELES_RADAR_STORE_PATH : undefined) ||
    (siteConfig.key === 'sf-bay' ? process.env.SF_BAY_RADAR_STORE_PATH : undefined);

  if (siteSpecificPath) {
    return siteSpecificPath;
  }

  if (siteConfig.key === 'arizona' && process.env.RADAR_STORE_PATH) {
    return process.env.RADAR_STORE_PATH;
  }

  return siteConfig.storePath;
}

const DEFAULT_SITE_KEY = normalizeSiteKey(process.env.RADAR_SITE || process.env.RADAR_CITY_KEY);
const RADAR_CITY = getSiteConfig(DEFAULT_SITE_KEY);

function parseArgs(argv) {
  const args = {
    command: 'run',
    fixturePath: process.env.RADAR_FIXTURE_PATH || '',
    draftMultiplier: Number(process.env.RADAR_DRAFT_MULTIPLIER || 2),
    feedTimeoutMs: Number(process.env.RADAR_FEED_TIMEOUT_MS || 15000),
    hermesBin: process.env.HERMES_BIN || 'hermes',
    hermesMaxTurns: parsePositiveInteger(process.env.RADAR_HERMES_MAX_TURNS, 0),
    hermesTimeoutMs: Number(process.env.RADAR_HERMES_TIMEOUT_MS || 240000),
    lookbackHours: 24,
    maxItems: 10,
    retryEmpty: parseBoolean(process.env.RADAR_RETRY_EMPTY, false),
    site: normalizeSiteKey(process.env.RADAR_SITE || process.env.RADAR_CITY_KEY),
    sourceBatchSize: Number(process.env.RADAR_SOURCE_BATCH_SIZE || 0),
    sourceSlugs: process.env.RADAR_SOURCE_SLUGS || '',
    storePath: '',
  };
  args.storePath = resolveStorePath(args.site);

  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === 'run') {
      args.command = 'run';
      continue;
    }
    if (value.startsWith('--site=')) {
      args.site = normalizeSiteKey(value.slice('--site='.length));
      args.storePath = resolveStorePath(args.site);
      continue;
    }
    if (value.startsWith('--feed-timeout-ms=')) {
      const parsed = Number(value.slice('--feed-timeout-ms='.length));
      if (Number.isFinite(parsed) && parsed > 0) {
        args.feedTimeoutMs = Math.floor(parsed);
      }
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
    if (value.startsWith('--hermes-max-turns=')) {
      args.hermesMaxTurns = parsePositiveInteger(
        value.slice('--hermes-max-turns='.length),
        args.hermesMaxTurns
      );
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
    if (value.startsWith('--retry-empty=')) {
      args.retryEmpty = parseBoolean(value.slice('--retry-empty='.length), args.retryEmpty);
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

function parseBoolean(value, fallback) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function printHelp() {
  process.stdout.write(
    [
      `${RADAR_CITY.regionName} Radar worker`,
      '',
      'Usage:',
      '  node scripts/arizona_radar/run.cjs run [--site=arizona|austin|los-angeles] [--fixture=/abs/path.json] [--draft-multiplier=2] [--lookback-hours=24] [--hermes-max-turns=8] [--hermes-timeout-ms=240000] [--max-items=10] [--retry-empty=0] [--source-batch-size=0] [--source-slugs=slug-a,slug-b] [--store-path=/abs/store.json]',
      '',
      'Environment:',
      '  HERMES_BIN=hermes',
      '  RADAR_DRAFT_MULTIPLIER=2',
      '  RADAR_FEED_TIMEOUT_MS=15000',
      '  RADAR_FIXTURE_PATH=/abs/fixture.json',
      '  RADAR_HERMES_MAX_TURNS=8',
      '  RADAR_RETRY_EMPTY=0',
      '  RADAR_SITE=arizona',
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

function loadManifest(siteConfig = RADAR_CITY) {
  return JSON.parse(fs.readFileSync(siteConfig.manifestPath, 'utf8'));
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

function stripHtml(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }

  return cheerio
    .load(`<article>${normalized}</article>`)('article')
    .text()
    .replace(/\s+/g, ' ')
    .trim();
}

function readElementText($, element, selector) {
  return stripHtml($(element).find(selector).first().text());
}

function readElementAttr($, element, selector, attribute) {
  return String($(element).find(selector).first().attr(attribute) || '').trim();
}

function readAtomLink($, element) {
  const alternate = $(element).find('link[rel="alternate"]').first().attr('href');
  return String(alternate || $(element).find('link').first().attr('href') || '').trim();
}

function normalizeFeedDate(value) {
  const parsed = new Date(String(value || ''));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function isWithinLookback(isoDate, lookbackHours, now) {
  if (!isoDate) {
    return false;
  }

  const ageMs = new Date(now).getTime() - new Date(isoDate).getTime();
  return ageMs >= 0 && ageMs <= lookbackHours * 60 * 60 * 1000;
}

function extractImageFromHtml(value) {
  const $ = cheerio.load(String(value || ''));
  return String($('img').first().attr('src') || '').trim();
}

function readMetaContent($, selector) {
  return String($(selector).first().attr('content') || '').trim();
}

function feedSourceUrl(source) {
  return String(source.feedUrl || '').trim();
}

function laneContext(lane, siteConfig = RADAR_CITY) {
  if (lane === 'openings') {
    return {
      en: 'an openings story',
      zh: '開店消息',
      personas: ['local_families', 'business_owners'],
    };
  }
  if (lane === 'housing') {
    return {
      en: 'a housing story',
      zh: '住房消息',
      personas: ['tsmc_newcomers', 'local_families'],
    };
  }
  if (lane === 'official') {
    return {
      en: `a ${siteConfig.regionName} update`,
      zh: `${siteConfig.regionNameZh}更新`,
      personas: ['local_families', 'business_owners'],
    };
  }
  if (lane === 'social') {
    return {
      en: 'a public trend note',
      zh: '公開趨勢消息',
      personas: ['local_families', 'students'],
    };
  }

  return {
    en: 'a community story',
    zh: '社區消息',
    personas: ['local_families', 'students'],
  };
}

function ensureSentence(value) {
  const text = stripHtml(value).replace(/\s+/g, ' ').trim();
  if (!text) {
    return '';
  }

  return /[.!?。！？]$/.test(text) ? text : `${text}.`;
}

function firstFeedSummarySentence(value) {
  const text = stripHtml(value).replace(/\s+/g, ' ').trim();
  if (!text) {
    return '';
  }

  const match = text.match(/^(.{1,240}?[.!?。！？])(?:\s|$)/);
  return ensureSentence(match ? match[1] : text.slice(0, 220));
}

function normalizePlainText(value) {
  return stripHtml(value)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueTexts(values) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const text = normalizePlainText(value);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(text);
  }

  return output;
}

function extractArticlePayload(html, fallback = {}) {
  const $ = cheerio.load(String(html || ''));
  const title =
    readMetaContent($, 'meta[property="og:title"]') ||
    readMetaContent($, 'meta[name="twitter:title"]') ||
    normalizePlainText($('h1').first().text()) ||
    fallback.titleEn ||
    '';
  const description =
    readMetaContent($, 'meta[property="og:description"]') ||
    readMetaContent($, 'meta[name="description"]') ||
    fallback.feedExcerpt ||
    '';
  const publishedAt =
    normalizeFeedDate(readMetaContent($, 'meta[property="article:published_time"]')) ||
    fallback.sourcePublishedAt;
  const heroImage =
    readMetaContent($, 'meta[property="og:image"]') ||
    readMetaContent($, 'meta[name="twitter:image"]') ||
    fallback.heroImage ||
    '';
  const selectors = ['.entry-content p', 'article p', 'main p', '[class*=content] p'];
  const paragraphs = uniqueTexts(
    selectors.flatMap((selector) =>
      $(selector)
        .map((_index, element) => $(element).text())
        .get()
    )
  )
    .filter((paragraph) => paragraph.length >= 40)
    .filter(
      (paragraph) =>
        !/(subscribe|advertisement|sign up|privacy policy|terms of service|all rights reserved)/i.test(
          paragraph
        )
    )
    .slice(0, 18);

  return {
    title,
    description: normalizePlainText(description),
    publishedAt,
    heroImage,
    paragraphs,
    text: paragraphs.join('\n\n').slice(0, 9000),
  };
}

function parseFeedItems(xml, source, options = {}) {
  const now = options.now || new Date().toISOString();
  const lookbackHours = Number.isFinite(options.lookbackHours) ? options.lookbackHours : 168;
  const maxItems = Number.isFinite(options.maxItems) ? Math.max(1, Math.floor(options.maxItems)) : 10;
  const $ = cheerio.load(xml, { xmlMode: true });
  const context = laneContext(source.lane, options.siteConfig || RADAR_CITY);
  const drafts = [];

  function pushDraft(input) {
    if (drafts.length >= maxItems) {
      return false;
    }

    const title = input.title;
    const canonicalUrl = normalizeCanonicalUrl(input.canonicalUrl);
    const sourcePublishedAt = normalizeFeedDate(input.sourcePublishedAt);
    if (!title || !canonicalUrl || !isWithinLookback(sourcePublishedAt, lookbackHours, now)) {
      return;
    }

    const descriptionHtml = input.descriptionHtml;
    const descriptionText = stripHtml(descriptionHtml);

    drafts.push({
      sourceSlug: source.slug,
      sourceName: source.name,
      sourceUrl: canonicalUrl,
      canonicalUrl,
      sourcePublishedAt,
      titleEn: title,
      titleZh: `${source.name}：${title}`,
      feedExcerpt: firstFeedSummarySentence(descriptionText),
      feedCategory: input.category,
      feedContextEn: context.en,
      feedContextZh: context.zh,
      heroImage: input.heroImage,
      topicFingerprint: `${source.slug}:${title}`,
      personaTargets: context.personas,
    });

    return true;
  }

  $('item').each((_index, item) => {
    return pushDraft({
      title: readElementText($, item, 'title'),
      canonicalUrl: readElementText($, item, 'link'),
      sourcePublishedAt: readElementText($, item, 'pubDate'),
      descriptionHtml: $(item).find('description').first().text(),
      category: readElementText($, item, 'category'),
      heroImage:
        readElementAttr($, item, 'media\\:content', 'url') ||
        readElementAttr($, item, 'enclosure', 'url') ||
        extractImageFromHtml($(item).find('description').first().text()),
    });
  });

  $('entry').each((_index, entry) => {
    return pushDraft({
      title: readElementText($, entry, 'title'),
      canonicalUrl: readAtomLink($, entry),
      sourcePublishedAt:
        readElementText($, entry, 'published') || readElementText($, entry, 'updated'),
      descriptionHtml:
        $(entry).find('summary').first().text() || $(entry).find('content').first().text(),
      category: String($(entry).find('category').first().attr('term') || '').trim(),
      heroImage:
        readElementAttr($, entry, 'media\\:content', 'url') ||
        extractImageFromHtml($(entry).find('content').first().text()),
    });
  });

  return drafts;
}

function buildFeedRewritePrompt(items, siteConfig = RADAR_CITY) {
  const sourcePayload = items.map((item) => ({
    sourceSlug: item.sourceSlug,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
    canonicalUrl: item.canonicalUrl,
    sourcePublishedAt: item.sourcePublishedAt,
    category: item.feedCategory,
    title: item.titleEn,
    rssExcerpt: item.feedExcerpt,
    articleTitle: item.articlePayload.title,
    articleDescription: item.articlePayload.description,
    articlePublishedAt: item.articlePayload.publishedAt,
    articleText: item.articlePayload.text,
  }));
  const bodyRule = siteConfig.summaryOnly
    ? '- Write 1-2 short English body paragraphs per item. Summarize only the most useful facts and link readers to the source for original reporting.'
    : '- Write 3-5 English body paragraphs per item. Each paragraph should contain concrete facts from the source.';
  const articleRule = siteConfig.summaryOnly
    ? '- Each item must be a source-linked local brief, not a replacement for the source article.'
    : '- Each item must be a real rewritten article, not a detector note, short summary, or placeholder.';
  const sourceAttributionRule = siteConfig.summaryOnly
    ? '- Do not write phrases such as "the outlet reports", "according to the source", "the source says", or similar provenance scaffolding inside the summary copy.'
    : '- Do not frame the rewrite as source attribution. Do not write phrases such as "the outlet reports", "according to the source", "the source says", or similar provenance language.';
  const bannedDetectorRule = siteConfig.summaryOnly
    ? '- Do not write: opening indicator, opening signal, source categorizes, not just X but Y, here is what you need to know.'
    : '- Do not write: ChineseArizona detected, opening indicator, opening signal, source categorizes, not just X but Y, here is what you need to know.';
  const schemaBodyEn = siteConfig.summaryOnly
    ? '    "bodyEn": ["1-2 concise English summary paragraphs"],'
    : '    "bodyEn": ["3-5 rewritten English paragraphs"],';
  const schemaBodyZh = siteConfig.summaryOnly
    ? '    "bodyZh": ["1-2 Traditional Chinese summary paragraphs aligned to bodyEn"],'
    : '    "bodyZh": ["3-5 Traditional Chinese paragraphs aligned to bodyEn"],';

  return [
    siteConfig.feedPromptTitle,
    '',
    'Use the provided articleText as source material. Do not browse. Do not invent facts.',
    'Do not copy source sentences or make a close paraphrase. Extract facts, then write new prose.',
    articleRule,
    '',
    'Content rules:',
    bodyRule,
    siteConfig.summaryOnly
      ? '- Write in a concise local news-summary voice and avoid trying to reproduce the source article.'
      : '- Write in the article voice, as a rewrite of the source article itself.',
    sourceAttributionRule,
    '- Keep source attribution only in the sourceLinks metadata and article page source link.',
    `- Explain what happened, who is involved, where it is, timing, and why a ${siteConfig.regionName} reader would care when the source supports it.`,
    '- Keep sourcePolicy summary_link. Link readers to the source; do not republish the source article.',
    '- Use plain, direct language. Do not inflate significance.',
    '',
    'Banned style:',
    '- Do not use: pivotal, testament, landscape, showcasing, nestled, boasts, unlock, seamless, vibrant, robust, at its core, future looks bright.',
    bannedDetectorRule,
    '- Do not write source attribution scaffolding inside titleEn, excerptEn, bodyEn, titleZh, excerptZh, or bodyZh.',
    '- Do not use emojis, markdown, bullet lists, inline section headers, title-case headings, em dashes, or en dashes.',
    '- Do not use common hyphenated word pairs unless the hyphen is part of a proper name.',
    '- Do not use vague attribution such as experts believe or industry observers say unless the source names them.',
    '- Do not add generic conclusions or promotional language.',
    '',
    'Return JSON only. Return either [] or an array of objects with this exact schema:',
    '[',
    '  {',
    '    "sourceSlug": "copy exactly from input",',
    '    "sourceName": "copy exactly from input",',
    '    "sourceUrl": "copy exactly from input",',
    '    "canonicalUrl": "copy exactly from input",',
    '    "sourcePublishedAt": "copy exactly from input",',
    '    "titleEn": "short English headline",',
    '    "titleZh": "matching Traditional Chinese headline",',
    '    "excerptEn": "1-2 direct English sentences",',
    '    "excerptZh": "matching Traditional Chinese excerpt",',
    schemaBodyEn,
    schemaBodyZh,
    '    "heroImage": "optional image URL",',
    '    "topicFingerprint": "stable short topic description"',
    '  }',
    ']',
    '',
    JSON.stringify(sourcePayload, null, 2),
  ].join('\n');
}

function normalizeGeneratedText(value) {
  return String(value || '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeGeneratedTextArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(normalizeGeneratedText).filter(Boolean);
}

function wordCount(value) {
  return String(value || '')
    .trim()
    .split(/\s+/g)
    .filter(Boolean).length;
}

function hasBannedGeneratedStyle(draft, siteConfig = RADAR_CITY) {
  const text = [
    draft.titleEn,
    draft.excerptEn,
    ...(Array.isArray(draft.bodyEn) ? draft.bodyEn : []),
  ]
    .join(' ')
    .toLowerCase();
  const brandDetectedPhrase = `${siteConfig.brandName} detected`.toLowerCase();
  const bannedPattern =
    /chinesearizona detected|opening indicator|opening signal|source categorizes|pivotal|testament|showcasing|nestled|boasts|unlock|seamless|vibrant|robust|at its core|future looks bright|here is what you need to know|actually|additionally|transformative|groundbreaking|rapidly evolving|vital role|plays a crucial role|experts believe|industry observers|despite challenges|continues to thrive|in conclusion|let's dive in|i hope this helps|in order to|due to the fact|could potentially|exciting times lie ahead|marking a .*moment|not just .*it'?s/i;

  return (
    text.includes(brandDetectedPhrase) ||
    bannedPattern.test(text) ||
    /[\u{1f300}-\u{1faff}]/u.test(text)
  );
}

function containsCopiedSourceSentence(draft, sourceText) {
  const output = normalizeGeneratedText([
    draft.excerptEn,
    ...(Array.isArray(draft.bodyEn) ? draft.bodyEn : []),
  ].join(' ')).toLowerCase();
  const sourceSentences = normalizeGeneratedText(sourceText)
    .split(/(?<=[.!?])\s+/g)
    .map((sentence) => sentence.trim())
    .filter((sentence) => wordCount(sentence) >= 10);

  return sourceSentences.some((sentence) => output.includes(sentence.toLowerCase()));
}

function mergeFeedRewriteDraft(seed, draft, options = {}) {
  const bodyEn = normalizeGeneratedTextArray(draft.bodyEn);
  const bodyZh = normalizeGeneratedTextArray(draft.bodyZh);
  const excerptEn = normalizeGeneratedText(draft.excerptEn);
  const titleEn = normalizeGeneratedText(draft.titleEn || seed.titleEn);

  const minimumParagraphs = options.summaryOnly ? 1 : 3;
  const minimumWords = options.summaryOnly ? 25 : 120;
  const maximumParagraphs = options.summaryOnly ? 2 : Infinity;
  const maximumWords = options.summaryOnly ? 220 : Infinity;
  const bodyWordCount = bodyEn.reduce((count, paragraph) => count + wordCount(paragraph), 0);
  if (
    bodyEn.length < minimumParagraphs ||
    bodyEn.length > maximumParagraphs ||
    bodyWordCount < minimumWords ||
    bodyWordCount > maximumWords
  ) {
    return null;
  }
  if (bodyZh.length !== bodyEn.length) {
    return null;
  }

  const candidate = {
    sourceSlug: seed.sourceSlug,
    sourceName: seed.sourceName,
    sourceUrl: seed.sourceUrl,
    canonicalUrl: seed.canonicalUrl,
    sourcePublishedAt: seed.sourcePublishedAt,
    titleEn,
    titleZh: normalizeGeneratedText(draft.titleZh || seed.titleZh || titleEn),
    excerptEn,
    excerptZh: normalizeGeneratedText(draft.excerptZh || excerptEn),
    bodyEn,
    bodyZh,
    heroImage: normalizeCanonicalUrl(draft.heroImage || seed.articlePayload.heroImage || seed.heroImage),
    topicFingerprint: normalizeGeneratedText(draft.topicFingerprint || seed.topicFingerprint),
    personaTargets: seed.personaTargets,
  };

  if (!candidate.excerptEn || hasBannedGeneratedStyle(candidate, options.siteConfig)) {
    return null;
  }
  if (containsCopiedSourceSentence(candidate, seed.articlePayload.text)) {
    return null;
  }

  return candidate;
}

function rewriteFeedItemsWithHermes({
  hermesBin,
  hermesTimeoutMs,
  items,
  maxTurns = 4,
  siteConfig = RADAR_CITY,
}) {
  if (!items.length) {
    return [];
  }

  const prompt = buildFeedRewritePrompt(items, siteConfig);
  const result = spawnSync(
    hermesBin,
    ['chat', '-Q', '--yolo', '--max-turns', String(maxTurns), '-q', prompt],
    {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 12 * 1024 * 1024,
      timeout: hermesTimeoutMs,
    }
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'Hermes feed rewrite failed.').trim());
  }

  const byUrl = new Map(
    items.flatMap((item) => [
      [item.canonicalUrl, item],
      [item.sourceUrl, item],
    ])
  );
  return parseHermesOutput(result.stdout)
    .map((draft) => {
      const seed = byUrl.get(draft.canonicalUrl) || byUrl.get(draft.sourceUrl);
      return seed
        ? mergeFeedRewriteDraft(seed, draft, { summaryOnly: siteConfig.summaryOnly, siteConfig })
        : null;
    })
    .filter(Boolean);
}

function formatDnsAddressAsHost(address, family) {
  return family === 6 || String(address).includes(':') ? `[${address}]` : address;
}

function resolvedAddressIsUnsafe(address, family) {
  return !normalizeCanonicalUrl(`https://${formatDnsAddressAsHost(address, family)}/`);
}

async function resolveFetchablePublicUrl(value) {
  const rawUrl = String(value || '').trim();
  const normalizedUrl = normalizeCanonicalUrl(rawUrl);
  if (!normalizedUrl) {
    throw new Error('Unsafe fetch URL.');
  }

  const url = new URL(rawUrl);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(hostname)) {
    return url.toString();
  }

  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (
    records.length === 0 ||
    records.some((record) => resolvedAddressIsUnsafe(record.address, record.family))
  ) {
    throw new Error('Unsafe fetch URL.');
  }

  return url.toString();
}

async function fetchText(url, timeoutMs, siteConfig = RADAR_CITY) {
  const fetchUrl = await resolveFetchablePublicUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(fetchUrl, {
      headers: {
        accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        'user-agent': `${siteConfig.brandName}RadarFeedSync/1.0`,
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function collectDraftsFromFeeds(manifest, options = {}) {
  const maxItems = Number.isFinite(options.maxItems) ? Math.max(1, Math.floor(options.maxItems)) : 10;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(1000, Math.floor(options.timeoutMs)) : 15000;
  const siteConfig = options.siteConfig || RADAR_CITY;
  const seeds = [];

  for (const source of Array.isArray(manifest) ? manifest : []) {
    const url = feedSourceUrl(source);
    if (!url) {
      continue;
    }

    try {
      const xml = await fetchText(url, timeoutMs, siteConfig);
      seeds.push(
        ...parseFeedItems(xml, source, {
          lookbackHours: options.lookbackHours,
          maxItems,
          now: options.now,
          siteConfig,
        })
      );
    } catch (error) {
      process.stderr.write(
        JSON.stringify({
          status: 'feed_failed',
          sourceSlug: source.slug,
          feedUrl: url,
          errorMessage: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        }) + '\n'
      );
    }
  }

  const rewriteSeeds = [];
  for (const seed of seeds
    .sort(
      (left, right) =>
        new Date(right.sourcePublishedAt || 0).getTime() -
        new Date(left.sourcePublishedAt || 0).getTime()
    )
    .slice(0, maxItems)) {
    try {
      const html = await fetchText(seed.canonicalUrl, timeoutMs, siteConfig);
      const articlePayload = extractArticlePayload(html, seed);
      if (articlePayload.text.length < 300) {
        process.stderr.write(
          JSON.stringify({
            status: 'feed_article_too_thin',
            sourceSlug: seed.sourceSlug,
            canonicalUrl: seed.canonicalUrl,
            textLength: articlePayload.text.length,
            timestamp: new Date().toISOString(),
          }) + '\n'
        );
        continue;
      }
      rewriteSeeds.push({
        ...seed,
        articlePayload,
      });
    } catch (error) {
      process.stderr.write(
        JSON.stringify({
          status: 'feed_article_failed',
          sourceSlug: seed.sourceSlug,
          canonicalUrl: seed.canonicalUrl,
          errorMessage: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        }) + '\n'
      );
    }
  }

  try {
    return rewriteFeedItemsWithHermes({
      hermesBin: options.hermesBin || 'hermes',
      hermesTimeoutMs: Number.isFinite(options.hermesTimeoutMs)
        ? Math.max(1000, Math.floor(options.hermesTimeoutMs))
        : 240000,
      items: rewriteSeeds,
      maxTurns: options.hermesMaxTurns || 4,
      siteConfig,
    }).slice(0, maxItems);
  } catch (error) {
    process.stderr.write(
      JSON.stringify({
        status: 'feed_rewrite_failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }) + '\n'
    );
    return [];
  }
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
    const candidate = fencedMatch[1].trim();
    try {
      JSON.parse(candidate);
      return candidate;
    } catch (_error) {
      // Fall back to scanning the full output for a complete JSON value.
    }
  }

  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    if (char !== '[' && char !== '{') {
      continue;
    }

    const endIndex = findJsonPayloadEnd(trimmed, index);
    if (endIndex < 0) {
      continue;
    }

    const candidate = trimmed.slice(index, endIndex + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch (_error) {
      // Keep scanning. Hermes can print non-JSON bracketed text before the payload.
    }
  }

  return '[]';
}

function findJsonPayloadEnd(text, startIndex) {
  const opener = text[startIndex];
  const initialCloser = opener === '[' ? ']' : opener === '{' ? '}' : '';
  if (!initialCloser) {
    return -1;
  }

  const stack = [initialCloser];
  let inString = false;
  let escaped = false;

  for (let index = startIndex + 1; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '[') {
      stack.push(']');
      continue;
    }
    if (char === '{') {
      stack.push('}');
      continue;
    }
    if (char === ']' || char === '}') {
      if (stack[stack.length - 1] !== char) {
        return -1;
      }
      stack.pop();
      if (stack.length === 0) {
        return index;
      }
    }
  }

  return -1;
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
  if (
    parsed &&
    typeof parsed === 'object' &&
    (parsed.sourceUrl || parsed.canonicalUrl || parsed.titleEn)
  ) {
    return [parsed];
  }
  return [];
}

function buildHermesPrompt(
  manifest,
  maxItems,
  lookbackHours,
  options = {},
  siteConfig = RADAR_CITY
) {
  const sourceMode = manifest.length === 0 ? 'open-web' : manifest.length === 1 ? 'seeded' : 'seeded-multi';
  const sourceList = manifest
    .map((source) => {
      return `- ${source.name} | ${source.url}`;
    })
    .join('\n');
  const summarySearchScope =
    siteConfig.summarySearchScope ||
    `${siteConfig.regionName} news, official sites, newsletters, public social platforms, community posts, local blogs, business openings, transit, housing, and local sources`;
  const summaryRelevanceLabel =
    siteConfig.summaryRelevanceLabel || `${siteConfig.regionName}-relevant`;
  const summaryRetryScope = siteConfig.summaryRetryScope || siteConfig.regionName;
  const operatorMode = siteConfig.summaryOnly
    ? 'source discovery and source-linked summary drafting'
    : 'source discovery and article drafting';
  const searchScope = siteConfig.summaryOnly
    ? summarySearchScope
    : 'Arizona news, blogs, official sites, newsletters, public social platforms, and community posts';
  const relevanceDecision = siteConfig.summaryOnly
    ? summaryRelevanceLabel
    : 'Arizona-relevant';
  const sourceReadingRule = siteConfig.summaryOnly
    ? '- Read only enough of each source to produce a concise, source-linked summary. Do not generate a replacement article.'
    : '- Read enough of each source to produce a real rewrite, not a thin summary.';
  const schemaBodyEn = siteConfig.summaryOnly
    ? '    "bodyEn": ["1-2 concise English summary paragraphs that do not replace the source"],'
    : '    "bodyEn": ["3-6 substantial English paragraphs that fully rewrite the source in original words"],';
  const schemaBodyZh = siteConfig.summaryOnly
    ? '    "bodyZh": ["1-2 Traditional Chinese summary paragraphs aligned to bodyEn"],'
    : '    "bodyZh": ["3-6 Traditional Chinese paragraphs aligned to the English rewrite"],';
  const schemaExcerptEn = siteConfig.summaryOnly
    ? '    "excerptEn": "1-2 sentence English deck that captures the useful local angle",'
    : '    "excerptEn": "2-3 sentence English deck that captures the full angle of the story",';
  const copyAlignmentRule = siteConfig.summaryOnly
    ? '- Provide both English and Traditional Chinese copy for the title, excerpt, and body. The Chinese version should closely match the English summary rather than adding new facts.'
    : '- Provide both English and Traditional Chinese copy for the title, excerpt, and body. The Chinese version should faithfully match the English rewrite rather than adding new facts.';
  const sourcePolicyRule = siteConfig.summaryOnly
    ? '- Official/news/blog sources must become concise source-linked summaries. Do not try to cover every detail or replace the source article.'
    : '- Official/news/blog sources must become comprehensive rewrites, not short blurbs. Cover the full article in original words, including key facts, names, numbers, timeline, and why it matters in Arizona.';
  const bannedDetectorRule = siteConfig.summaryOnly
    ? '- Do not write detector notes such as opening indicator, opening signal, or source categorizes.'
    : '- Do not write detector notes such as ChineseArizona detected, opening indicator, opening signal, or source categorizes.';
  const retryRule = siteConfig.summaryOnly
    ? `- The previous attempt returned zero items. Widen the ${summaryRetryScope} search beyond any familiar sites before giving up.`
    : '- The previous attempt returned zero items. Widen the search and look beyond any familiar sites before giving up.';
  const searchIntro = siteConfig.summaryOnly
    ? `Search the public web for ${siteConfig.regionName}-specific items. Do not limit yourself to any preset source allowlist.`
    : 'Search the public web freely. Do not limit yourself to any preset source allowlist.';
  const prompt = [
    siteConfig.openWebPromptTitle,
    `Mode: ${sourceMode}. You are the autonomous operator for ${operatorMode}.`,
    `Look back roughly ${lookbackHours} hours from now and return at most ${maxItems} ${siteConfig.regionName}-relevant items total.`,
    searchIntro,
    `You may use news sites, public social posts, government pages, company blogs, newsletters, event pages, community forums, and local publications, as long as the item is clearly about ${siteConfig.regionName}.`,
    `Prioritize the newest useful ${siteConfig.regionName} items first, but if enough material exists in the time window, fill the requested count so the feed can sustain a steady publishing cadence.`,
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
    `- Search broadly across ${searchScope}.`,
    '- Open specific article/detail pages when needed.',
    '- Prefer lightweight methods such as RSS feeds, direct HTML fetches, article metadata, and public pages you can read without graphical browser automation.',
    `- Decide which items are truly ${relevanceDecision} and recent enough.`,
    sourceReadingRule,
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
    schemaExcerptEn,
    '    "excerptZh": "matching Traditional Chinese deck covering the same angle",',
    schemaBodyEn,
    schemaBodyZh,
    '    "heroImage": "https://source-image.example/hero.jpg optional for non-social sources",',
    '    "topicFingerprint": "stable short topic description"',
    '  }',
    ']',
    '',
    'Rules:',
    `- Every item must be clearly about ${siteConfig.regionName} and useful to local residents, movers, students, families, or business owners.`,
    copyAlignmentRule,
    `- Reject anything that is not specifically tied to ${siteConfig.regionRelevance}.`,
    sourcePolicyRule,
    `- When useful, add concise ${siteConfig.regionName}-specific context or implications, but do not invent facts or unsupported claims.`,
    '- Use plain, direct language. Do not inflate significance or write promotional copy.',
    '- Do not copy source sentences or make a close paraphrase. Extract facts, then write new prose.',
    '- Avoid AI-style filler and banned phrasing: pivotal, testament, landscape, showcasing, nestled, boasts, unlock, seamless, vibrant, robust, at its core, future looks bright, here is what you need to know.',
    bannedDetectorRule,
    '- Do not use emojis, markdown, bullet lists, inline section headers, title-case headings, em dashes, en dashes, vague attribution, generic conclusions, or not just X but Y framing.',
    '- If the source page exposes a clear article image or OG image and the source is not signal_only, include it in heroImage.',
    '- Public social sources must become signal_only trend summaries. Do not reuse captions, hashtags, quotes, embeds, or any third-party media URLs.',
    '- Do not fabricate filler. If there are fewer than the requested count, return fewer.',
    '- As soon as you have enough qualifying items, stop searching and return the JSON immediately.',
    '- Never use a section homepage as sourceUrl or canonicalUrl when a specific article page exists.',
    '- If a source has no qualifying item, skip it instead of guessing.',
  );

  if (options.retry) {
    prompt.push(retryRule);
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
  siteConfig = RADAR_CITY,
}) {
  const prompt = buildHermesPrompt(manifest, maxItems, lookbackHours, promptOptions, siteConfig);
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
  maxTurns,
  siteConfig = RADAR_CITY,
}) {
  return dedupeDrafts(
    collectDraftsWithHermes({
      hermesBin,
      hermesTimeoutMs,
      manifest,
      maxItems,
      lookbackHours,
      maxTurns: maxTurns || (manifest.length <= 1 ? 12 : 14),
      promptOptions: { retry: true },
      siteConfig,
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
  const siteConfig = getSiteConfig(args.site);
  const manifest = loadManifest(siteConfig);
  const startedAt = new Date().toISOString();
  const runId = `${siteConfig.runIdPrefix}-${startedAt}`;
  const storageOptions = { useSupabase: siteConfig.useSupabase };
  const initialStore = await readStoreSnapshot(args.storePath, storageOptions);

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
    await writeStoreSnapshot(args.storePath, pausedStore, storageOptions);
    return { status: 'paused', runId, site: siteConfig.key, storePath: args.storePath };
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
  const hermesMaxTurns =
    Number.isFinite(args.hermesMaxTurns) && args.hermesMaxTurns > 0
      ? args.hermesMaxTurns
      : activeManifest.length <= 1
        ? 10
        : 12;

  try {
    const feedDrafts = args.fixturePath
      ? []
      : await collectDraftsFromFeeds(filteredManifest, {
          hermesBin: args.hermesBin,
          hermesMaxTurns: Math.min(hermesMaxTurns, 4),
          hermesTimeoutMs: args.hermesTimeoutMs,
          lookbackHours: args.lookbackHours,
          maxItems: draftTargetCount,
          now: startedAt,
          siteConfig,
          timeoutMs: args.feedTimeoutMs,
        });
    const feedDraftsSatisfiedTarget = feedDrafts.length >= draftTargetCount;
    let hermesError;
    const drafts = args.fixturePath
      ? parseFixturePayload(args.fixturePath)
      : feedDraftsSatisfiedTarget
        ? []
      : (() => {
          try {
            return collectDraftsWithHermes({
              hermesBin: args.hermesBin,
              hermesTimeoutMs: args.hermesTimeoutMs,
              manifest: activeManifest,
              maxItems: draftTargetCount,
              lookbackHours: args.lookbackHours,
              maxTurns: hermesMaxTurns,
              siteConfig,
            });
          } catch (error) {
            hermesError = error;
            return [];
          }
        })();
    const recoveredDrafts =
      !args.fixturePath && !feedDraftsSatisfiedTarget && drafts.length === 0 && args.retryEmpty
        ? collectDraftsWithHermesRetry({
            hermesBin: args.hermesBin,
            hermesTimeoutMs: args.hermesTimeoutMs,
            manifest: activeManifest,
            maxItems: draftTargetCount,
            lookbackHours: args.lookbackHours,
            maxTurns: hermesMaxTurns,
            siteConfig,
          })
        : drafts;
    const filteredDrafts = dedupeDrafts([...feedDrafts, ...recoveredDrafts]).filter(
      (draft) => draft && typeof draft === 'object'
    );
    if (hermesError && filteredDrafts.length === 0) {
      throw hermesError;
    }
    const finishedAt = new Date().toISOString();
    const applied = applyDraftsToStore(initialStore, filteredDrafts, {
      manifest,
      publishCap,
      now: finishedAt,
      defaultSourceName: siteConfig.defaultSourceName,
      summaryOnly: siteConfig.summaryOnly,
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
    await writeStoreSnapshot(args.storePath, nextStore, storageOptions);

    return {
      status: 'completed',
      runId,
      site: siteConfig.key,
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
    await writeStoreSnapshot(args.storePath, failedStore, storageOptions);
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

function runCli() {
  main()
    .catch((error) => {
      process.stderr.write(
        `${JSON.stringify({
          status: 'failed',
          timestamp: new Date().toISOString(),
          errorMessage: error instanceof Error ? error.message : String(error),
        })}\n`
      );
      process.exitCode = 1;
    });
}

if (require.main === module) {
  runCli();
}

module.exports = {
  buildFeedRewritePrompt,
  buildHermesPrompt,
  collectDraftsFromFeeds,
  extractJsonPayload,
  getSiteConfig,
  parseFeedItems,
  parseArgs,
  parseHermesOutput,
  runCli,
  runWorker,
  selectManifestBatch,
};
