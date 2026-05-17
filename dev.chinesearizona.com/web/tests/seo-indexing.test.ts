import { afterEach, describe, expect, it, vi } from 'vitest';

import sitemap from '@/app/sitemap';
import { directoryMetadata, homeMetadata } from '@/lib/page-metadata';
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
  });

  it('self-canonicalizes zh pages and exposes x-default alternates', () => {
    const metadata = directoryMetadata('zh', '/business', { page: '2' });

    expect(metadata.alternates?.canonical).toBe('https://chinesearizona.com/zh/business?page=2');
    expect(metadata.alternates?.languages?.en).toBe('https://chinesearizona.com/business?page=2');
    expect(metadata.alternates?.languages?.['x-default']).toBe('https://chinesearizona.com/business?page=2');
  });

  it('adds city and category landing pages to the sitemap with locale alternates', async () => {
    const entries = await sitemap();
    const entry = entries.find(
      (item) => item.url === 'https://chinesearizona.com/business/phoenix/real-estate'
    );

    expect(entry).toBeDefined();
    expect(entry?.alternates?.languages?.zh).toBe(
      'https://chinesearizona.com/zh/business/phoenix/real-estate'
    );
    expect(entry?.alternates?.languages?.['x-default']).toBe(
      'https://chinesearizona.com/business/phoenix/real-estate'
    );
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
