#!/usr/bin/env node

const DEFAULT_BASE_URL = 'https://dev.chinesearizona.com';
const baseUrl = (process.env.SMOKE_BASE_URL || process.env.DEV_SITE_URL || DEFAULT_BASE_URL).replace(
  /\/+$/,
  ''
);
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 15_000);
const requiredRoutes = ['/', '/en', '/zh', '/directory', '/arizona-news', '/api/health'];

function withTimeout() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    stop: () => clearTimeout(timeout),
  };
}

async function checkRoute(path) {
  const url = `${baseUrl}${path}`;
  const timer = withTimeout();
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'ChineseArizona closed-loop smoke check',
      },
      redirect: 'manual',
      signal: timer.signal,
    });
    const durationMs = Date.now() - startedAt;
    const result = {
      durationMs,
      ok: response.status >= 200 && response.status < 400,
      path,
      status: response.status,
      url,
    };

    if (path === '/api/health' && response.headers.get('content-type')?.includes('application/json')) {
      const body = await response.json();
      result.healthOk = Boolean(body.ok);
      result.ok = result.ok && result.healthOk;
      result.gitSha = body.gitSha;
      result.buildTime = body.buildTime;
    }

    return result;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      ok: false,
      path,
      url,
    };
  } finally {
    timer.stop();
  }
}

const results = await Promise.all(requiredRoutes.map(checkRoute));
const failed = results.filter((result) => !result.ok);

process.stdout.write(
  `${JSON.stringify(
    {
      baseUrl,
      checkedAt: new Date().toISOString(),
      ok: failed.length === 0,
      results,
    },
    null,
    2
  )}\n`
);

if (failed.length > 0) {
  process.exitCode = 1;
}
