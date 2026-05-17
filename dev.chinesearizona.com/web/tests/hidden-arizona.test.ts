import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  getHiddenArizonaEntries,
  getHiddenArizonaEntryBySlug,
  getHiddenArizonaEntryPath,
  getHiddenArizonaFilterOptions,
  getHiddenArizonaMapPoints,
} from '@/lib/hidden-arizona';
import { hiddenArizonaEntryMetadata, hiddenArizonaMetadata } from '@/lib/page-metadata';
import sitemap from '@/app/sitemap';
import type { HiddenArizonaPlace } from '@/lib/types';

describe('hidden arizona content', () => {
  it('loads the generated entries and filters by kind, city, and tag', () => {
    const allEntries = getHiddenArizonaEntries();
    const placeEntries = getHiddenArizonaEntries({ kind: 'place' });
    const phoenixEntries = getHiddenArizonaEntries({ city: 'Phoenix' });
    const architectureEntries = getHiddenArizonaEntries({ tag: 'Outsider Architecture' });

    expect(allEntries.length).toBeGreaterThanOrEqual(300);
    expect(placeEntries.length).toBeGreaterThanOrEqual(300);
    expect(placeEntries.every((entry) => entry.kind === 'place')).toBe(true);
    expect(phoenixEntries.map((entry) => entry.slug)).toContain('mystery-castle');
    expect(architectureEntries.map((entry) => entry.slug)).toContain('mystery-castle');
  });

  it('builds entry paths and filter options from the generated dataset', () => {
    const entry = getHiddenArizonaEntryBySlug('place', 'the-wave');
    const options = getHiddenArizonaFilterOptions();

    expect(entry).toBeDefined();
    expect(getHiddenArizonaEntryPath(entry!)).toBe('/hidden-arizona/places/the-wave');
    expect(options.cities).toContain('Marble Canyon');
    expect(options.tags.length).toBeGreaterThan(0);
  });

  it('maps points while keeping track of places without coordinates', () => {
    const entries: HiddenArizonaPlace[] = [
      {
        ...getHiddenArizonaEntryBySlug('place', 'the-wave')!,
        kind: 'place',
        nearbyEntrySlugs: ['white-pocket'],
        knowBeforeYouGo: getHiddenArizonaEntryBySlug('place', 'the-wave')!.knowBeforeYouGo ?? [],
      },
      {
        ...getHiddenArizonaEntryBySlug('place', 'mystery-castle')!,
        kind: 'place',
        coordinates: undefined,
        nearbyEntrySlugs: [],
        knowBeforeYouGo: getHiddenArizonaEntryBySlug('place', 'mystery-castle')!.knowBeforeYouGo ?? [],
      },
    ];

    const mapData = getHiddenArizonaMapPoints(entries);

    expect(mapData.points).toHaveLength(1);
    expect(mapData.hiddenCount).toBe(1);
    expect(mapData.points[0]?.slug).toBe('the-wave');
  });
});

describe('hidden arizona seo surfaces', () => {
  it('builds metadata for the hub and detail routes', async () => {
    const hubMetadata = hiddenArizonaMetadata('en');
    const detailMetadata = await hiddenArizonaEntryMetadata('en', 'place', 'the-wave');

    expect(hubMetadata.title).toBe('Hidden Arizona | ChineseArizona');
    expect(detailMetadata?.alternates?.canonical).toBe('https://chinesearizona.com/hidden-arizona/places/the-wave');
  });

  it('adds hub and detail routes to the sitemap', async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain('https://chinesearizona.com/hidden-arizona');
    expect(urls).not.toContain('https://chinesearizona.com/en/hidden-arizona');
    expect(urls).toContain('https://chinesearizona.com/zh/hidden-arizona');
    expect(urls).toContain('https://chinesearizona.com/hidden-arizona/places/the-wave');
  });

  it('keeps hidden arizona out of top-level navbar and footer navigation', () => {
    const navbar = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'Navbar.tsx'), 'utf-8');
    const footer = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'Footer.tsx'), 'utf-8');

    expect(navbar).not.toContain("/hidden-arizona");
    expect(footer).not.toContain("/hidden-arizona");
  });
});
