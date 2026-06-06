import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import losAngelesManifest from '@/data/los-angeles-radar-source-manifest.json';
import { getArticleBySlugAsync, getCurrentArticlesAsync } from '@/lib/content';
import { siteProfiles } from '@/lib/site-config';
import losAngelesStore from '../data/sites/los-angeles/radar-runtime/store.json';

const require = createRequire(import.meta.url);
const {
  buildFeedRewritePrompt,
  buildHermesPrompt,
  getSiteConfig,
  parseArgs,
  parseFeedItems,
} = require('../scripts/arizona_radar/run.cjs') as {
  buildFeedRewritePrompt: (
    items: Array<Record<string, unknown>>,
    siteConfig: {
      key: string;
      defaultSourceName: string;
      manifestPath: string;
      storePath: string;
      summaryOnly: boolean;
      useSupabase: boolean;
    }
  ) => string;
  buildHermesPrompt: (
    manifest: Array<Record<string, unknown>>,
    maxItems: number,
    lookbackHours: number,
    options: Record<string, unknown>,
    siteConfig: {
      key: string;
      defaultSourceName: string;
      manifestPath: string;
      storePath: string;
      summaryOnly: boolean;
      useSupabase: boolean;
    }
  ) => string;
  getSiteConfig: (site: string) => {
    key: string;
    defaultSourceName: string;
    manifestPath: string;
    storePath: string;
    summaryOnly: boolean;
    useSupabase: boolean;
  };
  parseArgs: (argv: string[]) => {
    site: string;
    storePath: string;
  };
  parseFeedItems: (
    xml: string,
    source: Record<string, unknown>,
    options: { lookbackHours: number; maxItems: number; now: string }
  ) => Array<Record<string, unknown>>;
};

const originalLosAngelesStorePath = process.env.RADAR_STORE_PATH_LOS_ANGELES;

afterEach(() => {
  if (originalLosAngelesStorePath) {
    process.env.RADAR_STORE_PATH_LOS_ANGELES = originalLosAngelesStorePath;
  } else {
    delete process.env.RADAR_STORE_PATH_LOS_ANGELES;
  }
});

function writeLosAngelesRadarStore(store: unknown) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'los-angeles-radar-store-'));
  const storePath = path.join(directory, 'store.json');
  fs.writeFileSync(storePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  process.env.RADAR_STORE_PATH_LOS_ANGELES = storePath;
  return storePath;
}

describe('Los Angeles Radar config', () => {
  it('uses Los Angeles-specific source configuration including Chinese-language local sources', () => {
    const serialized = JSON.stringify(losAngelesManifest);

    expect(losAngelesManifest.length).toBeGreaterThanOrEqual(8);
    expect(losAngelesManifest.map((source) => source.slug)).toEqual(
      expect.arrayContaining([
        'what-now-los-angeles',
        'eater-los-angeles',
        'urbanize-los-angeles',
        'world-journal-la',
        'chineseinla-hot-news',
        'lax-media-center',
      ])
    );
    expect(serialized).toContain('https://whatnow.com/los-angeles/feed/');
    expect(serialized).toContain('https://la.urbanize.city/rss.xml');
    expect(
      losAngelesManifest.find((source) => source.slug === 'world-journal-la')
    ).toMatchObject({
      lane: 'chinese',
      feedUrl: 'https://www.worldjournal.com/wj/rssfeed/121094',
    });
    expect(
      losAngelesManifest.find((source) => source.slug === 'chineseinla-hot-news')
    ).toMatchObject({
      lane: 'chinese',
      url: 'https://www.chineseinla.com/hotnews.html',
    });
    expect(serialized).not.toMatch(/arizona|phoenix|skyharbor|lachinesenews/i);
    expect(
      losAngelesManifest.find((source) => source.slug === 'tiktok-sgv-food')
    ).toMatchObject({
      sourceType: 'social_signal',
      sourcePolicy: 'signal_only',
    });
  });

  it('configures the worker for LA-only manifests, file storage, and summary generation', () => {
    const args = parseArgs(['node', 'scripts/arizona_radar/run.cjs', 'run', '--site=los-angeles']);
    const siteConfig = getSiteConfig(args.site);

    expect(args.site).toBe('los-angeles');
    expect(siteConfig.summaryOnly).toBe(true);
    expect(siteConfig.useSupabase).toBe(false);
    expect(siteConfig.defaultSourceName).toBe('Los Angeles Source');
    expect(siteConfig.manifestPath).toContain('los-angeles-radar-source-manifest.json');
    expect(args.storePath).toContain('data/sites/los-angeles/radar-runtime/store.json');
  });

  it('does not let a global Arizona store override the Los Angeles runtime store', () => {
    const originalRadarStorePath = process.env.RADAR_STORE_PATH;
    const originalLosAngelesStorePath = process.env.RADAR_STORE_PATH_LOS_ANGELES;
    const originalLegacyLosAngelesStorePath = process.env.LOS_ANGELES_RADAR_STORE_PATH;

    try {
      process.env.RADAR_STORE_PATH = '/tmp/shared-arizona-store.json';
      delete process.env.RADAR_STORE_PATH_LOS_ANGELES;
      delete process.env.LOS_ANGELES_RADAR_STORE_PATH;

      expect(
        parseArgs(['node', 'scripts/arizona_radar/run.cjs', 'run', '--site=los-angeles']).storePath
      ).toContain('data/sites/los-angeles/radar-runtime/store.json');

      process.env.RADAR_STORE_PATH_LOS_ANGELES = '/tmp/los-angeles-store.json';

      expect(
        parseArgs(['node', 'scripts/arizona_radar/run.cjs', 'run', '--site=los-angeles']).storePath
      ).toBe('/tmp/los-angeles-store.json');
    } finally {
      if (originalRadarStorePath) {
        process.env.RADAR_STORE_PATH = originalRadarStorePath;
      } else {
        delete process.env.RADAR_STORE_PATH;
      }

      if (originalLosAngelesStorePath) {
        process.env.RADAR_STORE_PATH_LOS_ANGELES = originalLosAngelesStorePath;
      } else {
        delete process.env.RADAR_STORE_PATH_LOS_ANGELES;
      }

      if (originalLegacyLosAngelesStorePath) {
        process.env.LOS_ANGELES_RADAR_STORE_PATH = originalLegacyLosAngelesStorePath;
      } else {
        delete process.env.LOS_ANGELES_RADAR_STORE_PATH;
      }
    }
  });

  it('keeps Los Angeles open-web fallback discovery Los Angeles-specific and summary-only', () => {
    const prompt = buildHermesPrompt([], 3, 24, { retry: true }, getSiteConfig('los-angeles'));

    expect(prompt).toContain('Los Angeles Radar');
    expect(prompt).toContain('Southern California');
    expect(prompt).toContain('San Gabriel Valley');
    expect(prompt).toContain('source-linked summary');
    expect(prompt).toContain('Los Angeles/Southern California search');
    expect(prompt).not.toMatch(/arizona|phoenix|chinesearizona/i);
    expect(prompt).not.toMatch(/rewrite|rewritten|full\b|comprehensive/i);
    expect(prompt).not.toContain('Arizona news, blogs');
    expect(prompt).not.toContain('Arizona-relevant');
  });

  it('keeps Los Angeles feed rewrite schema aligned with summary-only body rules', () => {
    const prompt = buildFeedRewritePrompt(
      [
        {
          sourceSlug: 'eater-los-angeles',
          sourceName: 'Eater LA',
          sourceUrl: 'https://la.eater.com/2026/5/29/sgv-arcadia-opening',
          canonicalUrl: 'https://la.eater.com/2026/5/29/sgv-arcadia-opening',
          sourcePublishedAt: '2026-05-29T10:00:00.000Z',
          feedCategory: 'Restaurants',
          titleEn: 'New SGV restaurant opens in Arcadia',
          feedExcerpt: 'A short local food summary for Los Angeles readers.',
          articlePayload: {
            title: 'New SGV restaurant opens in Arcadia',
            description: 'A local restaurant opening in Arcadia.',
            publishedAt: '2026-05-29T10:00:00.000Z',
            text: 'A restaurant opened in Arcadia with details relevant to Los Angeles readers.',
          },
        },
      ],
      getSiteConfig('los-angeles')
    );

    expect(prompt).toContain('Summarize these Los Angeles Radar RSS items');
    expect(prompt).toContain('"bodyEn": ["1-2 concise English summary paragraphs"]');
    expect(prompt).toContain(
      '"bodyZh": ["1-2 Traditional Chinese summary paragraphs aligned to bodyEn"]'
    );
    expect(prompt).toContain('source-linked local brief');
    expect(prompt).not.toMatch(/arizona|phoenix|chinesearizona/i);
    expect(prompt).not.toMatch(/rewrite|rewritten|full\b|comprehensive/i);
    expect(prompt).not.toContain('"bodyEn": ["3-5 rewritten English paragraphs"]');
  });

  it('normalizes Atom feeds from LA sources into source-linked draft seeds', () => {
    const source = losAngelesManifest.find((entry) => entry.slug === 'eater-los-angeles');
    const drafts = parseFeedItems(
      `<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <title>New SGV restaurant opens in Arcadia</title>
          <link rel="alternate" href="https://la.eater.com/2026/5/29/sgv-arcadia-opening" />
          <updated>2026-05-29T10:00:00Z</updated>
          <summary>A short local food summary for Los Angeles readers.</summary>
          <category term="Restaurants" />
        </entry>
      </feed>`,
      source as Record<string, unknown>,
      {
        lookbackHours: 48,
        maxItems: 3,
        now: '2026-05-30T10:00:00.000Z',
      }
    );

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      sourceSlug: 'eater-los-angeles',
      sourceName: 'Eater LA',
      canonicalUrl: 'https://la.eater.com/2026/5/29/sgv-arcadia-opening',
      feedCategory: 'Restaurants',
    });
  });

  it('ships no placeholder articles in the LA runtime seed store', () => {
    const serialized = JSON.stringify(losAngelesStore);

    expect(serialized).not.toMatch(/arizona|phoenix|skyharbor|chinesearizona|lachinesenews/i);
    expect(losAngelesStore.articles).toHaveLength(0);
    expect(losAngelesStore.candidates).toHaveLength(0);
    expect(serialized).not.toContain('los-angeles-opening-radar-local-source-watch');
    expect(serialized).not.toContain('sgv-housing-transit-watch-source-linked-summaries');
  });

  it('filters removed placeholder slugs from external LA runtime stores', async () => {
    writeLosAngelesRadarStore({
      version: 1,
      jobControl: {
        paused: false,
        publishCap: 10,
        updatedAt: '2026-05-29T16:00:00.000Z',
      },
      sourceControls: [],
      runs: [],
      candidates: [
        {
          id: 'la-candidate-opening-radar-launch',
          slug: 'los-angeles-opening-radar-local-source-watch',
          sourceSlug: 'what-now-los-angeles',
          sourceName: 'What Now Los Angeles',
          sourceUrl: 'https://whatnow.com/los-angeles/',
          canonicalUrl: 'https://whatnow.com/los-angeles/',
          sourceType: 'local_media',
          sourcePolicy: 'summary_link',
          lane: 'openings',
          title: {
            en: 'Los Angeles opening radar starts with source-linked restaurant and retail summaries',
            zh: '洛杉磯新店雷達先從附來源連結的餐飲與零售摘要開始',
          },
          excerpt: {
            en: 'Placeholder copy must not render.',
            zh: 'Placeholder copy must not render.',
          },
          topicFingerprint: 'los-angeles opening radar source linked summaries',
          moderationState: 'published',
          firstSeenAt: '2026-05-29T16:00:00.000Z',
          lastSeenAt: '2026-05-29T16:00:30.000Z',
          sourcePublishedAt: '2026-05-29T16:00:00.000Z',
        },
      ],
      articles: [
        {
          id: 'la-article-opening-radar-launch',
          candidateId: 'la-candidate-opening-radar-launch',
          slug: 'los-angeles-opening-radar-local-source-watch',
          lane: 'openings',
          title: {
            en: 'Los Angeles opening radar starts with source-linked restaurant and retail summaries',
            zh: '洛杉磯新店雷達先從附來源連結的餐飲與零售摘要開始',
          },
          excerpt: {
            en: 'Placeholder copy must not render.',
            zh: 'Placeholder copy must not render.',
          },
          body: [
            {
              en: 'Placeholder copy must not render.',
              zh: 'Placeholder copy must not render.',
            },
          ],
          heroImage: '',
          heroImagePolicy: 'fallback_only',
          category: 'news',
          freshnessTier: 'weekly',
          sourcePolicy: 'summary_link',
          sourceType: 'local_media',
          sourceName: 'What Now Los Angeles',
          sourceUrl: 'https://whatnow.com/los-angeles/',
          sourceLinks: [],
          relatedCategorySlugs: [],
          ctaBusinessSlugs: [],
          personaTargets: ['local_families'],
          publishedAt: '2026-05-29T16:00:30.000Z',
          updatedAt: '2026-05-29T16:00:30.000Z',
          lastCheckedAt: '2026-05-29T16:00:30.000Z',
          isPublished: true,
          aiGeneratedSummary: true,
        },
      ],
    });

    const articles = await getCurrentArticlesAsync(undefined, siteProfiles['los-angeles']);

    expect(articles.map((article) => article.slug)).not.toContain(
      'los-angeles-opening-radar-local-source-watch'
    );
    await expect(
      getArticleBySlugAsync(
        'los-angeles-opening-radar-local-source-watch',
        siteProfiles['los-angeles']
      )
    ).resolves.toBeUndefined();
  });
});
