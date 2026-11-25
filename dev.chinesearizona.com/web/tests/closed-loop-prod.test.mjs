import { describe, expect, it } from 'vitest';

import {
  PROD_PROCESS_NAME,
  prodAccessLogFindings,
  prodFindingKeys,
  prodPm2Findings,
  prodRuntimeLogFindings,
  prodSettings,
  prodSmokeFindings,
  prodSmokeRoutes,
} from '../../../ops/closed-loop/prod-signals.mjs';

const now = Date.parse('2026-11-25T08:00:00.000Z');
const baseUrl = 'https://chinesearizona.com';

function smokeResults(overrides = {}) {
  return prodSmokeRoutes.map((path) => ({
    ok: true,
    path,
    status: 200,
    url: `${baseUrl}${path}`,
    ...(path === '/api/health' ? { gitSha: 'abc123', healthOk: true } : {}),
    ...(overrides[path] ?? {}),
  }));
}

function pm2App(name, envOverrides = {}) {
  return {
    name,
    pm2_env: {
      node_version: '20.20.2',
      pm_uptime: Date.parse('2026-11-25T07:00:00.000Z'),
      restart_time: 0,
      status: 'online',
      unstable_restarts: 0,
      ...envOverrides,
    },
  };
}

function pm2List(...apps) {
  return JSON.stringify(apps);
}

function accessLine(time, path, status) {
  return `127.0.0.1 - - [${time}] "GET ${path} HTTP/1.1" ${status} 21 "-" "Mozilla/5.0"`;
}

function expectProdFinding(finding, key) {
  expect(finding.key).toBe(key);
  expect(prodFindingKeys).toContain(key);
  expect(finding.labels).toContain('loop/prod');
  expect(finding.labels).not.toContain('loop/dev');
  expect(finding.title).toMatch(/production/i);
}

describe('closed-loop production settings', () => {
  it('watches chinesearizona.com even when the dev base URL is configured', () => {
    const settings = prodSettings(
      { CLOSED_LOOP_BASE_URL: 'https://dev.chinesearizona.com' },
      { appRoot: '/var/www/dev.chinesearizona.com/web' }
    );

    expect(settings.baseUrl).toBe('https://chinesearizona.com');
    expect(settings.accessLog).toBe('/var/www/chinesearizona.com/logs/access.log');
    expect(settings.pm2ErrorLog).toBe('/home/derek/.pm2/logs/main-chinesearizona-error.log');
  });

  it('keeps its own state files so the dev cursors are not disturbed', () => {
    const settings = prodSettings({}, { appRoot: '/var/www/dev.chinesearizona.com/web' });

    expect(settings.runtimeLogStateFile).toBe(
      '/var/www/dev.chinesearizona.com/web/logs/closed-loop-prod-runtime-log-state.json'
    );
    expect(settings.pm2StateFile).toBe(
      '/var/www/dev.chinesearizona.com/web/logs/closed-loop-prod-pm2-state.json'
    );
  });

  it('lets the environment override the production targets', () => {
    const settings = prodSettings(
      {
        CLOSED_LOOP_PROD_ACCESS_LOG: '/tmp/access.log',
        CLOSED_LOOP_PROD_BASE_URL: 'https://staging.example.com/',
        CLOSED_LOOP_PROD_PM2_ERROR_LOG: '/tmp/error.log',
        CLOSED_LOOP_PROD_PM2_ERROR_LOG_STATE_FILE: '/tmp/runtime-state.json',
        CLOSED_LOOP_PROD_PM2_STATE_FILE: '/tmp/pm2-state.json',
      },
      { appRoot: '/app' }
    );

    expect(settings).toEqual({
      accessLog: '/tmp/access.log',
      baseUrl: 'https://staging.example.com',
      pm2ErrorLog: '/tmp/error.log',
      pm2StateFile: '/tmp/pm2-state.json',
      runtimeLogStateFile: '/tmp/runtime-state.json',
    });
  });

  it('uses prod-prefixed issue keys that cannot collide with dev keys', () => {
    expect(prodFindingKeys.length).toBeGreaterThan(0);
    for (const key of prodFindingKeys) {
      expect(key.startsWith('prod-')).toBe(true);
    }
  });
});

describe('closed-loop production signals when production is healthy', () => {
  it('stays quiet across smoke, PM2, access log, and runtime log', () => {
    const pm2 = prodPm2Findings(
      pm2List(pm2App('dev-chinesearizona'), pm2App(PROD_PROCESS_NAME)),
      { now, previousState: { checkedAt: '2026-11-25T07:50:00.000Z', restartTime: 0 } }
    );
    const accessLog = [
      accessLine('25/Nov/2026:07:59:00 +0000', '/', 200),
      accessLine('25/Nov/2026:07:59:30 +0000', '/missing', 404),
    ];
    const runtimeLog = [
      '⚠️  Node.js 20 and below are deprecated and will no longer be supported in future versions of @supabase/supabase-js.',
    ].join('\n');

    expect(prodSmokeFindings(smokeResults(), { baseUrl })).toEqual([]);
    expect(pm2.findings).toEqual([]);
    expect(prodAccessLogFindings(accessLog, { now })).toEqual([]);
    expect(prodRuntimeLogFindings(runtimeLog)).toEqual([]);
    expect(prodRuntimeLogFindings('')).toEqual([]);
  });

  it('does not report a dev PM2 problem as a production problem', () => {
    const pm2 = prodPm2Findings(
      pm2List(pm2App('dev-chinesearizona', { status: 'errored' }), pm2App(PROD_PROCESS_NAME)),
      { now }
    );

    expect(pm2.findings).toEqual([]);
  });

  it('ignores a production 5xx burst that has aged out of the window', () => {
    const lines = ['/', '/en', '/zh', '/directory', '/arizona-news'].map((path) =>
      accessLine('25/Nov/2026:06:30:00 +0000', path, 502)
    );

    expect(prodAccessLogFindings(lines, { now, threshold: 5, windowMinutes: 60 })).toEqual([]);
  });
});

describe('closed-loop production smoke', () => {
  it('opens a production smoke finding when a route fails', () => {
    const findings = prodSmokeFindings(smokeResults({ '/zh': { ok: false, status: 502 } }), {
      baseUrl,
    });

    expect(findings).toHaveLength(1);
    expectProdFinding(findings[0], 'prod-smoke');
    expect(findings[0].body).toContain('https://chinesearizona.com');
    expect(findings[0].body).toContain('"/zh"');
  });

  it('fails when /api/health answers but does not report ok: true', () => {
    const findings = prodSmokeFindings(
      smokeResults({ '/api/health': { healthOk: false, ok: true, status: 200 } }),
      { baseUrl }
    );

    expect(findings).toHaveLength(1);
    expectProdFinding(findings[0], 'prod-smoke');
  });

  it('fails when /api/health does not answer with health JSON', () => {
    const findings = prodSmokeFindings(
      smokeResults({ '/api/health': { gitSha: undefined, healthOk: undefined } }),
      { baseUrl }
    );

    expect(findings).toHaveLength(1);
    expectProdFinding(findings[0], 'prod-smoke');
  });
});

describe('closed-loop production PM2', () => {
  it('reports main-chinesearizona missing from PM2', () => {
    const pm2 = prodPm2Findings(pm2List(pm2App('dev-chinesearizona')), { now });

    expect(pm2.findings).toHaveLength(1);
    expectProdFinding(pm2.findings[0], 'prod-pm2-missing');
    expect(pm2.state).toBeNull();
  });

  it('reports main-chinesearizona when it is not online', () => {
    const pm2 = prodPm2Findings(pm2List(pm2App(PROD_PROCESS_NAME, { status: 'errored' })), {
      now,
    });

    expect(pm2.findings).toHaveLength(1);
    expectProdFinding(pm2.findings[0], 'prod-pm2-restarts');
    expect(pm2.findings[0].body).toContain('Status: errored');
  });

  it('reports restart churn since the previous production sample', () => {
    const pm2 = prodPm2Findings(
      pm2List(
        pm2App(PROD_PROCESS_NAME, {
          pm_uptime: Date.parse('2026-11-25T07:58:00.000Z'),
          restart_time: 20,
        })
      ),
      {
        now,
        previousState: { checkedAt: '2026-11-25T07:50:00.000Z', restartTime: 3 },
        threshold: 10,
      }
    );

    expect(pm2.findings).toHaveLength(1);
    expectProdFinding(pm2.findings[0], 'prod-pm2-restarts');
    expect(pm2.findings[0].body).toContain('Restart delta: 17');
  });

  it('returns the next state to remember for main-chinesearizona', () => {
    const pm2 = prodPm2Findings(pm2List(pm2App(PROD_PROCESS_NAME, { restart_time: 4 })), {
      now,
    });

    expect(pm2.state).toEqual({ checkedAt: '2026-11-25T08:00:00.000Z', restartTime: 4 });
  });

  it('leaves an unreadable PM2 list to the shared dev finding', () => {
    const pm2 = prodPm2Findings('[PM2] Spawning PM2 daemon', { now });

    expect(pm2).toEqual({ findings: [], state: null });
  });
});

describe('closed-loop production access log', () => {
  it('opens a production 5xx finding when recent 5xx reach the threshold', () => {
    const lines = [
      accessLine('25/Nov/2026:07:10:00 +0000', '/', 200),
      ...['/', '/en', '/zh', '/news', '/business'].map((path) =>
        accessLine('25/Nov/2026:07:30:00 +0000', path, 502)
      ),
    ];

    const findings = prodAccessLogFindings(lines, { now, threshold: 5, windowMinutes: 60 });

    expect(findings).toHaveLength(1);
    expectProdFinding(findings[0], 'prod-nginx-5xx');
    expect(findings[0].body).toContain('in the last 60 minutes');
    expect(findings[0].body).toContain('"GET /business HTTP/1.1" 502');
  });

  it('stays quiet below the threshold', () => {
    const lines = ['/', '/en', '/zh', '/news'].map((path) =>
      accessLine('25/Nov/2026:07:30:00 +0000', path, 500)
    );

    expect(prodAccessLogFindings(lines, { now, threshold: 5, windowMinutes: 60 })).toEqual([]);
  });
});

describe('closed-loop production runtime log', () => {
  it('opens a production runtime finding for new error patterns', () => {
    const log = 'Error: Failed to find Server Action "abc". This request might be from an older deployment.';

    const findings = prodRuntimeLogFindings(log);

    expect(findings).toHaveLength(1);
    expectProdFinding(findings[0], 'prod-runtime-errors');
    expect(findings[0].body).toContain('Failed to find Server Action');
  });
});
