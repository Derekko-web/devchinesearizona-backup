import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const workflowPath = path.join(process.cwd(), '..', '..', '.github', 'workflows', 'deploy-dev.yml');
const rootGitignorePath = path.join(process.cwd(), '..', '..', '.gitignore');

describe('Deploy Dev SSH setup', () => {
  it('retries VPS host key scans without disabling strict SSH host checking', () => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('for attempt in 1 2 3 4 5; do');
    expect(workflow).toContain('ssh-keyscan -T 20 -p "$VPS_PORT" "$VPS_HOST"');
    expect(workflow).toContain('sleep $((attempt * 5))');
    expect(workflow).toContain('Unable to fetch the VPS SSH host key after 5 attempts.');
    expect(workflow).toContain('-o ConnectionAttempts=5');
    expect(workflow).toContain('-o ConnectTimeout=20');
    expect(workflow).toContain('-o StrictHostKeyChecking=yes');
    expect(workflow).not.toContain('StrictHostKeyChecking=no');
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
