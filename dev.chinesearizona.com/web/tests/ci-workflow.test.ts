import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const workflowPath = path.join(process.cwd(), '..', '..', '.github', 'workflows', 'ci.yml');

describe('Dev CI homepage smoke check', () => {
  it('starts the built Next app and verifies the homepage locally', () => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('- name: Smoke homepage');
    expect(workflow).toContain('npm run start -- --hostname 127.0.0.1 --port 3000');
    expect(workflow).toContain('http://127.0.0.1:3000/');
    expect(workflow).toContain('Homepage returned HTTP $http_status instead of 200.');
    expect(workflow).toContain("grep -q 'ChineseArizona'");
  });
});
