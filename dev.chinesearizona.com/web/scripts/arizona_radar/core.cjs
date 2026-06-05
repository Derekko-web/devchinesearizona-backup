const { createHash, randomUUID } = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const VALID_PERSONA_TARGETS = new Set([
  'tsmc_newcomers',
  'local_families',
  'students',
  'business_owners',
]);
const VALID_FRESHNESS_TIERS = new Set([
  'breaking',
  'weekly',
  'monthly',
  'evergreen',
  'archive',
]);
const VALID_CATEGORIES = new Set(['news', 'feature']);
const VALID_SOURCE_TYPES = new Set([
  'local_media',
  'official_data',
  'airport_newsroom',
  'corporate_newsroom',
  'social_signal',
]);
const VALID_SOURCE_POLICIES = new Set([
  'summary_link',
  'signal_only',
  'republish_with_permission',
]);
const VALID_LANES = new Set([
  'housing',
  'openings',
  'community',
  'official',
  'social',
]);
const SOCIAL_HOST_PATTERNS = [
  /(^|\.)instagram\.com$/i,
  /(^|\.)tiktok\.com$/i,
  /(^|\.)facebook\.com$/i,
  /(^|\.)x\.com$/i,
  /(^|\.)twitter\.com$/i,
  /(^|\.)youtube\.com$/i,
  /(^|\.)youtu\.be$/i,
  /(^|\.)reddit\.com$/i,
];
const BLOCKED_SOCIAL_FIELDS = [
  'caption',
  'sourceCaption',
  'mediaUrl',
  'mediaUrls',
  'sourceMediaUrl',
  'sourceMediaUrls',
  'embedHtml',
  'embedUrl',
];
const DEFAULT_RADAR_FALLBACK_HEROES = {
  housing: '/home-neighborhood/phoenix-card.webp',
  openings: '/directory-ai-replacements/old-town-taste-tempe-v2.webp',
  community: '/home-neighborhood/tempe-card.webp',
  official: '/home-neighborhood/phoenix-card.webp',
  social: '/home-neighborhood/scottsdale-card.webp',
};
const SITE_RADAR_FALLBACK_HEROES = {
  arizona: DEFAULT_RADAR_FALLBACK_HEROES,
  austin: {
    housing: '/city-site-images/austin-newcomer-services.webp',
    openings: '/city-site-images/austin-community-hero.webp',
    community: '/city-site-images/austin-skyline-lake.webp',
    official: '/city-site-images/austin-community-hero.webp',
    social: '/city-site-images/asian-american-resource-center-austin.webp',
  },
  'los-angeles': {
    housing: '/city-site-images/la-newcomer-corridor.webp',
    openings: '/city-site-images/alhambra-main-street.webp',
    community: '/city-site-images/los-angeles-community-hero.webp',
    official: '/city-site-images/la-chinatown-downtown.webp',
    social: '/city-site-images/san-gabriel-valley-boulevard.webp',
  },
  'sf-bay': {
    housing: '/city-site-images/sf-bay-newcomer-discovery.webp',
    openings: '/city-site-images/sf-chinatown-bay.webp',
    community: '/city-site-images/sf-bay-community-hero.webp',
    official: '/city-site-images/sf-bay-community-hero.webp',
    social: '/city-site-images/oakland-chinatown-street.webp',
  },
};
const NON_RENDERABLE_RADAR_HERO_PATTERN =
  /(favicon|logo|sprite|spacer|tracking|pixel|blank|1x1|placeholder)/i;
const REMOVED_PLACEHOLDER_ARTICLE_SLUGS = new Set([
  'los-angeles-opening-radar-local-source-watch',
  'sgv-housing-transit-watch-source-linked-summaries',
]);
const DEFAULT_SOURCE_NAME =
  process.env.RADAR_FALLBACK_SOURCE_NAME ||
  (process.env.RADAR_REGION_NAME ? `${process.env.RADAR_REGION_NAME} Source` : 'Arizona Source');

function nowIso() {
  return new Date().toISOString();
}

function defaultStoreSnapshot() {
  return {
    version: 1,
    jobControl: {
      paused: false,
      publishCap: 10,
      updatedAt: nowIso(),
    },
    sourceControls: [],
    runs: [],
    candidates: [],
    articles: [],
  };
}

function radarHeroImageLooksRenderable(value) {
  const rawValue = String(value || '').trim();
  if (!rawValue || /^data:/i.test(rawValue) || NON_RENDERABLE_RADAR_HERO_PATTERN.test(rawValue)) {
    return false;
  }

  if (rawValue.startsWith('/')) {
    return true;
  }

  try {
    const url = new URL(rawValue);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (_error) {
    return false;
  }
}

function normalizeStoredArticle(article, siteKey = currentRadarSiteKey()) {
  const lane = VALID_LANES.has(article.lane) ? article.lane : 'community';
  const heroImage = String(article.heroImage || '').trim();
  const hasRenderableHeroImage = radarHeroImageLooksRenderable(heroImage);

  return {
    ...article,
    lane,
    heroImage: hasRenderableHeroImage ? heroImage : buildFallbackHero(lane, siteKey),
    heroImagePolicy: hasRenderableHeroImage
      ? String(article.heroImagePolicy || 'source_allowed')
      : 'fallback_only',
  };
}

function normalizeStore(input, siteKey = currentRadarSiteKey()) {
  const fallback = defaultStoreSnapshot();
  const isRemovedPlaceholder = (entry) =>
    REMOVED_PLACEHOLDER_ARTICLE_SLUGS.has(String(entry.slug || ''));

  return {
    version: 1,
    jobControl: {
      ...fallback.jobControl,
      ...(input && input.jobControl ? input.jobControl : {}),
    },
    sourceControls: Array.isArray(input && input.sourceControls) ? input.sourceControls : [],
    runs: Array.isArray(input && input.runs) ? input.runs : [],
    candidates: Array.isArray(input && input.candidates)
      ? input.candidates.filter((candidate) => !isRemovedPlaceholder(candidate))
      : [],
    articles: Array.isArray(input && input.articles)
      ? input.articles
          .filter((article) => !isRemovedPlaceholder(article))
          .map((article) => normalizeStoredArticle(article, siteKey))
      : [],
  };
}

function readStore(storePath, options = {}) {
  try {
    return normalizeStore(JSON.parse(fs.readFileSync(storePath, 'utf8')), options.siteKey);
  } catch (_error) {
    return defaultStoreSnapshot();
  }
}

function writeStore(storePath, store, options = {}) {
  const normalizedStore = normalizeStore(store, options.siteKey);
  let existingStore = null;
  try {
    if (fs.existsSync(storePath)) {
      existingStore = normalizeStore(
        JSON.parse(fs.readFileSync(storePath, 'utf8')),
        options.siteKey
      );
    }
  } catch (_error) {
    existingStore = null;
  }

  const allowEmptyStoreWrite = ['1', 'true', 'yes', 'on'].includes(
    String(process.env.RADAR_ALLOW_EMPTY_STORE_WRITE || '').trim().toLowerCase()
  );
  if (
    existingStore &&
    existingStore.articles.length > 0 &&
    normalizedStore.articles.length === 0 &&
    !allowEmptyStoreWrite
  ) {
    throw new Error(
      `Refusing to overwrite non-empty radar store with an empty article list: ${storePath}`
    );
  }

  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, `${JSON.stringify(normalizedStore, null, 2)}\n`, 'utf8');
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function slugify(value) {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || `radar-${hashValue(value).slice(0, 8)}`;
}

function shortHash(value) {
  return hashValue(value).slice(0, 8);
}

function ipv4ToInteger(value) {
  const parts = String(value || '')
    .split('.')
    .map((part) => Number(part));

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return null;
  }

  return parts.reduce((result, part) => ((result << 8) | part) >>> 0, 0);
}

function ipv4InRange(value, base, prefixLength) {
  const ip = ipv4ToInteger(value);
  const baseIp = ipv4ToInteger(base);
  if (ip === null || baseIp === null) {
    return false;
  }

  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  return (ip & mask) === (baseIp & mask);
}

function isPrivateOrReservedIpv4(value) {
  return [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4],
  ].some(([base, prefixLength]) => ipv4InRange(value, base, prefixLength));
}

function normalizeIpv4EmbeddedIpv6(value) {
  const lastColon = value.lastIndexOf(':');
  const ipv4Part = value.slice(lastColon + 1);
  if (!ipv4Part.includes('.')) {
    return value;
  }

  const ipv4 = ipv4ToInteger(ipv4Part);
  if (ipv4 === null) {
    return null;
  }

  const high = ((ipv4 >>> 16) & 0xffff).toString(16);
  const low = (ipv4 & 0xffff).toString(16);
  return `${value.slice(0, lastColon)}:${high}:${low}`;
}

function ipv6ToBigInt(value) {
  const withoutBrackets = String(value || '')
    .replace(/^\[|\]$/g, '')
    .toLowerCase();

  if (!withoutBrackets || withoutBrackets.includes('%')) {
    return null;
  }

  const normalized = normalizeIpv4EmbeddedIpv6(withoutBrackets);
  if (!normalized) {
    return null;
  }

  const halves = normalized.split('::');
  if (halves.length > 2) {
    return null;
  }

  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) {
    return null;
  }

  const hextets = [...head, ...Array(missing).fill('0'), ...tail];
  if (
    hextets.length !== 8 ||
    hextets.some((hextet) => !/^[0-9a-f]{1,4}$/.test(hextet))
  ) {
    return null;
  }

  return hextets.reduce((result, hextet) => {
    return (result << 16n) | BigInt(parseInt(hextet, 16));
  }, 0n);
}

function ipv6InRange(value, base, prefixLength) {
  const ip = ipv6ToBigInt(value);
  const baseIp = ipv6ToBigInt(base);
  if (ip === null || baseIp === null) {
    return false;
  }

  const fullMask = (1n << 128n) - 1n;
  const mask = prefixLength === 0
    ? 0n
    : (fullMask << BigInt(128 - prefixLength)) & fullMask;
  return (ip & mask) === (baseIp & mask);
}

function isPrivateOrReservedIpv6(value) {
  const normalized = String(value || '')
    .replace(/^\[|\]$/g, '')
    .toLowerCase();

  if (ipv6ToBigInt(normalized) === null) {
    return true;
  }

  if (!ipv6InRange(normalized, '2000::', 3)) {
    return true;
  }

  return [
    ['2001::', 32],
    ['2001:2::', 48],
    ['2001:10::', 28],
    ['2001:20::', 28],
    ['2001:db8::', 32],
    ['2002::', 16],
    ['3fff::', 20],
  ].some(([base, prefixLength]) => ipv6InRange(normalized, base, prefixLength));
}

function isLocalHostname(value) {
  const hostname = String(value || '')
    .replace(/\.$/, '')
    .toLowerCase();

  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  );
}

function isUnsafePublicUrlHost(hostname) {
  const normalized = String(hostname || '').replace(/^\[|\]$/g, '');
  const ipVersion = net.isIP(normalized);

  if (ipVersion === 4) {
    return isPrivateOrReservedIpv4(normalized);
  }
  if (ipVersion === 6) {
    return isPrivateOrReservedIpv6(normalized);
  }

  return isLocalHostname(normalized);
}

function normalizeCanonicalUrl(value) {
  if (!value) {
    return '';
  }

  try {
    const url = new URL(String(value).trim());
    if (!['http:', 'https:'].includes(url.protocol)) {
      return '';
    }
    if (!url.hostname || url.username || url.password || isUnsafePublicUrlHost(url.hostname)) {
      return '';
    }

    const trackingParams = new Set([
      'fbclid',
      'gclid',
      'igshid',
      'mc_cid',
      'mc_eid',
      'ref',
      'ref_src',
      'source',
      'utm_campaign',
      'utm_content',
      'utm_medium',
      'utm_source',
      'utm_term',
    ]);
    const params = new URLSearchParams();

    for (const [key, paramValue] of url.searchParams.entries()) {
      if (trackingParams.has(key.toLowerCase())) {
        continue;
      }
      params.append(key, paramValue);
    }

    url.hash = '';
    url.search = params.toString();
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== '/') {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }

    return url.toString();
  } catch (_error) {
    return '';
  }
}

function normalizeTopicFingerprint(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized ? shortHash(normalized) : '';
}

function splitParagraphs(value) {
  return String(value || '')
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function wordCount(value) {
  return String(value || '')
    .trim()
    .split(/\s+/g)
    .filter(Boolean).length;
}

function validateSummaryOnlyArticle(article) {
  const body = Array.isArray(article.body) ? article.body : [];
  const bodyWordCount = body.reduce((count, paragraph) => count + wordCount(paragraph.en), 0);

  if (article.sourcePolicy === 'republish_with_permission') {
    return 'summary_only_republish_policy';
  }
  if (body.length > 2) {
    return 'summary_only_too_many_paragraphs';
  }
  if (bodyWordCount > 220) {
    return 'summary_only_too_long';
  }

  return '';
}

function localizedTextFromDraft(draft, key) {
  const rawValue = draft[key];
  if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
    const english = String(rawValue.en || '').trim();
    const chinese = String(rawValue.zh || rawValue.en || '').trim();
    return english ? { en: english, zh: chinese || english } : null;
  }

  const english = String(draft[`${key}En`] || '').trim();
  const chinese = String(draft[`${key}Zh`] || english).trim();
  return english ? { en: english, zh: chinese || english } : null;
}

function localizedBodyFromDraft(draft) {
  if (Array.isArray(draft.body)) {
    const paragraphs = draft.body
      .map((paragraph) => {
        if (typeof paragraph === 'string') {
          const text = paragraph.trim();
          return text ? { en: text, zh: text } : null;
        }

        if (paragraph && typeof paragraph === 'object') {
          const english = String(paragraph.en || '').trim();
          const chinese = String(paragraph.zh || paragraph.en || '').trim();
          return english ? { en: english, zh: chinese || english } : null;
        }

        return null;
      })
      .filter(Boolean);

    return paragraphs.length > 0 ? paragraphs : null;
  }

  const englishParagraphs = Array.isArray(draft.bodyEn)
    ? draft.bodyEn.map((paragraph) => String(paragraph).trim()).filter(Boolean)
    : splitParagraphs(draft.bodyEn);
  const chineseParagraphs = Array.isArray(draft.bodyZh)
    ? draft.bodyZh.map((paragraph) => String(paragraph).trim()).filter(Boolean)
    : splitParagraphs(draft.bodyZh);

  if (englishParagraphs.length === 0) {
    return null;
  }

  return englishParagraphs.map((paragraph, index) => ({
    en: paragraph,
    zh: chineseParagraphs[index] || chineseParagraphs[0] || paragraph,
  }));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function generatedCopyHasSourceProvenance(title, excerpt, body, sourceName) {
  const source = String(sourceName || '').trim();
  const englishText = [
    title?.en,
    excerpt?.en,
    ...body.map((paragraph) => paragraph.en),
  ]
    .filter(Boolean)
    .join('\n');
  const chineseText = [
    title?.zh,
    excerpt?.zh,
    ...body.map((paragraph) => paragraph.zh),
  ]
    .filter(Boolean)
    .join('\n');

  const genericEnglishPattern =
    /\b(?:the\s+)?(?:source|outlet|publication|article|report)\s+(?:says?|said|reports?|reported|notes?|noted|states?|stated|adds?|added|indicates?|indicated|explains?|explained|shares?|shared)\b/i;
  const genericChinesePattern = /(?:來源|該來源|該媒體|該報導)(?:指出|表示|稱|說|報導|提到)/u;

  if (genericEnglishPattern.test(englishText) || genericChinesePattern.test(chineseText)) {
    return true;
  }

  if (!source) {
    return false;
  }

  const escapedSource = escapeRegExp(source);
  const namedEnglishPatterns = [
    new RegExp(`\\b${escapedSource}\\b\\s+(?:says?|said|reports?|reported|writes?|wrote|notes?|noted|states?|stated|adds?|added|shares?|shared|cites?|cited)\\b`, 'i'),
    new RegExp(`\\baccording\\s+to\\s+${escapedSource}\\b`, 'i'),
  ];
  const namedChinesePattern = new RegExp(`${escapedSource}(?:報導|指出|表示|稱|說|寫道|提到|引用)`, 'u');

  return (
    namedEnglishPatterns.some((pattern) => pattern.test(englishText)) ||
    namedChinesePattern.test(chineseText)
  );
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
    )
  );
}

function normalizePersonaTargets(value) {
  return normalizeStringArray(value).filter((target) => VALID_PERSONA_TARGETS.has(target));
}

function normalizeIsoDate(value) {
  if (!value) {
    return undefined;
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function inferFreshnessTier(sourcePublishedAt, now) {
  if (!sourcePublishedAt) {
    return 'weekly';
  }

  const publishedAtMs = new Date(sourcePublishedAt).getTime();
  const nowMs = new Date(now).getTime();
  const deltaDays = Math.max(0, Math.floor((nowMs - publishedAtMs) / 86400000));

  if (deltaDays <= 2) {
    return 'breaking';
  }
  if (deltaDays <= 10) {
    return 'weekly';
  }
  if (deltaDays <= 45) {
    return 'monthly';
  }
  return 'evergreen';
}

function hostnameFromUrl(value) {
  try {
    return new URL(String(value || '').trim()).hostname.toLowerCase();
  } catch (_error) {
    return '';
  }
}

function titleCase(value) {
  return String(value || '')
    .split(/[\s.-]+/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function inferSourceNameFromUrl(value, fallbackSourceName = DEFAULT_SOURCE_NAME) {
  const hostname = hostnameFromUrl(value).replace(/^www\./i, '');
  if (!hostname) {
    return fallbackSourceName;
  }

  const parts = hostname.split('.').filter(Boolean);
  if (parts.length > 2 && parts[0].length <= 3) {
    return titleCase(parts.slice(0, 2).join(' '));
  }

  return titleCase(parts[0] || hostname);
}

function inferSourceTypeFromUrl(value) {
  const hostname = hostnameFromUrl(value);
  if (!hostname) {
    return 'local_media';
  }

  if (SOCIAL_HOST_PATTERNS.some((pattern) => pattern.test(hostname))) {
    return 'social_signal';
  }
  if (hostname.includes('skyharbor.com')) {
    return 'airport_newsroom';
  }
  if (hostname.includes('flylax.com') || hostname.includes('lawa.org')) {
    return 'airport_newsroom';
  }
  if (hostname.endsWith('.gov') || hostname.includes('.gov.')) {
    return 'official_data';
  }

  return 'local_media';
}

function normalizeSourceType(value, sourceUrl) {
  const normalized = String(value || '').trim();
  if (VALID_SOURCE_TYPES.has(normalized)) {
    return normalized;
  }

  return inferSourceTypeFromUrl(sourceUrl);
}

function normalizeSourcePolicy(value, sourceType) {
  const normalized = String(value || '').trim();
  if (VALID_SOURCE_POLICIES.has(normalized)) {
    return normalized;
  }

  return sourceType === 'social_signal' ? 'signal_only' : 'summary_link';
}

function inferLaneFromDraft(draft, sourceType) {
  const requestedLane = String(draft.lane || '').trim();
  if (VALID_LANES.has(requestedLane)) {
    return requestedLane;
  }

  if (sourceType === 'social_signal') {
    return 'social';
  }
  if (sourceType === 'official_data' || sourceType === 'airport_newsroom') {
    return 'official';
  }

  const haystack = [
    draft.titleEn,
    draft.excerptEn,
    draft.topicFingerprint,
    draft.sourceName,
    draft.sourceUrl,
    draft.canonicalUrl,
  ]
    .map((entry) => String(entry || '').toLowerCase())
    .join(' ');

  if (/(housing|apartment|apartments|rental|rent|lease|homebuilder|home builders|condo|townhome)/.test(haystack)) {
    return 'housing';
  }
  if (/(opening|opens|opened|coming soon|restaurant|cafe|coffee|bar|boba|plaza|tenant|retail|storefront)/.test(haystack)) {
    return 'openings';
  }

  return 'community';
}

function findManifestSource(draft, manifestEntries, manifestBySlug) {
  const requestedSlug = String(draft.sourceSlug || '').trim();
  if (requestedSlug && manifestBySlug.has(requestedSlug)) {
    return manifestBySlug.get(requestedSlug);
  }

  const requestedName = String(draft.sourceName || '').trim().toLowerCase();
  const requestedUrl = normalizeCanonicalUrl(
    draft.sourceUrl || draft.originalUrl || draft.canonicalUrl
  );
  const requestedHost = hostnameFromUrl(requestedUrl);

  return manifestEntries.find((entry) => {
    if (requestedName && String(entry.name || '').trim().toLowerCase() === requestedName) {
      return true;
    }

    if (!requestedHost) {
      return false;
    }

    return hostnameFromUrl(entry.url) === requestedHost;
  });
}

function resolveSource(draft, manifestEntries, manifestBySlug, options = {}) {
  const fallbackSourceName = options.defaultSourceName || DEFAULT_SOURCE_NAME;
  const knownSource = findManifestSource(draft, manifestEntries, manifestBySlug);
  if (knownSource) {
    return knownSource;
  }

  const requestedSourceUrl = normalizeCanonicalUrl(
    draft.sourceUrl || draft.originalUrl || draft.canonicalUrl
  );
  const sourceType = normalizeSourceType(draft.sourceType, requestedSourceUrl);
  const sourceName = String(
    draft.sourceName || draft.publisher || inferSourceNameFromUrl(requestedSourceUrl, fallbackSourceName)
  ).trim() || fallbackSourceName;
  const sourceSlug = String(draft.sourceSlug || slugify(sourceName)).trim() || slugify(sourceName);

  return {
    slug: sourceSlug,
    name: sourceName,
    url: requestedSourceUrl,
    sourceType,
    sourcePolicy: normalizeSourcePolicy(draft.sourcePolicy, sourceType),
    lane: inferLaneFromDraft(draft, sourceType),
  };
}

function buildSourceLinks(draft, source, canonicalUrl) {
  const sourceLinks = [
    {
      label: {
        en: source.name,
        zh: source.name,
      },
      url: canonicalUrl,
      source: source.name,
    },
  ];

  for (const extraUrl of normalizeStringArray(draft.additionalSourceUrls || draft.sourceUrls)) {
    const normalizedUrl = normalizeCanonicalUrl(extraUrl);
    if (!normalizedUrl || sourceLinks.some((link) => link.url === normalizedUrl)) {
      continue;
    }

    sourceLinks.push({
      label: {
        en: source.name,
        zh: source.name,
      },
      url: normalizedUrl,
      source: source.name,
    });
  }

  return sourceLinks;
}

function normalizeRadarSiteKey(value) {
  const normalized = String(value || 'arizona').trim().toLowerCase();
  if (normalized === 'atx') {
    return 'austin';
  }
  if (normalized === 'la' || normalized === 'los_angeles') {
    return 'los-angeles';
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

  return SITE_RADAR_FALLBACK_HEROES[normalized] ? normalized : 'arizona';
}

function currentRadarSiteKey() {
  return normalizeRadarSiteKey(process.env.RADAR_SITE || process.env.RADAR_CITY_KEY);
}

function buildFallbackHero(lane, siteKey = currentRadarSiteKey()) {
  const fallbackHeroes =
    SITE_RADAR_FALLBACK_HEROES[normalizeRadarSiteKey(siteKey)] ||
    DEFAULT_RADAR_FALLBACK_HEROES;
  return fallbackHeroes[lane] || fallbackHeroes.community;
}

function candidateDedupeKey(candidate) {
  if (candidate.sourceType === 'social_signal') {
    return `topic:${candidate.topicFingerprint}`;
  }

  return `url:${candidate.canonicalUrl}`;
}

function ensureUniqueSlug(baseSlug, existingSlugs, seed) {
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  const nextSlug = `${baseSlug}-${shortHash(seed)}`;
  if (!existingSlugs.has(nextSlug)) {
    return nextSlug;
  }

  let index = 2;
  while (existingSlugs.has(`${nextSlug}-${index}`)) {
    index += 1;
  }

  return `${nextSlug}-${index}`;
}

function withBlockedFields(draft) {
  return BLOCKED_SOCIAL_FIELDS.filter((field) => {
    const value = draft[field];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });
}

function normalizeDraft(draft, source, now, options = {}) {
  const title = localizedTextFromDraft(draft, 'title');
  const excerpt = localizedTextFromDraft(draft, 'excerpt');
  const body = localizedBodyFromDraft(draft);
  const requestedSourceUrl = normalizeCanonicalUrl(
    draft.sourceUrl || draft.originalUrl || draft.canonicalUrl || source.url
  );
  const canonicalUrl = normalizeCanonicalUrl(draft.canonicalUrl || requestedSourceUrl);
  const sourceUrl = canonicalUrl || requestedSourceUrl;
  const sourcePublishedAt = normalizeIsoDate(draft.sourcePublishedAt);
  const topicFingerprint = normalizeTopicFingerprint(
    draft.topicFingerprint || `${title ? title.en : ''} ${excerpt ? excerpt.en : ''}`
  );

  if (!title || !excerpt || !body || body.length === 0) {
    return { error: 'missing_required_copy' };
  }

  if (generatedCopyHasSourceProvenance(title, excerpt, body, source.name)) {
    return { error: 'source_provenance_language' };
  }

  if (!sourceUrl || !canonicalUrl) {
    return { error: 'missing_source_url' };
  }

  if (source.sourceType === 'social_signal') {
    const blockedFields = withBlockedFields(draft);
    if (blockedFields.length > 0) {
      return { error: `social_signal_reused_fields:${blockedFields.join(',')}` };
    }
  }

  if (!topicFingerprint) {
    return { error: 'missing_topic_fingerprint' };
  }

  const freshnessTier = VALID_FRESHNESS_TIERS.has(draft.freshnessTier)
    ? draft.freshnessTier
    : inferFreshnessTier(sourcePublishedAt, now);
  const category = VALID_CATEGORIES.has(draft.category) ? draft.category : 'news';
  const heroImageAllowed = source.sourcePolicy !== 'signal_only';
  const providedHeroImage = normalizeCanonicalUrl(draft.heroImage);
  const hasProvidedHeroImage =
    heroImageAllowed && radarHeroImageLooksRenderable(providedHeroImage);
  const heroImage = hasProvidedHeroImage
    ? providedHeroImage
    : buildFallbackHero(source.lane, options.siteKey);

  return {
    candidate: {
      slug: slugify(draft.slug || title.en),
      sourceSlug: source.slug,
      sourceName: source.name,
      sourceUrl,
      canonicalUrl,
      sourceType: source.sourceType,
      sourcePolicy: source.sourcePolicy,
      lane: source.lane,
      title,
      excerpt,
      topicFingerprint,
      moderationState: 'published',
      firstSeenAt: now,
      lastSeenAt: now,
      sourcePublishedAt,
    },
    article: {
      slug: slugify(draft.slug || title.en),
      lane: source.lane,
      title,
      excerpt,
      body,
      heroImage,
      heroImagePolicy: hasProvidedHeroImage ? 'source_allowed' : 'fallback_only',
      category,
      freshnessTier,
      sourcePolicy: source.sourcePolicy,
      sourceType: source.sourceType,
      sourceName: source.name,
      sourceUrl,
      sourceLinks: buildSourceLinks(draft, source, canonicalUrl),
      relatedCategorySlugs: normalizeStringArray(draft.relatedCategorySlugs),
      ctaBusinessSlugs: normalizeStringArray(draft.ctaBusinessSlugs),
      personaTargets: normalizePersonaTargets(draft.personaTargets),
      publishedAt: now,
      updatedAt: now,
      lastCheckedAt: now,
      isPublished: true,
      aiGeneratedSummary: true,
    },
  };
}

function mergeCandidate(existingCandidate, normalizedCandidate, nextState, now) {
  return {
    ...existingCandidate,
    ...normalizedCandidate,
    id: existingCandidate.id,
    slug: existingCandidate.slug,
    firstSeenAt: existingCandidate.firstSeenAt,
    lastSeenAt: now,
    moderationState: nextState,
  };
}

function mergeArticle(existingArticle, candidateId, normalizedArticle, now) {
  return {
    ...existingArticle,
    ...normalizedArticle,
    id: existingArticle.id,
    candidateId,
    slug: existingArticle.slug,
    publishedAt: existingArticle.publishedAt || now,
    updatedAt: now,
    lastCheckedAt: now,
    isPublished: true,
  };
}

function mergeQueuedArticle(existingArticle, candidateId, normalizedArticle, now) {
  return {
    ...existingArticle,
    ...normalizedArticle,
    id: existingArticle.id,
    candidateId,
    slug: existingArticle.slug,
    publishedAt: existingArticle.publishedAt || now,
    updatedAt: now,
    lastCheckedAt: now,
    isPublished: false,
  };
}

function createBlockedCandidate(existingSlugs, normalizedCandidate, seed, reason, now) {
  const slug = ensureUniqueSlug(normalizedCandidate.slug, existingSlugs, seed);
  existingSlugs.add(slug);

  return {
    id: randomUUID(),
    ...normalizedCandidate,
    slug,
    firstSeenAt: now,
    lastSeenAt: now,
    moderationState: 'blocked',
    blockReason: reason,
  };
}

function queueDraftArticle(existingArticle, candidateId, normalizedArticle, slug, now) {
  if (existingArticle) {
    return mergeQueuedArticle(existingArticle, candidateId, normalizedArticle, now);
  }

  return {
    id: randomUUID(),
    candidateId,
    ...normalizedArticle,
    slug,
    publishedAt: now,
    updatedAt: now,
    lastCheckedAt: now,
    isPublished: false,
  };
}

function publishQueuedArticles(store, publishCap, now) {
  if (publishCap <= 0) {
    return {
      publishedCount: 0,
      latestPublishedAt: undefined,
    };
  }

  const queuedCandidates = store.candidates
    .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
    .filter(({ candidate }) => candidate.moderationState === 'queued')
    .sort(
      (left, right) =>
        new Date(left.candidate.firstSeenAt).getTime() -
        new Date(right.candidate.firstSeenAt).getTime()
    );

  let publishedCount = 0;
  let latestPublishedAt;

  for (const { candidate, candidateIndex } of queuedCandidates) {
    if (publishedCount >= publishCap) {
      break;
    }

    const articleIndex = store.articles.findIndex((article) => article.candidateId === candidate.id);
    if (articleIndex < 0) {
      continue;
    }

    const article = store.articles[articleIndex];
    if (article.isPublished) {
      continue;
    }

    store.candidates[candidateIndex] = {
      ...candidate,
      moderationState: 'published',
      lastSeenAt: now,
    };
    store.articles[articleIndex] = {
      ...article,
      isPublished: true,
      publishedAt: article.isPublished ? article.publishedAt : now,
      updatedAt: now,
      lastCheckedAt: now,
    };
    publishedCount += 1;
    latestPublishedAt = now;
  }

  return {
    publishedCount,
    latestPublishedAt,
  };
}

function applyDraftsToStore(store, drafts, options = {}) {
  const siteKey = options.siteKey || currentRadarSiteKey();
  const nextStore = normalizeStore(store, siteKey);
  const now = options.now || nowIso();
  const publishCap = Math.max(
    1,
    Number.isFinite(options.publishCap) ? Math.floor(options.publishCap) : nextStore.jobControl.publishCap
  );
  const manifestEntries = Array.isArray(options.manifest) ? options.manifest : [];
  const manifestBySlug = new Map(manifestEntries.map((entry) => [entry.slug, entry]));
  const existingSlugs = new Set([
    ...nextStore.candidates.map((candidate) => candidate.slug),
    ...nextStore.articles.map((article) => article.slug),
  ]);
  const summary = {
    candidateCount: Array.isArray(drafts) ? drafts.length : 0,
    publishedCount: 0,
    blockedCount: 0,
    duplicateCount: 0,
    latestPublishedAt: undefined,
  };

  for (const draft of Array.isArray(drafts) ? drafts : []) {
    if (!draft || typeof draft !== 'object') {
      continue;
    }

    const source = resolveSource(draft, manifestEntries, manifestBySlug, {
      defaultSourceName: options.defaultSourceName,
    });

    let normalized = normalizeDraft(draft, source, now, { siteKey });
    if (!normalized.error && options.summaryOnly) {
      const summaryOnlyError = validateSummaryOnlyArticle(normalized.article);
      if (summaryOnlyError) {
        normalized = {
          ...normalized,
          error: summaryOnlyError,
        };
      }
    }
    const placeholderCandidate = normalized.candidate || {
      slug: slugify(draft.slug || draft.titleEn || source.slug),
      sourceSlug: source.slug,
      sourceName: source.name,
      sourceUrl: normalizeCanonicalUrl(draft.sourceUrl || source.url) || source.url,
      canonicalUrl: normalizeCanonicalUrl(draft.canonicalUrl || draft.sourceUrl || source.url) || source.url,
      sourceType: source.sourceType,
      sourcePolicy: source.sourcePolicy,
      lane: source.lane,
      title: localizedTextFromDraft(draft, 'title') || { en: source.name, zh: source.name },
      excerpt: localizedTextFromDraft(draft, 'excerpt') || { en: 'Blocked candidate', zh: 'Blocked candidate' },
      topicFingerprint: normalizeTopicFingerprint(
        draft.topicFingerprint || `${draft.titleEn || ''} ${draft.excerptEn || ''}`
      ) || shortHash(JSON.stringify(draft)),
      moderationState: 'blocked',
      firstSeenAt: now,
      lastSeenAt: now,
    };
    const dedupeKey = candidateDedupeKey(placeholderCandidate);
    const candidateIndex = nextStore.candidates.findIndex(
      (candidate) => candidateDedupeKey(candidate) === dedupeKey
    );
    const existingCandidate = candidateIndex >= 0 ? nextStore.candidates[candidateIndex] : null;
    const articleIndex = existingCandidate
      ? nextStore.articles.findIndex((article) => article.candidateId === existingCandidate.id)
      : -1;
    const existingArticle = articleIndex >= 0 ? nextStore.articles[articleIndex] : null;

    if (normalized.error) {
      summary.blockedCount += 1;

      if (existingCandidate) {
        nextStore.candidates[candidateIndex] = {
          ...existingCandidate,
          ...placeholderCandidate,
          id: existingCandidate.id,
          slug: existingCandidate.slug,
          firstSeenAt: existingCandidate.firstSeenAt,
          lastSeenAt: now,
          moderationState: 'blocked',
          blockReason: normalized.error,
        };
        if (existingArticle) {
          nextStore.articles[articleIndex] = {
            ...existingArticle,
            isPublished: false,
            updatedAt: now,
            lastCheckedAt: now,
          };
        }
      } else {
        nextStore.candidates.push(
          createBlockedCandidate(existingSlugs, placeholderCandidate, dedupeKey, normalized.error, now)
        );
      }
      continue;
    }

    if (existingCandidate && existingArticle && existingArticle.isPublished) {
      nextStore.candidates[candidateIndex] = mergeCandidate(
        existingCandidate,
        normalized.candidate,
        'published',
        now
      );
      nextStore.articles[articleIndex] = mergeArticle(
        existingArticle,
        existingCandidate.id,
        normalized.article,
        now
      );
      summary.duplicateCount += 1;
      continue;
    }

    if (existingCandidate && existingCandidate.moderationState === 'blocked') {
      nextStore.candidates[candidateIndex] = mergeCandidate(
        existingCandidate,
        normalized.candidate,
        'blocked',
        now
      );
      summary.blockedCount += 1;
      continue;
    }

    if (summary.publishedCount >= publishCap) {
      if (existingCandidate) {
        nextStore.candidates[candidateIndex] = mergeCandidate(
          existingCandidate,
          normalized.candidate,
          'queued',
          now
        );
        nextStore.articles[articleIndex >= 0 ? articleIndex : nextStore.articles.length] = queueDraftArticle(
          existingArticle,
          existingCandidate.id,
          normalized.article,
          existingCandidate.slug,
          now
        );
      } else {
        const slug = ensureUniqueSlug(normalized.candidate.slug, existingSlugs, dedupeKey);
        const candidateId = randomUUID();
        existingSlugs.add(slug);
        nextStore.candidates.push({
          id: candidateId,
          ...normalized.candidate,
          slug,
          moderationState: 'queued',
        });
        nextStore.articles.push(
          queueDraftArticle(null, candidateId, normalized.article, slug, now)
        );
      }
      continue;
    }

    if (existingCandidate) {
      nextStore.candidates[candidateIndex] = mergeCandidate(
        existingCandidate,
        normalized.candidate,
        'published',
        now
      );

      if (existingArticle) {
        nextStore.articles[articleIndex] = mergeArticle(
          existingArticle,
          existingCandidate.id,
          normalized.article,
          now
        );
      } else {
        nextStore.articles.push({
          id: randomUUID(),
          candidateId: existingCandidate.id,
          ...normalized.article,
          slug: existingCandidate.slug,
        });
      }
    } else {
      const slug = ensureUniqueSlug(normalized.candidate.slug, existingSlugs, dedupeKey);
      const candidateId = randomUUID();
      existingSlugs.add(slug);
      nextStore.candidates.push({
        id: candidateId,
        ...normalized.candidate,
        slug,
      });
      nextStore.articles.push({
        id: randomUUID(),
        candidateId,
        ...normalized.article,
        slug,
      });
    }

    summary.publishedCount += 1;
    summary.latestPublishedAt = now;
  }

  if (summary.publishedCount < publishCap) {
    const queuedPromotion = publishQueuedArticles(
      nextStore,
      publishCap - summary.publishedCount,
      now
    );
    summary.publishedCount += queuedPromotion.publishedCount;
    if (queuedPromotion.latestPublishedAt) {
      summary.latestPublishedAt = queuedPromotion.latestPublishedAt;
    }
  }

  return {
    store: nextStore,
    summary,
  };
}

module.exports = {
  applyDraftsToStore,
  buildFallbackHero,
  candidateDedupeKey,
  defaultStoreSnapshot,
  normalizeCanonicalUrl,
  normalizeDraft,
  generatedCopyHasSourceProvenance,
  normalizeStore,
  normalizeTopicFingerprint,
  readStore,
  slugify,
  writeStore,
};
