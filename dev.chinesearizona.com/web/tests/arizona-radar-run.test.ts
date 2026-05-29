import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const {
  parseFeedItems,
  extractJsonPayload,
  parseArgs,
  parseHermesOutput,
  runWorker,
} = require('../scripts/arizona_radar/run.cjs') as {
  extractJsonPayload: (text: string) => string;
  parseFeedItems: (
    xml: string,
    source: Record<string, unknown>,
    options: { lookbackHours: number; maxItems: number; now: string }
  ) => Array<Record<string, unknown>>;
  parseArgs: (argv: string[]) => {
    feedTimeoutMs: number;
    hermesMaxTurns: number;
    retryEmpty: boolean;
    sourceBatchSize: number;
  };
  parseHermesOutput: (text: string) => Array<Record<string, unknown>>;
  runWorker: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  RADAR_STORAGE_MODE: process.env.RADAR_STORAGE_MODE,
};
const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe('Arizona Radar worker command parsing', () => {
  it('parses bounded cron controls', () => {
    const args = parseArgs([
      'node',
      'scripts/arizona_radar/run.cjs',
      'run',
      '--hermes-max-turns=7',
      '--feed-timeout-ms=8000',
      '--retry-empty=0',
      '--source-batch-size=3',
    ]);

    expect(args.feedTimeoutMs).toBe(8000);
    expect(args.hermesMaxTurns).toBe(7);
    expect(args.retryEmpty).toBe(false);
    expect(args.sourceBatchSize).toBe(3);
  });
});

describe('Arizona Radar feed fallback', () => {
  it('parses recent WordPress RSS items into summary-link drafts without copying article bodies', () => {
    const fixture = fs.readFileSync(
      path.join(__dirname, 'fixtures', 'whatnow-phoenix-feed.xml'),
      'utf8'
    );
    const drafts = parseFeedItems(
      fixture,
      {
        slug: 'what-now-phoenix',
        name: 'What Now Phoenix',
        url: 'https://whatnow.com/phoenix/',
        feedUrl: 'https://whatnow.com/phoenix/feed/',
        sourceType: 'local_media',
        sourcePolicy: 'summary_link',
        lane: 'openings',
      },
      {
        lookbackHours: 168,
        maxItems: 10,
        now: '2026-05-29T05:00:00.000Z',
      }
    );

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      sourceSlug: 'what-now-phoenix',
      sourceName: 'What Now Phoenix',
      sourcePublishedAt: '2026-05-27T03:39:37.000Z',
      canonicalUrl:
        'https://whatnow.com/phoenix/restaurants/sample-phoenix-storefront-opening-signal',
      heroImage: 'https://whatnow.com/wp-content/uploads/2026/05/project-leannation.jpg',
      sourceUrl:
        'https://whatnow.com/phoenix/restaurants/sample-phoenix-storefront-opening-signal',
    });
    expect(String(drafts[0]?.bodyEn)).not.toContain(
      'Synthetic fixture sentence that must not be copied into generated radar copy.'
    );
  });

  it('publishes feed drafts when Hermes returns no candidates', async () => {
    process.env.NODE_ENV = 'test';
    process.env.RADAR_STORAGE_MODE = 'file';

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-feed-fallback-'));
    const hermesBin = path.join(tempDir, 'hermes-empty');
    const storePath = path.join(tempDir, 'store.json');
    fs.writeFileSync(hermesBin, '#!/usr/bin/env bash\nprintf "[]\\n"\n', 'utf8');
    fs.chmodSync(hermesBin, 0o755);

    const fixture = fs.readFileSync(
      path.join(__dirname, 'fixtures', 'whatnow-phoenix-feed.xml'),
      'utf8'
    );
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      if (String(url) === 'https://whatnow.com/phoenix/feed/') {
        return new Response(fixture, {
          status: 200,
          headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
        });
      }

      throw new Error(`Unexpected fetch: ${String(url)}`);
    }) as typeof fetch;

    const result = await runWorker({
      command: 'run',
      draftMultiplier: 1,
      feedTimeoutMs: 1000,
      fixturePath: '',
      hermesBin,
      hermesMaxTurns: 1,
      hermesTimeoutMs: 1000,
      lookbackHours: 168,
      maxItems: 10,
      retryEmpty: false,
      sourceBatchSize: 3,
      sourceSlugs: '',
      storePath,
    });
    const store = JSON.parse(fs.readFileSync(storePath, 'utf8')) as {
      articles: Array<Record<string, unknown>>;
      runs: Array<Record<string, unknown>>;
    };

    expect(result.status).toBe('completed');
    expect(result.publishedCount).toBe(1);
    expect(store.articles).toHaveLength(1);
    expect(store.articles[0]).toMatchObject({
      sourceName: 'What Now Phoenix',
      sourcePolicy: 'summary_link',
      isPublished: true,
    });
    expect(store.runs[0]).toMatchObject({
      status: 'completed',
      publishedCount: 1,
    });
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
