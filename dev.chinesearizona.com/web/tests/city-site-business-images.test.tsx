import { existsSync } from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import austinBusinesses from '@/data/sites/austin/businesses.json';
import losAngelesBusinesses from '@/data/los-angeles-directory-businesses.json';
import sfBayBusinesses from '@/data/generated-sf-bay-directory-businesses.json';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
    fill,
    ...props
  }: {
    alt: string;
    src: string;
    fill?: boolean;
    [key: string]: unknown;
  }) => {
    void fill;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} src={String(src)} {...props} />
    );
  },
}));

vi.mock('@/components/forms/BusinessClaimForm', () => ({
  BusinessClaimForm: () => <form data-testid="business-claim-form" />,
}));

vi.mock('@/components/forms/ReportIssueForm', () => ({
  ReportIssueForm: () => <form data-testid="report-issue-form" />,
}));

function pathWithoutQueryString(value: string): string {
  return value.split('?')[0] ?? value;
}

describe('city-site business images', () => {
  it('keeps Arizona image behavior unchanged when a business has no image', async () => {
    const [{ resolveCitySiteBusinessImages }, { defaultSiteProfile }] = await Promise.all([
      import('@/lib/city-site-business-images'),
      import('@/lib/site-config'),
    ]);

    const images = resolveCitySiteBusinessImages(
      {
        id: 'test',
        slug: 'test-arizona-business',
        name: { en: 'Test Arizona Business', zh: 'Test Arizona Business' },
        categorySlug: 'dining',
        city: 'Phoenix',
        region: 'Phoenix',
        gallery: [],
        shortDescription: { en: 'Test', zh: 'Test' },
        description: { en: 'Test', zh: 'Test' },
        services: [],
        languages: [],
        searchAliases: [],
        verified: false,
        bilingual: false,
        newcomerFriendly: false,
        sponsored: false,
        featured: false,
        rating: 0,
        reviewCount: 0,
        lastUpdated: '2026-05-31',
        hours: [],
      },
      defaultSiteProfile,
      { locale: 'en' }
    );

    expect(images.heroImage).toBeUndefined();
    expect(images.gallery).toEqual([]);
    expect(images.usesContextualFallback).toBe(false);
  });

  it('uses business-specific city images before contextual fallbacks', async () => {
    const [{ resolveCitySiteBusinessImages }, { siteProfiles }, { getDirectoryBusinessBySlug }] = await Promise.all([
      import('@/lib/city-site-business-images'),
      import('@/lib/site-config'),
      import('@/lib/directory'),
    ]);
    const site = siteProfiles.austin;
    const business = await getDirectoryBusinessBySlug('house-of-three-gorges-austin', { site });

    expect(business).toBeDefined();
    const images = resolveCitySiteBusinessImages(business!, site, { locale: 'en', minimumGalleryImages: 4 });

    expect(images.heroImage).toBe('/city-site-images/house-of-three-gorges-austin.webp');
    expect(images.gallery).toHaveLength(4);
    expect(images.gallery.map(pathWithoutQueryString)).toEqual([
      '/city-site-images/house-of-three-gorges-austin.webp',
      '/city-site-images/house-of-three-gorges-austin.webp',
      '/city-site-images/house-of-three-gorges-austin.webp',
      '/city-site-images/house-of-three-gorges-austin.webp',
    ]);
    expect(images.usesContextualFallback).toBe(false);
  });

  it('keeps curated city-site image mappings valid and resolves expanded directories to existing static images', async () => {
    const { getCitySiteBusinessSpecificImage, resolveCitySiteBusinessImages } = await import('@/lib/city-site-business-images');
    const { siteProfiles } = await import('@/lib/site-config');
    const { getDirectoryBusinessBySlug } = await import('@/lib/directory');
    const mappedImages = new Map<string, string[]>();
    const groups = [
      { businesses: austinBusinesses, site: siteProfiles.austin },
      { businesses: losAngelesBusinesses, site: siteProfiles['los-angeles'] },
      { businesses: sfBayBusinesses, site: siteProfiles['sf-bay'] },
    ];

    for (const { businesses, site } of groups) {
      for (const business of businesses) {
        const imagePath = getCitySiteBusinessSpecificImage(business.slug);
        const directoryBusiness = await getDirectoryBusinessBySlug(business.slug, { site, includeNonPublic: true });
        expect(directoryBusiness, `${business.slug} should be in the directory`).toBeDefined();
        const images = resolveCitySiteBusinessImages(directoryBusiness!, site, { locale: 'en', minimumGalleryImages: 4 });

        expect(images.heroImage, `${business.slug} should resolve a city-site image`).toMatch(
          /^\/city-site-images\/[a-z0-9-]+\.webp(?:\?.*)?$/
        );
        expect(images.gallery.length, `${business.slug} should resolve a city-site gallery`).toBeGreaterThanOrEqual(4);

        const heroAssetPath = path.join(process.cwd(), 'public', pathWithoutQueryString(images.heroImage!));
        expect(existsSync(heroAssetPath), `${business.slug} resolved image does not exist: ${images.heroImage}`).toBe(true);

        if (!imagePath) {
          continue;
        }
        expect(imagePath, `${business.slug} should use a city-site asset`).toMatch(/^\/city-site-images\/[a-z0-9-]+\.webp$/);

        const assetPath = path.join(process.cwd(), 'public', imagePath);
        expect(existsSync(assetPath), `${business.slug} mapped image does not exist: ${imagePath}`).toBe(true);

        mappedImages.set(imagePath, [...(mappedImages.get(imagePath) ?? []), business.slug]);
      }
    }

    expect(mappedImages.size).toBeGreaterThan(0);
    const duplicatedImages = [...mappedImages.entries()].filter(([, slugs]) => slugs.length > 1);
    expect(duplicatedImages).toEqual([]);
  });

  it('renders city-site directory and detail pages without generic image placeholders', async () => {
    const [{ DirectoryPageView, BusinessDetailPageView }, { siteProfiles }] = await Promise.all([
      import('@/views/site-pages'),
      import('@/lib/site-config'),
    ]);

    const austinDirectory = renderToStaticMarkup(
      await DirectoryPageView({ locale: 'en', searchParams: {}, site: siteProfiles.austin })
    );
    const laDetail = renderToStaticMarkup(
      await BusinessDetailPageView({
        locale: 'en',
        site: siteProfiles['los-angeles'],
        slug: 'kit-leung-cpa-alhambra',
      })
    );
    const austinDetail = renderToStaticMarkup(
      await BusinessDetailPageView({
        locale: 'en',
        site: siteProfiles.austin,
        slug: 'house-of-three-gorges-austin',
      })
    );
    const sfBayDetail = renderToStaticMarkup(
      await BusinessDetailPageView({
        locale: 'en',
        site: siteProfiles['sf-bay'],
        slug: 'api-legal-outreach-san-francisco',
      })
    );

    expect(austinDirectory).toContain('/city-site-images/house-of-three-gorges-austin.webp');
    expect(austinDirectory).not.toContain('Placeholder');
    expect(austinDetail).toContain('/city-site-images/house-of-three-gorges-austin.webp');
    expect(austinDetail).not.toContain('/city-site-images/austin-community-hero.webp');
    expect(laDetail).toContain('/city-site-images/kit-leung-cpa-alhambra.webp');
    expect(laDetail).not.toContain('/city-site-images/los-angeles-community-hero.webp');
    expect(laDetail).not.toContain('Los Angeles Legal &amp; Finance guide image for Kit Leung CPA');
    expect(laDetail).not.toContain('Temporary image');
    expect(sfBayDetail).toContain('/city-site-images/api-legal-outreach-san-francisco.webp');
    expect(sfBayDetail).not.toContain('/city-site-images/sf-bay-community-hero.webp');
    expect(sfBayDetail).not.toContain('Temporary image');
  });
});
