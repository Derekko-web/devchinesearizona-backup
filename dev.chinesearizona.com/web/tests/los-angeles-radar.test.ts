import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

import losAngelesManifest from '@/data/los-angeles-radar-source-manifest.json';
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

describe('Los Angeles Radar config', () => {
  it('uses Los Angeles-specific source configuration without Arizona or LA Chinese News sources', () => {
    const serialized = JSON.stringify(losAngelesManifest);

    expect(losAngelesManifest.length).toBeGreaterThanOrEqual(8);
    expect(losAngelesManifest.map((source) => source.slug)).toEqual(
      expect.arrayContaining([
        'what-now-los-angeles',
        'eater-los-angeles',
        'urbanize-los-angeles',
        'lax-media-center',
      ])
    );
    expect(serialized).toContain('https://whatnow.com/los-angeles/feed/');
    expect(serialized).toContain('https://la.urbanize.city/rss.xml');
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
    expect(prompt).toContain('"bodyEn": ["1-3 concise English summary paragraphs"]');
    expect(prompt).toContain(
      '"bodyZh": ["1-3 Traditional Chinese summary paragraphs aligned to bodyEn"]'
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

  it('ships only Los Angeles summary/link articles in the LA runtime seed store', () => {
    const serialized = JSON.stringify(losAngelesStore);

    expect(serialized).not.toMatch(/arizona|phoenix|skyharbor|chinesearizona|lachinesenews/i);
    for (const article of losAngelesStore.articles) {
      expect(article.isPublished).toBe(true);
      expect(article.aiGeneratedSummary).toBe(true);
      expect(article.sourcePolicy).toBe('summary_link');
      expect(article.sourceLinks.length).toBeGreaterThan(0);
      expect(article.body.length).toBeLessThanOrEqual(2);
    }
  });
});
