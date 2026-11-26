import { describe, expect, it, vi } from 'vitest';

import {
  checkRoute,
  checkRouteWithRetry,
  routeCheckSettings,
  routeResultHealthy,
} from '../../../ops/closed-loop/route-check.mjs';

const baseUrl = 'https://chinesearizona.com';

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  });
}

describe('closed-loop route check', () => {
  it('treats /api/health as healthy only when the JSON body says ok', () => {
    expect(routeResultHealthy({ ok: true, path: '/' })).toBe(true);
    expect(routeResultHealthy({ ok: false, path: '/' })).toBe(false);
    expect(routeResultHealthy({ ok: true, path: '/api/health' })).toBe(false);
    expect(routeResultHealthy({ healthOk: true, ok: true, path: '/api/health' })).toBe(true);
    expect(routeResultHealthy(undefined)).toBe(false);
  });

  it('reads the health body and fails the route when it reports ok: false', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(503, { buildTime: 't', gitSha: 'abc', ok: false })
    );

    const result = await checkRoute('/api/health', baseUrl, { fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://chinesearizona.com/api/health',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result).toMatchObject({
      buildTime: 't',
      gitSha: 'abc',
      healthOk: false,
      ok: false,
      path: '/api/health',
      status: 503,
    });
  });

  it('reports a network error as a failed route', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('This operation was aborted');
    });

    const result = await checkRoute('/directory', baseUrl, { fetchImpl });

    expect(result).toEqual({
      error: 'This operation was aborted',
      ok: false,
      path: '/directory',
      url: 'https://chinesearizona.com/directory',
    });
  });

  it('passes a route that recovers on the second try', async () => {
    const check = vi
      .fn()
      .mockResolvedValueOnce({ healthOk: false, ok: false, path: '/api/health', status: 503 })
      .mockResolvedValueOnce({ healthOk: true, ok: true, path: '/api/health', status: 200 });
    const sleep = vi.fn(async () => {});

    const result = await checkRouteWithRetry('/api/health', baseUrl, {
      check,
      retryDelayMs: 1234,
      sleep,
    });

    expect(check).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1234);
    expect(result).toMatchObject({ attempts: 2, healthOk: true, ok: true });
    expect(routeResultHealthy(result)).toBe(true);
  });

  it('does not retry a healthy route', async () => {
    const check = vi.fn().mockResolvedValue({ ok: true, path: '/', status: 200 });
    const sleep = vi.fn(async () => {});

    const result = await checkRouteWithRetry('/', baseUrl, { check, sleep });

    expect(check).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, path: '/', status: 200 });
  });

  it('returns the last failure when every try fails', async () => {
    const check = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, path: '/zh', status: 502 })
      .mockResolvedValueOnce({ ok: false, path: '/zh', status: 504 });
    const sleep = vi.fn(async () => {});

    const result = await checkRouteWithRetry('/zh', baseUrl, { check, sleep });

    expect(check).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ attempts: 2, ok: false, path: '/zh', status: 504 });
  });

  it('reads attempts, delay and timeout from the environment with safe defaults', () => {
    expect(routeCheckSettings({})).toEqual({ attempts: 2, retryDelayMs: 5000, timeoutMs: 15000 });
    expect(
      routeCheckSettings({
        CLOSED_LOOP_ROUTE_ATTEMPTS: '3',
        CLOSED_LOOP_ROUTE_RETRY_DELAY_MS: '0',
        CLOSED_LOOP_TIMEOUT_MS: '9000',
      })
    ).toEqual({ attempts: 3, retryDelayMs: 0, timeoutMs: 9000 });
    expect(
      routeCheckSettings({
        CLOSED_LOOP_ROUTE_ATTEMPTS: '0',
        CLOSED_LOOP_ROUTE_RETRY_DELAY_MS: '-1',
        CLOSED_LOOP_TIMEOUT_MS: 'abc',
      })
    ).toEqual({ attempts: 2, retryDelayMs: 5000, timeoutMs: 15000 });
  });
});
