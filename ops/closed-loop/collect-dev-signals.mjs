#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { recentServerErrorLines } from './access-log-health.mjs';
import { recentCronAnomalyLines } from './cron-log-health.mjs';
import { syncFindingIssue } from './issue-sync.mjs';
import { evaluatePm2Health, pm2ProcessState } from './pm2-health.mjs';
import {
  PROD_PROCESS_NAME,
  prodAccessLogFindings,
  prodFindingKeys,
  prodPm2Findings,
  prodRuntimeLogFindings,
  prodSettings,
  prodSmokeFindings,
  prodSmokeRoutes,
} from './prod-signals.mjs';
import {
  defaultRuntimeLogPatterns,
  hasRuntimeLogPattern,
  readRuntimeLogAppend,
} from './runtime-log.mjs';
import { checkRoute, checkRouteWithRetry, routeCheckSettings } from './route-check.mjs';
import { arizonaRadarStorePath } from './runtime-paths.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = resolve(__dirname, '../..');
const REPO_ROOT = process.env.CLOSED_LOOP_REPO_ROOT || DEFAULT_REPO_ROOT;
const APP_ROOT = process.env.CLOSED_LOOP_APP_ROOT || resolve(REPO_ROOT, 'dev.chinesearizona.com/web');
const BASE_URL = (process.env.CLOSED_LOOP_BASE_URL || 'https://dev.chinesearizona.com').replace(
  /\/+$/,
  ''
);
const GITHUB_REPOSITORY =
  process.env.CLOSED_LOOP_GITHUB_REPOSITORY ||
  process.env.GITHUB_REPOSITORY ||
  'Derekko-web/devchinesearizona-backup';

const labels = {
  'agent-ready': '7057ff',
  ci: '0e8a16',
  cron: 'fbca04',
  'loop/dev': '5319e7',
  'loop/prod': 'b60205',
  runtime: 'd73a4a',
};

const requiredRoutes = ['/', '/en', '/zh', '/directory', '/arizona-news', '/api/health'];

loadEnvFile(process.env.CLOSED_LOOP_ENV || resolve(__dirname, '.env'));

const githubToken =
  process.env.CLOSED_LOOP_GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    if (!process.env[key]) {
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
  }
}

function run(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      cwd: options.cwd || REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: options.maxBuffer || 10 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    return error.stdout?.toString() || error.stderr?.toString() || error.message;
  }
}

function tail(path, lines = 500) {
  if (!existsSync(path)) {
    return '';
  }

  return run('tail', ['-n', String(lines), path]);
}

function readJsonFile(path) {
  if (!existsSync(path)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function writeJsonFile(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function fileAgeHours(path) {
  if (!existsSync(path)) {
    return Number.POSITIVE_INFINITY;
  }

  return (Date.now() - statSync(path).mtimeMs) / (60 * 60 * 1000);
}

function finding(key, title, body, extraLabels = []) {
  return {
    body,
    key,
    labels: ['loop/dev', 'agent-ready', ...extraLabels],
    title,
  };
}

const routeCheck = routeCheckSettings(process.env);

function smokeCheck(path, baseUrl) {
  return checkRouteWithRetry(path, baseUrl, {
    attempts: routeCheck.attempts,
    check: (routePath, routeBase) =>
      checkRoute(routePath, routeBase, { timeoutMs: routeCheck.timeoutMs }),
    retryDelayMs: routeCheck.retryDelayMs,
  });
}

async function collectSmokeFindings() {
  const results = await Promise.all(requiredRoutes.map((path) => smokeCheck(path, BASE_URL)));
  const failures = results.filter((result) => !result.ok);
  if (failures.length === 0) {
    return [];
  }

  return [
    finding(
      'smoke',
      'Dev smoke check is failing',
      [
        'The required dev smoke routes did not all return healthy responses.',
        '',
        '```json',
        JSON.stringify({ baseUrl: BASE_URL, failures, results }, null, 2),
        '```',
      ].join('\n'),
      ['runtime']
    ),
  ];
}

function collectPm2Findings() {
  const raw = run('pm2', ['jlist']);
  let processes = [];
  try {
    processes = JSON.parse(raw);
  } catch {
    return [
      finding('pm2-unreadable', 'PM2 process list could not be parsed', `PM2 output:\n\n\`\`\`\n${raw}\n\`\`\``, [
        'runtime',
      ]),
    ];
  }

  const app = processes.find((processInfo) => processInfo.name === 'dev-chinesearizona');
  if (!app) {
    return [
      finding('pm2-missing', 'dev-chinesearizona is missing from PM2', 'PM2 did not report a dev-chinesearizona process.', [
        'runtime',
      ]),
    ];
  }

  const threshold = Number(process.env.CLOSED_LOOP_PM2_RESTART_THRESHOLD || 10);
  const stableWindowMs = Number(process.env.CLOSED_LOOP_PM2_STABLE_WINDOW_MS || 30 * 60 * 1000);
  const stateFile =
    process.env.CLOSED_LOOP_PM2_STATE_FILE || resolve(APP_ROOT, 'logs/closed-loop-pm2-state.json');
  const state = readJsonFile(stateFile) ?? {};
  const previousState = state[app.name] ?? null;
  const health = evaluatePm2Health(app, {
    previousState,
    stableWindowMs,
    threshold,
  });

  try {
    writeJsonFile(stateFile, {
      ...state,
      [app.name]: pm2ProcessState(app),
    });
  } catch (error) {
    process.stderr.write(`PM2 state file ${stateFile}: ${error.message}\n`);
  }

  if (health.unhealthy) {
    return [
      finding(
        'pm2-restarts',
        'dev-chinesearizona PM2 process needs attention',
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
        ].join('\n'),
        ['runtime']
      ),
    ];
  }

  return [];
}

function collectAccessLogFindings() {
  const accessLog = process.env.CLOSED_LOOP_ACCESS_LOG || '/var/www/dev.chinesearizona.com/logs/access.log';
  const sampleSize = Number(process.env.CLOSED_LOOP_ACCESS_LOG_SAMPLE || 5000);
  const threshold = Number(process.env.CLOSED_LOOP_5XX_THRESHOLD || 5);
  const windowMinutes = Number(process.env.CLOSED_LOOP_5XX_WINDOW_MINUTES || 60);
  const lines = tail(accessLog, sampleSize).split(/\r?\n/).filter(Boolean);
  const failures = recentServerErrorLines(lines, { windowMinutes });

  if (failures.length < threshold) {
    return [];
  }

  return [
    finding(
      'nginx-5xx',
      'dev.chinesearizona.com has elevated 5xx responses',
      [
        `5xx responses in the last ${windowMinutes} minutes (from the last ${lines.length} access-log lines): ${failures.length}`,
        '',
        'Recent samples:',
        '',
        '```',
        failures.slice(-25).join('\n'),
        '```',
      ].join('\n'),
      ['runtime']
    ),
  ];
}

function collectRuntimeLogFindings() {
  const pm2ErrorLog =
    process.env.CLOSED_LOOP_PM2_ERROR_LOG || '/home/derek/.pm2/logs/dev-chinesearizona-error.log';
  const stateFile =
    process.env.CLOSED_LOOP_PM2_ERROR_LOG_STATE_FILE ||
    resolve(APP_ROOT, 'logs/closed-loop-runtime-log-state.json');
  const log = readRuntimeLogAppend(pm2ErrorLog, stateFile);

  if (!log || !hasRuntimeLogPattern(log, defaultRuntimeLogPatterns)) {
    return [];
  }

  return [
    finding(
      'runtime-errors',
      'Recent dev runtime errors are present',
      [
        'The PM2 error log contains new runtime error patterns since the last closed-loop sample.',
        '',
        '```',
        log.slice(-6000),
        '```',
      ].join('\n'),
      ['runtime']
    ),
  ];
}

function collectCronFindings() {
  const radarLog = process.env.CLOSED_LOOP_RADAR_LOG || resolve(APP_ROOT, 'logs/arizona-radar-cron.log');
  const articleLog =
    process.env.CLOSED_LOOP_ARTICLE_LOG || resolve(APP_ROOT, 'data/article-ingest-staging/cron-sync.log');
  const configuredRecentHours = Number(process.env.CLOSED_LOOP_CRON_RECENT_HOURS || 48);
  const recentHours =
    Number.isFinite(configuredRecentHours) && configuredRecentHours > 0 ? configuredRecentHours : 48;
  const issues = [];
  const radarTail = tail(radarLog, 200);
  const radarAnomalies = recentCronAnomalyLines(radarTail, { recentHours });

  if (radarAnomalies.length > 0) {
    issues.push(
      finding(
        'cron-arizona-radar',
        'Arizona Radar cron has failures or degraded runs',
        [
          `Arizona Radar cron anomalies in the last ${recentHours} hours:`,
          '',
          '```',
          radarAnomalies.map((entry) => entry.line).join('\n').slice(-6000),
          '```',
        ].join('\n'),
        ['cron']
      )
    );
  }

  const articleTail = tail(articleLog, 160);
  const articleAnomalies = recentCronAnomalyLines(articleTail, { recentHours });
  if (articleAnomalies.length > 0) {
    issues.push(
      finding(
        'cron-sunbird',
        'Sunbird article sync cron has failures',
        [
          `Sunbird article cron anomalies in the last ${recentHours} hours:`,
          '',
          '```',
          articleAnomalies.map((entry) => entry.line).join('\n').slice(-6000),
          '```',
        ].join('\n'),
        ['cron']
      )
    );
  }

  return issues;
}

function collectStalenessFindings() {
  const thresholds = [
    {
      hours: Number(process.env.CLOSED_LOOP_ARTICLE_STALE_HOURS || 192),
      key: 'stale-sunbird-sync',
      label: 'Sunbird article sync manifest is stale',
      path: resolve(APP_ROOT, 'data/article-ingest-staging/sync-manifest.json'),
    },
    {
      hours: Number(process.env.CLOSED_LOOP_RADAR_STALE_HOURS || 192),
      key: 'stale-radar-store',
      label: 'Arizona Radar runtime store is stale',
      path: arizonaRadarStorePath(),
    },
  ];

  return thresholds.flatMap((item) => {
    const ageHours = fileAgeHours(item.path);
    if (ageHours <= item.hours) {
      return [];
    }

    return [
      finding(
        item.key,
        item.label,
        [`Path: ${item.path}`, `Age hours: ${Math.round(ageHours)}`, `Threshold hours: ${item.hours}`].join(
          '\n'
        ),
        ['cron']
      ),
    ];
  });
}

// Production (chinesearizona.com) signals. Each read is guarded so a
// production problem can never stop the dev checks from syncing.
async function collectProdFindings() {
  const settings = prodSettings(process.env, { appRoot: APP_ROOT });

  const smokeResults = await Promise.all(
    prodSmokeRoutes.map((path) => smokeCheck(path, settings.baseUrl))
  );

  const pm2State = readJsonFile(settings.pm2StateFile) ?? {};
  const pm2 = prodPm2Findings(run('pm2', ['jlist']), {
    previousState: pm2State[PROD_PROCESS_NAME] ?? null,
    stableWindowMs: Number(process.env.CLOSED_LOOP_PM2_STABLE_WINDOW_MS || 30 * 60 * 1000),
    threshold: Number(process.env.CLOSED_LOOP_PM2_RESTART_THRESHOLD || 10),
  });
  if (pm2.state) {
    try {
      writeJsonFile(settings.pm2StateFile, { ...pm2State, [PROD_PROCESS_NAME]: pm2.state });
    } catch (error) {
      process.stderr.write(`Production PM2 state file ${settings.pm2StateFile}: ${error.message}\n`);
    }
  }

  const accessLines = tail(settings.accessLog, Number(process.env.CLOSED_LOOP_ACCESS_LOG_SAMPLE || 5000))
    .split(/\r?\n/)
    .filter(Boolean);

  let runtimeLog = '';
  try {
    runtimeLog = readRuntimeLogAppend(settings.pm2ErrorLog, settings.runtimeLogStateFile);
  } catch (error) {
    process.stderr.write(`Production runtime log ${settings.pm2ErrorLog}: ${error.message}\n`);
  }

  return [
    ...prodSmokeFindings(smokeResults, { baseUrl: settings.baseUrl }),
    ...pm2.findings,
    ...prodAccessLogFindings(accessLines, {
      threshold: Number(process.env.CLOSED_LOOP_5XX_THRESHOLD || 5),
      windowMinutes: Number(process.env.CLOSED_LOOP_5XX_WINDOW_MINUTES || 60),
    }),
    ...prodRuntimeLogFindings(runtimeLog),
  ].map((item) => ({ ...item, source: settings.baseUrl }));
}

async function githubRequest(path, options = {}) {
  if (!githubToken) {
    throw new Error('CLOSED_LOOP_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN is required.');
  }

  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${githubToken}`,
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${response.status} ${response.statusText}: ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function ensureLabels() {
  for (const [name, color] of Object.entries(labels)) {
    try {
      await githubRequest(`/repos/${GITHUB_REPOSITORY}/labels`, {
        body: JSON.stringify({
          color,
          description: `Closed-loop ${name} signal`,
          name,
        }),
        method: 'POST',
      });
    } catch (error) {
      if (!String(error.message).includes('already_exists')) {
        process.stderr.write(`label ${name}: ${error.message}\n`);
      }
    }
  }
}

const knownKeys = [
  'cron-arizona-radar',
  'cron-sunbird',
  'nginx-5xx',
  'pm2-missing',
  'pm2-restarts',
  'pm2-unreadable',
  'runtime-errors',
  'smoke',
  'stale-radar-store',
  'stale-sunbird-sync',
  ...prodFindingKeys,
];

const findings = [
  ...(await collectSmokeFindings()),
  ...collectPm2Findings(),
  ...collectAccessLogFindings(),
  ...collectRuntimeLogFindings(),
  ...collectCronFindings(),
  ...collectStalenessFindings(),
  ...(await collectProdFindings()),
];
const findingsByKey = new Map(findings.map((item) => [item.key, item]));

process.stdout.write(
  `${JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      findings: findings.map(({ body, ...item }) => item),
      ok: findings.length === 0,
      repository: GITHUB_REPOSITORY,
    },
    null,
    2
  )}\n`
);

if (!githubToken) {
  process.stderr.write('Closed-loop findings were collected, but no GitHub token is configured.\n');
  process.exitCode = process.env.CLOSED_LOOP_FAIL_ON_FINDINGS === '1' && findings.length > 0 ? 1 : 0;
} else {
  await ensureLabels();
  for (const key of knownKeys) {
    await syncFindingIssue({
      finding: findingsByKey.get(key),
      key,
      repository: GITHUB_REPOSITORY,
      request: githubRequest,
      source: BASE_URL,
    });
  }
  process.exitCode = process.env.CLOSED_LOOP_FAIL_ON_FINDINGS === '1' && findings.length > 0 ? 1 : 0;
}
