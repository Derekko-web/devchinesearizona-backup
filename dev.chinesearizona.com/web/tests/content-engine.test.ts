import { describe, expect, it } from 'vitest';

import { getArticleBySlug, getArticles, getCommunityTrendingArticles } from '@/lib/content';
import { getMonitoredSources, getSignalDeskQueue, getSignalDeskSummary } from '@/lib/signal-desk';

describe('content engine', () => {
  it('publishes original local articles with series metadata and directory CTAs', () => {
    const article = getArticleBySlug('housing-watch-where-tsmc-families-compare-first');

    expect(article).toBeDefined();
    expect(article?.series).toBe('housing-watch');
    expect(article?.sourcePolicy).toBe('summary_link');
    expect(article?.title.zh).toBeTruthy();
    expect(article?.excerpt.zh).toBeTruthy();
    expect(article?.sourceLinks.length).toBeGreaterThan(0);
    expect(article?.ctaBusinessSlugs.length).toBeGreaterThan(0);
  });

  it('keeps trend radar stories in signal-only mode without source-media hero images', () => {
    const article = getArticleBySlug('trend-radar-phoenix-apartment-myths-short-video-apps');

    expect(article).toBeDefined();
    expect(article?.sourcePolicy).toBe('signal_only');
    expect(article?.heroImage).toContain('images.unsplash.com');
    expect(article?.sourceLinks[0]?.url).toContain('tiktok.com');
  });

  it('sorts the newest local series items ahead of older imported archive pieces', () => {
    const articles = getArticles(3);

    expect(articles[0]?.slug).toBe('housing-watch-where-tsmc-families-compare-first');
    expect(articles[1]?.slug).toBe('tsmc-corridor-watch-supplier-growth-and-neighborhood-pressure');
  });

  it('curates a trending rail around TSMC, air service, and Arizona restaurant openings', () => {
    const articles = getCommunityTrendingArticles(4);

    expect(articles.map((article) => article.slug)).toEqual([
      'tsmc-corridor-watch-supplier-growth-and-neighborhood-pressure',
      'phoenix-route-watch-asia-connector-playbook',
      'trend-radar-what-phoenix-food-posts-keep-highlighting',
      'restaurant-opening-radar-east-valley-plaza-shifts',
    ]);
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
