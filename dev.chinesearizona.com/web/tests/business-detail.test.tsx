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
    fill: _fill,
    ...props
  }: {
    alt: string;
    src: string;
    fill?: boolean;
    [key: string]: unknown;
  }) => {
    void _fill;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} src={String(src)} {...props} />
    );
  },
}));

vi.mock('@/components/forms/ReportIssueForm', () => ({
  ReportIssueForm: ({ entitySlug }: { entitySlug: string }) => <div data-report-issue={entitySlug} />,
}));

describe('BusinessDetailPageView', () => {
  it('renders Los Angeles business details without Arizona SEO or verification fallback copy', async () => {
    const [{ BusinessDetailPageView }, { siteProfiles }] = await Promise.all([
      import('@/views/site-pages'),
      import('@/lib/site-config'),
    ]);

    const html = renderToStaticMarkup(
      await BusinessDetailPageView({
        locale: 'en',
        slug: 'lunasia-dim-sum-house-alhambra',
        site: siteProfiles['los-angeles'],
      })
    );

    expect(html).toContain('Lunasia Dim Sum House');
    expect(html).toContain('Verified by ChineseLosAngeles');
    expect(html).toContain('"addressRegion":"CA"');
    expect(html).toContain('https://chineselosangeles.com/en/business/lunasia-dim-sum-house-alhambra');
    expect(html).not.toContain('Verified by ChineseArizona');
    expect(html).not.toContain('"addressRegion":"AZ"');
    expect(html).not.toContain('https://chinesearizona.com/en/business/lunasia-dim-sum-house-alhambra');
  });

  it('shows the full description once, in the About section, not again in the top section', async () => {
    const [{ BusinessDetailPageView }, { siteProfiles }, { getDirectoryBusinessBySlug }] = await Promise.all([
      import('@/views/site-pages'),
      import('@/lib/site-config'),
      import('@/lib/directory'),
    ]);
    const site = siteProfiles['los-angeles'];
    const slug = 'lunasia-dim-sum-house-alhambra';
    const business = await getDirectoryBusinessBySlug(slug, { site });
    expect(business).toBeDefined();

    const html = renderToStaticMarkup(await BusinessDetailPageView({ locale: 'en', slug, site }));
    const visibleHtml = html.replace(/<script[\s\S]*?<\/script>/g, '');
    const description = renderToStaticMarkup(<>{business!.description.en}</>);

    expect(visibleHtml.split(description).length - 1).toBe(1);
  });
});
