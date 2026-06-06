import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalAustinRadarStorePath = process.env.AUSTIN_RADAR_STORE_PATH;
const originalLosAngelesRadarStorePath = process.env.RADAR_STORE_PATH_LOS_ANGELES;
const originalSfBayRadarStorePath = process.env.SF_BAY_RADAR_STORE_PATH;

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

function writeHomepageRadarStore({
  envKey,
  tempPrefix,
  slugPrefix,
  sourceName,
  titles,
}: {
  envKey: 'AUSTIN_RADAR_STORE_PATH' | 'RADAR_STORE_PATH_LOS_ANGELES' | 'SF_BAY_RADAR_STORE_PATH';
  tempPrefix: string;
  slugPrefix: string;
  sourceName: string;
  titles: string[];
}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), tempPrefix));
  const storePath = path.join(directory, 'store.json');
  const articles = titles.map((title, index) => {
    const slug = `${slugPrefix}-${index + 1}`;
    const publishedAt = `2026-06-06T${String(17 - index).padStart(2, '0')}:00:00.000Z`;

    return {
      id: `${slug}-article`,
      candidateId: `${slug}-candidate`,
      slug,
      lane: 'community',
      title: { en: title, zh: title },
      excerpt: {
        en: `${title} is a source-linked local summary for homepage tests.`,
        zh: `${title} is a source-linked local summary for homepage tests.`,
      },
      body: [
        {
          en: `${title} points readers back to the original source instead of replacing it.`,
          zh: `${title} points readers back to the original source instead of replacing it.`,
        },
      ],
      heroImage: 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?auto=format&fit=crop&w=1400&q=80',
      heroImagePolicy: 'fallback_only',
      category: 'news',
      freshnessTier: 'weekly',
      sourcePolicy: 'summary_link',
      sourceType: 'local_media',
      sourceName,
      sourceUrl: `https://example.com/${slug}`,
      sourceLinks: [
        {
          label: { en: sourceName, zh: sourceName },
          url: `https://example.com/${slug}`,
          source: sourceName,
        },
      ],
      relatedCategorySlugs: [],
      ctaBusinessSlugs: [],
      personaTargets: ['local_families'],
      publishedAt,
      updatedAt: publishedAt,
      lastCheckedAt: publishedAt,
      isPublished: true,
      aiGeneratedSummary: true,
    };
  });

  fs.writeFileSync(
    storePath,
    `${JSON.stringify(
      {
        version: 1,
        jobControl: {
          paused: false,
          publishCap: 10,
          updatedAt: '2026-05-30T12:00:00.000Z',
        },
        sourceControls: [],
        runs: [],
        candidates: [],
        articles,
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  process.env[envKey] = storePath;
}

afterEach(() => {
  if (originalAustinRadarStorePath) {
    process.env.AUSTIN_RADAR_STORE_PATH = originalAustinRadarStorePath;
  } else {
    delete process.env.AUSTIN_RADAR_STORE_PATH;
  }

  if (originalLosAngelesRadarStorePath) {
    process.env.RADAR_STORE_PATH_LOS_ANGELES = originalLosAngelesRadarStorePath;
  } else {
    delete process.env.RADAR_STORE_PATH_LOS_ANGELES;
  }

  if (originalSfBayRadarStorePath) {
    process.env.SF_BAY_RADAR_STORE_PATH = originalSfBayRadarStorePath;
  } else {
    delete process.env.SF_BAY_RADAR_STORE_PATH;
  }
});

describe('HomePageView', () => {
  it('renders the redesigned landing page sections', async () => {
    const { HomePageView } = await import('@/views/home-page');

    const html = renderToStaticMarkup(await HomePageView({ locale: 'en' }));

    expect(html).toContain("Your Guide to Arizona&#x27;s Chinese Community");
    expect(html).toContain('Featured Businesses');
    expect(html).toContain('Explore by Neighborhood');
    expect(html).toContain('Trusted Services');
    expect(html).toContain('/en/business');
    expect(html).toContain('/en/relocation-guide');
  });

  it('uses the freshest generated Arizona articles for News & Community cards', async () => {
    const [{ HomePageView }, { getCurrentArticlesAsync }] = await Promise.all([
      import('@/views/home-page'),
      import('@/lib/content'),
    ]);

    const html = renderToStaticMarkup(await HomePageView({ locale: 'en' }));
    const expectedStoryTitles = (await getCurrentArticlesAsync())
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
    writeHomepageRadarStore({
      envKey: 'AUSTIN_RADAR_STORE_PATH',
      tempPrefix: 'homepage-austin-radar-',
      slugPrefix: 'austin-homepage-news',
      sourceName: 'Austin Monitor',
      titles: [
        'Austin school and services source summary',
        'Round Rock community source summary',
        'Central Texas business source summary',
      ],
    });
    const [{ HomePageView }, { siteProfiles }] = await Promise.all([
      import('@/views/home-page'),
      import('@/lib/site-config'),
    ]);

    const html = renderToStaticMarkup(await HomePageView({ locale: 'en', site: siteProfiles.austin }));

    expect(html).toContain('Austin&#x27;s Chinese Community Guide');
    expect(html).toContain('Find Austin-area Chinese restaurants');
    expect(html).toContain('323+');
    expect(html).toContain('House of Three Gorges');
    expect(html).toContain('H Mart Austin');
    expect(html).toContain('Austin school and services source summary');
    expect(html).toContain('Round Rock community source summary');
    expect(html).toContain('Central Texas business source summary');
    expect(html).toContain('/en/news/austin-homepage-news-1');
    expect(html).not.toContain('Austin news desk starts with Central Texas sources');
    expect(html).toContain('/city-site-images/austin-skyline-lake.webp');
    expect(html).toContain('/city-site-images/cedar-park-market-street.webp');
    expect(html).not.toContain('Bido Cafe');
    expect(html).not.toContain('Hedy Li');
    expect(html).not.toContain('/directory-ai-replacements/');
    expect(html).not.toContain('/arizona-news/');
    expect(html).not.toContain('/relocation-guide');
  });

  it('renders Los Angeles directory signals without Arizona listing fallback', async () => {
    writeHomepageRadarStore({
      envKey: 'RADAR_STORE_PATH_LOS_ANGELES',
      tempPrefix: 'homepage-la-radar-',
      slugPrefix: 'los-angeles-homepage-news',
      sourceName: 'LAist',
      titles: [
        'Los Angeles community source summary',
        'San Gabriel Valley services source summary',
        'LA small business source summary',
      ],
    });
    const [{ HomePageView }, { siteProfiles }] = await Promise.all([
      import('@/views/home-page'),
      import('@/lib/site-config'),
    ]);

    const html = renderToStaticMarkup(await HomePageView({ locale: 'en', site: siteProfiles['los-angeles'] }));

    expect(html).toContain('Los Angeles Chinese Community Guide');
    expect(html).toContain('331+');
    expect(html).toContain('Lunasia Dim Sum House');
    expect(html).toContain('Chinatown Service Center');
    expect(html).toContain('San Gabriel');
    expect(html).toContain('Los Angeles community source summary');
    expect(html).toContain('San Gabriel Valley services source summary');
    expect(html).toContain('LA small business source summary');
    expect(html).toContain('/en/news/los-angeles-homepage-news-1');
    expect(html).not.toContain('LA opening radar starts with source-linked local summaries');
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
    writeHomepageRadarStore({
      envKey: 'SF_BAY_RADAR_STORE_PATH',
      tempPrefix: 'homepage-sf-bay-radar-',
      slugPrefix: 'sf-bay-homepage-news',
      sourceName: 'The San Francisco Standard',
      titles: [
        'SF Bay community source summary',
        'South Bay services source summary',
        'East Bay local source summary',
      ],
    });
    const [{ HomePageView }, { siteProfiles }] = await Promise.all([
      import('@/views/home-page'),
      import('@/lib/site-config'),
    ]);

    const html = renderToStaticMarkup(await HomePageView({ locale: 'en', site: siteProfiles['sf-bay'] }));

    expect(html).toContain('Your Guide to the SF Bay Chinese Community');
    expect(html).toContain('Find SF Bay Chinese restaurants');
    expect(html).not.toContain('Follow local summaries for San Francisco');
    expect(html).toContain('336+');
    expect(html).toContain('R&amp;G Lounge');
    expect(html).toContain('99 Ranch Market Cupertino');
    expect(html).toContain('Chinese American International School');
    expect(html).toContain('Asian Law Alliance');
    expect(html).toContain('SF Bay community source summary');
    expect(html).toContain('South Bay services source summary');
    expect(html).toContain('East Bay local source summary');
    expect(html).toContain('/en/news/sf-bay-homepage-news-1');
    expect(html).not.toContain('SF Bay source-linked news desk is live');
    expect(html).not.toContain('Bay Area directory separates city coverage');
    expect(html).not.toContain('Community discovery focuses on Bay Area anchors');
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
