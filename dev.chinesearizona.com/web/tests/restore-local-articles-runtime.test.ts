import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const scriptPath = path.join(process.cwd(), 'scripts', 'arizona_radar', 'restore_local_articles_runtime.cjs');
const { isArticleList, restoreLocalArticlesRuntime } = require(scriptPath) as {
  isArticleList: (filePath: string) => boolean;
  restoreLocalArticlesRuntime: (options: { fixturePath?: string; runtimePath?: string }) => string;
};

const radarStoreMirror = JSON.stringify({ articles: [], candidates: [], runs: [], version: 1 });
const articleList = JSON.stringify([{ slug: 'picacho-peak-travel-stop-closes-after-40-years' }]);

let tmp: string;
let runtimePath: string;
let fixturePath: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'local-articles-'));
  runtimePath = path.join(tmp, 'runtime', 'generated-local-articles.json');
  fixturePath = path.join(tmp, 'fixture.json');
  fs.mkdirSync(path.dirname(runtimePath), { recursive: true });
  fs.writeFileSync(fixturePath, articleList);
});

afterEach(() => {
  fs.rmSync(tmp, { force: true, recursive: true });
});

describe('restore_local_articles_runtime', () => {
  it('puts the repo copy back when a radar store mirror overwrote the article list', () => {
    fs.writeFileSync(runtimePath, radarStoreMirror);

    expect(restoreLocalArticlesRuntime({ fixturePath, runtimePath })).toBe('restored');
    expect(fs.readFileSync(runtimePath, 'utf8')).toBe(articleList);
  });

  it('leaves a valid article list alone', () => {
    const liveList = JSON.stringify([{ slug: 'live-article' }]);
    fs.writeFileSync(runtimePath, liveList);

    expect(restoreLocalArticlesRuntime({ fixturePath, runtimePath })).toBe('ok');
    expect(fs.readFileSync(runtimePath, 'utf8')).toBe(liveList);
  });

  it('does nothing when there is no runtime file, no path, or the path is the repo copy', () => {
    expect(restoreLocalArticlesRuntime({ fixturePath, runtimePath })).toBe('missing');
    expect(restoreLocalArticlesRuntime({ fixturePath })).toBe('skipped');
    expect(restoreLocalArticlesRuntime({ fixturePath, runtimePath: fixturePath })).toBe('skipped');
  });

  it('never replaces the runtime file with a repo copy that is not an article list', () => {
    fs.writeFileSync(runtimePath, radarStoreMirror);
    fs.writeFileSync(fixturePath, radarStoreMirror);

    expect(restoreLocalArticlesRuntime({ fixturePath, runtimePath })).toBe('fixture-invalid');
    expect(fs.readFileSync(runtimePath, 'utf8')).toBe(radarStoreMirror);
  });

  it('treats unreadable JSON as not an article list', () => {
    fs.writeFileSync(runtimePath, '{ broken');
    expect(isArticleList(runtimePath)).toBe(false);
  });

  it('checks the real repo copy and reports a restore from the command line', () => {
    fs.writeFileSync(runtimePath, radarStoreMirror);

    const result = spawnSync('node', [scriptPath], {
      encoding: 'utf8',
      env: { ...process.env, GENERATED_LOCAL_ARTICLES_PATH: runtimePath },
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('Restored');
    expect(isArticleList(runtimePath)).toBe(true);
  });
});
