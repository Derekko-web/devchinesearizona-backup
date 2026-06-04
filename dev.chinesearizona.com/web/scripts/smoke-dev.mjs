#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = 'https://dev.chinesearizona.com';
const DEFAULT_TIMEOUT_MS = 15_000;
const MIN_CITY_DIRECTORY_COUNT = 200;

const ARIZONA_FALLBACK_MARKERS = [
  'Phoenix, AZ',
  'Chandler, AZ',
  'Tempe, AZ',
  'Scottsdale, AZ',
  'Gilbert, AZ',
  'Mesa, AZ',
  'AZ 850',
  'AZ 852',
  'AZ 853',
];

export function normalizeOrigin(value) {
  return value.replace(/\/+$/, '');
}

export function parseBooleanFlag(value) {
  if (value === undefined) {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function extractDirectoryCounts(body) {
  return Array.from(body.matchAll(/Showing\s+1-24\s+of\s+(\d+)/g), (match) =>
    Number(match[1])
  ).filter((count) => Number.isFinite(count));
}

export function extractDeployIds(body) {
  const ids = new Set();

  for (const match of body.matchAll(/data-dpl-id="([^"]+)"/g)) {
    ids.add(match[1]);
  }

  for (const match of body.matchAll(/[?&]dpl=([a-f0-9]{7,40})/g)) {
    ids.add(match[1]);
  }

  return Array.from(ids);
}

function expectedGitShaFromEnv(env) {
  return (
    env.SMOKE_EXPECTED_GIT_SHA ||
    env.DEPLOY_SHA ||
    env.GIT_SHA ||
    env.NEXT_PUBLIC_GIT_SHA ||
    undefined
  );
}

function timeoutMsFromEnv(env) {
  const timeoutMs = Number(env.SMOKE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS;
}

function userAgentFromEnv(env) {
  return env.SMOKE_USER_AGENT || 'ChineseArizona closed-loop smoke check';
}

function route(origin, path, options = {}) {
  return {
    expectedStatuses: [200],
    followRedirects: true,
    kind: 'html',
    origin,
    path,
    ...options,
  };
}

function redirect(origin, path, expectedLocationPath, id) {
  return {
    expectedLocationPath,
    expectedStatuses: [301, 302, 307, 308],
    followRedirects: false,
    id,
    kind: 'redirect',
    origin,
    path,
  };
}

function citySiteChecks({ brand, detail, directoryCities, directoryOrigin, newsPath, sitemapNeedle }) {
  return [
    route(directoryOrigin, '/', {
      id: `${brand}:home`,
      requiredText: [brand],
    }),
    route(directoryOrigin, '/business', {
      forbiddenText: ARIZONA_FALLBACK_MARKERS,
      id: `${brand}:business-directory`,
      minDirectoryCount: MIN_CITY_DIRECTORY_COUNT,
      requiredText: [brand, 'Showing 1-24', ...directoryCities],
    }),
    redirect(directoryOrigin, '/directory', '/business', `${brand}:directory-redirect`),
    route(directoryOrigin, detail.path, {
      forbiddenText: ARIZONA_FALLBACK_MARKERS,
      id: `${brand}:business-detail`,
      requiredText: [detail.name, detail.city],
    }),
    route(directoryOrigin, newsPath, {
      id: `${brand}:news-index`,
      requiredText: [brand],
    }),
    route(directoryOrigin, '/robots.txt', {
      checkDeployId: false,
      expectedContentType: 'text/plain',
      id: `${brand}:robots`,
      kind: 'text',
      requiredText: [`Sitemap: ${directoryOrigin}/sitemap.xml`],
    }),
    route(directoryOrigin, '/sitemap.xml', {
      checkDeployId: false,
      expectedContentType: 'application/xml',
      id: `${brand}:sitemap`,
      kind: 'text',
      requiredText: [directoryOrigin, sitemapNeedle],
    }),
  ];
}

export function buildSmokeChecks(env = process.env) {
  const baseUrl = normalizeOrigin(env.SMOKE_BASE_URL || env.DEV_SITE_URL || DEFAULT_BASE_URL);
  const skipPublicDomains = parseBooleanFlag(env.SMOKE_SKIP_PUBLIC_DOMAINS);
  const austinUrl = normalizeOrigin(env.SMOKE_AUSTIN_URL || 'https://chineseaustin.com');
  const losAngelesUrl = normalizeOrigin(
    env.SMOKE_LOS_ANGELES_URL || 'https://chineselosangeles.com'
  );
  const sfBayUrl = normalizeOrigin(env.SMOKE_SF_BAY_URL || 'https://chinesesfbay.com');

  const checks = [
    route(baseUrl, '/', {
      id: 'dev:home',
      requiredText: ['ChineseArizona'],
    }),
    route(baseUrl, '/en', {
      id: 'dev:english-home',
      requiredText: ['ChineseArizona'],
    }),
    route(baseUrl, '/zh', {
      id: 'dev:chinese-home',
      requiredText: ['ChineseArizona'],
    }),
    route(baseUrl, '/business', {
      id: 'dev:business-directory',
      requiredText: ['ChineseArizona', 'Showing 1-24'],
    }),
    redirect(baseUrl, '/directory', '/business', 'dev:directory-redirect'),
    route(baseUrl, '/arizona-news', {
      id: 'dev:arizona-news',
      requiredText: ['ChineseArizona'],
    }),
    route(baseUrl, '/api/health', {
      checkDeployId: false,
      id: 'dev:health',
      kind: 'health',
    }),
    route(baseUrl, '/robots.txt', {
      checkDeployId: false,
      expectedContentType: 'text/plain',
      id: 'dev:robots',
      kind: 'text',
      requiredText: ['Sitemap:', '/sitemap.xml'],
    }),
    route(baseUrl, '/sitemap.xml', {
      checkDeployId: false,
      expectedContentType: 'application/xml',
      id: 'dev:sitemap',
      kind: 'text',
      requiredText: ['/business'],
    }),
  ];

  if (skipPublicDomains) {
    return checks;
  }

  return [
    ...checks,
    ...citySiteChecks({
      brand: 'ChineseAustin',
      detail: {
        city: 'Austin',
        name: 'House of Three Gorges',
        path: '/business/house-of-three-gorges-austin',
      },
      directoryCities: ['Austin', 'Round Rock'],
      directoryOrigin: austinUrl,
      newsPath: '/local-news',
      sitemapNeedle: '/business/house-of-three-gorges-austin',
    }),
    ...citySiteChecks({
      brand: 'ChineseLosAngeles',
      detail: {
        city: 'Alhambra',
        name: 'Lunasia',
        path: '/business/lunasia-dim-sum-house-alhambra',
      },
      directoryCities: ['Los Angeles', 'Alhambra'],
      directoryOrigin: losAngelesUrl,
      newsPath: '/los-angeles-news',
      sitemapNeedle: '/business/lunasia-dim-sum-house-alhambra',
    }),
    ...citySiteChecks({
      brand: 'ChineseSFBay',
      detail: {
        city: 'Oakland',
        name: 'Asian Health Services',
        path: '/business/asian-health-services-oakland',
      },
      directoryCities: ['San Francisco', 'Oakland'],
      directoryOrigin: sfBayUrl,
      newsPath: '/news',
      sitemapNeedle: '/business/asian-health-services-oakland',
    }),
  ];
}

function withTimeout(timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    stop: () => clearTimeout(timeout),
  };
}

function expectedStatusOk(status, expectedStatuses) {
  return expectedStatuses.includes(status);
}

function contentTypeOk(contentType, expectedContentType) {
  if (!expectedContentType) {
    return true;
  }

  return contentType?.toLowerCase().includes(expectedContentType.toLowerCase());
}

function checkDeployIdShouldRun(check) {
  return check.checkDeployId !== false && check.kind === 'html';
}

function addTextAssertions(result, body, check) {
  for (const expectedText of check.requiredText || []) {
    if (!body.includes(expectedText)) {
      result.errors.push(`Missing required text: ${expectedText}`);
    }
  }

  for (const forbiddenText of check.forbiddenText || []) {
    if (body.includes(forbiddenText)) {
      result.errors.push(`Found forbidden text: ${forbiddenText}`);
    }
  }

  if (check.minDirectoryCount !== undefined) {
    const counts = extractDirectoryCounts(body);
    const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
    result.directoryCounts = counts;
    result.maxDirectoryCount = maxCount;

    if (maxCount < check.minDirectoryCount) {
      result.errors.push(
        `Directory count ${maxCount} is below required minimum ${check.minDirectoryCount}`
      );
    }
  }

  if (checkDeployIdShouldRun(check)) {
    const deployIds = extractDeployIds(body);
    result.deployIds = deployIds;

    if (result.expectedGitSha && !deployIds.includes(result.expectedGitSha)) {
      result.errors.push(`HTML deploy id does not include expected SHA ${result.expectedGitSha}`);
    }
  }
}

async function readBody(response, kind) {
  if (kind === 'health') {
    return response.json();
  }

  return response.text();
}

function addHealthAssertions(result, body, expectedGitSha) {
  result.healthOk = Boolean(body.ok);
  result.gitSha = body.gitSha;
  result.buildTime = body.buildTime;
  result.uptimeSeconds = body.uptimeSeconds;

  if (!result.healthOk) {
    result.errors.push('Health endpoint returned ok=false');
  }

  if (expectedGitSha && body.gitSha !== expectedGitSha) {
    result.errors.push(`Health gitSha ${body.gitSha} does not match expected ${expectedGitSha}`);
  }

  if (!body.buildTime || body.buildTime === 'unknown' || Number.isNaN(Date.parse(body.buildTime))) {
    result.errors.push('Health buildTime is missing or invalid');
  }

  for (const [name, check] of Object.entries(body.checks || {})) {
    if (check?.required && !check.ok) {
      result.errors.push(`Required health check failed: ${name}`);
    }
  }
}

function addRedirectAssertions(result, response, check) {
  const location = response.headers.get('location') || '';
  result.location = location;

  if (!location) {
    result.errors.push('Redirect response did not include a location header');
    return;
  }

  const locationPath = new URL(location, check.origin).pathname;
  result.locationPath = locationPath;

  if (locationPath !== check.expectedLocationPath) {
    result.errors.push(
      `Redirect location ${locationPath} does not match ${check.expectedLocationPath}`
    );
  }
}

export async function runSmokeCheck(check, options) {
  const { expectedGitSha, fetchImpl, timeoutMs, userAgent } = options;
  const url = `${check.origin}${check.path}`;
  const timer = withTimeout(timeoutMs);
  const startedAt = Date.now();
  const result = {
    durationMs: 0,
    errors: [],
    expectedGitSha,
    id: check.id || `${check.origin}${check.path}`,
    kind: check.kind,
    ok: false,
    path: check.path,
    url,
  };

  try {
    const response = await fetchImpl(url, {
      headers: {
        'user-agent': userAgent,
      },
      redirect: check.followRedirects ? 'follow' : 'manual',
      signal: timer.signal,
    });

    result.durationMs = Date.now() - startedAt;
    result.status = response.status;
    result.finalUrl = response.url || url;

    if (!expectedStatusOk(response.status, check.expectedStatuses)) {
      result.errors.push(
        `Status ${response.status} did not match expected ${check.expectedStatuses.join(', ')}`
      );
    }

    const contentType = response.headers.get('content-type') || '';
    result.contentType = contentType;

    if (!contentTypeOk(contentType, check.expectedContentType)) {
      result.errors.push(
        `Content-Type ${contentType || '(missing)'} did not include ${check.expectedContentType}`
      );
    }

    if (check.kind === 'redirect') {
      addRedirectAssertions(result, response, check);
    } else {
      const body = await readBody(response, check.kind);

      if (check.kind === 'health') {
        addHealthAssertions(result, body, expectedGitSha);
      } else {
        addTextAssertions(result, body, check);
      }
    }
  } catch (error) {
    result.durationMs = Date.now() - startedAt;
    result.errors.push(error instanceof Error ? error.message : String(error));
  } finally {
    timer.stop();
  }

  result.ok = result.errors.length === 0;
  return result;
}

export async function runSmokeChecks(options = {}) {
  const env = options.env || process.env;
  const checks = options.checks || buildSmokeChecks(env);
  const expectedGitSha = options.expectedGitSha || expectedGitShaFromEnv(env);
  const timeoutMs = options.timeoutMs || timeoutMsFromEnv(env);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const userAgent = options.userAgent || userAgentFromEnv(env);

  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required to run smoke checks.');
  }

  const results = await Promise.all(
    checks.map((check) =>
      runSmokeCheck(check, {
        expectedGitSha,
        fetchImpl,
        timeoutMs,
        userAgent,
      })
    )
  );
  const failed = results.filter((result) => !result.ok);

  return {
    checkedAt: new Date().toISOString(),
    expectedGitSha,
    ok: failed.length === 0,
    results,
    summary: {
      failed: failed.length,
      passed: results.length - failed.length,
      total: results.length,
    },
  };
}

function isMainModule() {
  return process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
}

if (isMainModule()) {
  const result = await runSmokeChecks();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

  if (!result.ok) {
    process.exitCode = 1;
  }
}
