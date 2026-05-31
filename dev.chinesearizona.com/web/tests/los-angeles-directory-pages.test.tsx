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

describe('Los Angeles directory pages', () => {
  it('renders connected LA directory listings instead of the disconnected-data placeholder', async () => {
    const [{ DirectoryPageView }, { siteProfiles }] = await Promise.all([
      import('@/views/site-pages'),
      import('@/lib/site-config'),
    ]);

    const html = renderToStaticMarkup(
      await DirectoryPageView({
        locale: 'en',
        searchParams: {},
        site: siteProfiles['los-angeles'],
      })
    );

    expect(html).toContain('Lunasia Dim Sum House');
    expect(html).toContain('Chinatown Service Center');
    expect(html).toContain('Los Angeles, CA');
    expect(html).toContain('/en/add-business');
    expect(html).not.toContain('directory data is not connected yet');
    expect(html).not.toContain('Bido Cafe');
    expect(html).not.toContain('Phoenix, AZ');
    expect(html).not.toContain('ChineseArizona listings');
  });

  it('renders LA business detail structured data and claim links with LA values', async () => {
    const [{ BusinessDetailPageView }, { siteProfiles }] = await Promise.all([
      import('@/views/site-pages'),
      import('@/lib/site-config'),
    ]);

    const rendered = await BusinessDetailPageView({
      locale: 'en',
      site: siteProfiles['los-angeles'],
      slug: 'lunasia-dim-sum-house-alhambra',
    });
    const html = renderToStaticMarkup(rendered);

    expect(html).toContain('https://chineselosangeles.com/en/business/lunasia-dim-sum-house-alhambra');
    expect(html).toContain('"addressRegion":"CA"');
    expect(html).toContain('Alhambra, CA');
    expect(html).toContain('ALHAMBRA, CA');
    expect(html).toContain('Verified by ChineseLosAngeles');
    expect(html).not.toContain('https://chinesearizona.com/business/lunasia-dim-sum-house-alhambra');
    expect(html).not.toContain('"addressRegion":"AZ"');
    expect(html).not.toContain('Verified by ChineseArizona');
  });

  it('uses LA domain values for sitemap, SEO metadata, and add-business copy', async () => {
    const [{ buildSitemap }, { addBusinessMetadata, businessMetadata }, { AddBusinessPageView }, { siteProfiles }] =
      await Promise.all([
        import('@/app/sitemap'),
        import('@/lib/page-metadata'),
        import('@/views/site-pages'),
        import('@/lib/site-config'),
      ]);
    const site = siteProfiles['los-angeles'];

    const [sitemapEntries, business] = await Promise.all([
      buildSitemap(site),
      businessMetadata('en', 'lunasia-dim-sum-house-alhambra', site),
    ]);
    const sitemapUrls = sitemapEntries.map((entry) => entry.url);
    const addMetadata = addBusinessMetadata('en', site);
    const addBusinessHtml = renderToStaticMarkup(
      await AddBusinessPageView({ locale: 'en', site })
    );

    expect(sitemapUrls).toContain('https://chineselosangeles.com/business/lunasia-dim-sum-house-alhambra');
    expect(sitemapUrls).toContain('https://chineselosangeles.com/business/chinatown-service-center-los-angeles');
    expect(sitemapUrls).not.toContain('https://chineselosangeles.com/business/bido-cafe');
    expect(JSON.stringify(sitemapEntries)).not.toContain('chinesearizona.com/business');

    expect(addMetadata.title).toBe('Add or Claim a Business | ChineseLosAngeles');
    expect(addMetadata.alternates?.canonical).toBe('https://chineselosangeles.com/add-business');
    expect(business?.title).toBe('Lunasia Dim Sum House | ChineseLosAngeles');
    expect(business?.alternates?.canonical).toBe(
      'https://chineselosangeles.com/business/lunasia-dim-sum-house-alhambra'
    );
    expect(addBusinessHtml).toContain('ChineseLosAngeles business directory');
    expect(addBusinessHtml).toContain('Help trusted Los Angeles Chinese businesses get found');
    expect(JSON.stringify(addMetadata)).not.toContain('ChineseArizona');
    expect(addBusinessHtml).not.toContain('ChineseArizona business directory');
  });
});
