#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_VPS_RUNTIME_ROOT = '/var/www/runtime-data/dev.chinesearizona.com/web';

const LOS_ANGELES_IMAGE_REPAIRS = {
  'federal-prosecutor-cites-california-election-fraud-probes':
    'https://california-times-brightspot.s3.amazonaws.com/cd/0f/1256f5014bc2b1bedbc16955841b/1557801-me-lapd-macarthur-park-raid-ajs-009.jpg',
  'california-wildfire-plan-aims-to-expand-prevention-work':
    'https://california-times-brightspot.s3.amazonaws.com/0a/5f/eb568dbc4cb981c72fc804d40c37/california-wildfires-68126.jpg',
  'judge-dismisses-murder-case-against-former-lapd-officer':
    'https://california-times-brightspot.s3.amazonaws.com/34/a6/741b268845d986ff9569496d7834/1556933-me-ex-lapd-officer-court-appearance-mjc-01.jpg',
  'two-south-gate-men-admit-robbing-casino-winners':
    'https://california-times-brightspot.s3.amazonaws.com/1c/1c/a3694c864591930362efd0f4b131/1201133-fi-poker-cheating-scandal-5-ajs.jpg',
  'raman-narrows-pratt-lead-in-la-mayoral-primary':
    'https://california-times-brightspot.s3.amazonaws.com/b4/69/82d4ac8e4030bc0844e4df61c260/la-me-2026-mayoral-race.jpg',
  'casey-wasserman-says-he-will-stay-as-la28-chair':
    'https://california-times-brightspot.s3.amazonaws.com/62/0b/ec0d9ff74f70804b0db3d11e913f/1557651-sp-la28-ioc-commission-ajs-13.jpg',
  'orange-county-revises-statement-on-garden-grove-chemical-vapors':
    'https://california-times-brightspot.s3.amazonaws.com/90/0e/228649fe4dc4ae4bd44dc9345253/1556662-me-gg-chemical-crisis-folo-ajs-03.jpg',
  'lapd-and-federal-agents-sweep-macarthur-park-for-narcotics':
    'https://california-times-brightspot.s3.amazonaws.com/78/d9/9454284b41fc8cfd5d88efe82a99/1557801-me-lapd-macarthur-park-raid-ajs-001.JPG',
};

const AUSTIN_IMAGE_REPAIRS = {
  'south-texas-screwworm-case-puts-pet-owners-on-alert':
    'https://npr-brightspot.s3.amazonaws.com/3e/f9/02d79a284fbfac8b4c4abe9dba2f/pexels-ar-kay-768552413-33252199.jpg',
  'austin-isd-families-push-back-on-budget-cuts':
    'https://npr-brightspot.s3.amazonaws.com/28/a5/9777b47045358628043562250965/20260604-ms-aisd-school-board-meeting-10.jpg',
  'texas-softball-wins-second-straight-ncaa-title':
    'https://npr-brightspot.s3.amazonaws.com/ab/43/f1c0d46f46568b9701851b1e4d44/20260604-texas-softball-05.JPG',
  'austin-isd-police-chief-injured-in-motorcycle-crash':
    'https://npr-brightspot.s3.amazonaws.com/95/7b/acaa012c4ae09d702ce676524174/20240920-shooter-threats-presser22.JPG',
  'ut-begins-removing-cesar-chavez-statue':
    'https://npr-brightspot.s3.amazonaws.com/ea/f8/04ab6b49433ca7bf7799517c2078/20260604-chavez-statue-01.JPG',
  'austin-spurs-fans-pack-finals-watch-party':
    'https://npr-brightspot.s3.amazonaws.com/cf/18/01c594af45d6ace9e441d74c8694/20260604-spurswatchparty-pl-05.JPG',
  'ridgetop-cafeteria-duo-says-goodbye':
    'https://npr-brightspot.s3.amazonaws.com/c4/3d/6498a86a431db5cfcac90e550fae/20260528-ridgetopelementarylunches-14.JPG',
  'capmetro-bikeshare-remains-shut-down-after-fire':
    'https://npr-brightspot.s3.amazonaws.com/f8/25/831b535945bf835e770e8865ed4f/screenshot-2026-06-03-at-12-49-16-pm.png',
};

const LOCAL_ARTICLE_IMAGE_REPAIRS = {
  'picacho-peak-travel-stop-closes-after-40-years':
    'https://ewscripps-brightspot.s3.amazonaws.com/96/5d/12c96b2847118875f78a73c1e000/screenshot-2026-05-31-at-15-06-18.png',
};

function resolveDefaultRuntimePath(relativePath) {
  if (process.env.CHINESEARIZONA_RUNTIME_DATA_ROOT) {
    return path.join(process.env.CHINESEARIZONA_RUNTIME_DATA_ROOT, relativePath);
  }

  if (ROOT === '/var/www/dev.chinesearizona.com/web') {
    return path.join(DEFAULT_VPS_RUNTIME_ROOT, relativePath);
  }

  return path.join(ROOT, relativePath);
}

function firstSetEnvPath(keys) {
  for (const key of keys) {
    if (process.env[key]) {
      return process.env[key];
    }
  }

  return '';
}

function getRepairTargets() {
  return [
    {
      kind: 'radar-store',
      label: 'los-angeles-radar',
      filePath:
        firstSetEnvPath(['RADAR_STORE_PATH_LOS_ANGELES', 'LOS_ANGELES_RADAR_STORE_PATH']) ||
        resolveDefaultRuntimePath(path.join('data', 'sites', 'los-angeles', 'radar-runtime', 'store.json')),
      repairs: LOS_ANGELES_IMAGE_REPAIRS,
    },
    {
      kind: 'radar-store',
      label: 'austin-radar',
      filePath:
        firstSetEnvPath(['RADAR_STORE_PATH_AUSTIN', 'AUSTIN_RADAR_STORE_PATH']) ||
        resolveDefaultRuntimePath(path.join('data', 'sites', 'austin', 'radar-runtime', 'store.json')),
      repairs: AUSTIN_IMAGE_REPAIRS,
    },
    {
      kind: 'article-array',
      label: 'generated-local-articles',
      filePath:
        firstSetEnvPath(['GENERATED_LOCAL_ARTICLES_PATH']) ||
        resolveDefaultRuntimePath(path.join('src', 'data', 'generated-local-articles.json')),
      repairs: LOCAL_ARTICLE_IMAGE_REPAIRS,
    },
  ];
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function getArticleList(payload, kind) {
  if (kind === 'article-array') {
    return Array.isArray(payload) ? payload : [];
  }

  return Array.isArray(payload && payload.articles) ? payload.articles : [];
}

function markArticleWithSourceImage(article, heroImage, now) {
  article.heroImage = heroImage;
  article.heroImagePolicy = 'source_allowed';

  if (Object.prototype.hasOwnProperty.call(article, 'updatedAt')) {
    article.updatedAt = now;
  }

  if (Object.prototype.hasOwnProperty.call(article, 'lastCheckedAt')) {
    article.lastCheckedAt = now;
  }
}

async function imageUrlIsUsable(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
        'accept-encoding': 'identity',
        range: 'bytes=0-1023',
        'user-agent': 'ChineseArizonaCurrentImageRepair/1.0',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    try {
      await response.body?.cancel();
    } catch (_error) {
      // Only headers are needed for validation.
    }
    return response.ok && contentType.startsWith('image/');
  } catch (_error) {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function repairTarget(target, options = {}) {
  const now = options.now || new Date().toISOString();
  const validateImages = options.validateImages !== false;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 15000;
  const summary = {
    label: target.label,
    filePath: target.filePath,
    repaired: [],
    missing: [],
    invalid: [],
    unchanged: [],
    skipped: false,
  };

  if (!fs.existsSync(target.filePath)) {
    summary.skipped = true;
    return summary;
  }

  const payload = readJsonFile(target.filePath);
  const articles = getArticleList(payload, target.kind);
  const bySlug = new Map(articles.map((article) => [String(article.slug || ''), article]));
  let changed = false;

  for (const [slug, heroImage] of Object.entries(target.repairs)) {
    const article = bySlug.get(slug);
    if (!article) {
      summary.missing.push(slug);
      continue;
    }

    if (validateImages && !(await imageUrlIsUsable(heroImage, timeoutMs))) {
      summary.invalid.push(slug);
      continue;
    }

    if (article.heroImage === heroImage && article.heroImagePolicy === 'source_allowed') {
      summary.unchanged.push(slug);
      continue;
    }

    markArticleWithSourceImage(article, heroImage, now);
    summary.repaired.push(slug);
    changed = true;
  }

  if (changed && !options.dryRun) {
    writeJsonFile(target.filePath, payload);
  }

  return summary;
}

async function repairCurrentArticleImages(options = {}) {
  const summaries = [];
  for (const target of options.targets || getRepairTargets()) {
    summaries.push(await repairTarget(target, options));
  }

  return summaries;
}

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    strict: argv.includes('--strict'),
    validateImages: !argv.includes('--no-validate'),
  };
}

async function runCli() {
  const options = parseArgs(process.argv.slice(2));
  const summaries = await repairCurrentArticleImages(options);

  for (const summary of summaries) {
    process.stdout.write(`${JSON.stringify({ status: 'current_article_image_repair', ...summary })}\n`);
  }

  const invalidCount = summaries.reduce((count, summary) => count + summary.invalid.length, 0);
  if (options.strict && invalidCount > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli().catch((error) => {
    process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  AUSTIN_IMAGE_REPAIRS,
  LOCAL_ARTICLE_IMAGE_REPAIRS,
  LOS_ANGELES_IMAGE_REPAIRS,
  getRepairTargets,
  imageUrlIsUsable,
  repairCurrentArticleImages,
  repairTarget,
};
