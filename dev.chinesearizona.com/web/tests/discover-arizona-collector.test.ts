import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import collector from '../scripts/discover_arizona_tiktok/collector.cjs';

const {
  SOURCE_SURFACE,
  computeMissingCandidateUpdates,
  extractTikTokTravelCandidatesFromHtml,
  mergeCategoryCandidates,
} = collector as {
  SOURCE_SURFACE: string;
  computeMissingCandidateUpdates: (
    existingRows: Array<Record<string, unknown>>,
    seenPostIds: Set<string>,
    collectedAt: string
  ) => Array<Record<string, unknown>>;
  extractTikTokTravelCandidatesFromHtml: (input: {
    html: string;
    discoveredCategory: string;
    collectedAt: string;
  }) => Array<{
    sourceUrl: string;
    postId: string;
    discoveredCategories: string[];
  }>;
  mergeCategoryCandidates: (
    candidates: Array<{
      sourceUrl: string;
      postId: string;
      discoveredCategories: string[];
    }>
  ) => Array<{
    sourceUrl: string;
    postId: string;
    discoveredCategories: string[];
  }>;
};

const FIXTURE_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'discover-arizona');
const COLLECTED_AT = '2026-04-17T18:00:00.000Z';

function readFixture(name: string) {
  return fs.readFileSync(path.join(FIXTURE_DIR, name), 'utf8');
}

describe('discover arizona collector fixtures', () => {
  it('extracts candidate URLs from the landing fixture', () => {
    const candidates = extractTikTokTravelCandidatesFromHtml({
      html: readFixture('landing.html'),
      discoveredCategory: 'things_to_do',
      collectedAt: COLLECTED_AT,
    });

    expect(candidates.map((candidate) => candidate.postId)).toEqual([
      '7492001001001001001',
      '7492001001001001002',
    ]);
    expect(candidates[1]?.sourceUrl).toBe(
      'https://www.tiktok.com/@foodaz/video/7492001001001001002'
    );
  });

  it('extracts candidates from each category fixture', () => {
    const cases = [
      ['things-to-do.html', 'things_to_do', ['7492001001001001001', '7492001001001001006']],
      ['restaurants.html', 'restaurants', ['7492001001001001002', '7492001001001001007']],
      ['hotels.html', 'hotels', ['7492001001001001003']],
      ['parks.html', 'parks', ['7492001001001001005', '7492001001001001006']],
      ['shopping.html', 'shopping', ['7492001001001001004']],
    ] as const;

    for (const [fixtureName, category, expectedPostIds] of cases) {
      const candidates = extractTikTokTravelCandidatesFromHtml({
        html: readFixture(fixtureName),
        discoveredCategory: category,
        collectedAt: COLLECTED_AT,
      });

      expect(candidates.map((candidate) => candidate.postId)).toEqual(expectedPostIds);
    }
  });

  it('deduplicates posts that appear in multiple categories and merges their tags', () => {
    const thingsToDo = extractTikTokTravelCandidatesFromHtml({
      html: readFixture('things-to-do.html'),
      discoveredCategory: 'things_to_do',
      collectedAt: COLLECTED_AT,
    });
    const parks = extractTikTokTravelCandidatesFromHtml({
      html: readFixture('parks.html'),
      discoveredCategory: 'parks',
      collectedAt: COLLECTED_AT,
    });

    const merged = mergeCategoryCandidates([...thingsToDo, ...parks]);
    const bisbee = merged.find((candidate) => candidate.postId === '7492001001001001006');

    expect(merged).toHaveLength(3);
    expect(bisbee?.discoveredCategories).toEqual(['parks', 'things_to_do']);
  });

  it('marks missing pre-publication candidates stale but keeps published ones live', () => {
    const updates = computeMissingCandidateUpdates(
      [
        {
          id: 'candidate-queued',
          post_id: '111',
          source_surface: SOURCE_SURFACE,
          queue_status: 'review_ready',
          missing_run_count: 2,
          last_seen_at: '2026-04-15T18:00:00.000Z',
        },
        {
          id: 'candidate-published',
          post_id: '222',
          source_surface: SOURCE_SURFACE,
          queue_status: 'published',
          missing_run_count: 2,
          last_seen_at: '2026-04-15T18:00:00.000Z',
        },
        {
          id: 'candidate-other-source',
          post_id: '333',
          source_surface: 'manual_admin',
          queue_status: 'queued',
          missing_run_count: 2,
          last_seen_at: '2026-04-15T18:00:00.000Z',
        },
      ],
      new Set(['444']),
      COLLECTED_AT
    );

    expect(updates).toEqual([
      {
        id: 'candidate-queued',
        last_seen_at: '2026-04-15T18:00:00.000Z',
        missing_run_count: 3,
        queue_status: 'stale',
      },
      {
        id: 'candidate-published',
        last_seen_at: '2026-04-15T18:00:00.000Z',
        missing_run_count: 3,
        queue_status: 'published',
      },
    ]);
  });
});
