#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

async function checkRoute(path) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.CLOSED_LOOP_TIMEOUT_MS || 15_000));
  const url = `${BASE_URL}${path}`;

  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'ChineseArizona closed-loop collector',
      },
      signal: controller.signal,
    });
    const result = {
      durationMs: Date.now() - startedAt,
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

async function collectSmokeFindings() {
  const results = await Promise.all(requiredRoutes.map(checkRoute));
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

  const restarts = Number(app.pm2_env?.restart_time ?? 0);
  const threshold = Number(process.env.CLOSED_LOOP_PM2_RESTART_THRESHOLD || 10);
  if (app.pm2_env?.status !== 'online' || restarts > threshold) {
    return [
      finding(
        'pm2-restarts',
        'dev-chinesearizona PM2 process needs attention',
        [
          `Status: ${app.pm2_env?.status ?? 'unknown'}`,
          `Restarts: ${restarts}`,
          `Threshold: ${threshold}`,
          `Uptime: ${app.pm2_env?.pm_uptime ? new Date(app.pm2_env.pm_uptime).toISOString() : 'unknown'}`,
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
  const lines = tail(accessLog, sampleSize).split(/\r?\n/).filter(Boolean);
  const failures = lines.filter((line) => {
    const parts = line.split(/\s+/);
    return /^5\d\d$/.test(parts[8] || '');
  });

  if (failures.length < threshold) {
    return [];
  }

  return [
    finding(
      'nginx-5xx',
      'dev.chinesearizona.com has elevated 5xx responses',
      [
        `5xx responses in last ${lines.length} access-log lines: ${failures.length}`,
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
  const log = tail(pm2ErrorLog, 300);
  const patterns = [
    /Failed to find Server Action/i,
    /Cloudflare[\s\S]*Error/i,
    /Unhandled|uncaught|fatal/i,
  ];

  const matched = patterns.some((pattern) => pattern.test(log));
  if (!matched) {
    return [];
  }

  return [
    finding(
      'runtime-errors',
      'Recent dev runtime errors are present',
      ['The PM2 error log contains recent runtime error patterns.', '', '```', log.slice(-6000), '```'].join(
        '\n'
      ),
      ['runtime']
    ),
  ];
}

function collectCronFindings() {
  const radarLog = process.env.CLOSED_LOOP_RADAR_LOG || resolve(APP_ROOT, 'logs/arizona-radar-cron.log');
  const articleLog =
    process.env.CLOSED_LOOP_ARTICLE_LOG || resolve(APP_ROOT, 'data/article-ingest-staging/cron-sync.log');
  const issues = [];
  const radarTail = tail(radarLog, 200);

  if (/ETIMEDOUT|Falling back to file-backed|lock_busy|Traceback|Error:/i.test(radarTail)) {
    issues.push(
      finding(
        'cron-arizona-radar',
        'Arizona Radar cron has failures or degraded runs',
        ['Recent Arizona Radar cron output:', '', '```', radarTail.slice(-6000), '```'].join('\n'),
        ['cron']
      )
    );
  }

  const articleTail = tail(articleLog, 160);
  if (/Traceback|Error:|failed|ETIMEDOUT/i.test(articleTail)) {
    issues.push(
      finding(
        'cron-sunbird',
        'Sunbird article sync cron has failures',
        ['Recent Sunbird article cron output:', '', '```', articleTail.slice(-6000), '```'].join('\n'),
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
      path: resolve(APP_ROOT, 'data/radar-runtime/store.json'),
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

async function findOpenIssue(key) {
  const marker = `closed-loop:dev:${key}`;
  const query = new URLSearchParams({
    q: `repo:${GITHUB_REPOSITORY} is:issue is:open ${marker}`,
  });
  const result = await githubRequest(`/search/issues?${query.toString()}`);
  return result.items?.[0];
}

async function syncIssue(key, currentFinding) {
  const marker = `<!-- closed-loop:dev:${key} -->`;
  const openIssue = await findOpenIssue(key);

  if (!currentFinding) {
    if (openIssue) {
      await githubRequest(`/repos/${GITHUB_REPOSITORY}/issues/${openIssue.number}`, {
        body: JSON.stringify({
          state: 'closed',
          state_reason: 'completed',
        }),
        method: 'PATCH',
      });
    }
    return;
  }

  const body = [
    marker,
    currentFinding.body,
    '',
    '---',
    `Collected at: ${new Date().toISOString()}`,
    `Source: ${BASE_URL}`,
  ].join('\n');

  if (openIssue) {
    await githubRequest(`/repos/${GITHUB_REPOSITORY}/issues/${openIssue.number}`, {
      body: JSON.stringify({
        body,
        labels: currentFinding.labels,
        title: currentFinding.title,
      }),
      method: 'PATCH',
    });
    return;
  }

  await githubRequest(`/repos/${GITHUB_REPOSITORY}/issues`, {
    body: JSON.stringify({
      body,
      labels: currentFinding.labels,
      title: currentFinding.title,
    }),
    method: 'POST',
  });
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
];

const findings = [
  ...(await collectSmokeFindings()),
  ...collectPm2Findings(),
  ...collectAccessLogFindings(),
  ...collectRuntimeLogFindings(),
  ...collectCronFindings(),
  ...collectStalenessFindings(),
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
    await syncIssue(key, findingsByKey.get(key));
  }
  process.exitCode = process.env.CLOSED_LOOP_FAIL_ON_FINDINGS === '1' && findings.length > 0 ? 1 : 0;
}
