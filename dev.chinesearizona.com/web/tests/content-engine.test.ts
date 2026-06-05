import { describe, expect, it } from 'vitest';

import {
  getArticleBySlug,
  getArticles,
  getCommunityTrendingArticles,
  getCurrentArticles,
  getLegacyArticles,
} from '@/lib/content';
import { getMonitoredSources, getSignalDeskQueue, getSignalDeskSummary } from '@/lib/signal-desk';

const configuredTrendingArticleSlugs = [
  'tsmc-corridor-watch-supplier-growth-and-neighborhood-pressure',
  'phoenix-route-watch-asia-connector-playbook',
  'trend-radar-what-phoenix-food-posts-keep-highlighting',
  'restaurant-opening-radar-east-valley-plaza-shifts',
] as const;

describe('content engine', () => {
  it('publishes fresh generated local articles with source metadata and hero images', () => {
    const generatedArticle = getCurrentArticles().find(
      (candidate) => candidate.sourcePolicy === 'summary_link'
    );
    const article = generatedArticle ? getArticleBySlug(generatedArticle.slug) : undefined;

    expect(article).toBeDefined();
    expect(article?.sourcePolicy).toBe('summary_link');
    expect(article?.title.zh).toBeTruthy();
    expect(article?.excerpt.zh).toBeTruthy();
    expect(article?.heroImage).toMatch(/^https?:\/\//);
    expect(article?.sourceLinks.length).toBeGreaterThan(0);
    expect(article?.sourceName).toBeTruthy();
  });

  it('keeps generated article images tied to source media', () => {
    const article = getCurrentArticles().find((candidate) => candidate.sourcePolicy === 'summary_link');

    expect(article).toBeDefined();
    expect(article?.sourcePolicy).toBe('summary_link');
    expect(article?.heroImage).toMatch(/^https?:\/\//);
    expect(article?.sourceLinks.some((sourceLink) => /^https?:\/\//.test(sourceLink.url))).toBe(true);
  });

  it('sorts the newest local series items ahead of older imported archive pieces', () => {
    const articles = getArticles(3);
    const latestLegacyArticle = getLegacyArticles(1)[0];

    expect(articles).toHaveLength(3);
    expect(new Date(articles[0]?.publishedAt ?? 0).getTime()).toBeGreaterThanOrEqual(
      new Date(articles[1]?.publishedAt ?? 0).getTime()
    );
    expect(new Date(articles[1]?.publishedAt ?? 0).getTime()).toBeGreaterThanOrEqual(
      new Date(articles[2]?.publishedAt ?? 0).getTime()
    );
    expect(new Date(articles[0]?.publishedAt ?? 0).getTime()).toBeGreaterThan(
      new Date(latestLegacyArticle?.publishedAt ?? 0).getTime()
    );
  });

  it('curates the trending rail from the freshest generated local articles', () => {
    const currentArticleSlugs = new Set(getCurrentArticles().map((article) => article.slug));
    const availableConfiguredSlugs = configuredTrendingArticleSlugs.filter((slug) =>
      currentArticleSlugs.has(slug)
    );
    const articles = getCommunityTrendingArticles(4);
    const articleSlugs = articles.map((article) => article.slug);

    expect(articles).toHaveLength(4);
    expect(new Set(articleSlugs).size).toBe(articleSlugs.length);
    expect(articleSlugs.every((slug) => currentArticleSlugs.has(slug))).toBe(true);
    expect(articleSlugs.slice(0, availableConfiguredSlugs.length)).toEqual(availableConfiguredSlugs);
  });

  it('loads monitored sources and signal desk queue summary', () => {
    const monitoredSources = getMonitoredSources();
    const queue = getSignalDeskQueue();
    const summary = getSignalDeskSummary();
    const queueSlugs = new Set(queue.map((item) => item.slug));

    expect(monitoredSources.length).toBeGreaterThan(5);
    expect(summary.monitoredSourceCount).toBe(monitoredSources.length);
    expect(summary.reviewReadyCount).toBeGreaterThan(0);
    expect(summary.openDirectoryFollowUpCount).toBeGreaterThan(0);
    expect(queueSlugs.size).toBe(queue.length);
  });
});
