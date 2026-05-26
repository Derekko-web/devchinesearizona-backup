import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  extractJsonPayload,
  parseArgs,
  parseHermesOutput,
} = require('../scripts/arizona_radar/run.cjs') as {
  extractJsonPayload: (text: string) => string;
  parseArgs: (argv: string[]) => {
    hermesMaxTurns: number;
    retryEmpty: boolean;
    sourceBatchSize: number;
  };
  parseHermesOutput: (text: string) => Array<Record<string, unknown>>;
};

describe('Arizona Radar worker command parsing', () => {
  it('parses bounded cron controls', () => {
    const args = parseArgs([
      'node',
      'scripts/arizona_radar/run.cjs',
      'run',
      '--hermes-max-turns=7',
      '--retry-empty=0',
      '--source-batch-size=3',
    ]);

    expect(args.hermesMaxTurns).toBe(7);
    expect(args.retryEmpty).toBe(false);
    expect(args.sourceBatchSize).toBe(3);
  });
});

describe('Arizona Radar Hermes output parsing', () => {
  it('extracts the first complete JSON payload when Hermes appends extra output', () => {
    const payload = extractJsonPayload(
      [
        '{"sourceName":"ABC15 Arizona","sourceUrl":"https://www.abc15.com/news","titleEn":"Phoenix update"}',
        '{"status":"completed","tokens":123}',
      ].join('\n')
    );

    expect(JSON.parse(payload)).toMatchObject({
      sourceName: 'ABC15 Arizona',
      sourceUrl: 'https://www.abc15.com/news',
    });
  });

  it('skips non-JSON bracketed text before the draft array', () => {
    const drafts = parseHermesOutput(
      [
        'candidate sources [not json]',
        '[',
        '  {"sourceName":"Phoenix Sky Harbor","sourceUrl":"https://www.skyharbor.com/newsroom/item","titleEn":"Airport update"}',
        ']',
      ].join('\n')
    );

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      sourceName: 'Phoenix Sky Harbor',
      titleEn: 'Airport update',
    });
  });

  it('accepts a single draft object as degraded Hermes output', () => {
    const drafts = parseHermesOutput(
      '{"sourceName":"What Now Phoenix","sourceUrl":"https://whatnow.com/phoenix/item","titleEn":"Opening update"}'
    );

    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.sourceName).toBe('What Now Phoenix');
  });
});
