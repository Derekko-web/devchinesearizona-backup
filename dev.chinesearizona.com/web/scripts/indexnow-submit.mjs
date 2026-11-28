#!/usr/bin/env node
// Tells IndexNow engines (Bing, Yandex, Naver, Seznam, Yep, Amazon) about our
// pages (issue #530). Bing's index also feeds ChatGPT search, Copilot and
// DuckDuckGo.
//
//   npm run indexnow -- --dry-run          print what would be sent, send nothing
//   npm run indexnow                       submit every chinesearizona.com URL in the sitemap
//   npm run indexnow -- --prefix /business --prefix /relocation-guide
//                                          only URLs whose path starts with one of these
//
// Protocol (https://www.indexnow.org/documentation, checked 2026-11-28):
// POST JSON {host, key, keyLocation, urlList} to https://api.indexnow.org/indexnow
// with Content-Type: application/json; charset=utf-8, at most 10,000 URLs per
// request; one endpoint is shared with every participating engine. 200 and 202
// mean received (202: key check pending); 400 bad request; 403 key not valid;
// 422 URLs not on the host or bad key; 429 too many requests.
// Do not resubmit unchanged URLs: run this after launches or big content changes.

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SITE_HOST = 'chinesearizona.com';
export const ENDPOINT = 'https://api.indexnow.org/indexnow';
export const MAX_BATCH_SIZE = 10_000;
const DEFAULT_SITEMAP = `https://${SITE_HOST}/sitemap.xml`;

const statusMeanings = {
  200: 'received',
  202: 'received, key check pending',
  400: 'bad request',
  403: 'key not valid (key file missing or wrong)',
  422: 'URLs not on this host, or key does not match',
  429: 'too many requests, back off',
};

export function describeStatus(status) {
  return statusMeanings[status] ?? 'unexpected response';
}

export function isAccepted(status) {
  return status === 200 || status === 202;
}

export function readIndexNowConfig() {
  const path = fileURLToPath(new URL('../src/data/indexnow.json', import.meta.url));
  const config = JSON.parse(readFileSync(path, 'utf8'));
  if (config.host !== SITE_HOST || !/^[A-Za-z0-9-]{8,128}$/.test(config.key ?? '')) {
    throw new Error('src/data/indexnow.json must hold host "chinesearizona.com" and an 8-128 character key.');
  }
  return config;
}

function decodeXml(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

// Page URLs are the <loc> values (Chinese pages have their own <loc>); hreflang
// alternates are <xhtml:link> attributes and are not read.
export function parseSitemapUrls(xml) {
  return Array.from(xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g), (match) => decodeXml(match[1]));
}

// Exactly https://chinesearizona.com/…, optionally limited to path prefixes; duplicates removed.
export function selectSiteUrls(urls, prefixes = []) {
  const selected = new Set();
  for (const value of urls) {
    let url;
    try {
      url = new URL(value);
    } catch {
      continue;
    }
    if (url.protocol !== 'https:' || url.host !== SITE_HOST) {
      continue;
    }
    const path = url.pathname.replace(/^\/zh(?=\/|$)/, '') || '/';
    if (prefixes.length > 0 && !prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      continue;
    }
    selected.add(url.href);
  }
  return [...selected];
}

export function buildBatches(urls, size = MAX_BATCH_SIZE) {
  const batchSize = Math.min(Math.max(1, size), MAX_BATCH_SIZE);
  const batches = [];
  for (let index = 0; index < urls.length; index += batchSize) {
    batches.push(urls.slice(index, index + batchSize));
  }
  return batches;
}

export function buildPayload(config, urlList) {
  return {
    host: SITE_HOST,
    key: config.key,
    keyLocation: `https://${SITE_HOST}/${config.key}.txt`,
    urlList,
  };
}

export function parseArgs(argv) {
  const options = { dryRun: false, prefixes: [], sitemap: DEFAULT_SITEMAP, batchSize: MAX_BATCH_SIZE };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--prefix') {
      options.prefixes.push(argv[++index]);
    } else if (arg === '--sitemap') {
      options.sitemap = argv[++index];
    } else if (arg === '--batch-size') {
      options.batchSize = Number(argv[++index]);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return options;
}

// Never submit from CI, and never for any host but chinesearizona.com.
export function refusalReason(options, env = process.env) {
  if (env.CI || env.GITHUB_ACTIONS) {
    return 'Running in CI: IndexNow submissions are only run by hand.';
  }
  let sitemapHost;
  try {
    sitemapHost = new URL(options.sitemap).host;
  } catch {
    return `Not a URL: ${options.sitemap}`;
  }
  if (sitemapHost !== SITE_HOST) {
    return `Refusing to read ${sitemapHost}: this script only submits ${SITE_HOST}.`;
  }
  if (options.prefixes.some((prefix) => typeof prefix !== 'string' || !prefix.startsWith('/'))) {
    return 'Each --prefix must be a path starting with "/".';
  }
  if (!Number.isInteger(options.batchSize) || options.batchSize < 1) {
    return '--batch-size must be a positive whole number.';
  }
  return null;
}

export async function run({ argv = process.argv.slice(2), env = process.env, fetchImpl = fetch, log = console.log } = {}) {
  const options = parseArgs(argv);
  const refusal = refusalReason(options, env);
  if (refusal) {
    log(refusal);
    return { submitted: 0, accepted: 0, refused: true };
  }

  const config = readIndexNowConfig();
  const sitemapResponse = await fetchImpl(options.sitemap);
  if (!sitemapResponse.ok) {
    throw new Error(`Could not read ${options.sitemap}: HTTP ${sitemapResponse.status}`);
  }
  const urls = selectSiteUrls(parseSitemapUrls(await sitemapResponse.text()), options.prefixes);
  const batches = buildBatches(urls, options.batchSize);
  log(`${urls.length} ${SITE_HOST} URLs from ${options.sitemap} in ${batches.length} batch(es).`);

  if (options.dryRun) {
    log(`Dry run: would POST to ${ENDPOINT} with key file ${buildPayload(config, []).keyLocation}`);
    urls.forEach((url) => log(`  ${url}`));
    return { submitted: 0, accepted: 0, dryRun: true, urls };
  }

  // Engines verify the key file before accepting anything, so check it first.
  const keyLocation = buildPayload(config, []).keyLocation;
  const keyResponse = await fetchImpl(keyLocation);
  const keyText = keyResponse.ok ? (await keyResponse.text()).trim() : '';
  if (keyText !== config.key) {
    log(`Key file ${keyLocation} is not live yet (HTTP ${keyResponse.status}). Deploy first; nothing was sent.`);
    return { submitted: 0, accepted: 0, keyMissing: true };
  }

  let submitted = 0;
  let accepted = 0;
  for (const [index, batch] of batches.entries()) {
    const response = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(buildPayload(config, batch)),
    });
    submitted += batch.length;
    if (isAccepted(response.status)) {
      accepted += batch.length;
    }
    log(`Batch ${index + 1}/${batches.length}: ${batch.length} URLs -> HTTP ${response.status} (${describeStatus(response.status)})`);
    if (response.status === 429) {
      log(`Stopping. Retry-After: ${response.headers.get('retry-after') ?? 'not given'}`);
      break;
    }
  }

  log(`Done: ${accepted} of ${submitted} URLs accepted.`);
  return { submitted, accepted };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
