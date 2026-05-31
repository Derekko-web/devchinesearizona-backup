import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.join(process.cwd(), '..', '..');
const egressRoot = path.join(repoRoot, 'ops', 'radar-hermes-egress');
const servicePath = path.join(egressRoot, 'systemd', 'radar-hermes-worker@.service');
const nftablesPath = path.join(egressRoot, 'nftables', 'radar-hermes-worker.nft');
const readmePath = path.join(egressRoot, 'README.md');
const rolloutPlanPath = path.join(egressRoot, 'rollout-plan.md');
const applyRuntimePath = path.join(egressRoot, 'apply-runtime-deploy.sh');
const runtimeWorkflowPath = path.join(repoRoot, '.github', 'workflows', 'radar-hermes-runtime-egress.yml');
const launcherPath = path.join(process.cwd(), 'scripts', 'radar_hermes', 'run_or_start_systemd.cjs');

const deniedRanges = [
  '10.0.0.0/8',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '198.18.0.0/15',
  '224.0.0.0/4',
  '240.0.0.0/4',
  '::/3',
  '::1/128',
  '::ffff:0:0/96',
  '4000::/2',
  '8000::/1',
  'fc00::/7',
  'fe80::/10',
  'ff00::/8',
];

describe('Radar/Hermes egress policy templates', () => {
  it('keeps systemd worker execution behind the expected denied network ranges', () => {
    const service = fs.readFileSync(servicePath, 'utf8');

    expect(service).toContain('ExecStart=/usr/bin/node scripts/arizona_radar/run.cjs run --site=%i');
    expect(service).toContain('User=radar-hermes');
    expect(service).toContain('WorkingDirectory=/var/www/dev.chinesearizona.com/web');
    expect(service).toContain('ReadWritePaths=/var/www/runtime-data/dev.chinesearizona.com/web');
    expect(service).toContain('Environment=PATH=/usr/local/bin:/usr/bin:/bin');
    expect(service).toContain('EnvironmentFile=-/etc/chinesearizona/radar-hermes/%i.env');
    expect(service).toContain('RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX');

    for (const range of deniedRanges) {
      expect(service).toContain(`IPAddressDeny=${range}`);
    }
  });

  it('keeps the optional nftables policy scoped to the worker identity and public web ports', () => {
    const policy = fs.readFileSync(nftablesPath, 'utf8');

    expect(policy).toContain('table inet radar_hermes_egress');
    expect(policy).toContain('define radar_worker_uid = "radar-hermes"');
    expect(policy).toContain('meta skuid $radar_worker_uid udp dport 53 accept');
    expect(policy).toContain('meta skuid $radar_worker_uid tcp dport { 53, 80, 443 } accept');
    expect(policy).toContain('meta skuid $radar_worker_uid reject with icmpx admin-prohibited');

    for (const range of deniedRanges) {
      expect(policy).toContain(range);
    }
  });

  it('applies the runtime egress layer after the normal deploy workflow succeeds', () => {
    const applyRuntime = fs.readFileSync(applyRuntimePath, 'utf8');
    const runtimeWorkflow = fs.readFileSync(runtimeWorkflowPath, 'utf8');

    expect(runtimeWorkflow).toContain('workflows:');
    expect(runtimeWorkflow).toContain('- Deploy Dev');
    expect(runtimeWorkflow).toContain('apply-runtime-deploy.sh');
    expect(runtimeWorkflow).toContain('current_sha="$(git rev-parse HEAD)"');
    expect(applyRuntime).toContain('backup_existing_runtime_state');
    expect(applyRuntime).toContain('install_runtime_env_files');
    expect(applyRuntime).toContain('systemd-analyze verify');
    expect(applyRuntime).toContain('systemctl daemon-reload');
    expect(applyRuntime).toContain('systemctl start "radar-hermes-worker@$city.service"');
    expect(applyRuntime).toContain('systemctl enable --now "radar-hermes-worker@$city.timer"');
    expect(applyRuntime).toContain('disable_legacy_cron_entries');
    expect(applyRuntime).toContain('operator=github-actions-deploy');
  });

  it('keeps a launcher for manual npm invocations without bypassing systemd when installed', () => {
    const launcher = fs.readFileSync(launcherPath, 'utf8');

    expect(launcher).toContain('systemctl');
    expect(launcher).toContain('sudo');
    expect(launcher).toContain("['-n', 'systemctl']");
    expect(launcher).toContain('scripts/arizona_radar/run.cjs');
    expect(launcher).toContain('RADAR_HERMES_DIRECT');
  });

  it('documents owner decisions and rollback without embedding live private endpoints', () => {
    const readme = fs.readFileSync(readmePath, 'utf8');
    const rolloutPlan = fs.readFileSync(rolloutPlanPath, 'utf8');

    expect(readme).toContain('Owner decisions');
    expect(readme).toContain('Rollback');
    expect(readme).toContain('rollout-plan.md');
    expect(readme).toContain('Do not record credentials');
    expect(rolloutPlan).toContain('Required owner decisions');
    expect(rolloutPlan).toContain('Backup');
    expect(rolloutPlan).toContain('Dry-run');
    expect(rolloutPlan).toContain('Rollback');
    expect(`${readme}\n${rolloutPlan}`).not.toMatch(
      /https?:\/\/(?:10\.|127\.|192\.168\.|172\.(?:1[6-9]|2\d|3[0-1])\.)/
    );
  });

  it('keeps the owner rollout plan scoped to all four city news pipelines', () => {
    const rolloutPlan = fs.readFileSync(rolloutPlanPath, 'utf8');

    for (const city of ['arizona', 'austin', 'los-angeles', 'sf-bay']) {
      expect(rolloutPlan).toContain(`radar-hermes-worker@${city}.service`);
      expect(rolloutPlan).toContain(`radar-hermes-worker@${city}.timer`);
      expect(rolloutPlan).toContain(`--site=${city}`);
    }

    expect(rolloutPlan).toContain('npm run scrape:arizona-radar');
    expect(rolloutPlan).toContain('npm run scrape:austin-radar');
    expect(rolloutPlan).toContain('npm run scrape:los-angeles-radar');
    expect(rolloutPlan).toContain('npm run scrape:sf-bay-radar');
  });
});
