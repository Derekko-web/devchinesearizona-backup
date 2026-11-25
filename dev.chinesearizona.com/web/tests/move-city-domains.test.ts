import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const repoRoot = path.join(process.cwd(), '..', '..');
const scriptPath = path.join(repoRoot, 'ops', 'move-city-domains-to-prod.sh');
const domains = ['chineseaustin.com', 'chineselosangeles.com', 'chinesesfbay.com'];
const stores = [
  'data/sites/austin/radar-runtime/store.json',
  'data/sites/los-angeles/radar-runtime/store.json',
  'data/sf-bay-radar-runtime/store.json',
];

let tmp: string;
let sitesDir: string;
let prodRuntime: string;
let devRuntime: string;
let binDir: string;

function writeFile(file: string, body: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}

function site(domain: string, port: number) {
  return `server {\n    server_name ${domain};\n    location / {\n        proxy_pass http://127.0.0.1:${port};\n    }\n}\n`;
}

function run(mode?: string) {
  return spawnSync('bash', [scriptPath, ...(mode ? [mode] : [])], {
    encoding: 'utf8',
    env: {
      ...process.env,
      DEV_RUNTIME_DATA_ROOT: devRuntime,
      NGINX_SITES_DIR: sitesDir,
      PATH: `${binDir}:${process.env.PATH}`,
      PROD_RUNTIME_DATA_ROOT: prodRuntime,
      SKIP_NGINX_RELOAD: '1',
    },
  });
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'move-city-domains-'));
  sitesDir = path.join(tmp, 'sites');
  prodRuntime = path.join(tmp, 'prod-runtime');
  devRuntime = path.join(tmp, 'dev-runtime');
  binDir = path.join(tmp, 'bin');

  for (const domain of domains) {
    writeFile(path.join(sitesDir, `${domain}.conf`), site(domain, 3002));
  }
  for (const store of stores) {
    writeFile(path.join(prodRuntime, store), '{"placeholder":true}');
    writeFile(path.join(devRuntime, store), '{"worker":true}');
  }
  // The production app answers through the router.
  writeFile(path.join(binDir, 'curl'), '#!/usr/bin/env bash\nprintf 200\n');
  fs.chmodSync(path.join(binDir, 'curl'), 0o755);
});

afterEach(() => {
  fs.rmSync(tmp, { force: true, recursive: true });
});

describe('move-city-domains-to-prod.sh', () => {
  it('points the city sites at the production app and shares the city worker stores', () => {
    const result = run();
    expect(result.status, result.stderr).toBe(0);

    for (const domain of domains) {
      const conf = fs.readFileSync(path.join(sitesDir, `${domain}.conf`), 'utf8');
      expect(conf).toContain('proxy_pass http://127.0.0.1:3000;');
      expect(conf).not.toContain('127.0.0.1:3002');
      expect(fs.readdirSync(sitesDir).some((name) => name.startsWith(`${domain}.conf.bak.`))).toBe(true);
    }
    for (const store of stores) {
      expect(fs.readlinkSync(path.join(prodRuntime, store))).toBe(path.join(devRuntime, store));
      expect(fs.readFileSync(path.join(prodRuntime, store), 'utf8')).toBe('{"worker":true}');
    }
  });

  it('is safe to run twice', () => {
    expect(run().status).toBe(0);
    const second = run();

    expect(second.status, second.stderr).toBe(0);
    expect(second.stdout).toContain('already uses http://127.0.0.1:3000;');
    expect(second.stdout).toContain('already links to the city worker store');
  });

  it('rolls the city sites back to the dev app', () => {
    expect(run().status).toBe(0);
    const result = run('rollback');

    expect(result.status, result.stderr).toBe(0);
    for (const domain of domains) {
      expect(fs.readFileSync(path.join(sitesDir, `${domain}.conf`), 'utf8')).toContain(
        'proxy_pass http://127.0.0.1:3002;'
      );
    }
  });

  it('changes nothing when the production app does not answer for a city', () => {
    writeFile(path.join(binDir, 'curl'), '#!/usr/bin/env bash\nprintf 502\n');
    const result = run();

    expect(result.status).not.toBe(0);
    expect(fs.readFileSync(path.join(sitesDir, 'chineseaustin.com.conf'), 'utf8')).toContain('127.0.0.1:3002');
    expect(fs.lstatSync(path.join(prodRuntime, stores[0])).isSymbolicLink()).toBe(false);
  });
});
