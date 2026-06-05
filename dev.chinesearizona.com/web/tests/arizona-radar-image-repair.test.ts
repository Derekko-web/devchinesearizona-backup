import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

const {
  AUSTIN_IMAGE_REPAIRS,
  LOCAL_ARTICLE_IMAGE_REPAIRS,
  LOS_ANGELES_IMAGE_REPAIRS,
  repairCurrentArticleImages,
} = require('../scripts/arizona_radar/repair_current_article_images.cjs') as {
  AUSTIN_IMAGE_REPAIRS: Record<string, string>;
  LOCAL_ARTICLE_IMAGE_REPAIRS: Record<string, string>;
  LOS_ANGELES_IMAGE_REPAIRS: Record<string, string>;
  repairCurrentArticleImages: (options: {
    now?: string;
    targets: Array<{
      kind: 'article-array' | 'radar-store';
      label: string;
      filePath: string;
      repairs: Record<string, string>;
    }>;
    validateImages?: boolean;
  }) => Promise<
    Array<{
      repaired: string[];
      missing: string[];
      invalid: string[];
      unchanged: string[];
    }>
  >;
};

function tempJsonPath(name: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-image-repair-'));
  return path.join(directory, name);
}

describe('current radar article image repair', () => {
  it('updates city radar store records by slug', async () => {
    const filePath = tempJsonPath('store.json');
    fs.writeFileSync(
      filePath,
      `${JSON.stringify(
        {
          version: 1,
          articles: [
            {
              slug: 'federal-prosecutor-cites-california-election-fraud-probes',
              heroImage: '/city-site-images/los-angeles-community-hero.webp',
              heroImagePolicy: 'fallback_only',
              updatedAt: '2026-06-05T18:00:00.000Z',
              lastCheckedAt: '2026-06-05T18:00:00.000Z',
            },
            {
              slug: 'unrelated-article',
              heroImage: 'https://example.com/original.jpg',
              heroImagePolicy: 'source_allowed',
            },
          ],
        },
        null,
        2
      )}\n`,
      'utf8'
    );

    const [summary] = await repairCurrentArticleImages({
      now: '2026-06-05T20:00:00.000Z',
      validateImages: false,
      targets: [
        {
          kind: 'radar-store',
          label: 'los-angeles-radar',
          filePath,
          repairs: LOS_ANGELES_IMAGE_REPAIRS,
        },
      ],
    });

    const store = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    expect(summary.repaired).toContain('federal-prosecutor-cites-california-election-fraud-probes');
    expect(store.articles[0].heroImage).toBe(
      LOS_ANGELES_IMAGE_REPAIRS['federal-prosecutor-cites-california-election-fraud-probes']
    );
    expect(store.articles[0].heroImagePolicy).toBe('source_allowed');
    expect(store.articles[0].updatedAt).toBe('2026-06-05T20:00:00.000Z');
    expect(store.articles[0].lastCheckedAt).toBe('2026-06-05T20:00:00.000Z');
    expect(store.articles[1].heroImage).toBe('https://example.com/original.jpg');
  });

  it('updates generated local article array records by slug', async () => {
    const filePath = tempJsonPath('generated-local-articles.json');
    fs.writeFileSync(
      filePath,
      `${JSON.stringify(
        [
          {
            slug: 'picacho-peak-travel-stop-closes-after-40-years',
            heroImage: '/home-neighborhood/tempe-card.webp',
            heroImagePolicy: 'fallback_only',
            updatedAt: '2026-06-05T18:00:00.000Z',
            lastCheckedAt: '2026-06-05T18:00:00.000Z',
          },
        ],
        null,
        2
      )}\n`,
      'utf8'
    );

    const [summary] = await repairCurrentArticleImages({
      now: '2026-06-05T20:00:00.000Z',
      validateImages: false,
      targets: [
        {
          kind: 'article-array',
          label: 'generated-local-articles',
          filePath,
          repairs: LOCAL_ARTICLE_IMAGE_REPAIRS,
        },
      ],
    });

    const articles = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    expect(summary.repaired).toEqual(['picacho-peak-travel-stop-closes-after-40-years']);
    expect(articles[0].heroImage).toBe(
      LOCAL_ARTICLE_IMAGE_REPAIRS['picacho-peak-travel-stop-closes-after-40-years']
    );
    expect(articles[0].heroImagePolicy).toBe('source_allowed');
  });

  it('keeps unchanged records unchanged', async () => {
    const filePath = tempJsonPath('store.json');
    fs.writeFileSync(
      filePath,
      `${JSON.stringify(
        {
          version: 1,
          articles: [
            {
              slug: 'south-texas-screwworm-case-puts-pet-owners-on-alert',
              heroImage: AUSTIN_IMAGE_REPAIRS['south-texas-screwworm-case-puts-pet-owners-on-alert'],
              heroImagePolicy: 'source_allowed',
            },
          ],
        },
        null,
        2
      )}\n`,
      'utf8'
    );

    const [summary] = await repairCurrentArticleImages({
      validateImages: false,
      targets: [
        {
          kind: 'radar-store',
          label: 'austin-radar',
          filePath,
          repairs: AUSTIN_IMAGE_REPAIRS,
        },
      ],
    });

    expect(summary.unchanged).toEqual(['south-texas-screwworm-case-puts-pet-owners-on-alert']);
    expect(summary.repaired).toEqual([]);
  });
});
