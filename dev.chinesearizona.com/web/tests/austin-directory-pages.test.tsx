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

describe('Austin directory pages', () => {
  it('renders Austin business detail structured data without Arizona SEO values', async () => {
    const [{ BusinessDetailPageView }, { siteProfiles }] = await Promise.all([
      import('@/views/site-pages'),
      import('@/lib/site-config'),
    ]);

    const rendered = await BusinessDetailPageView({
      locale: 'en',
      site: siteProfiles.austin,
      slug: 'house-of-three-gorges-austin',
    });
    const html = renderToStaticMarkup(rendered);

    expect(html).toContain('https://chineseaustin.com/en/business/house-of-three-gorges-austin');
    expect(html).toContain('"addressRegion":"TX"');
    expect(html).toContain('Austin, TX');
    expect(html).toContain('AUSTIN, TX');
    expect(html).toContain('Verified by ChineseAustin');
    expect(html).not.toContain('https://chinesearizona.com/business/house-of-three-gorges-austin');
    expect(html).not.toContain('"addressRegion":"AZ"');
    expect(html).not.toContain('Austin, AZ');
    expect(html).not.toContain('AUSTIN, ARIZONA');
    expect(html).not.toContain('Verified by ChineseArizona');
  });

  it('renders Austin add-business copy without Arizona fallback content', async () => {
    const [{ AddBusinessPageView }, { siteProfiles }] = await Promise.all([
      import('@/views/site-pages'),
      import('@/lib/site-config'),
    ]);

    const html = renderToStaticMarkup(
      await AddBusinessPageView({ locale: 'en', site: siteProfiles.austin })
    );

    expect(html).toContain('ChineseAustin business directory');
    expect(html).toContain('Help trusted Austin Chinese businesses get found');
    expect(html).not.toContain('ChineseArizona business directory');
    expect(html).not.toContain('Arizona Chinese business storefront');
    expect(html).not.toContain('/directory-ai-replacements/lee-lee-oriental-supermarket-chandler.webp');
  });
});
