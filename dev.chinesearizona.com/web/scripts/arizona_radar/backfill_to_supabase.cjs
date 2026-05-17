#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const { readStore } = require('./core.cjs');
const { writeStoreSnapshot } = require('./storage.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_STORE_PATH = path.join(ROOT, 'data', 'radar-runtime', 'store.json');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, 'utf8');
  for (const line of contents.split(/\r?\n/g)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const args = {
    storePath: process.env.RADAR_STORE_PATH || DEFAULT_STORE_PATH,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    if (value.startsWith('--store-path=')) {
      args.storePath = path.resolve(value.slice('--store-path='.length));
    }
  }

  return args;
}

async function main() {
  loadEnvFile(path.join(ROOT, '.env.local'));
  const args = parseArgs(process.argv);
  const store = readStore(args.storePath);
  const persisted = await writeStoreSnapshot(args.storePath, store);

  process.stdout.write(
    `${JSON.stringify(
      {
        storePath: args.storePath,
        candidateCount: persisted.candidates.length,
        articleCount: persisted.articles.length,
        runCount: persisted.runs.length,
        sourceControlCount: persisted.sourceControls.length,
      },
      null,
      2
    )}\n`
  );
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
