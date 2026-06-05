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

function hasLatinCharacters(value: string): boolean {
  return /[A-Za-z]/.test(value);
}

function hasCjkCharacters(value: string): boolean {
  return /[\u3400-\u9FFF\uF900-\uFAFF]/.test(value);
}

function stripStoryCardLeadIn(value: string) {
  const normalized = value.trim();
  const separatorIndex = normalized.search(/[:：]/);

  if (separatorIndex === -1) {
    return normalized;
  }

  const stripped = normalized.slice(separatorIndex + 1).trim();
  return stripped || normalized;
}

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

  it('uses the freshest generated Arizona articles for News & Community cards', async () => {
    const [{ HomePageView }, { getCurrentArticlesForSite }] = await Promise.all([
      import('@/views/home-page'),
      import('@/lib/content'),
    ]);

    const html = renderToStaticMarkup(<HomePageView locale="en" />);
    const expectedStoryTitles = getCurrentArticlesForSite()
      .filter((article, index, articles) => articles.findIndex((candidate) => candidate.slug === article.slug) === index)
      .filter((article) => hasLatinCharacters(article.title.en) && !hasCjkCharacters(article.title.en))
      .slice(0, 3)
      .map((article) => stripStoryCardLeadIn(article.title.en));
    const storyIndexes = expectedStoryTitles.map((title) => html.indexOf(title));

    expect(expectedStoryTitles).toHaveLength(3);
    storyIndexes.forEach((index) => expect(index).toBeGreaterThan(-1));
    expect(storyIndexes[1]).toBeGreaterThan(storyIndexes[0]);
    expect(storyIndexes[2]).toBeGreaterThan(storyIndexes[1]);
  });

  it('renders Austin-specific directory content without reusing Arizona listings', async () => {
    const [{ HomePageView }, { siteProfiles }] = await Promise.all([
      import('@/views/home-page'),
      import('@/lib/site-config'),
    ]);

    const html = renderToStaticMarkup(<HomePageView locale="en" site={siteProfiles.austin} />);

    expect(html).toContain('Austin&#x27;s Chinese Community Guide');
    expect(html).toContain('Find Austin-area Chinese restaurants');
    expect(html).toContain('323+');
    expect(html).toContain('House of Three Gorges');
    expect(html).toContain('H Mart Austin');
    expect(html).toContain('Austin news desk starts with Central Texas sources');
    expect(html).toContain('/city-site-images/austin-skyline-lake.webp');
    expect(html).toContain('/city-site-images/cedar-park-market-street.webp');
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
    expect(html).toContain('331+');
    expect(html).toContain('Lunasia Dim Sum House');
    expect(html).toContain('Chinatown Service Center');
    expect(html).toContain('San Gabriel');
    expect(html).toContain('LA opening radar starts with source-linked local summaries');
    expect(html).toContain('/city-site-images/la-chinatown-downtown.webp');
    expect(html).toContain('/city-site-images/alhambra-main-street.webp');
    expect(html).not.toContain('/en/los-angeles-news/los-angeles-opening-radar-local-source-watch');
    expect(html).not.toContain('/en/los-angeles-news/sgv-housing-transit-watch-source-linked-summaries');
    expect(html).not.toContain('Bido Cafe');
    expect(html).not.toContain('Hedy Li');
    expect(html).not.toContain('/directory-ai-replacements/');
    expect(html).not.toContain('/arizona-news/');
    expect(html).not.toContain('/relocation-guide');
  });

  it('renders SF Bay homepage counts, story cards, featured businesses, and local intro copy', async () => {
    const [{ HomePageView }, { siteProfiles }] = await Promise.all([
      import('@/views/home-page'),
      import('@/lib/site-config'),
    ]);

    const html = renderToStaticMarkup(<HomePageView locale="en" site={siteProfiles['sf-bay']} />);

    expect(html).toContain('Your Guide to the SF Bay Chinese Community');
    expect(html).toContain('Find SF Bay Chinese restaurants');
    expect(html).not.toContain('Follow local summaries for San Francisco');
    expect(html).toContain('336+');
    expect(html).toContain('R&amp;G Lounge');
    expect(html).toContain('99 Ranch Market Cupertino');
    expect(html).toContain('Chinese American International School');
    expect(html).toContain('Asian Law Alliance');
    expect(html).toContain('SF Bay source-linked news desk is live');
    expect(html).toContain('Bay Area directory separates city coverage');
    expect(html).toContain('Community discovery focuses on Bay Area anchors');
    expect(html).toContain('/city-site-images/sf-chinatown-bay.webp');
    expect(html).toContain('/city-site-images/oakland-chinatown-street.webp');
    expect(html).toContain('/city-site-images/cupertino-tech-avenue.webp');
    expect(html).not.toContain('SF Chinatown and Downtown Resource Watch');
    expect(html).not.toContain('South Bay and Cupertino Services Watch');
    expect(html).not.toContain('Oakland and East Bay Community Anchor Watch');
    expect(html).not.toContain('SF Bay News Desk: How ChineseSFBay Uses Local Sources');
    expect(html).not.toContain('Openings Watch: Bay Area Restaurant and Retail Signals Need Local Links');
    expect(html).not.toContain('Bido Cafe');
    expect(html).not.toContain('/directory-ai-replacements/');
    expect(html).not.toContain('/arizona-news/');
    expect(html).not.toContain('/relocation-guide');
  });
});
