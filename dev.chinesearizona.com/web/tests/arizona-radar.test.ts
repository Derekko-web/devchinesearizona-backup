import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  applyDraftsToStore,
  defaultStoreSnapshot,
  normalizeCanonicalUrl,
  normalizeStore,
} = require('../scripts/arizona_radar/core.cjs') as {
  applyDraftsToStore: (
    store: Record<string, unknown>,
    drafts: Array<Record<string, unknown>>,
    options: {
      manifest: Array<Record<string, unknown>>;
      publishCap: number;
      now: string;
      siteKey?: string;
    }
  ) => {
    store: {
      candidates: Array<Record<string, unknown>>;
      articles: Array<Record<string, unknown>>;
    };
    summary: {
      publishedCount: number;
      blockedCount: number;
      duplicateCount: number;
    };
  };
  defaultStoreSnapshot: () => Record<string, unknown>;
  normalizeCanonicalUrl: (value: string) => string;
  normalizeStore: (store: Record<string, unknown>, siteKey?: string) => {
    articles: Array<Record<string, unknown>>;
  };
};

const manifest = [
  {
    slug: 'phoenix-sky-harbor-news',
    name: 'Phoenix Sky Harbor',
    url: 'https://www.skyharbor.com/newsroom/',
    sourceType: 'airport_newsroom',
    sourcePolicy: 'summary_link',
    lane: 'official',
    cadence: '5m',
    notes: { en: 'Airport newsroom', zh: 'Airport newsroom' },
  },
  {
    slug: 'what-now-phoenix',
    name: 'What Now Phoenix',
    url: 'https://whatnow.com/phoenix/',
    sourceType: 'local_media',
    sourcePolicy: 'summary_link',
    lane: 'openings',
    cadence: '5m',
    notes: { en: 'Local openings', zh: 'Local openings' },
  },
  {
    slug: 'instagram-downtown-phoenix',
    name: 'Instagram Downtown Phoenix',
    url: 'https://www.instagram.com/downtownphoenix/',
    sourceType: 'social_signal',
    sourcePolicy: 'signal_only',
    lane: 'social',
    cadence: '5m',
    notes: { en: 'Social signal', zh: 'Social signal' },
  },
] as const;

function makeWebDraft(index: number) {
  return {
    sourceSlug: 'what-now-phoenix',
    sourceUrl: `https://whatnow.com/phoenix/restaurants/item-${index}/`,
    canonicalUrl: `https://whatnow.com/phoenix/restaurants/item-${index}/?utm_source=test`,
    sourcePublishedAt: `2026-04-${String(index).padStart(2, '0')}T12:00:00.000Z`,
    titleEn: `Opening item ${index}`,
    titleZh: `新店項目 ${index}`,
    excerptEn: `Opening item ${index} excerpt.`,
    excerptZh: `新店項目 ${index} 摘要。`,
    bodyEn: [`Opening item ${index} body.`],
    bodyZh: [`新店項目 ${index} 內文。`],
    topicFingerprint: `opening-item-${index}`,
    heroImage: 'https://example.com/not-allowed-source-image.jpg',
  };
}

describe('Arizona Radar core', () => {
  it('normalizes only public http and https URLs for generated radar links', () => {
    expect(normalizeCanonicalUrl('https://example.com/a?utm_source=test#section')).toBe(
      'https://example.com/a'
    );
    expect(normalizeCanonicalUrl('https://[2606:4700:4700::1111]/dns?utm_source=test')).toBe(
      'https://[2606:4700:4700::1111]/dns'
    );
    expect(normalizeCanonicalUrl('javascript:alert(1)')).toBe('');
    expect(normalizeCanonicalUrl('data:text/html,hi')).toBe('');
    expect(normalizeCanonicalUrl('file:///etc/passwd')).toBe('');
    expect(normalizeCanonicalUrl('https://user:pass@example.com/admin')).toBe('');
    expect(normalizeCanonicalUrl('https://localhost/admin')).toBe('');
    expect(normalizeCanonicalUrl('http://10.0.0.5/admin')).toBe('');
    expect(normalizeCanonicalUrl('http://127.0.0.1:3000/admin')).toBe('');
    expect(normalizeCanonicalUrl('http://169.254.169.254/latest/meta-data/')).toBe('');
    expect(normalizeCanonicalUrl('http://172.16.0.5/admin')).toBe('');
    expect(normalizeCanonicalUrl('http://192.168.1.10/admin')).toBe('');
    expect(normalizeCanonicalUrl('http://198.51.100.5/admin')).toBe('');
    expect(normalizeCanonicalUrl('http://[::1]/admin')).toBe('');
    expect(normalizeCanonicalUrl('http://[2001:db8::1]/admin')).toBe('');
    expect(normalizeCanonicalUrl('http://[3fff::1]/admin')).toBe('');
  });

  it('blocks social drafts that try to reuse captions or media fields', () => {
    const result = applyDraftsToStore(
      defaultStoreSnapshot(),
      [
        {
          sourceSlug: 'instagram-downtown-phoenix',
          sourceUrl: 'https://www.instagram.com/p/test-1/',
          canonicalUrl: 'https://www.instagram.com/p/test-1/',
          titleEn: 'Downtown Phoenix buzz',
          titleZh: 'Downtown Phoenix 熱度',
          excerptEn: 'Social trend summary.',
          excerptZh: '社群趨勢摘要。',
          bodyEn: ['A short summary.'],
          bodyZh: ['一段簡短摘要。'],
          topicFingerprint: 'downtown phoenix buzz',
          caption: 'Original caption that should not be reused.',
          mediaUrl: 'https://cdn.instagram.com/test.jpg',
        },
      ],
      {
        manifest: [...manifest],
        publishCap: 10,
        now: '2026-04-18T12:00:00.000Z',
      }
    );

    expect(result.summary.blockedCount).toBe(1);
    expect(result.store.articles).toHaveLength(0);
    expect(result.store.candidates[0]?.moderationState).toBe('blocked');
  });

  it('preserves source hero images for article sources and falls back for signal_only items', () => {
    const result = applyDraftsToStore(
      defaultStoreSnapshot(),
      [
        makeWebDraft(1),
        {
          sourceSlug: 'instagram-downtown-phoenix',
          sourceUrl: 'https://www.instagram.com/p/test-2/',
          canonicalUrl: 'https://www.instagram.com/p/test-2/',
          titleEn: 'Phoenix apartment chatter',
          titleZh: 'Phoenix 公寓討論',
          excerptEn: 'A signal-only trend summary.',
          excerptZh: '一則 signal-only 趨勢摘要。',
          bodyEn: ['The trend keeps surfacing across Phoenix apartment conversations.'],
          bodyZh: ['這個趨勢持續出現在 Phoenix 公寓相關討論中。'],
          topicFingerprint: 'phoenix apartment chatter',
          heroImage: 'https://example.com/not-allowed-social-image.jpg',
        },
      ],
      {
        manifest: [...manifest],
        publishCap: 10,
        now: '2026-04-18T12:00:00.000Z',
      }
    );

    expect(result.store.articles).toHaveLength(2);
    const webArticle = result.store.articles.find((article) => article.sourcePolicy === 'summary_link');
    const socialArticle = result.store.articles.find((article) => article.sourcePolicy === 'signal_only');

    expect(webArticle?.heroImagePolicy).toBe('source_allowed');
    expect(webArticle?.heroImage).toBe('https://example.com/not-allowed-source-image.jpg');
    expect(socialArticle?.heroImagePolicy).toBe('fallback_only');
    expect(socialArticle?.heroImage).toBe('/home-neighborhood/scottsdale-card.webp');
  });

  it('repairs stored articles with empty or non-renderable hero images', () => {
    const store = normalizeStore({
      ...defaultStoreSnapshot(),
      articles: [
        {
          id: 'stored-empty-image',
          candidateId: 'candidate-empty-image',
          slug: 'stored-empty-image',
          lane: 'official',
          heroImage: '',
          heroImagePolicy: 'source_allowed',
        },
        {
          id: 'stored-favicon-image',
          candidateId: 'candidate-favicon-image',
          slug: 'stored-favicon-image',
          lane: 'openings',
          heroImage: 'https://example.com/favicon.ico',
          heroImagePolicy: 'source_allowed',
        },
        {
          id: 'stored-brightspot-transform-image',
          candidateId: 'candidate-brightspot-transform-image',
          slug: 'stored-brightspot-transform-image',
          lane: 'community',
          heroImage:
            'https://npr.brightspotcdn.com/dims4/default/87a2150/2147483647/strip/true/crop/3000x1575+0+213/resize/1200x630!/quality/90?url=http%3A%2F%2Fnpr-brightspot.s3.amazonaws.com%2F95%2F7b%2Fimage.JPG',
          heroImagePolicy: 'source_allowed',
        },
      ],
    });

    expect(store.articles).toHaveLength(3);
    expect(store.articles[0]?.heroImagePolicy).toBe('fallback_only');
    expect(store.articles[0]?.heroImage).toBe('/home-neighborhood/phoenix-card.webp');
    expect(store.articles[1]?.heroImagePolicy).toBe('fallback_only');
    expect(store.articles[1]?.heroImage).toBe(
      '/directory-ai-replacements/old-town-taste-tempe-v2.webp'
    );
    expect(store.articles[2]?.heroImagePolicy).toBe('fallback_only');
    expect(store.articles[2]?.heroImage).toBe('/home-neighborhood/tempe-card.webp');
  });

  it('repairs city radar article images with site-local fallback assets', () => {
    const store = normalizeStore(
      {
        ...defaultStoreSnapshot(),
        articles: [
          {
            id: 'la-stored-opening',
            candidateId: 'candidate-la-stored-opening',
            slug: 'la-stored-opening',
            lane: 'openings',
            heroImage: '',
            heroImagePolicy: 'source_allowed',
          },
        ],
      },
      'los-angeles'
    );

    expect(store.articles[0]?.heroImagePolicy).toBe('fallback_only');
    expect(store.articles[0]?.heroImage).toBe('/city-site-images/alhambra-main-street.webp');
  });

  it('accepts Arizona sources that are not in the manifest by inferring source metadata', () => {
    const result = applyDraftsToStore(
      defaultStoreSnapshot(),
      [
        {
          sourceName: 'ABC15 Arizona',
          sourceUrl: 'https://www.abc15.com/entertainment/events/phoenix-night-market-expands',
          canonicalUrl:
            'https://www.abc15.com/entertainment/events/phoenix-night-market-expands?utm_source=test',
          sourcePublishedAt: '2026-04-18T10:00:00.000Z',
          titleEn: 'Phoenix night market expands with more local vendors',
          titleZh: 'Phoenix 夜市擴大並加入更多本地攤商',
          excerptEn: 'The Phoenix event is adding vendors, food stalls, and late-night programming.',
          excerptZh: 'Phoenix 活動新增攤商、美食攤位與夜間節目。',
          bodyEn: [
            'Organizers say the Phoenix night market is growing with more local vendors and a broader food lineup.',
            'The updated format is designed to draw larger evening crowds and give small Arizona businesses more exposure.',
          ],
          bodyZh: [
            '主辦方表示，Phoenix 夜市正在擴大，新增更多本地攤商與更完整的餐飲陣容。',
            '更新後的形式旨在吸引更多晚間人潮，並讓亞利桑那小型商家獲得更多曝光。',
          ],
          topicFingerprint: 'phoenix night market expansion',
          heroImage: 'https://www.abc15.com/assets/phoenix-night-market.jpg',
        },
      ],
      {
        manifest: [...manifest],
        publishCap: 10,
        now: '2026-04-18T12:00:00.000Z',
      }
    );

    expect(result.summary.publishedCount).toBe(1);
    expect(result.store.articles).toHaveLength(1);
    expect(result.store.candidates).toHaveLength(1);
    expect(result.store.candidates[0]?.sourceSlug).toBe('abc15-arizona');
    expect(result.store.articles[0]?.sourceName).toBe('ABC15 Arizona');
    expect(result.store.articles[0]?.sourcePolicy).toBe('summary_link');
    expect(result.store.articles[0]?.heroImagePolicy).toBe('source_allowed');
  });

  it('blocks generated drafts whose primary source URL is unsafe', () => {
    const result = applyDraftsToStore(
      defaultStoreSnapshot(),
      [
        {
          sourceName: 'Injected Local Endpoint',
          sourceUrl: 'http://127.0.0.1:3000/admin',
          canonicalUrl: 'javascript:alert(1)',
          sourcePublishedAt: '2026-04-18T10:00:00.000Z',
          titleEn: 'Phoenix local update should not publish',
          titleZh: 'Phoenix 本地更新不應發布',
          excerptEn: 'A generated item must not publish unsafe source links.',
          excerptZh: '生成內容不得發布不安全來源連結。',
          bodyEn: ['This looks like city news, but the source URL points at an unsafe location.'],
          bodyZh: ['這看起來像城市新聞，但來源連結指向不安全位置。'],
          topicFingerprint: 'unsafe source url injection',
        },
      ],
      {
        manifest: [...manifest],
        publishCap: 10,
        now: '2026-04-18T12:00:00.000Z',
      }
    );

    expect(result.summary.publishedCount).toBe(0);
    expect(result.summary.blockedCount).toBe(1);
    expect(result.store.articles).toHaveLength(0);
    expect(result.store.candidates[0]).toMatchObject({
      moderationState: 'blocked',
      blockReason: 'missing_source_url',
    });
  });

  it('drops unsafe optional source and hero URLs without weakening valid source-linked articles', () => {
    const result = applyDraftsToStore(
      defaultStoreSnapshot(),
      [
        {
          sourceName: 'Austin Public News',
          sourceUrl: 'https://news.example/austin/transit-update?utm_source=test',
          canonicalUrl: 'https://news.example/austin/transit-update?utm_source=test',
          additionalSourceUrls: [
            'file:///etc/passwd',
            'https://city.example/austin/transit-doc?utm_campaign=radar',
            'http://127.0.0.1:8080/private',
          ],
          sourcePublishedAt: '2026-04-18T10:00:00.000Z',
          titleEn: 'Austin transit update stays source linked',
          titleZh: 'Austin 交通更新保留來源連結',
          excerptEn: 'A concise city news summary keeps safe source links.',
          excerptZh: '精簡城市新聞摘要保留安全來源連結。',
          bodyEn: ['Austin readers get a brief summary with safe links back to public sources.'],
          bodyZh: ['Austin 讀者可閱讀簡短摘要，並透過安全連結回到公開來源。'],
          heroImage: 'http://127.0.0.1:8080/private-image.jpg',
          topicFingerprint: 'austin transit source link safety',
        },
      ],
      {
        manifest: [...manifest],
        publishCap: 10,
        now: '2026-04-18T12:00:00.000Z',
      }
    );

    expect(result.summary.publishedCount).toBe(1);
    expect(result.summary.blockedCount).toBe(0);
    expect(result.store.articles[0]?.sourcePolicy).toBe('summary_link');
    expect(result.store.articles[0]?.sourceLinks).toEqual([
      expect.objectContaining({ url: 'https://news.example/austin/transit-update' }),
      expect.objectContaining({ url: 'https://city.example/austin/transit-doc' }),
    ]);
    expect(result.store.articles[0]?.heroImagePolicy).toBe('fallback_only');
    expect(result.store.articles[0]?.heroImage).toBe('/home-neighborhood/tempe-card.webp');
  });

  it('infers signal_only handling for Arizona social sources outside the manifest', () => {
    const result = applyDraftsToStore(
      defaultStoreSnapshot(),
      [
        {
          sourceName: 'Phoenix Food Scene',
          sourceUrl: 'https://www.instagram.com/p/test-arizona-social/',
          canonicalUrl: 'https://www.instagram.com/p/test-arizona-social/',
          titleEn: 'Phoenix restaurant buzz grows around weekend popup',
          titleZh: 'Phoenix 週末快閃餐飲話題升溫',
          excerptEn: 'A trend summary about repeated Phoenix chatter around the popup.',
          excerptZh: '整理 Phoenix 社群對快閃活動的重複討論。',
          bodyEn: ['The popup keeps resurfacing across Phoenix restaurant chatter this week.'],
          bodyZh: ['這個快閃活動本週持續出現在 Phoenix 餐飲社群討論中。'],
          topicFingerprint: 'phoenix popup restaurant chatter',
          heroImage: 'https://cdn.instagram.com/not-allowed.jpg',
        },
      ],
      {
        manifest: [...manifest],
        publishCap: 10,
        now: '2026-04-18T12:00:00.000Z',
      }
    );

    expect(result.summary.publishedCount).toBe(1);
    expect(result.store.articles[0]?.sourceType).toBe('social_signal');
    expect(result.store.articles[0]?.sourcePolicy).toBe('signal_only');
    expect(result.store.articles[0]?.heroImagePolicy).toBe('fallback_only');
    expect(result.store.articles[0]?.heroImage).toBe('/home-neighborhood/scottsdale-card.webp');
  });

  it('uses city-local fallback images for generated Austin articles without usable source art', () => {
    const result = applyDraftsToStore(
      defaultStoreSnapshot(),
      [
        {
          sourceName: 'Austin Community News',
          sourceUrl: 'https://news.example/austin/community-update',
          canonicalUrl: 'https://news.example/austin/community-update',
          sourcePublishedAt: '2026-04-18T10:00:00.000Z',
          titleEn: 'Austin community center update adds weekend services',
          titleZh: 'Austin 社區中心更新新增週末服務',
          excerptEn: 'A concise Austin community update keeps source links while using local fallback art.',
          excerptZh: '一則簡短的 Austin 社區更新保留來源連結並使用本地備用圖片。',
          bodyEn: ['Austin readers get a source-linked summary for the community update.'],
          bodyZh: ['Austin 讀者可閱讀附來源連結的社區更新摘要。'],
          topicFingerprint: 'austin community local fallback art',
          heroImage: 'https://news.example/assets/logo.png',
        },
      ],
      {
        manifest: [...manifest],
        publishCap: 10,
        now: '2026-04-18T12:00:00.000Z',
        siteKey: 'austin',
      }
    );

    expect(result.summary.publishedCount).toBe(1);
    expect(result.store.articles[0]?.heroImagePolicy).toBe('fallback_only');
    expect(result.store.articles[0]?.heroImage).toBe('/city-site-images/austin-skyline-lake.webp');
  });

  it('uses city-local fallback images for generated LA articles with broken Brightspot transforms', () => {
    const result = applyDraftsToStore(
      defaultStoreSnapshot(),
      [
        {
          sourceName: 'Los Angeles Times',
          sourceUrl: 'https://www.latimes.com/california/story/test-item',
          canonicalUrl: 'https://www.latimes.com/california/story/test-item',
          sourcePublishedAt: '2026-06-05T10:00:00.000Z',
          titleEn: 'Los Angeles update uses fallback art',
          titleZh: '洛杉磯更新使用備用圖片',
          excerptEn: 'A concise Los Angeles summary keeps source links while replacing broken CDN art.',
          excerptZh: '一則簡短的洛杉磯摘要保留來源連結並改用備用圖片。',
          bodyEn: ['Los Angeles readers get a source-linked summary with stable local artwork.'],
          bodyZh: ['洛杉磯讀者可閱讀附來源連結並使用穩定本地圖片的摘要。'],
          topicFingerprint: 'los angeles broken brightspot fallback art',
          heroImage:
            'https://ca-times.brightspotcdn.com/dims4/default/cdbaa47/2147483647/strip/true/crop/3900x2048+0+285/resize/1200x630!/quality/75?url=https%3A%2F%2Fcalifornia-times-brightspot.s3.amazonaws.com%2Fimage.jpg',
        },
      ],
      {
        manifest: [...manifest],
        publishCap: 10,
        now: '2026-06-05T12:00:00.000Z',
        siteKey: 'los-angeles',
      }
    );

    expect(result.summary.publishedCount).toBe(1);
    expect(result.store.articles[0]?.heroImagePolicy).toBe('fallback_only');
    expect(result.store.articles[0]?.heroImage).toBe('/city-site-images/los-angeles-community-hero.webp');
  });

  it('suppresses duplicates by canonical url for web items and by topic fingerprint for social items', () => {
    const result = applyDraftsToStore(
      defaultStoreSnapshot(),
      [
        makeWebDraft(1),
        {
          ...makeWebDraft(1),
          titleEn: 'Opening item 1 duplicate',
          canonicalUrl: 'https://whatnow.com/phoenix/restaurants/item-1/',
        },
        {
          sourceSlug: 'instagram-downtown-phoenix',
          sourceUrl: 'https://www.instagram.com/p/test-3/',
          canonicalUrl: 'https://www.instagram.com/p/test-3/',
          titleEn: 'Phoenix social signal',
          titleZh: 'Phoenix 社群訊號',
          excerptEn: 'First trend writeup.',
          excerptZh: '第一則趨勢摘要。',
          bodyEn: ['Signal summary one.'],
          bodyZh: ['訊號摘要一。'],
          topicFingerprint: 'phoenix social signal',
        },
        {
          sourceSlug: 'instagram-downtown-phoenix',
          sourceUrl: 'https://www.instagram.com/p/test-4/',
          canonicalUrl: 'https://www.instagram.com/p/test-4/',
          titleEn: 'Phoenix social signal rerun',
          titleZh: 'Phoenix 社群訊號重跑',
          excerptEn: 'Second trend writeup.',
          excerptZh: '第二則趨勢摘要。',
          bodyEn: ['Signal summary two.'],
          bodyZh: ['訊號摘要二。'],
          topicFingerprint: 'phoenix social signal',
        },
      ],
      {
        manifest: [...manifest],
        publishCap: 10,
        now: '2026-04-18T12:00:00.000Z',
      }
    );

    expect(result.summary.publishedCount).toBe(2);
    expect(result.summary.duplicateCount).toBe(2);
    expect(result.store.articles).toHaveLength(2);
  });

  it('caps publication at 10 items and queues overflow candidates', () => {
    const drafts = Array.from({ length: 12 }, (_, index) => makeWebDraft(index + 1));
    const result = applyDraftsToStore(defaultStoreSnapshot(), drafts, {
      manifest: [...manifest],
      publishCap: 10,
      now: '2026-04-18T12:00:00.000Z',
    });

    expect(result.summary.publishedCount).toBe(10);
    expect(result.store.articles).toHaveLength(12);
    expect(result.store.candidates).toHaveLength(12);
    expect(result.store.candidates.filter((candidate) => candidate.moderationState === 'queued')).toHaveLength(2);
    expect(result.store.articles.filter((article) => article.isPublished)).toHaveLength(10);
    expect(result.store.articles.filter((article) => !article.isPublished)).toHaveLength(2);
  });

  it('publishes queued draft articles on later runs without requiring the same draft again', () => {
    const first = applyDraftsToStore(
      defaultStoreSnapshot(),
      Array.from({ length: 12 }, (_, index) => makeWebDraft(index + 1)),
      {
        manifest: [...manifest],
        publishCap: 10,
        now: '2026-04-18T12:00:00.000Z',
      }
    );
    const second = applyDraftsToStore(first.store, [], {
      manifest: [...manifest],
      publishCap: 10,
      now: '2026-04-18T12:05:00.000Z',
    });

    expect(second.summary.publishedCount).toBe(2);
    expect(second.store.candidates.filter((candidate) => candidate.moderationState === 'published')).toHaveLength(12);
    expect(second.store.articles.filter((article) => article.isPublished)).toHaveLength(12);
    expect(second.store.articles.filter((article) => !article.isPublished)).toHaveLength(0);
  });

  it('updates copy for already-published items without creating duplicate articles', () => {
    const first = applyDraftsToStore(defaultStoreSnapshot(), [makeWebDraft(1)], {
      manifest: [...manifest],
      publishCap: 10,
      now: '2026-04-18T12:00:00.000Z',
    });
    const rewrittenDraft = {
      ...makeWebDraft(1),
      titleEn: 'Project LeanNation plans Peoria meal prep shop',
      excerptEn: 'Project LeanNation Lake Pleasant is being built in Peoria.',
      bodyEn: [
        'Project LeanNation Lake Pleasant is being built at 9785 W. Happy Valley Road in Peoria.',
        'The Peoria shop would sell prepared meals and pair them with nutrition coaching.',
        'Early customers can sign up for a founding membership with a $20 discount on each box.',
      ],
    };
    const second = applyDraftsToStore(first.store, [rewrittenDraft], {
      manifest: [...manifest],
      publishCap: 10,
      now: '2026-04-18T12:05:00.000Z',
    });

    expect(second.summary.publishedCount).toBe(0);
    expect(second.summary.duplicateCount).toBe(1);
    expect(second.store.candidates).toHaveLength(1);
    expect(second.store.articles).toHaveLength(1);
    expect(second.store.articles[0]?.title).toMatchObject({
      en: 'Project LeanNation plans Peoria meal prep shop',
    });
    expect((second.store.articles[0]?.body as Array<{ en: string }>).map((paragraph) => paragraph.en)).toEqual(
      rewrittenDraft.bodyEn
    );
  });

  it('blocks generated copy that frames the article as a source report', () => {
    const result = applyDraftsToStore(
      defaultStoreSnapshot(),
      [
        {
          ...makeWebDraft(1),
          excerptEn: 'What Now Phoenix reports that Project LeanNation Lake Pleasant is being built in Peoria.',
          bodyEn: [
            'Project LeanNation Lake Pleasant is being built at 9785 W. Happy Valley Road in Peoria.',
            'The source says early customers can sign up for a founding membership with a $20 discount on each box.',
          ],
        },
      ],
      {
        manifest: [...manifest],
        publishCap: 10,
        now: '2026-04-18T12:00:00.000Z',
      }
    );

    expect(result.summary.publishedCount).toBe(0);
    expect(result.summary.blockedCount).toBe(1);
    expect(result.store.candidates[0]).toMatchObject({
      moderationState: 'blocked',
      blockReason: 'source_provenance_language',
    });
  });
});
