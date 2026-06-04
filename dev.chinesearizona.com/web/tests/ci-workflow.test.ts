import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const workflowPath = path.join(process.cwd(), '..', '..', '.github', 'workflows', 'ci.yml');

describe('Dev CI homepage smoke check', () => {
  it('runs for every PR and includes the dependency security gate', () => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('pull_request:');
    expect(workflow).not.toContain("'.github/workflows/**'");
    expect(workflow).not.toContain("'.github/dependabot.yml'");
    expect(workflow).toContain('- name: Security audit');
    expect(workflow).toContain('npm run security:audit');
    expect(workflow).toContain('- name: Upload coverage report');
    expect(workflow).toContain('dev.chinesearizona.com/web/coverage');
  });

  it('starts the built Next app and verifies the homepage locally', () => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('- name: Smoke homepage');
    expect(workflow).toContain('npm run start -- --hostname 127.0.0.1 --port 3000');
    expect(workflow).toContain('http://127.0.0.1:3000/');
    expect(workflow).toContain('Homepage returned HTTP $http_status instead of 200.');
    expect(workflow).toContain("grep -q 'ChineseArizona'");
  });
});
