import { resolve } from 'node:path';

import { recentServerErrorLines } from './access-log-health.mjs';
import { evaluatePm2Health, pm2ProcessState } from './pm2-health.mjs';
import { defaultRuntimeLogPatterns, hasRuntimeLogPattern } from './runtime-log.mjs';

// Production (chinesearizona.com) runs on the same VPS as dev, deployed by the
// manual Deploy Prod workflow. These checks give it its own issue keys, titles,
// and `loop/prod` label so dev and production issues never touch each other.
export const PROD_PROCESS_NAME = 'main-chinesearizona';

export const prodSmokeRoutes = ['/', '/en', '/zh', '/directory', '/arizona-news', '/api/health'];

export const prodFindingKeys = [
  'prod-nginx-5xx',
  'prod-pm2-missing',
  'prod-pm2-restarts',
  'prod-runtime-errors',
  'prod-smoke',
];

// CLOSED_LOOP_BASE_URL and the other unprefixed settings belong to dev, so
// production only reads CLOSED_LOOP_PROD_* overrides.
export function prodSettings(env = process.env, { appRoot }) {
  return {
    accessLog: env.CLOSED_LOOP_PROD_ACCESS_LOG || '/var/www/chinesearizona.com/logs/access.log',
    baseUrl: (env.CLOSED_LOOP_PROD_BASE_URL || 'https://chinesearizona.com').replace(/\/+$/, ''),
    pm2ErrorLog:
      env.CLOSED_LOOP_PROD_PM2_ERROR_LOG || '/home/derek/.pm2/logs/main-chinesearizona-error.log',
    pm2StateFile:
      env.CLOSED_LOOP_PROD_PM2_STATE_FILE || resolve(appRoot, 'logs/closed-loop-prod-pm2-state.json'),
    runtimeLogStateFile:
      env.CLOSED_LOOP_PROD_PM2_ERROR_LOG_STATE_FILE ||
      resolve(appRoot, 'logs/closed-loop-prod-runtime-log-state.json'),
  };
}

function prodFinding(key, title, body) {
  return {
    body,
    key,
    labels: ['loop/prod', 'agent-ready', 'runtime'],
    title,
  };
}

function smokeResultHealthy(result) {
  if (!result.ok) {
    return false;
  }

  // Production health must be proven by the JSON body, not just a 200.
  return result.path !== '/api/health' || result.healthOk === true;
}

export function prodSmokeFindings(results, { baseUrl }) {
  const failures = results.filter((result) => !smokeResultHealthy(result));
  if (failures.length === 0) {
    return [];
  }

  return [
    prodFinding(
      'prod-smoke',
      'Production smoke check is failing (chinesearizona.com)',
      [
        'The required production smoke routes did not all return healthy responses.',
        '`/api/health` must answer with JSON that reports `ok: true`.',
        '',
        '```json',
        JSON.stringify({ baseUrl, failures, results }, null, 2),
        '```',
      ].join('\n')
    ),
  ];
}

// `pm2Output` is the raw `pm2 jlist` text. An unreadable list is a PM2 daemon
// problem that the dev `pm2-unreadable` finding already reports, so production
// stays quiet rather than opening a second issue for the same cause.
export function prodPm2Findings(pm2Output, options = {}) {
  let processes;
  try {
    processes = JSON.parse(pm2Output);
  } catch {
    return { findings: [], state: null };
  }

  if (!Array.isArray(processes)) {
    return { findings: [], state: null };
  }

  const app = processes.find((processInfo) => processInfo?.name === PROD_PROCESS_NAME);
  if (!app) {
    return {
      findings: [
        prodFinding(
          'prod-pm2-missing',
          `${PROD_PROCESS_NAME} (production) is missing from PM2`,
          `PM2 did not report a ${PROD_PROCESS_NAME} process, so chinesearizona.com has no app server.`
        ),
      ],
      state: null,
    };
  }

  const now = options.now ?? Date.now();
  const threshold = options.threshold ?? 10;
  const health = evaluatePm2Health(app, {
    now,
    previousState: options.previousState ?? null,
    stableWindowMs: options.stableWindowMs,
    threshold,
  });
  const state = pm2ProcessState(app, now);

  if (!health.unhealthy) {
    return { findings: [], state };
  }

  return {
    findings: [
      prodFinding(
        'prod-pm2-restarts',
        `${PROD_PROCESS_NAME} (production) PM2 process needs attention`,
        [
          `Status: ${health.status}`,
          `Restarts: ${health.restarts}`,
          `Restart delta: ${health.restartDelta}`,
          `Delta window minutes: ${health.deltaWindowMinutes ?? 'unknown'}`,
          `Threshold: ${threshold}`,
          `Stable window minutes: ${health.stableWindowMinutes}`,
          `Unstable restarts: ${health.unstableRestarts}`,
          `Uptime: ${health.uptimeIso}`,
          `Node: ${app.pm2_env?.node_version ?? 'unknown'}`,
        ].join('\n')
      ),
    ],
    state,
  };
}

export function prodAccessLogFindings(lines, options = {}) {
  const threshold = options.threshold ?? 5;
  const windowMinutes = options.windowMinutes ?? 60;
  const failures = recentServerErrorLines(lines, { now: options.now, windowMinutes });

  if (failures.length < threshold) {
    return [];
  }

  return [
    prodFinding(
      'prod-nginx-5xx',
      'chinesearizona.com (production) has elevated 5xx responses',
      [
        `5xx responses in the last ${windowMinutes} minutes (from the last ${lines.length} access-log lines): ${failures.length}`,
        '',
        'Recent samples:',
        '',
        '```',
        failures.slice(-25).join('\n'),
        '```',
      ].join('\n')
    ),
  ];
}

export function prodRuntimeLogFindings(log, patterns = defaultRuntimeLogPatterns) {
  if (!log || !hasRuntimeLogPattern(log, patterns)) {
    return [];
  }

  return [
    prodFinding(
      'prod-runtime-errors',
      'Recent production runtime errors are present (chinesearizona.com)',
      [
        `The ${PROD_PROCESS_NAME} PM2 error log contains new runtime error patterns since the last closed-loop sample.`,
        '',
        '```',
        log.slice(-6000),
        '```',
      ].join('\n')
    ),
  ];
}
