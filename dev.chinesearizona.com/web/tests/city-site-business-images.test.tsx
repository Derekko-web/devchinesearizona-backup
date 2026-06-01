import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

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
    expect(images.usesContextualFallback).toBe(false);
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
    const sfBayDetail = renderToStaticMarkup(
      await BusinessDetailPageView({
        locale: 'en',
        site: siteProfiles['sf-bay'],
        slug: 'api-legal-outreach-san-francisco',
      })
    );

    expect(austinDirectory).toContain('/city-site-images/house-of-three-gorges-austin.webp');
    expect(austinDirectory).not.toContain('Placeholder');
    expect(laDetail).toContain('/city-site-images/kit-leung-cpa-alhambra.webp');
    expect(laDetail).toContain('Kit Leung CPA');
    expect(laDetail).not.toContain('Temporary image');
    expect(sfBayDetail).toContain('/city-site-images/api-legal-outreach-san-francisco.webp');
    expect(sfBayDetail).not.toContain('Temporary image');
  });
});
