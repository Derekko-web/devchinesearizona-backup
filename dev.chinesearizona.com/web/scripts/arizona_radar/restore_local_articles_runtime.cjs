#!/usr/bin/env node

// Builds before the Arizona radar store path fix mirrored the radar store over
// the runtime local article list (GENERATED_LOCAL_ARTICLES_PATH). The app can
// only read an article list, so put the repo copy back when the runtime file
// holds anything else. Safe to run on every deploy: a valid list is left alone.

const fs = require('node:fs');
const path = require('node:path');

const FIXTURE_PATH = path.resolve(__dirname, '..', '..', 'src', 'data', 'generated-local-articles.json');

function isArticleList(filePath) {
  try {
    return Array.isArray(JSON.parse(fs.readFileSync(filePath, 'utf8')));
  } catch {
    return false;
  }
}

function restoreLocalArticlesRuntime({ runtimePath, fixturePath = FIXTURE_PATH }) {
  if (!runtimePath || path.resolve(runtimePath) === path.resolve(fixturePath)) {
    return 'skipped';
  }

  if (!fs.existsSync(runtimePath)) {
    return 'missing';
  }

  if (isArticleList(runtimePath)) {
    return 'ok';
  }

  if (!isArticleList(fixturePath)) {
    return 'fixture-invalid';
  }

  fs.copyFileSync(fixturePath, runtimePath);
  return 'restored';
}

module.exports = {
  isArticleList,
  restoreLocalArticlesRuntime,
};

if (require.main === module) {
  const runtimePath = process.env.GENERATED_LOCAL_ARTICLES_PATH;
  const status = restoreLocalArticlesRuntime({ runtimePath });

  if (status === 'restored') {
    console.log(`Restored ${runtimePath} from the repo copy; it did not hold an article list.`);
  } else if (status === 'fixture-invalid') {
    console.error(`${runtimePath} is not an article list, and neither is the repo copy; left it alone.`);
    process.exitCode = 1;
  }
}
