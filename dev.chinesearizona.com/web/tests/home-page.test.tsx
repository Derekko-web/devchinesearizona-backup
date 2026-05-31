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

describe('HomePageView', () => {
  it('renders the redesigned landing page sections', async () => {
    const { HomePageView } = await import('@/views/home-page');

    const html = renderToStaticMarkup(<HomePageView locale="en" />);

    expect(html).toContain("Your Guide to Arizona&#x27;s Chinese Community");
    expect(html).toContain('Featured Businesses');
    expect(html).toContain('Explore by Neighborhood');
    expect(html).toContain('Trusted Services');
    expect(html).toContain('/en/business');
    expect(html).toContain('/en/relocation-guide');
  });

  it('renders Austin-specific directory content without reusing Arizona listings', async () => {
    const [{ HomePageView }, { siteProfiles }] = await Promise.all([
      import('@/views/home-page'),
      import('@/lib/site-config'),
    ]);

    const html = renderToStaticMarkup(<HomePageView locale="en" site={siteProfiles.austin} />);

    expect(html).toContain('Austin&#x27;s Chinese Community Guide');
    expect(html).toContain('Find Austin-area Chinese restaurants');
    expect(html).toContain('House of Three Gorges');
    expect(html).toContain('H Mart Austin');
    expect(html).not.toContain('Bido Cafe');
    expect(html).not.toContain('Hedy Li');
    expect(html).not.toContain('/directory-ai-replacements/');
    expect(html).not.toContain('/arizona-news/');
    expect(html).not.toContain('/relocation-guide');
  });

  it('renders Los Angeles directory signals without Arizona listing fallback', async () => {
    const [{ HomePageView }, { siteProfiles }] = await Promise.all([
      import('@/views/home-page'),
      import('@/lib/site-config'),
    ]);

    const html = renderToStaticMarkup(<HomePageView locale="en" site={siteProfiles['los-angeles']} />);

    expect(html).toContain('Los Angeles Chinese Community Guide');
    expect(html).toContain('Lunasia Dim Sum House');
    expect(html).toContain('Chinatown Service Center');
    expect(html).toContain('San Gabriel');
    expect(html).not.toContain('Bido Cafe');
    expect(html).not.toContain('Hedy Li');
    expect(html).not.toContain('/directory-ai-replacements/');
    expect(html).not.toContain('/arizona-news/');
    expect(html).not.toContain('/relocation-guide');
  });
});
