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
    expect(workflow).toContain('git checkout -- "${generated_data_paths[@]}"');
    expect(workflow).toContain('Seeded runtime data fixture $external_path');
    expect(workflow).toContain('git status --porcelain --untracked-files=all');
  });

  it('keeps migrated runtime data outside dirty-tree status checks', () => {
    const gitignore = fs.readFileSync(rootGitignorePath, 'utf8');

    expect(gitignore).toContain('/runtime-data/');
  });
});
