import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  getArticleArchivePage,
  getArticleArchivePageAsync,
  getArticleBySlugAsync,
  getBusinesses,
  getCommunityPostBySlug,
  getCommunityPosts,
  getCurrentArticlesAsync,
  getLegacyArticles,
  isLegacyArticle,
  shouldNoIndexCommunityPost,
} from '@/lib/content';
import { articleMetadata, communityNewsMetadata } from '@/lib/page-metadata';
import { createCommunityPost, createModerationReport } from '@/lib/runtime-store';

const originalRadarStorePath = process.env.RADAR_STORE_PATH;

afterEach(() => {
  if (originalRadarStorePath) {
    process.env.RADAR_STORE_PATH = originalRadarStorePath;
  } else {
    delete process.env.RADAR_STORE_PATH;
  }
});

function writeRadarStore(store: unknown) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-store-'));
  const storePath = path.join(directory, 'store.json');
  fs.writeFileSync(storePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  process.env.RADAR_STORE_PATH = storePath;
  return storePath;
}

describe('content selectors', () => {
  it('filters businesses by city, category, and verified trust signal', () => {
    const results = getBusinesses('en', {
      city: 'Chandler',
      category: 'real-estate',
      verifiedOnly: true,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.slug).toBe('elite-az-realty-team');
  });

  it('includes runtime community submissions in the public feed', () => {
    const post = createCommunityPost({
      type: 'board',
      title: {
        en: 'Test Runtime Post',
        zh: '測試即時貼文',
      },
      excerpt: {
        en: 'Runtime feed coverage',
        zh: '即時社群串接',
      },
      body: [
        {
          en: 'This post exists to prove runtime submissions are merged into the community feed.',
          zh: '這則貼文用來驗證即時提交會被併入社群列表。',
        },
      ],
      authorSlug: 'newcomer-derek',
      city: 'Mesa',
      price: undefined,
      linkUrl: 'https://example.com/runtime-post',
    });

    const results = getCommunityPosts('board');
    expect(results.some((item) => item.slug === post.slug)).toBe(true);
  });

  it('marks reported community posts as noindex', () => {
    createModerationReport('used-minivan-east-valley', 'spam');
    const post = getCommunityPostBySlug('classified', 'used-minivan-east-valley');

    expect(post).toBeDefined();
    expect(post?.reportCount).toBeGreaterThan(0);
    expect(shouldNoIndexCommunityPost(post!)).toBe(true);
  });

  it('defaults archive pages to current editorial and excludes imported legacy items', () => {
    const page = getArticleArchivePage(undefined, 200);

    expect(page.filters.bucket).toBe('current');
    expect(page.articles.length).toBeGreaterThan(0);
    expect(page.articles.every((article) => !isLegacyArticle(article))).toBe(true);
  });

  it('returns legacy archive results with the expected filters and pagination metadata', () => {
    const legacyArticle = getLegacyArticles(1)[0];
    expect(legacyArticle).toBeDefined();

    const publishedAt = new Date(legacyArticle!.publishedAt);
    const year = publishedAt.getUTCFullYear();
    const month = publishedAt.getUTCMonth() + 1;
    const page = getArticleArchivePage(
      {
        bucket: 'legacy',
        series: legacyArticle!.series,
        sourcePolicy: legacyArticle!.sourcePolicy,
        year: String(year),
        month: String(month),
      },
      200
    );

    expect(page.filters.bucket).toBe('legacy');
    expect(page.filters.year).toBe(year);
    expect(page.filters.month).toBe(month);
    expect(page.totalCount).toBeGreaterThan(0);
    expect(page.articles.some((article) => article.slug === legacyArticle!.slug)).toBe(true);
    expect(page.articles.every((article) => isLegacyArticle(article))).toBe(true);
    expect(page.availableYears).toContain(year);
    expect(page.availableMonths).toContain(month);
  });

  it('marks legacy archive hubs and legacy article pages as noindex', async () => {
    const legacyArticle = getLegacyArticles(1)[0];
    expect(legacyArticle).toBeDefined();

    const archiveMetadata = communityNewsMetadata('en', { bucket: 'legacy' });
    const detailMetadata = await articleMetadata('en', legacyArticle!.slug);

    expect(archiveMetadata.robots).toEqual({ index: false, follow: false });
    expect(detailMetadata?.robots).toEqual({ index: false, follow: false });
  });

  it('merges published radar items into async current-article loaders without a rebuild', async () => {
    writeRadarStore({
      version: 1,
      jobControl: {
        paused: false,
        publishCap: 10,
        updatedAt: '2026-04-18T12:00:00.000Z',
      },
      sourceControls: [],
      runs: [],
      candidates: [
        {
          id: 'candidate-radar-1',
          slug: 'mesa-radar-housing-pulse',
          sourceSlug: 'phoenix-sky-harbor-news',
          sourceName: 'Phoenix Sky Harbor',
          sourceUrl: 'https://www.skyharbor.com/news/test-item',
          canonicalUrl: 'https://www.skyharbor.com/news/test-item',
          sourceType: 'airport_newsroom',
          sourcePolicy: 'summary_link',
          lane: 'official',
          title: { en: 'Mesa radar housing pulse', zh: 'Mesa 雷達住房動態' },
          excerpt: { en: 'A runtime test item for Arizona Radar.', zh: '用來測試 Arizona Radar 的即時項目。' },
          topicFingerprint: 'mesa-radar-housing-pulse',
          moderationState: 'published',
          firstSeenAt: '2026-04-18T12:00:00.000Z',
          lastSeenAt: '2026-04-18T12:00:00.000Z',
        },
      ],
      articles: [
        {
          id: 'article-radar-1',
          candidateId: 'candidate-radar-1',
          slug: 'mesa-radar-housing-pulse',
          lane: 'official',
          title: { en: 'Mesa radar housing pulse', zh: 'Mesa 雷達住房動態' },
          excerpt: { en: 'A runtime test item for Arizona Radar.', zh: '用來測試 Arizona Radar 的即時項目。' },
          body: [
            {
              en: 'This article only exists in the radar runtime store.',
              zh: '這篇文章只存在於 Arizona Radar 的即時資料儲存。',
            },
          ],
          heroImage: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1400&q=80',
          heroImagePolicy: 'fallback_only',
          category: 'news',
          freshnessTier: 'breaking',
          sourcePolicy: 'summary_link',
          sourceType: 'airport_newsroom',
          sourceName: 'Phoenix Sky Harbor',
          sourceUrl: 'https://www.skyharbor.com/news/test-item',
          sourceLinks: [
            {
              label: { en: 'Phoenix Sky Harbor', zh: 'Phoenix Sky Harbor' },
              url: 'https://www.skyharbor.com/news/test-item',
              source: 'Phoenix Sky Harbor',
            },
          ],
          relatedCategorySlugs: [],
          ctaBusinessSlugs: [],
          personaTargets: ['local_families'],
          publishedAt: '2026-04-18T12:00:00.000Z',
          updatedAt: '2026-04-18T12:00:00.000Z',
          lastCheckedAt: '2026-04-18T12:00:00.000Z',
          isPublished: true,
          aiGeneratedSummary: true,
        },
      ],
    });

    const currentArticles = await getCurrentArticlesAsync();
    const archivePage = await getArticleArchivePageAsync({ series: 'arizona-radar' }, 24);
    const detailArticle = await getArticleBySlugAsync('mesa-radar-housing-pulse');

    expect(currentArticles.some((article) => article.slug === 'mesa-radar-housing-pulse')).toBe(true);
    expect(archivePage.articles.some((article) => article.slug === 'mesa-radar-housing-pulse')).toBe(true);
    expect(detailArticle?.series).toBe('arizona-radar');
    expect(detailArticle?.aiGeneratedSummary).toBe(true);
  });
});
