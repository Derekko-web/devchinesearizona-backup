import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import sitemap from '@/app/sitemap';
import {
  buildTikTokEmbedUrl,
  getDiscoverArticleBySlug,
  getPublishedDiscoverArticles,
  normalizeDiscoverHeroImageUrl,
  parseTikTokPostId,
} from '@/lib/discover-arizona';
import {
  discoverArizonaArticleMetadata,
  discoverArizonaCategoryMetadata,
  discoverArizonaMetadata,
} from '@/lib/page-metadata';

const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

afterEach(() => {
  if (originalServiceRoleKey === undefined) {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  } else {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
  }
});

describe('discover arizona content', () => {
  it('parses TikTok post ids and builds official embed player URLs', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(
      parseTikTokPostId('https://www.tiktok.com/@desertlightstays/video/7492001001001001001')
    ).toBe('7492001001001001001');
    expect(buildTikTokEmbedUrl('7492001001001001001')).toBe(
      'https://www.tiktok.com/player/v1/7492001001001001001?controls=1&description=1'
    );
  });

  it('falls back to seed data for published articles when the service client is unavailable', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const scenicArticles = await getPublishedDiscoverArticles({ category: 'beautiful_arizona' });
    const article = await getDiscoverArticleBySlug('sedona-sunrise-pullouts-and-red-rock-first-stop');

    expect(scenicArticles.length).toBeGreaterThan(0);
    expect(scenicArticles.every((item) => item.primaryCategory === 'beautiful_arizona')).toBe(true);
    expect(article?.queueStatus).toBe('published');
    expect(article?.embedEnabled).toBe(true);
  });

  it('rewrites known blocked Marriott hero image variants to stable discover article images', () => {
    expect(
      normalizeDiscoverHeroImageUrl(
        'sky-rock-sedona',
        'https://cache.marriott.com/is/image/marriotts7prod/tx-flgsx-sky-rock-patio-37842%3AClassic-Hor?fit=constrain&wid=1336'
      )
    ).toBe(
      'https://cache.marriott.com/is/image/marriotts7prod/tx-flgsx-sky-rock-patio-37842-77570%3AFeature-Hor?fit=constrain&wid=1920'
    );

    expect(
      normalizeDiscoverHeroImageUrl(
        'the-phoenician',
        'https://cache.marriott.com/content/dam/marriott-renditions/PHXLC/phxlc-phoenician-exterior-8647-hor-feat.jpg?downsize=1920px%3A%2A&interpolation=progressive-bilinear&output-quality=70'
      )
    ).toBe(
      'https://cache.marriott.com/content/dam/marriott-renditions/PHXLC/phxlc-phoenician-exterior-8647-hor-feat.jpg?downsize=1920px%3A%2A&interpolation=progressive-bilinear&output-quality=70'
    );
  });
});

describe('discover arizona seo surfaces', () => {
  it('builds metadata for the hub, category, and detail routes', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const hubMetadata = discoverArizonaMetadata('en');
    const categoryMetadata = discoverArizonaCategoryMetadata('en', 'restaurants');
    const detailMetadata = await discoverArizonaArticleMetadata(
      'en',
      'beautiful_arizona',
      'sedona-sunrise-pullouts-and-red-rock-first-stop'
    );

    expect(hubMetadata.title).toBe('Discover Arizona | ChineseArizona');
    expect(categoryMetadata?.alternates?.canonical).toBe(
      'https://chinesearizona.com/discover-arizona/restaurants'
    );
    expect(detailMetadata?.alternates?.canonical).toBe(
      'https://chinesearizona.com/discover-arizona/beautiful_arizona/sedona-sunrise-pullouts-and-red-rock-first-stop'
    );
  });

  it('adds discover arizona hub, category, and detail routes to the sitemap', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain('https://chinesearizona.com/discover-arizona');
    expect(urls).not.toContain('https://chinesearizona.com/en/discover-arizona');
    expect(urls).toContain('https://chinesearizona.com/discover-arizona/restaurants');
    expect(urls).toContain('https://chinesearizona.com/zh/discover-arizona');
    expect(urls).toContain(
      'https://chinesearizona.com/discover-arizona/beautiful_arizona/sedona-sunrise-pullouts-and-red-rock-first-stop'
    );
  });

  it('keeps discover arizona out of the top navbar', () => {
    const navbar = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'Navbar.tsx'), 'utf-8');

    expect(navbar).not.toContain('/discover-arizona');
  });
});
