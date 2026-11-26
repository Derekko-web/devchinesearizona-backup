// Smoke checks for the closed-loop collector. A single slow reply (for example
// one Supabase test query that takes longer than the health probe allows) used
// to open an issue that closed itself ten minutes later. A failing route is now
// checked once more after a short pause, so only failures that last get filed.

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 5_000;

export function routeResultHealthy(result) {
  if (!result?.ok) {
    return false;
  }

  // Health must be proven by the JSON body, not just a 2xx status.
  return result.path !== '/api/health' || result.healthOk === true;
}

export async function checkRoute(
  path,
  baseUrl,
  { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, now = Date.now } = {}
) {
  const startedAt = now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${baseUrl}${path}`;

  try {
    const response = await fetchImpl(url, {
      headers: {
        'user-agent': 'ChineseArizona closed-loop collector',
      },
      signal: controller.signal,
    });
    const result = {
      durationMs: now() - startedAt,
      ok: response.status >= 200 && response.status < 400,
      path,
      status: response.status,
      url,
    };

    if (path === '/api/health' && response.headers.get('content-type')?.includes('application/json')) {
      const health = await response.json();
      result.healthOk = Boolean(health.ok);
      result.gitSha = health.gitSha;
      result.buildTime = health.buildTime;
      result.ok = result.ok && result.healthOk;
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
    clearTimeout(timeout);
  }
}

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

// Returns the first healthy result, or the last failing one. A result that
// needed more than one try records how many it took in `attempts`.
export async function checkRouteWithRetry(
  path,
  baseUrl,
  {
    attempts = DEFAULT_ATTEMPTS,
    check = checkRoute,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    sleep = wait,
  } = {}
) {
  const tries = Math.max(1, Math.floor(Number(attempts) || 1));
  let result;

  for (let attempt = 1; attempt <= tries; attempt += 1) {
    result = await check(path, baseUrl);
    if (routeResultHealthy(result)) {
      return attempt > 1 ? { ...result, attempts: attempt } : result;
    }
    if (attempt < tries) {
      await sleep(retryDelayMs);
    }
  }

  return tries > 1 ? { ...result, attempts: tries } : result;
}

export function routeCheckSettings(env = process.env) {
  const attempts = Number(env.CLOSED_LOOP_ROUTE_ATTEMPTS);
  const retryDelayMs = Number(env.CLOSED_LOOP_ROUTE_RETRY_DELAY_MS);
  const timeoutMs = Number(env.CLOSED_LOOP_TIMEOUT_MS);

  return {
    attempts: Number.isFinite(attempts) && attempts >= 1 ? attempts : DEFAULT_ATTEMPTS,
    retryDelayMs:
      Number.isFinite(retryDelayMs) && retryDelayMs >= 0 ? retryDelayMs : DEFAULT_RETRY_DELAY_MS,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
  };
}
