import { afterEach, describe, expect, it, vi } from 'vitest';

import sitemap from '@/app/sitemap';
import {
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
  if (originalConvexUrl === undefined) {
    delete process.env.NEXT_PUBLIC_CONVEX_URL;
  } else {
    process.env.NEXT_PUBLIC_CONVEX_URL = originalConvexUrl;
  }

  delete process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NODE_ENV = 'test';
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
    const metadata = directoryMetadata('en', '/business', undefined, siteProfiles['los-angeles']);

    expect(metadata.title).toBe('ChineseLosAngeles Business Directory Requires Local Data');
    expect(metadata.description).toContain('will not fall back to ChineseArizona listings');
    expect(metadata.alternates?.canonical).toBe('https://chineselosangeles.com/business');
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('keeps city and category filter pages out of the sitemap', async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    const metadata = cityCategoryMetadata('en', 'phoenix', 'real-estate');

    expect(urls).not.toContain('https://chinesearizona.com/business/phoenix/real-estate');
    expect(metadata?.robots).toEqual({ index: false, follow: false });
  });

  it('adds publisher trust pages to the sitemap', async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    const metadata = publisherPageMetadata('en', 'privacy');

    expect(urls).toContain('https://chinesearizona.com/about');
    expect(urls).toContain('https://chinesearizona.com/privacy');
    expect(urls).toContain('https://chinesearizona.com/editorial-policy');
    expect(metadata.title).toBe('Privacy Policy | ChineseArizona');
  });

  it('noindexes thin generated directory profiles and omits them from the sitemap', async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    const metadata = await businessMetadata('en', 'roll-avenue-ice-cream-rolls-mesa');

    expect(metadata?.robots).toEqual({ index: false, follow: false });
    expect(urls).not.toContain('https://chinesearizona.com/business/roll-avenue-ice-cream-rolls-mesa');
    expect(urls).toContain('https://chinesearizona.com/business/happy-bao-s-mesa');
  });

  it('keeps noindex community posts out of the sitemap', async () => {
    createModerationReport('used-minivan-east-valley', 'spam');

    const entries = await sitemap();
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
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';

    const { siteUrl } = await import('@/lib/seo');

    expect(siteUrl).toBe('https://chinesearizona.com');
  });
});
