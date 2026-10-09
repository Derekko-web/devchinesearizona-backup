import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { getRootDirs } = require('@next/eslint-plugin-next/dist/utils/get-root-dirs') as {
  getRootDirs: (context: { cwd: string; settings: { next?: { rootDir?: string | string[] } } }) => string[];
};
const fixture = mkdtempSync(join(tmpdir(), 'next-eslint-roots-'));

for (const app of ['web', 'admin']) mkdirSync(join(fixture, app));
writeFileSync(join(fixture, 'README.md'), 'fixture');

afterAll(() => rmSync(fixture, { recursive: true, force: true }));

// The scoped tinyglobby override must preserve Next's directory-only glob API.
describe('Next ESLint root directory detection', () => {
  it('uses the working directory when no root glob is configured', () => {
    expect(getRootDirs({ cwd: fixture, settings: {} })).toEqual([fixture]);
  });

  it('expands brace patterns and excludes files', () => {
    expect(getRootDirs({ cwd: fixture, settings: { next: { rootDir: `${fixture}/{web,admin,README.md}` } } }).map(dir => resolve(dir)).sort())
      .toEqual([join(fixture, 'admin'), join(fixture, 'web')]);
  });

  it('combines arrays of root directory globs', () => {
    expect(getRootDirs({ cwd: fixture, settings: { next: { rootDir: [`${fixture}/web`, `${fixture}/adm*`] } } }).map(dir => resolve(dir)).sort())
      .toEqual([join(fixture, 'admin'), join(fixture, 'web')]);
  });
});

