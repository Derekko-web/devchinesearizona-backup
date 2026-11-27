import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

// The Chinese side of every site uses Traditional characters. This list holds
// characters that exist only in Simplified (generated from OpenCC's
// STCharacters table: entries whose Traditional candidates exclude the
// character itself), so valid Traditional characters like 台 or 准 never trip it.
const simplifiedOnly = new Set(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'simplified-only-chars.txt'), 'utf8').trim()
);

const srcRoot = path.join(process.cwd(), 'src');
// Large imported corpora are converted once when imported and are too big to
// rescan on every test run.
const skippedDataFiles = new Set(['generated-imported-articles.json', 'generated-hidden-arizona.json']);
// Search aliases keep Simplified spellings on purpose so Simplified searches match.
const aliasKeys = new Set(['searchAliases', 'search_aliases', 'aliases']);

function listFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

function simplifiedCharacters(text: string): string[] {
  return [...new Set([...text].filter((char) => simplifiedOnly.has(char)))];
}

function collectJsonStrings(value: unknown, key: string | undefined, out: string[]) {
  if (key && aliasKeys.has(key)) {
    return;
  }
  if (typeof value === 'string') {
    out.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectJsonStrings(item, key, out));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([childKey, child]) => collectJsonStrings(child, childKey, out));
  }
}

describe('Traditional Chinese copy', () => {
  it('uses no Simplified-only characters in page and component source', () => {
    const offenders = listFiles(srcRoot)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .flatMap((file) =>
        fs
          .readFileSync(file, 'utf8')
          .split('\n')
          .map((line, index) => ({ file, line, index }))
          .filter(({ line }) => !/alias/i.test(line) && simplifiedCharacters(line).length > 0)
          .map(({ file: offender, line, index }) => `${path.relative(srcRoot, offender)}:${index + 1} ${simplifiedCharacters(line).join('')}`)
      );

    expect(offenders).toEqual([]);
  });

  it('uses no Simplified-only characters in curated directory and article data', () => {
    const offenders = listFiles(path.join(srcRoot, 'data'))
      .filter((file) => file.endsWith('.json') && !skippedDataFiles.has(path.basename(file)))
      .flatMap((file) => {
        const strings: string[] = [];
        collectJsonStrings(JSON.parse(fs.readFileSync(file, 'utf8')), undefined, strings);
        const found = simplifiedCharacters(strings.join('\n'));
        return found.length > 0 ? [`${path.relative(srcRoot, file)} ${found.join('')}`] : [];
      });

    expect(offenders).toEqual([]);
  });

  // The daily signal desk job copies this hand-written file into
  // src/data/generated-local-articles.json. It sits outside src/, so it is
  // checked here: a Simplified character must fail in pull request CI, not
  // in the daily job.
  it('uses no Simplified-only characters in the signal desk input file', () => {
    const inputPath = path.join(process.cwd(), 'data', 'signal-desk-staging', 'source-signals.json');
    const strings: string[] = [];
    collectJsonStrings(JSON.parse(fs.readFileSync(inputPath, 'utf8')), undefined, strings);

    expect(simplifiedCharacters(strings.join('\n'))).toEqual([]);
  });
});
