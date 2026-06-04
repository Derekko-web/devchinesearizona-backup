import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.join(process.cwd(), '..', '..');
const contentJobsPath = path.join(repoRoot, '.github', 'workflows', 'content-jobs.yml');
const e2eWorkflowPath = path.join(repoRoot, '.github', 'workflows', 'e2e.yml');
const dependencyReviewPath = path.join(repoRoot, '.github', 'workflows', 'dependency-review.yml');
const dependabotPath = path.join(repoRoot, '.github', 'dependabot.yml');

describe('workflow hardening', () => {
  it('makes scheduled content jobs reproducible and persistent', () => {
    const workflow = fs.readFileSync(contentJobsPath, 'utf8');

    expect(workflow).toContain('actions/setup-python@v5');
    expect(workflow).toContain('name: dev-content');
    expect(workflow).toContain('python3 -m pip install --target .python-packages -r requirements.txt');
    expect(workflow).toContain('actions/upload-artifact@v4');
    expect(workflow).toContain('Open content update PR');
    expect(workflow).toContain('git status --porcelain -- "${changed_paths[@]}"');
    expect(workflow).toContain('/var/www/runtime-data/dev.chinesearizona.com/web');
    expect(workflow).toContain('gh workflow run deploy-dev.yml');
    expect(workflow).not.toContain('OPENAI_API_KEY');
    expect(workflow).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(workflow).not.toContain('DIRECTORY_STORAGE_BUCKET');
  });

  it('adds real browser e2e coverage in Actions', () => {
    const workflow = fs.readFileSync(e2eWorkflowPath, 'utf8');

    expect(workflow).toContain('name: Dev E2E');
    expect(workflow).toContain('pull_request:');
    expect(workflow).toContain('npx playwright install --with-deps chromium');
    expect(workflow).toContain('npm run e2e');
  });

  it('adds dependency update and dependency-review coverage', () => {
    const dependencyReview = fs.readFileSync(dependencyReviewPath, 'utf8');
    const dependabot = fs.readFileSync(dependabotPath, 'utf8');

    expect(dependencyReview).toContain('actions/dependency-review-action@v4');
    expect(dependencyReview).toContain('npm run security:audit');
    expect(dependencyReview).toContain('continue-on-error: true');
    expect(dependencyReview).toContain('fail-on-severity: moderate');
    expect(dependabot).toContain('package-ecosystem: npm');
    expect(dependabot).toContain('package-ecosystem: pip');
    expect(dependabot).toContain('package-ecosystem: github-actions');
  });
});
