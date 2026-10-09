import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildSitemap } from '@/app/sitemap';
import { buildRobots } from '@/app/robots';
import {
  addBusinessMetadata,
  businessMetadata,
  cityCategoryMetadata,
  directoryMetadata,
  homeMetadata,
  publisherPageMetadata,
} from '@/lib/page-metadata';
import { resolveSiteProfileFromHost, siteProfiles } from '@/lib/site-config';
import { createModerationReport } from '@/lib/runtime-store';

const originalConvexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

afterEach(() => {
  vi.unstubAllEnvs();
  if (originalConvexUrl === undefined) {
    delete process.env.NEXT_PUBLIC_CONVEX_URL;
  } else {
    process.env.NEXT_PUBLIC_CONVEX_URL = originalConvexUrl;
  }

  delete process.env.NEXT_PUBLIC_SITE_URL;
  vi.stubEnv('NODE_ENV', 'test');
  vi.resetModules();
});

describe('indexing signals', () => {
  it('brands the homepage as the site root instead of reusing directory metadata', () => {
    const metadata = homeMetadata('en');

    expect(metadata.title).toBe(
      'ChineseArizona | Arizona Chinese Community Directory, News, and Resources'
    );
    expect(metadata.alternates?.canonical).toBe('https://chinesearizona.com');
    expect(metadata.robots).toBeUndefined();
  });

  it('keeps Austin homepage metadata live and Austin-specific', () => {
    const metadata = homeMetadata('en', siteProfiles.austin);

    expect(metadata.title).toBe(
      'ChineseAustin | Austin Chinese Community Directory, News, and Resources'
    );
    expect(metadata.alternates?.canonical).toBe('https://chineseaustin.com');
    expect(metadata.description).toContain('Austin Chinese community');
    expect(metadata.description).not.toContain('Arizona');
    expect(metadata.robots).toBeUndefined();
  });

  it('noindexes unconfigured city homepage metadata', () => {
    const site = resolveSiteProfileFromHost('missing-city.example');
    const metadata = homeMetadata('en', site);

    expect(metadata.alternates?.canonical).toBe('https://missing-city.example');
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('self-canonicalizes zh pages and exposes x-default alternates', () => {
    const metadata = directoryMetadata('zh', '/business', { page: '2' });

    expect(metadata.alternates?.canonical).toBe('https://chinesearizona.com/zh/business?page=2');
    expect(metadata.alternates?.languages?.en).toBe('https://chinesearizona.com/business?page=2');
    expect(metadata.alternates?.languages?.['x-default']).toBe('https://chinesearizona.com/business?page=2');
  });

  it('indexes Austin directory metadata with Austin-specific copy', () => {
    const metadata = directoryMetadata('en', '/business', undefined, siteProfiles.austin);

    expect(metadata.title).toBe('Chinese Businesses | ChineseAustin');
    expect(metadata.description).toContain('Chinese businesses in Austin');
    expect(metadata.description).not.toContain('Arizona');
    expect(metadata.alternates?.canonical).toBe('https://chineseaustin.com/business');
    expect(metadata.robots).toBeUndefined();
  });

  it('noindexes non-live city directory metadata instead of falling back to Arizona listings', () => {
    const site = resolveSiteProfileFromHost('missing-city.example');
    const metadata = directoryMetadata('en', '/business', undefined, site);

    expect(metadata.title).toBe('Unconfigured City Site Business Directory Requires Local Data');
    expect(metadata.description).toContain('will not fall back to ChineseArizona listings');
    expect(metadata.alternates?.canonical).toBe('https://missing-city.example/business');
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('keeps city and category filter pages out of the sitemap', async () => {
    const entries = await buildSitemap();
    const urls = entries.map((entry) => entry.url);
    const metadata = cityCategoryMetadata('en', 'phoenix', 'real-estate');

    expect(urls).not.toContain('https://chinesearizona.com/business/phoenix/real-estate');
    expect(metadata?.robots).toEqual({ index: false, follow: false });
  });

  it('adds publisher trust pages to the sitemap', async () => {
    const entries = await buildSitemap();
    const urls = entries.map((entry) => entry.url);
    const metadata = publisherPageMetadata('en', 'privacy');

    expect(urls).toContain('https://chinesearizona.com/about');
    expect(urls).toContain('https://chinesearizona.com/privacy');
    expect(urls).toContain('https://chinesearizona.com/editorial-policy');
    expect(metadata.title).toBe('Privacy Policy | ChineseArizona');
  });

  it('noindexes thin generated directory profiles and omits them from the sitemap', async () => {
    const entries = await buildSitemap();
    const urls = entries.map((entry) => entry.url);
    const metadata = await businessMetadata('en', 'roll-avenue-ice-cream-rolls-mesa');

    expect(metadata?.robots).toEqual({ index: false, follow: false });
    expect(urls).not.toContain('https://chinesearizona.com/business/roll-avenue-ice-cream-rolls-mesa');
    expect(urls).toContain('https://chinesearizona.com/business/happy-bao-s-mesa');
  });

  it('keeps noindex community posts out of the sitemap', async () => {
    createModerationReport('used-minivan-east-valley', 'spam');

    const entries = await buildSitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).not.toContain(
      'https://chinesearizona.com/community/classifieds/used-minivan-east-valley'
    );
  });

  it('marks mission control routes as noindex', async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://example.convex.cloud';

    const { metadata } = await import('@/app/mission-control/layout');

    expect(metadata.robots).toEqual({
      index: false,
      follow: false,
    });
  });

  it('falls back to the production domain when a production build is misconfigured with localhost', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';

    const { siteUrl } = await import('@/lib/seo');

    expect(siteUrl).toBe('https://chinesearizona.com');
  });

  it('builds Austin sitemap and robots URLs without default Arizona directory routes', async () => {
    const entries = await buildSitemap(siteProfiles.austin);
    const urls = entries.map((entry) => entry.url);
    const robots = buildRobots(siteProfiles.austin);

    expect(robots.sitemap).toBe('https://chineseaustin.com/sitemap.xml');
    expect(urls).toContain('https://chineseaustin.com/business/house-of-three-gorges-austin');
    expect(urls).toContain('https://chineseaustin.com/business/h-mart-austin');
    expect(urls).not.toContain('https://chineseaustin.com/business/bido-cafe');
    expect(JSON.stringify(entries)).not.toContain('chinesearizona.com/business');
  });

  it('builds SF Bay sitemap and robots URLs from SF Bay directory listings only', async () => {
    const entries = await buildSitemap(siteProfiles['sf-bay']);
    const urls = entries.map((entry) => entry.url);
    const robots = buildRobots(siteProfiles['sf-bay']);

    expect(robots.sitemap).toBe('https://chinesesfbay.com/sitemap.xml');
    expect(urls).toContain('https://chinesesfbay.com/business/r-g-lounge-san-francisco');
    expect(urls).toContain('https://chinesesfbay.com/business/asian-health-services-oakland');
    expect(urls).not.toContain('https://chinesesfbay.com/business/bido-cafe');
    expect(JSON.stringify(entries)).not.toContain('chinesearizona.com/business');
  });

  it('uses Austin-specific add-business and business detail metadata', async () => {
    const addMetadata = addBusinessMetadata('en', siteProfiles.austin);
    const business = await businessMetadata('en', 'house-of-three-gorges-austin', siteProfiles.austin);

    expect(addMetadata.title).toBe('Add or Claim a Business | ChineseAustin');
    expect(addMetadata.description).toContain('Austin business claim');
    expect(addMetadata.alternates?.canonical).toBe('https://chineseaustin.com/add-business');
    expect(JSON.stringify(addMetadata)).not.toContain('ChineseArizona');

    expect(business?.title).toBe('House of Three Gorges | ChineseAustin');
    expect(business?.alternates?.canonical).toBe(
      'https://chineseaustin.com/business/house-of-three-gorges-austin'
    );
    expect(JSON.stringify(business)).not.toContain('Arizona');
  });

  it('uses SF Bay-specific directory, add-business, and business detail metadata', async () => {
    const site = siteProfiles['sf-bay'];
    const directory = directoryMetadata('en', '/business', undefined, site);
    const addMetadata = addBusinessMetadata('en', site);
    const business = await businessMetadata('en', 'r-g-lounge-san-francisco', site);

    expect(directory.title).toBe('Chinese Businesses | ChineseSFBay');
    expect(directory.description).toContain('Chinese businesses in SF Bay');
    expect(directory.alternates?.canonical).toBe('https://chinesesfbay.com/business');
    expect(directory.robots).toBeUndefined();

    expect(addMetadata.title).toBe('Add or Claim a Business | ChineseSFBay');
    expect(addMetadata.description).toContain('SF Bay business claim');
    expect(addMetadata.alternates?.canonical).toBe('https://chinesesfbay.com/add-business');
    expect(JSON.stringify(addMetadata)).not.toContain('ChineseArizona');

    expect(business?.title).toBe('R&G Lounge | ChineseSFBay');
    expect(business?.alternates?.canonical).toBe(
      'https://chinesesfbay.com/business/r-g-lounge-san-francisco'
    );
    expect(JSON.stringify(business)).not.toContain('Arizona');
  });
});
