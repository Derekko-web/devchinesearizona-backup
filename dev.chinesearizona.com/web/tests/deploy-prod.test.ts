import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const repoRoot = path.join(process.cwd(), '..', '..');
const scriptPath = path.join(repoRoot, 'ops', 'deploy-prod', 'deploy-prod.sh');
const workflowPath = path.join(repoRoot, '.github', 'workflows', 'deploy-prod.yml');
const devWorkflowPath = path.join(repoRoot, '.github', 'workflows', 'deploy-dev.yml');
const ecosystemPath = path.join(repoRoot, 'chinesearizona.com', 'main-ecosystem.config.cjs');
const gitignorePath = path.join(repoRoot, '.gitignore');
const readmePath = path.join(process.cwd(), 'README.md');

const LEGACY = 'legacy-20260517';

// Stand-ins for the VPS tools. pm2 "start" records which folder `current`
// resolves to and the GIT_SHA it was given; curl answers from that record.
const stubs: Record<string, string> = {
  flock: '#!/usr/bin/env bash\nexit 0\n',
  npm: `#!/usr/bin/env bash
echo "npm $* sha=\${SMOKE_EXPECTED_GIT_SHA:-\${GIT_SHA:-}} base=\${SMOKE_BASE_URL:-} skip=\${SMOKE_SKIP_PUBLIC_DOMAINS:-} storage=\${RADAR_STORAGE_MODE:-unset}" >> "$STUB_LOG"
case "$1 \${2:-}" in
  "ci "*) mkdir -p node_modules ;;
  "run build")
    if [ "$(basename "$PWD")" = "\${FAIL_BUILD_SHA:-none}" ]; then exit 1; fi
    mkdir -p .next ;;
  "run smoke:dev")
    if [ "$SMOKE_EXPECTED_GIT_SHA" = "\${FAIL_SMOKE_SHA:-none}" ]; then exit 1; fi ;;
esac
exit 0
`,
  pm2: `#!/usr/bin/env bash
echo "pm2 $*" >> "$STUB_LOG"
case "$1" in
  describe) [ -f "$PM2_STATE" ]; exit $? ;;
  delete) rm -f "$PM2_STATE" ;;
  start) printf '%s %s\\n' "$(cd -P "$PROD_ROOT/current" && pwd -P)" "\${GIT_SHA:-}" > "$PM2_STATE" ;;
esac
exit 0
`,
  curl: `#!/usr/bin/env bash
state="$(cat "$PM2_STATE" 2>/dev/null || true)"
dir="\${state% *}"
sha="\${state##* }"
if [[ " $* " == *" -w "* ]]; then
  if [ -n "$state" ]; then printf 200; else printf 000; fi
  exit 0
fi
if [ -n "$sha" ] && [ -d "$dir/.next" ]; then printf '{"gitSha":"%s"}' "$sha"; fi
exit 0
`,
};

let tmp: string;
let repoDir: string;
let prodRoot: string;
let runtimeRoot: string;
let binDir: string;
let logFile: string;
let stateFile: string;
let shas: string[];

function git(args: string[]) {
  return execFileSync('git', ['-c', 'commit.gpgsign=false', ...args], {
    cwd: repoDir,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_AUTHOR_NAME: 'test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'test',
    },
  }).trim();
}

function writeFile(file: string, content: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function commit(label: string) {
  const web = path.join(repoDir, 'dev.chinesearizona.com', 'web');
  writeFile(path.join(web, 'package.json'), JSON.stringify({ label, name: 'web' }));
  writeFile(path.join(web, 'data', 'sites', 'austin', 'radar-runtime', 'store.json'), `{"label":"${label}"}`);
  writeFile(path.join(web, 'src', 'data', 'generated-local-articles.json'), `[{"slug":"${label}"}]`);
  writeFile(
    path.join(web, 'scripts', 'arizona_radar', 'restore_local_articles_runtime.cjs'),
    fs.readFileSync(path.join(process.cwd(), 'scripts', 'arizona_radar', 'restore_local_articles_runtime.cjs'), 'utf8')
  );
  writeFile(path.join(repoDir, 'chinesearizona.com', 'main-ecosystem.config.cjs'), `// ${label}\n`);
  git(['add', '-A']);
  git(['commit', '-q', '-m', label]);
  return git(['rev-parse', 'HEAD']);
}

function run(args: string[], extraEnv: Record<string, string> = {}) {
  return spawnSync('bash', [scriptPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      PM2_STATE: stateFile,
      PROD_READY_ATTEMPTS: '2',
      PROD_READY_INTERVAL_SECONDS: '0',
      PROD_REPO_DIR: repoDir,
      PROD_ROOT: prodRoot,
      PROD_RUNTIME_DATA_ROOT: runtimeRoot,
      RADAR_STORAGE_MODE: 'file',
      STUB_LOG: logFile,
      VPS_BUILD_LOCK_FILE: path.join(tmp, 'build.lock'),
      ...extraEnv,
    },
  });
}

function deploy(sha: string, extraEnv: Record<string, string> = {}) {
  const result = run(['deploy', sha], extraEnv);
  expect(result.status, result.stderr).toBe(0);
  return result;
}

function link(name: string) {
  return fs.readlinkSync(path.join(prodRoot, name));
}

function pm2State() {
  const [dir, sha = ''] = fs.readFileSync(stateFile, 'utf8').trim().split(' ');
  return { dir, sha };
}

function stubLog() {
  return fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '';
}

function release(name: string) {
  return path.join(prodRoot, 'releases', name);
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-prod-'));
  repoDir = path.join(tmp, 'repo');
  prodRoot = path.join(tmp, 'prod');
  runtimeRoot = path.join(tmp, 'runtime');
  binDir = path.join(tmp, 'bin');
  logFile = path.join(tmp, 'stub.log');
  stateFile = path.join(tmp, 'pm2-state');

  fs.mkdirSync(repoDir, { recursive: true });
  git(['init', '-q']);
  shas = ['one', 'two', 'three', 'four'].map(commit);

  writeFile(path.join(prodRoot, 'app', '.env.local'), 'NEXT_PUBLIC_SITE_URL=https://chinesearizona.com\n');
  writeFile(path.join(prodRoot, 'app', 'node_modules', 'next', 'dist', 'bin', 'next'), '');
  // pm2 is serving the hand-copied app, as it does today.
  writeFile(stateFile, `${fs.realpathSync(path.join(prodRoot, 'app'))} \n`);

  for (const [name, body] of Object.entries(stubs)) {
    writeFile(path.join(binDir, name), body);
    fs.chmodSync(path.join(binDir, name), 0o755);
  }
});

afterEach(() => {
  fs.rmSync(tmp, { force: true, recursive: true });
});

describe('deploy-prod.sh deploy', () => {
  it('serves the new release and keeps the old app folder as the rollback target', () => {
    deploy(shas[0]);

    expect(link('current')).toBe(`releases/${shas[0]}`);
    expect(link('previous')).toBe(`releases/${LEGACY}`);
    expect(fs.readlinkSync(release(LEGACY))).toBe('../app');
    expect(fs.existsSync(path.join(prodRoot, 'app', '.env.local'))).toBe(true);
    expect(fs.readFileSync(path.join(prodRoot, 'shared', '.env.local'), 'utf8')).toContain(
      'https://chinesearizona.com'
    );
    expect(fs.readlinkSync(path.join(release(shas[0]), '.env.local'))).toBe(
      path.join(prodRoot, 'shared', '.env.local')
    );
    expect(fs.readFileSync(path.join(prodRoot, 'shared', 'main-ecosystem.config.cjs'), 'utf8')).toBe(
      '// one\n'
    );
    expect(
      fs.readFileSync(path.join(runtimeRoot, 'data', 'sites', 'austin', 'radar-runtime', 'store.json'), 'utf8')
    ).toBe('{"label":"one"}');

    expect(pm2State()).toEqual({ dir: fs.realpathSync(release(shas[0])), sha: shas[0] });
    const log = stubLog();
    expect(log).toContain(`npm run build sha=${shas[0]} base= skip= storage=unset`);
    expect(log).toContain('pm2 delete main-chinesearizona');
    expect(log).toContain(
      `pm2 start ${path.join(prodRoot, 'shared', 'main-ecosystem.config.cjs')} --only main-chinesearizona`
    );
    expect(log).toContain(`npm run smoke:dev sha=${shas[0]} base=https://chinesearizona.com skip=1`);
  });

  it('also smoke checks the city domains once they point at the production app', () => {
    const citySite = path.join(tmp, 'chineseaustin.com.conf');
    writeFile(citySite, 'location / {\n    proxy_pass http://127.0.0.1:3000;\n}\n');

    deploy(shas[0], { PROD_CITY_NGINX_SITE: citySite });

    expect(stubLog()).toContain(`npm run smoke:dev sha=${shas[0]} base=https://chinesearizona.com skip=0`);
  });

  it('skips the city domains while they still point at the dev app', () => {
    const citySite = path.join(tmp, 'chineseaustin.com.conf');
    writeFile(citySite, 'location / {\n    proxy_pass http://127.0.0.1:3002;\n}\n');

    deploy(shas[0], { PROD_CITY_NGINX_SITE: citySite });

    expect(stubLog()).toContain(`npm run smoke:dev sha=${shas[0]} base=https://chinesearizona.com skip=1`);
  });

  it('does not overwrite runtime data that already exists', () => {
    writeFile(path.join(runtimeRoot, 'data', 'sites', 'austin', 'radar-runtime', 'store.json'), 'live');

    deploy(shas[0]);

    expect(
      fs.readFileSync(path.join(runtimeRoot, 'data', 'sites', 'austin', 'radar-runtime', 'store.json'), 'utf8')
    ).toBe('live');
  });

  it('repairs a runtime article list that an older build overwrote with the radar store', () => {
    const articlesPath = path.join(runtimeRoot, 'src', 'data', 'generated-local-articles.json');
    writeFile(articlesPath, '{"version":1,"articles":[],"runs":[]}');

    deploy(shas[0]);

    expect(JSON.parse(fs.readFileSync(articlesPath, 'utf8'))).toEqual([{ slug: 'one' }]);
  });

  it('switches back to the release that was live when smoke fails', () => {
    deploy(shas[0]);

    const result = run(['deploy', shas[1]], { FAIL_SMOKE_SHA: shas[1] });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(`Deploy of ${shas[1]} failed.`);
    expect(link('current')).toBe(`releases/${shas[0]}`);
    expect(link('previous')).toBe(`releases/${LEGACY}`);
    expect(pm2State()).toEqual({ dir: fs.realpathSync(release(shas[0])), sha: shas[0] });
    expect(fs.readFileSync(path.join(prodRoot, 'shared', 'main-ecosystem.config.cjs'), 'utf8')).toBe(
      '// one\n'
    );
  });

  it('leaves the live site alone when the build fails', () => {
    deploy(shas[0]);
    const startsBefore = stubLog().split('pm2 start').length;

    const result = run(['deploy', shas[1]], { FAIL_BUILD_SHA: shas[1] });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('The live site was not touched.');
    expect(link('current')).toBe(`releases/${shas[0]}`);
    expect(fs.existsSync(release(shas[1]))).toBe(false);
    expect(stubLog().split('pm2 start').length).toBe(startsBefore);
  });

  it('reuses a release that is already built', () => {
    deploy(shas[0]);
    deploy(shas[0]);

    expect(stubLog().match(/^npm ci/gm)).toHaveLength(1);
    expect(link('current')).toBe(`releases/${shas[0]}`);
    expect(link('previous')).toBe(`releases/${LEGACY}`);
  });

  it('keeps the three newest releases plus current and previous', () => {
    for (const sha of shas) {
      deploy(sha);
    }

    const releases = fs.readdirSync(path.join(prodRoot, 'releases')).filter((name) => !name.startsWith('.'));
    expect(releases.sort()).toEqual([shas[1], shas[2], shas[3]].sort());
    expect(link('current')).toBe(`releases/${shas[3]}`);
    expect(link('previous')).toBe(`releases/${shas[2]}`);
    // Pruning the legacy link must not delete the app folder it pointed at.
    expect(fs.existsSync(path.join(prodRoot, 'app', '.env.local'))).toBe(true);
  });

  it('rejects anything but a full commit SHA', () => {
    const result = run(['deploy', 'abc123']);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('full 40-character commit SHA');
    expect(fs.existsSync(path.join(prodRoot, 'releases'))).toBe(false);
  });
});

describe('deploy-prod.sh rollback', () => {
  it('swaps current and previous without rebuilding', () => {
    deploy(shas[0]);
    deploy(shas[1]);
    const buildsBefore = stubLog().match(/^npm run build/gm)?.length;

    const first = run(['rollback']);
    expect(first.status, first.stderr).toBe(0);
    expect(link('current')).toBe(`releases/${shas[0]}`);
    expect(link('previous')).toBe(`releases/${shas[1]}`);
    expect(pm2State()).toEqual({ dir: fs.realpathSync(release(shas[0])), sha: shas[0] });

    const second = run(['rollback']);
    expect(second.status, second.stderr).toBe(0);
    expect(link('current')).toBe(`releases/${shas[1]}`);
    expect(link('previous')).toBe(`releases/${shas[0]}`);
    expect(stubLog().match(/^npm run build/gm)?.length).toBe(buildsBefore);
  });

  it('can return to the legacy app after the first deploy', () => {
    deploy(shas[0]);
    const smokesBefore = stubLog().match(/^npm run smoke:dev/gm)?.length;

    const result = run(['rollback']);

    expect(result.status, result.stderr).toBe(0);
    expect(link('current')).toBe(`releases/${LEGACY}`);
    expect(pm2State()).toEqual({ dir: fs.realpathSync(path.join(prodRoot, 'app')), sha: '' });
    expect(stubLog().match(/^npm run smoke:dev/gm)?.length).toBe(smokesBefore);
  });

  it('refuses a release that is not on the server', () => {
    deploy(shas[0]);

    const result = run(['rollback', shas[3]]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('is not on the server');
    expect(link('current')).toBe(`releases/${shas[0]}`);
  });
});

describe('Deploy Prod workflow', () => {
  const workflow = fs.readFileSync(workflowPath, 'utf8');

  it('runs only by hand, from main, behind the production environment', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toMatch(/^\s+(push|pull_request|workflow_run|schedule):/m);
    expect(workflow).toContain("if: github.ref == 'refs/heads/main'");
    expect(workflow).toContain('name: production');
    expect(workflow).toContain('url: https://chinesearizona.com');
    expect(workflow).toContain('group: deploy-prod');
    expect(workflow).toContain('cancel-in-progress: false');
    expect(workflow).toContain('select(.type == "required_reviewers")');
  });

  it('only deploys main SHAs that passed Dev CI and already shipped to dev', () => {
    expect(workflow).toContain('git merge-base --is-ancestor "$DEPLOY_SHA" origin/main');
    expect(workflow).toContain('/actions/workflows/ci.yml/runs');
    expect(workflow).toContain('/actions/workflows/deploy-dev.yml/runs');
    expect(workflow).toContain('select(.name == "Deploy exact SHA to VPS")');
    expect(workflow).toContain('npm run verify');
  });

  it('uses its own secrets and never trusts unknown host keys', () => {
    for (const secret of [
      'PROD_VPS_HOST',
      'PROD_VPS_PORT',
      'PROD_VPS_USER',
      'PROD_VPS_SSH_KEY',
      'PROD_VPS_SSH_KNOWN_HOSTS',
    ]) {
      expect(workflow).toContain(`secrets.${secret}`);
    }
    expect(workflow).not.toContain('secrets.DEV_');
    expect(workflow).toContain('-o StrictHostKeyChecking=yes');
    expect(workflow).not.toContain('accept-new');
    expect(workflow).not.toContain('StrictHostKeyChecking=no');
    expect(workflow).toContain('< ops/deploy-prod/deploy-prod.sh');
  });
});

describe('VPS build lock', () => {
  it('is shared by Deploy Dev and Deploy Prod', () => {
    const devWorkflow = fs.readFileSync(devWorkflowPath, 'utf8');
    const script = fs.readFileSync(scriptPath, 'utf8');

    expect(devWorkflow).toContain('exec 9>"$HOME/.chinesearizona-vps-build.lock"');
    expect(devWorkflow).toContain('flock -w 1800 9');
    expect(devWorkflow.indexOf('flock -w 1800 9')).toBeLessThan(devWorkflow.indexOf('npm run build'));
    expect(script).toContain('LOCK_FILE="${VPS_BUILD_LOCK_FILE:-$HOME/.chinesearizona-vps-build.lock}"');
  });

  it('is never inherited by a pm2 daemon', () => {
    const devWorkflow = fs.readFileSync(devWorkflowPath, 'utf8');
    const script = fs.readFileSync(scriptPath, 'utf8');
    const pm2Lines = [...devWorkflow.split('\n'), ...script.split('\n')]
      .map((line) => line.trim())
      .filter((line) => /^(if )?pm2 /.test(line));

    expect(pm2Lines.length).toBeGreaterThanOrEqual(8);
    for (const line of pm2Lines) {
      expect(line).toContain('9>&-');
    }
  });
});

describe('production pm2 config', () => {
  it('serves the current release on port 3001 with production runtime data', () => {
    const require = createRequire(import.meta.url);
    const config = require(ecosystemPath) as {
      apps: Array<{ args: string; cwd: string; env: Record<string, string>; name: string }>;
    };
    const [app] = config.apps;
    const runtimeRoot = '/var/www/runtime-data/chinesearizona.com/web';

    expect(app.name).toBe('main-chinesearizona');
    expect(app.cwd).toBe('/var/www/chinesearizona.com/current');
    expect(app.args).toContain('--port 3001');
    expect(app.env.PORT).toBe('3001');
    expect(app.env).not.toHaveProperty('RADAR_STORAGE_MODE');
    expect(app.env.CHINESEARIZONA_RUNTIME_DATA_ROOT).toBe(runtimeRoot);

    const script = fs.readFileSync(scriptPath, 'utf8');
    for (const name of [
      'RADAR_STORE_PATH_AUSTIN',
      'RADAR_STORE_PATH_LOS_ANGELES',
      'SF_BAY_RADAR_STORE_PATH',
      'ARTICLE_EN_TRANSLATION_CACHE_PATH',
      'ARTICLE_ZH_TRANSLATION_CACHE_PATH',
      'GENERATED_LOCAL_ARTICLES_PATH',
    ]) {
      expect(app.env[name]).toMatch(new RegExp(`^${runtimeRoot}/`));
      // The build and the running app must use the same paths.
      expect(script).toContain(`export ${name}="$RUNTIME_DATA_ROOT${app.env[name].slice(runtimeRoot.length)}"`);
    }
  });

  it('keeps release folders out of the /var/www clean-tree check', () => {
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');

    for (const entry of [
      'chinesearizona.com/releases/',
      'chinesearizona.com/shared/',
      'chinesearizona.com/current',
      'chinesearizona.com/previous',
    ]) {
      expect(gitignore).toContain(entry);
    }
  });

  it('is documented in the README runbook', () => {
    const readme = fs.readFileSync(readmePath, 'utf8');

    expect(readme).toContain('## Production deploys (chinesearizona.com)');
    expect(readme).toContain('`production`');
    expect(readme).toContain('action=rollback');
  });
});
