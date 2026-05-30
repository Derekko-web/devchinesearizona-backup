import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

import losAngelesManifest from '@/data/los-angeles-radar-source-manifest.json';
import losAngelesStore from '../data/sites/los-angeles/radar-runtime/store.json';

const require = createRequire(import.meta.url);
const {
  getSiteConfig,
  parseArgs,
  parseFeedItems,
} = require('../scripts/arizona_radar/run.cjs') as {
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
