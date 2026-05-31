#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');

const VALID_SITES = new Set(['arizona', 'austin', 'los-angeles', 'sf-bay']);

function normalizeSite(value) {
  const normalized = String(value || 'arizona').trim().toLowerCase();
  if (normalized === 'la' || normalized === 'los_angeles') return 'los-angeles';
  if (normalized === 'atx') return 'austin';
  if (
    normalized === 'sfbay' ||
    normalized === 'sf_bay' ||
    normalized === 'bay-area' ||
    normalized === 'bay_area' ||
    normalized === 'san-francisco' ||
    normalized === 'san_francisco'
  ) {
    return 'sf-bay';
  }
  return VALID_SITES.has(normalized) ? normalized : 'arizona';
}

function parseArgs(argv) {
  const args = {
    site: normalizeSite(process.env.RADAR_SITE || process.env.RADAR_CITY_KEY),
    passthrough: [],
  };

  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    if (value.startsWith('--site=')) {
      args.site = normalizeSite(value.slice('--site='.length));
      continue;
    }
    if (value === '--site' && argv[index + 1]) {
      args.site = normalizeSite(argv[index + 1]);
      index += 1;
      continue;
    }
    args.passthrough.push(value);
  }

  return args;
}

function unitName(site) {
  return `radar-hermes-worker@${site}.service`;
}

function canUseSystemd(site) {
  if (process.env.RADAR_HERMES_DIRECT === '1') {
    return false;
  }
  if (process.platform !== 'linux' || !fs.existsSync('/run/systemd/system')) {
    return false;
  }

  const result = spawnSync('systemctl', ['cat', unitName(site)], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return result.status === 0;
}

function systemctlCommand() {
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    return { command: 'systemctl', argsPrefix: [] };
  }
  return { command: 'sudo', argsPrefix: ['-n', 'systemctl'] };
}

function startSystemd(site) {
  const { command, argsPrefix } = systemctlCommand();
  const result = spawnSync(command, [...argsPrefix, 'start', unitName(site)], {
    stdio: 'inherit',
  });
  process.exitCode = result.status === null ? 1 : result.status;
}

function runDirect(site, passthrough) {
  const result = spawnSync(
    process.execPath,
    ['scripts/arizona_radar/run.cjs', 'run', `--site=${site}`, ...passthrough],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        RADAR_SITE: site,
      },
    }
  );
  process.exitCode = result.status === null ? 1 : result.status;
}

function main() {
  const args = parseArgs(process.argv);

  if (canUseSystemd(args.site)) {
    startSystemd(args.site);
    return;
  }

  runDirect(args.site, args.passthrough);
}

main();
