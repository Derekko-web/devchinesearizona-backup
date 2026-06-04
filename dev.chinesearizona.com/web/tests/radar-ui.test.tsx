import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const routerRefreshMock = vi.fn();
const originalRadarStorePath = process.env.RADAR_STORE_PATH;
const originalLosAngelesRadarStorePath = process.env.RADAR_STORE_PATH_LOS_ANGELES;
const originalAustinRadarStorePath = process.env.AUSTIN_RADAR_STORE_PATH;
const originalSfBayRadarStorePath = process.env.SF_BAY_RADAR_STORE_PATH;
const originalRuntimeDataRoot = process.env.CHINESEARIZONA_RUNTIME_DATA_ROOT;
const originalZhTranslationCachePath = process.env.ARTICLE_ZH_TRANSLATION_CACHE_PATH;
const zhTranslationCachePath = path.join(os.tmpdir(), 'radar-ui-zh-cache.json');

process.env.ARTICLE_ZH_TRANSLATION_CACHE_PATH = zhTranslationCachePath;

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
      // The mock intentionally renders a plain img so server-side markup tests stay dependency-light.
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} src={src} {...props} />
    );
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
  usePathname: () => '/en/community',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    signOut: vi.fn(async () => null),
  }),
}));

afterEach(() => {
  routerRefreshMock.mockReset();
  if (originalRadarStorePath) {
    process.env.RADAR_STORE_PATH = originalRadarStorePath;
  } else {
    delete process.env.RADAR_STORE_PATH;
  }

  if (originalLosAngelesRadarStorePath) {
    process.env.RADAR_STORE_PATH_LOS_ANGELES = originalLosAngelesRadarStorePath;
  } else {
    delete process.env.RADAR_STORE_PATH_LOS_ANGELES;
  }

  if (originalAustinRadarStorePath) {
    process.env.AUSTIN_RADAR_STORE_PATH = originalAustinRadarStorePath;
  } else {
    delete process.env.AUSTIN_RADAR_STORE_PATH;
  }

  if (originalSfBayRadarStorePath) {
    process.env.SF_BAY_RADAR_STORE_PATH = originalSfBayRadarStorePath;
  } else {
    delete process.env.SF_BAY_RADAR_STORE_PATH;
  }

  if (originalRuntimeDataRoot) {
    process.env.CHINESEARIZONA_RUNTIME_DATA_ROOT = originalRuntimeDataRoot;
  } else {
    delete process.env.CHINESEARIZONA_RUNTIME_DATA_ROOT;
  }

  if (originalZhTranslationCachePath) {
    process.env.ARTICLE_ZH_TRANSLATION_CACHE_PATH = originalZhTranslationCachePath;
  } else {
    delete process.env.ARTICLE_ZH_TRANSLATION_CACHE_PATH;
  }

  if (fs.existsSync(zhTranslationCachePath)) {
    fs.unlinkSync(zhTranslationCachePath);
  }

  vi.unstubAllGlobals();
});

function writeRadarStore(
  options: {
    mirrorChineseCopy?: boolean;
    envKey?:
      | 'RADAR_STORE_PATH'
      | 'AUSTIN_RADAR_STORE_PATH'
      | 'RADAR_STORE_PATH_LOS_ANGELES'
      | 'SF_BAY_RADAR_STORE_PATH';
  } = {}
) {
  const mirrorChineseCopy = options.mirrorChineseCopy ?? false;
  const envKey = options.envKey ?? 'RADAR_STORE_PATH';
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-ui-'));
  const storePath = path.join(directory, 'store.json');
  fs.writeFileSync(
    storePath,
    `${JSON.stringify(
      {
        version: 1,
        jobControl: {
          paused: false,
          publishCap: 10,
          updatedAt: '2026-04-18T12:00:00.000Z',
        },
        sourceControls: [],
        runs: [
          {
            id: 'run-1',
            worker: 'hermes',
            startedAt: '2026-04-18T12:00:00.000Z',
            finishedAt: '2026-04-18T12:00:30.000Z',
            status: 'completed',
            candidateCount: 1,
            publishedCount: 1,
            blockedCount: 0,
            duplicateCount: 0,
            latestPublishedAt: '2026-04-18T12:00:30.000Z',
          },
        ],
        candidates: [
          {
            id: 'candidate-1',
            slug: 'mesa-radar-housing-pulse',
            sourceSlug: 'phoenix-sky-harbor-news',
            sourceName: 'Phoenix Sky Harbor',
            sourceUrl: 'https://www.skyharbor.com/news/test-item',
            canonicalUrl: 'https://www.skyharbor.com/news/test-item',
            sourceType: 'airport_newsroom',
            sourcePolicy: 'summary_link',
            lane: 'official',
            title: {
              en: 'Mesa radar housing pulse',
              zh: mirrorChineseCopy ? 'Mesa radar housing pulse' : 'Mesa 雷達住房動態',
            },
            excerpt: {
              en: 'A runtime test item for Arizona Radar.',
              zh: mirrorChineseCopy
                ? 'A runtime test item for Arizona Radar.'
                : '用來測試 Arizona Radar 的即時項目。',
            },
            topicFingerprint: 'mesa-radar-housing-pulse',
            moderationState: 'published',
            firstSeenAt: '2026-04-18T12:00:00.000Z',
            lastSeenAt: '2026-04-18T12:00:30.000Z',
          },
        ],
        articles: [
          {
            id: 'article-1',
            candidateId: 'candidate-1',
            slug: 'mesa-radar-housing-pulse',
            lane: 'official',
            title: {
              en: 'Mesa radar housing pulse',
              zh: mirrorChineseCopy ? 'Mesa radar housing pulse' : 'Mesa 雷達住房動態',
            },
            excerpt: {
              en: 'A runtime test item for Arizona Radar.',
              zh: mirrorChineseCopy
                ? 'A runtime test item for Arizona Radar.'
                : '用來測試 Arizona Radar 的即時項目。',
            },
            body: [
              {
                en: 'This article only exists in the radar runtime store.',
                zh: mirrorChineseCopy
                  ? 'This article only exists in the radar runtime store.'
                  : '這篇文章只存在於 Arizona Radar 的即時資料儲存。',
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
                label: {
                  en: 'Phoenix Sky Harbor',
                  zh: mirrorChineseCopy ? 'Phoenix Sky Harbor' : '鳳凰城天港機場',
                },
                url: 'https://www.skyharbor.com/news/test-item',
                source: 'Phoenix Sky Harbor',
              },
            ],
            relatedCategorySlugs: [],
            ctaBusinessSlugs: [],
            personaTargets: ['local_families'],
            publishedAt: '2026-04-18T12:00:30.000Z',
            updatedAt: '2026-04-18T12:00:30.000Z',
            lastCheckedAt: '2026-04-18T12:00:30.000Z',
            isPublished: true,
            aiGeneratedSummary: true,
          },
        ],
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  process.env[envKey] = storePath;
}

function writeAustinRadarStore() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'austin-radar-ui-'));
  const storePath = path.join(directory, 'store.json');
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
        candidates: [
          {
            id: 'candidate-austin-1',
            slug: 'austin-transit-summary',
            sourceSlug: 'austin-monitor',
            sourceName: 'Austin Monitor',
            sourceUrl: 'https://austinmonitor.com/example-transit-item/',
            canonicalUrl: 'https://austinmonitor.com/example-transit-item/',
            sourceType: 'local_media',
            sourcePolicy: 'summary_link',
            lane: 'official',
            title: { en: 'Austin transit summary', zh: '奥斯汀交通摘要' },
            excerpt: {
              en: 'A short source-linked Austin summary for local readers.',
              zh: '面向本地读者的奥斯汀来源摘要。',
            },
            topicFingerprint: 'austin transit summary',
            moderationState: 'published',
            firstSeenAt: '2026-05-30T12:00:00.000Z',
            lastSeenAt: '2026-05-30T12:00:00.000Z',
          },
        ],
        articles: [
          {
            id: 'article-austin-1',
            candidateId: 'candidate-austin-1',
            slug: 'austin-transit-summary',
            lane: 'official',
            title: { en: 'Austin transit summary', zh: '奥斯汀交通摘要' },
            excerpt: {
              en: 'A short source-linked Austin summary for local readers.',
              zh: '面向本地读者的奥斯汀来源摘要。',
            },
            body: [
              {
                en: 'This Austin item is a concise generated summary that points readers back to the original source instead of replacing it.',
                zh: '这则奥斯汀内容是简短生成摘要，引导读者回到原始来源，而不是替代原文。',
              },
            ],
            heroImage: 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?auto=format&fit=crop&w=1400&q=80',
            heroImagePolicy: 'fallback_only',
            category: 'news',
            freshnessTier: 'weekly',
            sourcePolicy: 'summary_link',
            sourceType: 'local_media',
            sourceName: 'Austin Monitor',
            sourceUrl: 'https://austinmonitor.com/example-transit-item/',
            sourceLinks: [
              {
                label: { en: 'Austin Monitor', zh: 'Austin Monitor' },
                url: 'https://austinmonitor.com/example-transit-item/',
                source: 'Austin Monitor',
              },
            ],
            relatedCategorySlugs: [],
            ctaBusinessSlugs: [],
            personaTargets: ['local_families'],
            publishedAt: '2026-05-30T12:00:00.000Z',
            updatedAt: '2026-05-30T12:00:00.000Z',
            lastCheckedAt: '2026-05-30T12:00:00.000Z',
            isPublished: true,
            aiGeneratedSummary: true,
          },
        ],
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  process.env.AUSTIN_RADAR_STORE_PATH = storePath;
}

function mockChineseTranslationFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = new URL(String(input));
      const texts = (url.searchParams.get('q') ?? '').split('<<<CA_ZH_SPLIT>>>');
      const translated = texts.map((text) => `翻譯：${text}`).join('<<<CA_ZH_SPLIT>>>');

      return {
        ok: true,
        status: 200,
        json: async () => [[[translated]]],
      };
    })
  );
}

function writeEmptyLosAngelesStore() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-ui-la-'));
  const storePath = path.join(directory, 'store.json');
  fs.writeFileSync(
    storePath,
    `${JSON.stringify(
      {
        version: 1,
        jobControl: {
          paused: false,
          publishCap: 10,
          updatedAt: '2026-05-29T12:00:00.000Z',
        },
        sourceControls: [],
        runs: [],
        candidates: [],
        articles: [],
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  process.env.RADAR_STORE_PATH_LOS_ANGELES = storePath;
}

describe('radar ui', () => {
  it('renders the radar hero without exposing operational metrics', async () => {
    writeRadarStore();
    const { CommunityRadarPageView } = await import('@/views/site-pages');

    const html = renderToStaticMarkup(
      await CommunityRadarPageView({ locale: 'en', searchParams: { lane: 'official' } })
    );

    expect(html).toContain('Official');
    expect(html).toContain('Official news');
    expect(html).toContain('mesa-radar-housing-pulse');
    expect(html).toContain('Read article');
    expect(html).not.toContain('Newest Arizona News');
    expect(html).not.toContain('Showing 1-1 of 1');
    expect(html).not.toContain('Original source');
    expect(html).not.toContain('All signals');
    expect(html).not.toContain('AI summary');
    expect(html).not.toContain('Latest public summary');
    expect(html).not.toContain('Monitoring live');
  });

  it('does not reuse the Arizona runtime store for Austin news pages', async () => {
    writeRadarStore();
    const [{ CommunityRadarPageView }, { siteProfiles }] = await Promise.all([
      import('@/views/site-pages'),
      import('@/lib/site-config'),
    ]);

    const html = renderToStaticMarkup(
      await CommunityRadarPageView({
        locale: 'en',
        searchParams: {},
        site: siteProfiles.austin,
      })
    );

    expect(html).toContain('There are no public items for this filter yet');
    expect(html).not.toContain('mesa-radar-housing-pulse');
    expect(html).not.toContain('Phoenix Sky Harbor');
    expect(html).not.toContain('All Arizona News');
  });

  it('does not fall back to Arizona Radar content for Los Angeles when LA runtime data is empty', async () => {
    writeRadarStore();
    writeEmptyLosAngelesStore();
    const [{ CommunityRadarPageView }, { siteProfiles }] = await Promise.all([
      import('@/views/site-pages'),
      import('@/lib/site-config'),
    ]);

    const html = renderToStaticMarkup(
      await CommunityRadarPageView({
        locale: 'en',
        searchParams: { lane: 'official' },
        site: siteProfiles['los-angeles'],
      })
    );

    expect(html).toContain('Official news');
    expect(html).toContain('There are no public items for this filter yet');
    expect(html).not.toContain('mesa-radar-housing-pulse');
    expect(html).not.toContain('Phoenix Sky Harbor');
    expect(html).not.toContain('Arizona News');
  });

  it('does not reuse the Arizona runtime store for SF Bay news pages', async () => {
    writeRadarStore();
    const [{ CommunityRadarPageView }, { siteProfiles }] = await Promise.all([
      import('@/views/site-pages'),
      import('@/lib/site-config'),
    ]);

    const html = renderToStaticMarkup(
      await CommunityRadarPageView({
        locale: 'en',
        searchParams: {},
        site: siteProfiles['sf-bay'],
      })
    );

    expect(html).toContain('All SF Bay News');
    expect(html).toContain('/en/news/sf-bay-chinatown-downtown-resource-watch');
    expect(html).not.toContain('mesa-radar-housing-pulse');
    expect(html).not.toContain('Phoenix Sky Harbor');
    expect(html).not.toContain('All Arizona News');
  });

  it('renders Los Angeles labels and source links for Los Angeles article pages', async () => {
    const [{ ArticleDetailPageView }, { siteProfiles }] = await Promise.all([
      import('@/views/site-pages'),
      import('@/lib/site-config'),
    ]);

    const html = renderToStaticMarkup(
      (await ArticleDetailPageView({
        locale: 'en',
        slug: 'los-angeles-opening-radar-local-source-watch',
        site: siteProfiles['los-angeles'],
      }))!
    );

    expect(html).toContain('Back to Los Angeles News');
    expect(html).toContain('What Now Los Angeles');
    expect(html).toContain('This page is an editorial summary');
    expect(html).not.toContain('Back to Arizona News');
    expect(html).not.toContain('Phoenix Sky Harbor');
    expect(html).not.toContain('ChineseArizona');
  });

  it('renders polished source attribution on article detail pages', async () => {
    writeRadarStore();
    const { ArticleDetailPageView } = await import('@/views/site-pages');

    const html = renderToStaticMarkup(
      (await ArticleDetailPageView({ locale: 'en', slug: 'mesa-radar-housing-pulse' }))!
    );

    expect(html).toContain('Back to Arizona News');
    expect(html).toContain('Sources');
    expect(html).toContain('Source links');
    expect(html).toContain('This page is an editorial summary');
    expect(html).toContain('Phoenix Sky Harbor');
    expect(html).toContain('Open');
    expect(html).not.toContain('ChineseArizona rewritten article');
    expect(html).not.toContain('Source type');
    expect(html).not.toContain('Image policy');
    expect(html).not.toContain('Fallback-safe hero only');
    expect(html).not.toContain('Editorial tags');
  });

  it('renders Austin article pages with Austin route labels and source links only', async () => {
    writeAustinRadarStore();
    const [{ ArticleDetailPageView, CommunityRadarPageView }, { siteProfiles }] = await Promise.all([
      import('@/views/site-pages'),
      import('@/lib/site-config'),
    ]);

    const feedHtml = renderToStaticMarkup(
      await CommunityRadarPageView({
        locale: 'en',
        searchParams: {},
        site: siteProfiles.austin,
      })
    );
    const detailHtml = renderToStaticMarkup(
      (await ArticleDetailPageView({
        locale: 'en',
        slug: 'austin-transit-summary',
        site: siteProfiles.austin,
      }))!
    );

    expect(feedHtml).toContain('All Austin News');
    expect(feedHtml).toContain('/en/local-news/austin-transit-summary');
    expect(detailHtml).toContain('Back to Austin News');
    expect(detailHtml).toContain('Austin Monitor');
    expect(detailHtml).toContain('This page is an editorial summary');
    expect(detailHtml).not.toContain('Arizona News');
    expect(detailHtml).not.toContain('Phoenix Sky Harbor');
  });

  it('renders SF Bay feed, archive, and article pages with SF Bay labels and source links only', async () => {
    writeRadarStore();
    const [{ ArticleDetailPageView, CommunityRadarPageView, NewsArchivePageView }, { siteProfiles }] = await Promise.all([
      import('@/views/site-pages'),
      import('@/lib/site-config'),
    ]);

    const feedHtml = renderToStaticMarkup(
      await CommunityRadarPageView({
        locale: 'en',
        searchParams: {},
        site: siteProfiles['sf-bay'],
      })
    );
    const archiveHtml = renderToStaticMarkup(
      await NewsArchivePageView({
        locale: 'en',
        searchParams: {},
        site: siteProfiles['sf-bay'],
      })
    );
    const detailHtml = renderToStaticMarkup(
      (await ArticleDetailPageView({
        locale: 'en',
        slug: 'sf-bay-chinatown-downtown-resource-watch',
        site: siteProfiles['sf-bay'],
      }))!
    );

    expect(feedHtml).toContain('All SF Bay News');
    expect(feedHtml).toContain('/en/news/sf-bay-chinatown-downtown-resource-watch');
    expect(feedHtml).not.toContain('There are no public items for this filter yet');
    expect(feedHtml).not.toContain('mesa-radar-housing-pulse');
    expect(feedHtml).not.toContain('Phoenix Sky Harbor');
    expect(feedHtml).not.toContain('Arizona News');
    expect(archiveHtml).toContain('The SF Bay News homepage');
    expect(archiveHtml).toContain('/en/news/sf-bay-chinatown-downtown-resource-watch');
    expect(detailHtml).toContain('Back to SF Bay News');
    expect(detailHtml).toContain('The San Francisco Standard');
    expect(detailHtml).toContain('This page is an editorial summary');
    expect(detailHtml).not.toContain('Arizona News');
    expect(detailHtml).not.toContain('Phoenix Sky Harbor');
  });

  it('falls back to translated Chinese copy when Arizona Radar only has English text', async () => {
    writeRadarStore({ mirrorChineseCopy: true });
    mockChineseTranslationFetch();
    const { ArticleDetailPageView, CommunityRadarPageView } = await import('@/views/site-pages');

    const feedHtml = renderToStaticMarkup(
      await CommunityRadarPageView({ locale: 'zh', searchParams: { lane: 'official' } })
    );
    const detailHtml = renderToStaticMarkup(
      (await ArticleDetailPageView({ locale: 'zh', slug: 'mesa-radar-housing-pulse' }))!
    );

    expect(feedHtml).toContain('官方新聞');
    expect(feedHtml).toContain('翻譯：Mesa radar housing pulse');
    expect(feedHtml).toContain('翻譯：A runtime test item for Arizona Radar.');
    expect(detailHtml).toContain('翻譯：Mesa radar housing pulse');
    expect(detailHtml).toContain('翻譯：This article only exists in the radar runtime store.');
    expect(detailHtml).toContain('來源');
  });

  it('renders the community teaser entry point for Arizona Radar', async () => {
    writeRadarStore();
    const { CommunityPageView } = await import('@/views/site-pages');

    const html = renderToStaticMarkup(await CommunityPageView({ locale: 'en' }));

    expect(html).toContain('Local news and content');
    expect(html).toContain('/en/arizona-news/archive');
  });

  it('renders admin kill-switch actions for radar controls', async () => {
    const { RadarAdminPanel } = await import('@/components/admin/RadarAdminPanel');

    const html = renderToStaticMarkup(
      <RadarAdminPanel
        locale="en"
        overview={{
          runCount: 1,
          latestRun: {
            id: 'run-1',
            worker: 'hermes',
            startedAt: '2026-04-18T12:00:00.000Z',
            finishedAt: '2026-04-18T12:00:30.000Z',
            status: 'completed',
            candidateCount: 1,
            publishedCount: 1,
            blockedCount: 0,
            duplicateCount: 0,
          },
          latestPublishedAt: '2026-04-18T12:00:30.000Z',
          publishedCount: 1,
          blockedCount: 0,
          duplicateCount: 0,
          candidateCount: 1,
          pausedSourceCount: 0,
          jobControl: {
            paused: false,
            publishCap: 10,
            updatedAt: '2026-04-18T12:00:30.000Z',
          },
          topNoisySources: [
            {
              sourceSlug: 'phoenix-sky-harbor-news',
              sourceName: 'Phoenix Sky Harbor',
              itemCount: 1,
              blockedCount: 0,
              paused: false,
            },
          ],
        }}
        sources={[
          {
            slug: 'phoenix-sky-harbor-news',
            name: 'Phoenix Sky Harbor',
            url: 'https://www.skyharbor.com/newsroom/',
            sourceType: 'airport_newsroom',
            sourcePolicy: 'summary_link',
            lane: 'official',
            cadence: '5m',
            notes: { en: 'Airport newsroom', zh: 'Airport newsroom' },
            candidateCount: 1,
            paused: false,
          },
        ]}
        candidates={[
          {
            id: 'candidate-1',
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
            moderationState: 'queued',
            firstSeenAt: '2026-04-18T12:00:00.000Z',
            lastSeenAt: '2026-04-18T12:00:30.000Z',
          },
        ]}
        articles={[
          {
            id: 'article-1',
            candidateId: 'candidate-1',
            slug: 'mesa-radar-housing-pulse',
            lane: 'official',
            title: { en: 'Mesa radar housing pulse', zh: 'Mesa 雷達住房動態' },
            excerpt: { en: 'A runtime test item for Arizona Radar.', zh: '用來測試 Arizona Radar 的即時項目。' },
            body: [{ en: 'Body', zh: 'Body' }],
            heroImage: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1400&q=80',
            heroImagePolicy: 'fallback_only',
            category: 'news',
            freshnessTier: 'breaking',
            sourcePolicy: 'summary_link',
            sourceType: 'airport_newsroom',
            sourceName: 'Phoenix Sky Harbor',
            sourceUrl: 'https://www.skyharbor.com/news/test-item',
            sourceLinks: [],
            relatedCategorySlugs: [],
            ctaBusinessSlugs: [],
            personaTargets: [],
            publishedAt: '2026-04-18T12:00:30.000Z',
            updatedAt: '2026-04-18T12:00:30.000Z',
            lastCheckedAt: '2026-04-18T12:00:30.000Z',
            isPublished: true,
            aiGeneratedSummary: true,
          },
        ]}
        runs={[
          {
            id: 'run-1',
            worker: 'hermes',
            startedAt: '2026-04-18T12:00:00.000Z',
            finishedAt: '2026-04-18T12:00:30.000Z',
            status: 'completed',
            candidateCount: 1,
            publishedCount: 1,
            blockedCount: 0,
            duplicateCount: 0,
          },
        ]}
      />
    );

    expect(html).toContain('Pause job');
    expect(html).toContain('Pause source');
    expect(html).toContain('Block candidate');
    expect(html).toContain('Unpublish');
  });
});
