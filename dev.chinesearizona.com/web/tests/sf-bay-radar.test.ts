import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import sfBayManifest from '@/data/sf-bay-radar-source-manifest.json';
import { getArticleBySlugAsync, getCurrentArticlesAsync } from '@/lib/content';
import { getRadarSourceManifest, getRadarStorePath } from '@/lib/radar';
import { siteProfiles } from '@/lib/site-config';

const require = createRequire(import.meta.url);
const { applyDraftsToStore, defaultStoreSnapshot } = require('../scripts/arizona_radar/core.cjs') as {
  applyDraftsToStore: (
    store: Record<string, unknown>,
    drafts: Array<Record<string, unknown>>,
    options: {
      manifest: Array<Record<string, unknown>>;
      publishCap: number;
      now: string;
      sourceFallbackName?: string;
      summaryOnly?: boolean;
    }
  ) => {
    store: {
      articles: Array<Record<string, unknown>>;
      candidates: Array<Record<string, unknown>>;
    };
    summary: {
      publishedCount: number;
      blockedCount: number;
    };
  };
  defaultStoreSnapshot: () => Record<string, unknown>;
};
const { parseFeedItems } = require('../scripts/arizona_radar/run.cjs') as {
  parseFeedItems: (
    xml: string,
    source: Record<string, unknown>,
    options: { lookbackHours: number; maxItems: number; now: string }
  ) => Array<Record<string, unknown>>;
};

describe('SF Bay Radar configuration', () => {
  it('uses Bay Area source configuration and excludes Arizona sources', () => {
    const sourceText = JSON.stringify(sfBayManifest).toLowerCase();

    expect(sfBayManifest.length).toBeGreaterThanOrEqual(8);
    expect(sourceText).toContain('san francisco');
    expect(sourceText).toContain('oakland');
    expect(sourceText).toContain('san jose');
    expect(sourceText).not.toMatch(/phoenix|scottsdale|tempe|chandler|mesa|arizona/);
    expect(sfBayManifest.every((source) => source.sourcePolicy !== 'republish_with_permission')).toBe(true);
    expect(sfBayManifest.some((source) => source.feedUrl?.includes('sfstandard.com/feed'))).toBe(true);
    expect(sfBayManifest.some((source) => source.feedUrl?.includes('sanjosespotlight.com/feed'))).toBe(true);
    expect(sfBayManifest.some((source) => source.feedUrl?.includes('oaklandside.org/feed'))).toBe(true);
    expect(getRadarSourceManifest(siteProfiles['sf-bay']).map((source) => source.slug)).toContain('sf-standard');
  });

  it('maps the SF Bay site profile to the SF Bay radar store path', () => {
    expect(getRadarStorePath(siteProfiles['sf-bay'])).toContain('sf-bay-radar-runtime/store.json');
  });

  it('resolves SF Bay runtime stores under the migrated runtime data root', () => {
    const originalRuntimeRoot = process.env.CHINESEARIZONA_RUNTIME_DATA_ROOT;
    const originalCanonicalStorePath = process.env.RADAR_STORE_PATH_SF_BAY;
    const originalStorePath = process.env.SF_BAY_RADAR_STORE_PATH;
    const runtimeRoot = path.join(process.cwd(), 'tmp-runtime-root');

    try {
      process.env.CHINESEARIZONA_RUNTIME_DATA_ROOT = runtimeRoot;
      delete process.env.RADAR_STORE_PATH_SF_BAY;
      delete process.env.SF_BAY_RADAR_STORE_PATH;

      expect(getRadarStorePath(siteProfiles['sf-bay'])).toBe(
        path.join(runtimeRoot, 'data', 'sf-bay-radar-runtime', 'store.json')
      );
    } finally {
      if (originalRuntimeRoot) {
        process.env.CHINESEARIZONA_RUNTIME_DATA_ROOT = originalRuntimeRoot;
      } else {
        delete process.env.CHINESEARIZONA_RUNTIME_DATA_ROOT;
      }

      if (originalStorePath) {
        process.env.SF_BAY_RADAR_STORE_PATH = originalStorePath;
      } else {
        delete process.env.SF_BAY_RADAR_STORE_PATH;
      }

      if (originalCanonicalStorePath) {
        process.env.RADAR_STORE_PATH_SF_BAY = originalCanonicalStorePath;
      } else {
        delete process.env.RADAR_STORE_PATH_SF_BAY;
      }
    }
  });

  it('runs the SF Bay radar wrapper as a real CLI entrypoint', () => {
    const result = spawnSync(
      process.execPath,
      [path.join(process.cwd(), 'scripts', 'sf_bay_radar', 'run.cjs'), '--help'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: { ...process.env, RADAR_STORE_PATH: '' },
      }
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('San Francisco Bay Area Radar worker');
    expect(result.stdout).toContain('node scripts/arizona_radar/run.cjs run');
  });

  it('builds SF Bay prompts without Arizona copy or full-article schemas', () => {
    const result = spawnSync(
      process.execPath,
      [
        '-e',
        `
          const { buildFeedRewritePrompt, buildHermesPrompt } = require('./scripts/arizona_radar/run.cjs');
          const item = {
            sourceSlug: 'sf-standard',
            sourceName: 'The San Francisco Standard',
            sourceUrl: 'https://sfstandard.com/2026/05/29/transit-test',
            canonicalUrl: 'https://sfstandard.com/2026/05/29/transit-test',
            sourcePublishedAt: '2026-05-29T16:00:00.000Z',
            feedCategory: 'Transit',
            titleEn: 'San Francisco transit update',
            feedExcerpt: 'A fixture summary for San Francisco transit readers.',
            articlePayload: {
              title: 'San Francisco transit update',
              description: 'A fixture description for San Francisco transit readers.',
              publishedAt: '2026-05-29T16:00:00.000Z',
              text: 'A source article fixture for San Francisco transit readers with enough local facts to summarize.',
            },
          };
          process.stdout.write(JSON.stringify({
            broadPrompt: buildHermesPrompt([], 3, 24),
            feedPrompt: buildFeedRewritePrompt([item]),
          }));
        `,
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          RADAR_CITY_KEY: 'sf-bay',
          RADAR_BRAND_NAME: 'ChineseSFBay',
          RADAR_REGION_NAME: 'San Francisco Bay Area',
          RADAR_REGION_NAME_ZH: '灣區',
          RADAR_REGION_PLACES:
            'San Francisco, Oakland, Berkeley, San Jose, Santa Clara, Sunnyvale, Cupertino, Fremont, Milpitas, Daly City, the Peninsula, South Bay, East Bay, North Bay, or another San Francisco Bay Area place',
          RADAR_SUMMARY_ONLY: '1',
        },
      }
    );
    expect(result.status).toBe(0);
    const { broadPrompt, feedPrompt } = JSON.parse(result.stdout) as {
      broadPrompt: string;
      feedPrompt: string;
    };

    expect(broadPrompt).toContain('San Francisco Bay Area');
    expect(broadPrompt).toContain('1-2 concise English summary paragraphs');
    expect(feedPrompt).toContain('1-2 short English body paragraphs');
    expect(feedPrompt).toContain('"bodyEn": ["1-2 concise English summary paragraphs"]');
    expect(`${broadPrompt}\n${feedPrompt}`).not.toMatch(
      /Arizona|Phoenix|ChineseArizona|What Now Phoenix|3-5 rewritten English paragraphs/
    );
  });

  it('parses Bay Area RSS seeds without copying article bodies into drafts', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <item>
            <title>San Jose night market adds more downtown vendors</title>
            <link>https://sanjosespotlight.com/san-jose-night-market-test/?utm_source=test</link>
            <pubDate>Fri, 29 May 2026 10:00:00 GMT</pubDate>
            <category>Business</category>
            <description><![CDATA[
              <p>A downtown San Jose event is adding more vendors.</p>
              <p>Synthetic fixture sentence that must not become generated body copy.</p>
            ]]></description>
          </item>
        </channel>
      </rss>`;
    const drafts = parseFeedItems(
      xml,
      {
        slug: 'san-jose-spotlight',
        name: 'San Jose Spotlight',
        url: 'https://sanjosespotlight.com/',
        feedUrl: 'https://sanjosespotlight.com/feed/',
        sourceType: 'local_media',
        sourcePolicy: 'summary_link',
        lane: 'openings',
      },
      {
        lookbackHours: 48,
        maxItems: 5,
        now: '2026-05-30T10:00:00.000Z',
      }
    );

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      sourceSlug: 'san-jose-spotlight',
      sourceName: 'San Jose Spotlight',
      canonicalUrl: 'https://sanjosespotlight.com/san-jose-night-market-test',
      feedCategory: 'Business',
    });
    expect(drafts[0]).not.toHaveProperty('bodyEn');
    expect(String(drafts[0]?.feedExcerpt)).not.toContain('Synthetic fixture sentence');
  });

  it('publishes SF Bay summaries with source links and no Arizona fallback source names', () => {
    const result = applyDraftsToStore(
      defaultStoreSnapshot(),
      [
        {
          sourceSlug: 'sf-standard',
          sourceUrl: 'https://sfstandard.com/2026/05/29/san-francisco-transit-test/',
          canonicalUrl: 'https://sfstandard.com/2026/05/29/san-francisco-transit-test/?utm_source=test',
          sourcePublishedAt: '2026-05-29T16:00:00.000Z',
          titleEn: 'San Francisco transit brief for weekend families',
          titleZh: '舊金山週末家庭交通摘要',
          excerptEn: 'A short source-linked brief for SF Bay readers.',
          excerptZh: '面向灣區讀者的短篇來源連結摘要。',
          bodyEn: [
            'The update is handled as a concise Bay Area summary. Readers get the practical route context here, then use the source link for the full reporting and any late changes.',
          ],
          bodyZh: [
            '這則更新以精簡灣區摘要處理。讀者可先在這裡掌握實用交通脈絡，再透過來源連結查看完整報導與後續變更。',
          ],
          topicFingerprint: 'san francisco transit weekend families',
        },
      ],
      {
        manifest: sfBayManifest,
        publishCap: 10,
        now: '2026-05-30T12:00:00.000Z',
        sourceFallbackName: 'SF Bay Source',
        summaryOnly: true,
      }
    );

    expect(result.summary.publishedCount).toBe(1);
    expect(result.summary.blockedCount).toBe(0);
    expect(result.store.articles[0]).toMatchObject({
      sourceName: 'The San Francisco Standard',
      sourcePolicy: 'summary_link',
      isPublished: true,
    });
    expect(result.store.articles[0]?.sourceLinks).toEqual([
      expect.objectContaining({
        source: 'The San Francisco Standard',
        url: 'https://sfstandard.com/2026/05/29/san-francisco-transit-test',
      }),
    ]);
    expect(JSON.stringify(result.store.articles[0])).not.toMatch(/Arizona|Phoenix|ChineseArizona/);
  });

  it('blocks full-length SF Bay drafts when summary-only enforcement is enabled', () => {
    const result = applyDraftsToStore(
      defaultStoreSnapshot(),
      [
        {
          sourceSlug: 'sf-standard',
          sourceUrl: 'https://sfstandard.com/2026/05/29/san-francisco-full-rewrite-test/',
          canonicalUrl: 'https://sfstandard.com/2026/05/29/san-francisco-full-rewrite-test/',
          sourcePublishedAt: '2026-05-29T16:00:00.000Z',
          titleEn: 'San Francisco transit full rewrite should not publish',
          titleZh: '舊金山交通全文改寫不應發布',
          excerptEn: 'A source-linked SF Bay brief must stay concise.',
          excerptZh: '有來源連結的灣區摘要必須保持精簡。',
          bodyEn: [
            'The first paragraph has useful San Francisco details but should not be enough to allow a full article shape.',
            'The second paragraph continues with source-derived context and keeps expanding beyond a compact summary.',
            'The third paragraph turns the item into a full rewrite, which the SF Bay pipeline must block.',
          ],
          bodyZh: [
            '第一段包含舊金山實用資訊，但不應讓內容成為完整文章形態。',
            '第二段繼續展開來源脈絡，已超出精簡摘要需求。',
            '第三段把項目變成全文改寫，灣區管線必須阻擋。',
          ],
          topicFingerprint: 'san francisco full rewrite enforcement',
        },
      ],
      {
        manifest: sfBayManifest,
        publishCap: 10,
        now: '2026-05-30T12:00:00.000Z',
        sourceFallbackName: 'SF Bay Source',
        summaryOnly: true,
      }
    );

    expect(result.summary.publishedCount).toBe(0);
    expect(result.summary.blockedCount).toBe(1);
    expect(result.store.articles).toHaveLength(0);
    expect(result.store.candidates[0]).toMatchObject({
      moderationState: 'blocked',
      blockReason: 'summary_only_too_many_paragraphs',
    });
  });

  it('does not return Arizona articles when resolving SF Bay content', async () => {
    const sfBayArticles = await getCurrentArticlesAsync(undefined, siteProfiles['sf-bay']);
    const arizonaSlug = 'housing-watch-where-tsmc-families-compare-first';

    expect(sfBayArticles.map((article) => article.slug)).toContain('sf-bay-chinatown-downtown-resource-watch');
    expect(sfBayArticles.map((article) => article.slug)).not.toContain(arizonaSlug);
    expect(await getArticleBySlugAsync(arizonaSlug, siteProfiles['sf-bay'])).toBeUndefined();
    expect(await getArticleBySlugAsync('sf-bay-chinatown-downtown-resource-watch', siteProfiles['sf-bay'])).toBeDefined();
  });
});
