import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.join(process.cwd(), '..', '..');
const contentJobsPath = path.join(repoRoot, '.github', 'workflows', 'content-jobs.yml');
const ciWorkflowPath = path.join(repoRoot, '.github', 'workflows', 'ci.yml');
const e2eWorkflowPath = path.join(repoRoot, '.github', 'workflows', 'e2e.yml');
const dependencyReviewPath = path.join(repoRoot, '.github', 'workflows', 'dependency-review.yml');
const dependabotPath = path.join(repoRoot, '.github', 'dependabot.yml');
const readmePath = path.join(process.cwd(), 'README.md');
const packageJsonPath = path.join(process.cwd(), 'package.json');
const plazaDirectoryExportPath = path.join(process.cwd(), 'scripts', 'plaza_directory_site_export.py');

describe('workflow hardening', () => {
  it('makes scheduled content jobs reproducible and persistent', () => {
    const workflow = fs.readFileSync(contentJobsPath, 'utf8');

    expect(workflow).toContain('actions/setup-python@v6');
    expect(workflow).toContain('name: dev-content');
    expect(workflow).toContain('python3 -m pip install --target .python-packages -r requirements.txt');
    expect(workflow).toContain('actions/upload-artifact@v7');
    expect(workflow).toContain('Open content update PR');
    expect(workflow).toContain('git status --porcelain -- "${changed_paths[@]}"');
    expect(workflow).toContain('npm run scrape:promote-directory');
    expect(workflow).toContain('src/data/generated-directory-businesses.json');
    expect(workflow).toContain('src/data/generated-plaza-businesses.json');
    expect(workflow).toContain('src/data/generated-business-image-overrides.json');
    expect(workflow).not.toContain('actions: write');
    expect(workflow).not.toContain('gh workflow run deploy-dev.yml');
    expect(workflow).not.toContain('/var/www/runtime-data/dev.chinesearizona.com/web');
    expect(workflow).not.toContain('VPS_HOST');
    expect(workflow).not.toContain('scp -i');
    expect(workflow).not.toContain('ssh -i');
    expect(workflow).not.toContain('OPENAI_API_KEY');
    expect(workflow).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(workflow).not.toContain('DIRECTORY_STORAGE_BUCKET');
  });

  it('protects the scraped-to-app directory promotion contract', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      scripts: Record<string, string>;
    };
    const exportScript = fs.readFileSync(plazaDirectoryExportPath, 'utf8');

    expect(packageJson.scripts['scrape:promote-directory']).toBe(
      'PYTHONPATH=.python-packages python3 scripts/plaza_directory_site_export.py'
    );
    expect(exportScript).toContain('SCRAPED_FIXTURE_PATH = ROOT / "src" / "data" / "generated-scraped-businesses.json"');
    expect(exportScript).toContain('COMBINED_OUTPUT_PATH = ROOT / "src" / "data" / "generated-directory-businesses.json"');
    expect(exportScript).toContain('COMBINED_OUTPUT_PATH.write_text');
  });

  it('adds real browser e2e coverage to the deploy-gating CI workflow', () => {
    const workflow = fs.readFileSync(ciWorkflowPath, 'utf8');
    const manualWorkflow = fs.readFileSync(e2eWorkflowPath, 'utf8');

    expect(workflow).toContain('name: Dev CI');
    expect(workflow).toContain('pull_request:');
    expect(workflow).toContain('playwright-e2e:');
    expect(workflow).toContain('npx playwright install --with-deps chromium');
    expect(workflow).toContain('npm run e2e');
    expect(workflow).toContain('actions/upload-artifact@v7');
    expect(workflow).toContain('ci-required:');
    expect(workflow).toContain('name: ci-required');

    expect(manualWorkflow).toContain('name: Dev E2E Manual');
    expect(manualWorkflow).toContain('workflow_dispatch:');
    expect(manualWorkflow).not.toContain('pull_request:');
    expect(manualWorkflow).not.toContain('branches:');
  });

  it('adds path-aware Python scraper and WordPress theme checks to Dev CI', () => {
    const workflow = fs.readFileSync(ciWorkflowPath, 'utf8');

    expect(workflow).toContain('python-scraper-tests:');
    expect(workflow).toContain("if: needs.changes.outputs.python_scraper == 'true'");
    expect(workflow).toContain('cache-dependency-path: dev.chinesearizona.com/web/requirements.txt');
    expect(workflow).toContain('actions/setup-python@v6');
    expect(workflow).toContain('npm run scrape:test');

    expect(workflow).toContain('wordpress-theme:');
    expect(workflow).toContain("if: needs.changes.outputs.wordpress_theme == 'true'");
    expect(workflow).toContain('chinesearizona.com/public/wp-content/themes/twentytwentyfive');
    expect(workflow).toContain('npm audit --audit-level=moderate');
    expect(workflow).toContain('npm run build');
  });

  it('adds dependency update and dependency-review coverage', () => {
    const dependencyReview = fs.readFileSync(dependencyReviewPath, 'utf8');
    const dependabot = fs.readFileSync(dependabotPath, 'utf8');

    expect(dependencyReview).toContain('actions/dependency-review-action@v5');
    expect(dependencyReview).toContain('npm run security:audit');
    expect(dependencyReview).toContain('continue-on-error: true');
    expect(dependencyReview).toContain('fail-on-severity: moderate');
    expect(dependencyReview).toContain('chinesearizona.com/public/wp-content/themes/twentytwentyfive/package-lock.json');
    expect(dependabot).toContain('package-ecosystem: npm');
    expect(dependabot).toContain('exclude-patterns:');
    expect(dependabot).toContain('- stripe');
    expect(dependabot).toContain('dependency-name: undici');
    expect(dependabot).toContain('dependency-name: eslint');
    expect(dependabot).toContain('version-update:semver-major');
    expect(dependabot).toContain('directory: /chinesearizona.com/public/wp-content/themes/twentytwentyfive');
    expect(dependabot).toContain('wordpress-theme-npm-security-and-minor');
    expect(dependabot).toContain('package-ecosystem: pip');
    expect(dependabot).toContain('package-ecosystem: github-actions');
  });

  it('documents the branch protection and environment settings that GitHub must enforce', () => {
    const readme = fs.readFileSync(readmePath, 'utf8');

    expect(readme).toContain('The `Dev CI` workflow exposes one stable required status check: `ci-required`.');
    expect(readme).toContain('Branch protection for `main` should require `ci-required`');
    expect(readme).toContain('should not require');
    expect(readme).toContain('without required reviewers');
    expect(readme).toContain('`dev`');
    expect(readme).toContain('`dev-content`');
    expect(readme).toContain('`dev-runtime`');
    expect(readme).toContain('restrict deployment branches to `main` or protected branches only');
  });
});
