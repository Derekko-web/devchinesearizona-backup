import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

// Deploy Prod builds a release folder that holds only dev.chinesearizona.com/web,
// and `next build` type-checks every .ts/.tsx file in it. A static import that
// reaches outside the web folder (for example into ../../ops) passes CI, where
// the whole repo is checked out, but breaks the production build.
const webRoot = process.cwd();
const staticImport = /(?:^|\n)\s*(?:import|export)\s[^'"]*?from\s+['"](\.{1,2}\/[^'"]+)['"]/g;
const sideEffectImport = /(?:^|\n)\s*import\s+['"](\.{1,2}\/[^'"]+)['"]/g;

function listTypeScriptFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
      return [];
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listTypeScriptFiles(fullPath);
    }
    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [fullPath] : [];
  });
}

describe('production release folder', () => {
  it('has no TypeScript file that statically imports from outside the web app', () => {
    const offenders = ['src', 'tests', 'e2e', 'scripts']
      .map((dir) => path.join(webRoot, dir))
      .filter((dir) => fs.existsSync(dir))
      .flatMap(listTypeScriptFiles)
      .flatMap((file) => {
        const source = fs.readFileSync(file, 'utf8');
        return [...source.matchAll(staticImport), ...source.matchAll(sideEffectImport)]
          .map((match) => match[1])
          .filter((specifier) => {
            const resolved = path.resolve(path.dirname(file), specifier);
            return path.relative(webRoot, resolved).startsWith('..');
          })
          .map((specifier) => `${path.relative(webRoot, file)} imports ${specifier}`);
      });

    expect(offenders).toEqual([]);
  });
});
