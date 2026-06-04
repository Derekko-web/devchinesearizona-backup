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

  it('runs Playwright e2e inside the deploy-gating workflow', () => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('playwright-e2e:');
    expect(workflow).toContain('- name: Install Chromium');
    expect(workflow).toContain('npx playwright install --with-deps chromium');
    expect(workflow).toContain('- name: Build');
    expect(workflow).toContain('npm run build');
    expect(workflow).toContain('- name: Run Playwright e2e');
    expect(workflow).toContain('npm run e2e');
  });

  it('exposes ci-required as the stable branch-protection check', () => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('ci-required:');
    expect(workflow).toContain('name: ci-required');
    expect(workflow).toContain('- playwright-e2e');
    expect(workflow).toContain('- python-scraper-tests');
    expect(workflow).toContain('- wordpress-theme');
    expect(workflow).toContain('require_success_when_needed "python-scraper-tests"');
    expect(workflow).toContain('require_success_when_needed "wordpress-theme"');
  });

  it('adds lightweight scoped jobs for scraper and WordPress theme packages', () => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('python-scraper-tests:');
    expect(workflow).toContain("if: needs.changes.outputs.python_scraper == 'true'");
    expect(workflow).toContain('data/(scrape-staging|signal-desk-staging)/');
    expect(workflow).toContain('generated-(scraped-businesses|directory-businesses|plaza-businesses|business-image-overrides|local-articles|signal-desk-queue)');
    expect(workflow).toContain('cache-dependency-path: dev.chinesearizona.com/web/requirements.txt');
    expect(workflow).toContain('python3 -m pip install --target .python-packages -r requirements.txt');
    expect(workflow).toContain('npm run scrape:test');

    expect(workflow).toContain('wordpress-theme:');
    expect(workflow).toContain("if: needs.changes.outputs.wordpress_theme == 'true'");
    expect(workflow).toContain(
      'cache-dependency-path: chinesearizona.com/public/wp-content/themes/twentytwentyfive/package-lock.json'
    );
    expect(workflow).toContain('npm audit --audit-level=moderate');
    expect(workflow).toContain('npm run build');
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
