import { describe, expect, it } from 'vitest';

import { getArticleBySlug, getArticles, getCommunityTrendingArticles } from '@/lib/content';
import { getMonitoredSources, getSignalDeskQueue, getSignalDeskSummary } from '@/lib/signal-desk';

describe('content engine', () => {
  it('publishes fresh generated local articles with source metadata and hero images', () => {
    const article = getArticleBySlug('angry-crab-shack-sets-june-11-opening-in-chandler');

    expect(article).toBeDefined();
    expect(article?.series).toBe('community-wire');
    expect(article?.sourcePolicy).toBe('summary_link');
    expect(article?.title.zh).toBeTruthy();
    expect(article?.excerpt.zh).toBeTruthy();
    expect(article?.heroImage).toContain('whatnow.com');
    expect(article?.sourceLinks.length).toBeGreaterThan(0);
    expect(article?.sourceName).toBe('What Now Phoenix');
  });

  it('keeps generated article images tied to source media', () => {
    const article = getArticleBySlug('black-rock-coffee-bar-lines-up-three-arizona-shops');

    expect(article).toBeDefined();
    expect(article?.sourcePolicy).toBe('summary_link');
    expect(article?.heroImage).toContain('whatnow.com');
    expect(article?.sourceLinks[0]?.url).toContain('whatnow.com/phoenix');
  });

  it('sorts the newest local series items ahead of older imported archive pieces', () => {
    const articles = getArticles(3);

    expect(articles[0]?.slug).toBe('angry-crab-shack-sets-june-11-opening-in-chandler');
    expect(articles[1]?.slug).toBe('black-rock-coffee-bar-lines-up-three-arizona-shops');
  });

  it('curates the trending rail from the freshest generated local articles', () => {
    const articles = getCommunityTrendingArticles(4);

    expect(articles.map((article) => article.slug)).toEqual([
      'angry-crab-shack-sets-june-11-opening-in-chandler',
      'black-rock-coffee-bar-lines-up-three-arizona-shops',
      'luna-grill-plans-three-more-phoenix-area-restaurants-in-2026',
      'atashi-yokocho-planned-for-scottsdale-s-the-sydney',
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
