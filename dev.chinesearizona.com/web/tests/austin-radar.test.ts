import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import austinManifest from '@/data/austin-radar-source-manifest.json';
import arizonaManifest from '@/data/radar-source-manifest.json';
import { getRadarStorePath } from '@/lib/radar';
import { siteProfiles } from '@/lib/site-config';

const require = createRequire(import.meta.url);
const {
  applyDraftsToStore,
  defaultStoreSnapshot,
} = require('../scripts/arizona_radar/core.cjs') as {
  applyDraftsToStore: (
    store: Record<string, unknown>,
    drafts: Array<Record<string, unknown>>,
    options: { manifest: Array<Record<string, unknown>>; publishCap: number; now: string }
  ) => {
    store: {
      candidates: Array<Record<string, unknown>>;
      articles: Array<{
        body: Array<{ en: string; zh: string }>;
        sourceLinks: Array<{ url: string; source: string }>;
        sourceName: string;
        sourcePolicy: string;
        sourceUrl: string;
      }>;
    };
    summary: {
      publishedCount: number;
      blockedCount: number;
    };
  };
  defaultStoreSnapshot: () => Record<string, unknown>;
};

describe('Austin Radar config', () => {
  it('runs the Austin radar wrapper as a real CLI entrypoint', () => {
    const result = spawnSync(
      process.execPath,
      [path.join(process.cwd(), 'scripts', 'austin_radar', 'run.cjs'), '--help'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: { ...process.env, RADAR_STORE_PATH: '' },
      }
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Austin Radar worker');
    expect(result.stdout).toContain('node scripts/arizona_radar/run.cjs run');
  });

  it('uses Austin-local sources and no Arizona source entries', () => {
    const austinSourceText = JSON.stringify(austinManifest).toLowerCase();
    const arizonaSourceSlugs = new Set(arizonaManifest.map((source) => source.slug));

    expect(austinManifest.length).toBeGreaterThanOrEqual(8);
    expect(
      austinManifest.some(
        (source) => 'feedUrl' in source && source.feedUrl?.includes('whatnow.com/austin')
      )
    ).toBe(true);
    expect(
      austinManifest.some(
        (source) => 'feedUrl' in source && source.feedUrl?.includes('austinmonitor.com/feed')
      )
    ).toBe(true);
    expect(austinManifest.some((source) => source.sourcePolicy === 'signal_only')).toBe(true);
    expect(austinManifest.every((source) => !arizonaSourceSlugs.has(source.slug))).toBe(true);
    expect(austinSourceText).not.toContain('phoenix');
    expect(austinSourceText).not.toContain('arizona');
    expect(austinSourceText).not.toContain('skyharbor');
  });

  it('resolves Austin runtime stores under the migrated runtime data root', () => {
    const originalRuntimeRoot = process.env.CHINESEARIZONA_RUNTIME_DATA_ROOT;
    const originalStorePath = process.env.RADAR_STORE_PATH_AUSTIN;
    const originalLegacyStorePath = process.env.AUSTIN_RADAR_STORE_PATH;
    const runtimeRoot = path.join(process.cwd(), 'tmp-runtime-root');

    try {
      process.env.CHINESEARIZONA_RUNTIME_DATA_ROOT = runtimeRoot;
      delete process.env.RADAR_STORE_PATH_AUSTIN;
      delete process.env.AUSTIN_RADAR_STORE_PATH;

      expect(getRadarStorePath(siteProfiles.austin)).toBe(
        path.join(runtimeRoot, 'data', 'sites', 'austin', 'radar-runtime', 'store.json')
      );
    } finally {
      if (originalRuntimeRoot) {
        process.env.CHINESEARIZONA_RUNTIME_DATA_ROOT = originalRuntimeRoot;
      } else {
        delete process.env.CHINESEARIZONA_RUNTIME_DATA_ROOT;
      }

      if (originalStorePath) {
        process.env.RADAR_STORE_PATH_AUSTIN = originalStorePath;
      } else {
        delete process.env.RADAR_STORE_PATH_AUSTIN;
      }

      if (originalLegacyStorePath) {
        process.env.AUSTIN_RADAR_STORE_PATH = originalLegacyStorePath;
      } else {
        delete process.env.AUSTIN_RADAR_STORE_PATH;
      }
    }
  });

  it('publishes Austin summary/link-only drafts with canonical source links', () => {
    const result = applyDraftsToStore(
      defaultStoreSnapshot(),
      [
        {
          sourceSlug: 'austin-monitor',
          sourceUrl: 'https://austinmonitor.com/example-austin-civic-item/?utm_source=test',
          canonicalUrl: 'https://austinmonitor.com/example-austin-civic-item/?utm_source=test',
          sourcePublishedAt: '2026-05-30T10:00:00.000Z',
          titleEn: 'Austin civic update affects transit planning',
          titleZh: '奥斯汀市政更新影响交通规划',
          excerptEn: 'Austin leaders are weighing a local transit planning update.',
          excerptZh: '奥斯汀地方负责人正在评估交通规划更新。',
          bodyEn: [
            'Austin residents get a concise summary of the public transit planning update, with the original source link preserved for full context.',
          ],
          bodyZh: [
            '奥斯汀读者可以先读到简短摘要，并通过保留的原始来源链接查看完整背景。',
          ],
          topicFingerprint: 'austin civic transit planning update',
        },
      ],
      {
        manifest: [...austinManifest],
        publishCap: 10,
        now: '2026-05-30T12:00:00.000Z',
      }
    );

    expect(result.summary.publishedCount).toBe(1);
    expect(result.summary.blockedCount).toBe(0);
    expect(result.store.articles).toHaveLength(1);
    expect(result.store.articles[0]?.body).toHaveLength(1);
    expect(result.store.articles[0]?.sourceName).toBe('Austin Monitor');
    expect(result.store.articles[0]?.sourcePolicy).toBe('summary_link');
    expect(result.store.articles[0]?.sourceUrl).toBe(
      'https://austinmonitor.com/example-austin-civic-item'
    );
    expect(result.store.articles[0]?.sourceLinks[0]?.url).toBe(
      'https://austinmonitor.com/example-austin-civic-item'
    );
    expect(JSON.stringify(result.store.articles[0])).not.toContain('Phoenix');
    expect(JSON.stringify(result.store.articles[0])).not.toContain('ChineseArizona');
  });
});
