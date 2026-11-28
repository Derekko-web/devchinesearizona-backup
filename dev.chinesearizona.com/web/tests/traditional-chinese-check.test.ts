import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  findSimplifiedOnlyCharacters,
  isSimplifiedOnlyCharacter,
  simplifiedOnlyCharacterCount,
} from '@/lib/traditional-chinese';

const fixture = [
  ...new Set(fs.readFileSync(path.join(__dirname, 'fixtures', 'simplified-only-chars.txt'), 'utf8').trim()),
];

describe('Simplified-only character check', () => {
  it('matches the fixture used by the Traditional Chinese copy test', () => {
    expect(simplifiedOnlyCharacterCount()).toBe(fixture.length);
    expect(fixture.every((character) => isSimplifiedOnlyCharacter(character))).toBe(true);
  });

  it('finds Simplified-only characters once each, in order', () => {
    // 适 and 游 also exist as Traditional characters, so only 驾, 动 and 园 count.
    expect(findSimplifiedOnlyCharacters('适合家庭出游的自驾野生动物园动物')).toEqual(['驾', '动', '园']);
  });

  it('accepts Traditional Chinese as used in Taiwan', () => {
    expect(findSimplifiedOnlyCharacters('適合全家出遊的自駕野生動物園，台灣用語。')).toEqual([]);
    expect(findSimplifiedOnlyCharacters('Bearizona Wildlife Park, Route 66')).toEqual([]);
  });
});
