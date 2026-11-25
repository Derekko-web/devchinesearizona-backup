import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const workflowPath = path.join(process.cwd(), '..', '..', '.github', 'workflows', 'deploy-dev.yml');
const rootGitignorePath = path.join(process.cwd(), '..', '..', '.gitignore');

describe('Deploy Dev SSH setup', () => {
  it('retries VPS host key scans and falls back without disabling host checking', () => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('name: dev');
    expect(workflow).toContain('url: https://dev.chinesearizona.com');
    expect(workflow).toContain('for attempt in 1 2 3 4 5; do');
    expect(workflow).toContain('VPS_SSH_KNOWN_HOSTS: ${{ secrets.DEV_VPS_SSH_KNOWN_HOSTS }}');
    expect(workflow).toContain('ssh-keyscan -4 -H -T 30 -p "$VPS_PORT" "$VPS_HOST"');
    expect(workflow).toContain('sleep $((attempt * 5))');
    expect(workflow).toContain('StrictHostKeyChecking=accept-new');
    expect(workflow).toContain('-o ConnectionAttempts=5');
    expect(workflow).toContain('-o ConnectTimeout=20');
    expect(workflow).toContain('-o StrictHostKeyChecking="$SSH_STRICT_HOST_KEY_CHECKING"');
    expect(workflow).toContain('-o UserKnownHostsFile="$HOME/.ssh/known_hosts"');
    expect(workflow).not.toContain('StrictHostKeyChecking=no');
  });
});

describe('Deploy Dev rollback', () => {
  it('restores the previous checkout if post-reload smoke fails', () => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('previous_sha="$(git rev-parse HEAD)"');
    expect(workflow).toContain('rollback_to_previous_sha()');
    expect(workflow).toContain('Smoke failed; rolling back to previous SHA $previous_sha.');
    expect(workflow).toContain('git checkout --force -B main "$previous_sha"');
    expect(workflow).toContain('git checkout --force --detach "$previous_sha"');
    expect(workflow).toContain('export GIT_SHA="$previous_sha"');
    expect(workflow).toContain('rollback_to_previous_sha || true');
  });
});

describe('Deploy Dev readiness', () => {
  it('waits for the reloaded app to serve the deployed SHA before smoke', () => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('wait_for_app_ready()');
    expect(workflow).toContain('app_health_url="http://127.0.0.1:3002/api/health"');
    expect(workflow).toContain('body && body.gitSha === expected');

    const deployReload = workflow.indexOf('export GIT_SHA="$DEPLOY_SHA"');
    const deployWait = workflow.indexOf('wait_for_app_ready "$DEPLOY_SHA" || true');
    const deploySmoke = workflow.indexOf('if ! npm run smoke:dev; then');
    expect(deployReload).toBeGreaterThan(-1);
    expect(deployWait).toBeGreaterThan(deployReload);
    expect(deploySmoke).toBeGreaterThan(deployWait);
  });

  it('smokes the rollback against the rolled-back SHA after it is serving', () => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');
    const rollbackStart = workflow.indexOf('rollback_to_previous_sha() {');
    const rollbackEnd = workflow.indexOf('if ! npm run smoke:dev; then');
    const rollback = workflow.slice(rollbackStart, rollbackEnd);

    expect(rollbackStart).toBeGreaterThan(-1);
    expect(rollback).toContain('export SMOKE_EXPECTED_GIT_SHA="$previous_sha"');

    const rollbackWait = rollback.indexOf('wait_for_app_ready "$previous_sha" || true');
    const rollbackSmoke = rollback.indexOf('npm run smoke:dev');
    expect(rollbackWait).toBeGreaterThan(rollback.indexOf('pm2 startOrReload'));
    expect(rollbackSmoke).toBeGreaterThan(rollbackWait);
  });
});

describe('Deploy Dev build hygiene', () => {
  it('clears stale next dev types before every VPS build', () => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');
    const lines = workflow.split('\n').map((line) => line.trim());
    const buildLines = lines.flatMap((line, index) => (line === 'npm run build' ? [index] : []));

    // One build for the deploy, one for the rollback.
    expect(buildLines).toHaveLength(2);
    for (const buildLine of buildLines) {
      const preceding = lines.slice(Math.max(0, buildLine - 3), buildLine);
      expect(preceding).toContain('rm -rf .next/dev');
    }
  });
});

describe('Deploy Dev gate', () => {
  it('requires every deploy target to be a main SHA with successful Dev CI', () => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('actions: read');
    expect(workflow).toContain('- name: Check deploy SHA is verified main');
    expect(workflow).toContain('git merge-base --is-ancestor "$deploy_sha" origin/main');
    expect(workflow).toContain('Deploy target $deploy_sha is not on main. Deploy Dev only accepts main commits.');
    expect(workflow).toContain('Deploy target $deploy_sha came from a successful Dev CI workflow_run.');
    expect(workflow).toContain('/actions/workflows/ci.yml/runs');
    expect(workflow).toContain('-f head_sha="$deploy_sha"');
    expect(workflow).toContain('Deploy Dev for main SHA $deploy_sha requires a successful Dev CI run first.');
    expect(workflow).toContain('Dev CI is the deploy gate and includes ci-required, npm run verify, npm run e2e, and scraper checks when applicable.');
  });
});

describe('Deploy Dev dirty tree guard', () => {
  it('only migrates known generated runtime data paths before requiring a clean checkout', () => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('runtime_data_root="/var/www/runtime-data/dev.chinesearizona.com/web"');
    expect(workflow).toContain('git_exclude_path="$(git rev-parse --git-path info/exclude)"');
    expect(workflow).toContain("'/runtime-data/' >> \"$git_exclude_path\"");
    expect(workflow).toContain(
      '"dev.chinesearizona.com/web/data/sites/austin/radar-runtime/store.json"'
    );
    expect(workflow).toContain(
      '"dev.chinesearizona.com/web/data/sites/los-angeles/radar-runtime/store.json"'
    );
    expect(workflow).toContain(
      '"dev.chinesearizona.com/web/data/sf-bay-radar-runtime/store.json"'
    );
    expect(workflow).toContain(
      '"dev.chinesearizona.com/web/data/article-ingest-staging/english-translation-cache.json"'
    );
    expect(workflow).toContain(
      '"dev.chinesearizona.com/web/data/article-ingest-staging/chinese-translation-cache.json"'
    );
    expect(workflow).toContain(
      '"dev.chinesearizona.com/web/data/article-ingest-staging/sync-manifest.json"'
    );
    expect(workflow).toContain(
      '"dev.chinesearizona.com/web/src/data/generated-local-articles.json"'
    );
    expect(workflow).toContain(
      'ARTICLE_EN_TRANSLATION_CACHE_PATH="$runtime_data_root/data/article-ingest-staging/english-translation-cache.json"'
    );
    expect(workflow).toContain(
      'ARTICLE_ZH_TRANSLATION_CACHE_PATH="$runtime_data_root/data/article-ingest-staging/chinese-translation-cache.json"'
    );
    expect(workflow).toContain('if [ -n "$unsafe_dirty" ]; then');
    expect(workflow).toContain('runtime_article_count()');
    expect(workflow).toContain('should_preserve_external_runtime_data()');
    expect(workflow).toContain(
      'Preserving non-empty runtime data fixture $external_path; checked-out source has no articles.'
    );
    expect(workflow).toContain('git checkout -- "${generated_data_paths[@]}"');
    expect(workflow).toContain('Seeded runtime data fixture $external_path');
    expect(workflow).toContain('git status --porcelain --untracked-files=all');
  });

  it('keeps migrated runtime data outside dirty-tree status checks', () => {
    const gitignore = fs.readFileSync(rootGitignorePath, 'utf8');

    expect(gitignore).toContain('/runtime-data/');
  });
});

describe('Deploy Dev local article repair', () => {
  it('repairs the runtime local article list after the new code serves and before smoke', () => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');
    const wait = workflow.indexOf('wait_for_app_ready "$DEPLOY_SHA" || true');
    const repair = workflow.indexOf('node scripts/arizona_radar/restore_local_articles_runtime.cjs');
    const smoke = workflow.indexOf('if ! npm run smoke:dev; then');

    expect(wait).toBeGreaterThan(-1);
    expect(repair).toBeGreaterThan(wait);
    expect(smoke).toBeGreaterThan(repair);
    expect(workflow).toContain('export GENERATED_LOCAL_ARTICLES_PATH="$runtime_data_root/src/data/generated-local-articles.json"');
  });
});
