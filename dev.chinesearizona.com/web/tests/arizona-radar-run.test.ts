import { createRequire } from 'node:module';
import dns from 'node:dns';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const {
  parseFeedItems,
  collectDraftsFromFeeds,
  extractJsonPayload,
  fetchText,
  getSiteConfig,
  lookupPublicFetchAddress,
  parseArgs,
  parseHermesOutput,
  runWorker,
} = require('../scripts/arizona_radar/run.cjs') as {
  collectDraftsFromFeeds: (
    manifest: Array<Record<string, unknown>>,
    options: Record<string, unknown>
  ) => Promise<Array<Record<string, unknown>>>;
  extractJsonPayload: (text: string) => string;
  fetchText: (url: string, timeoutMs: number, siteConfig?: { brandName: string }) => Promise<string>;
  getSiteConfig: (siteKey: string) => Record<string, unknown>;
  lookupPublicFetchAddress: (
    hostname: string,
    options: { all?: boolean; family?: number; hints?: number },
    callback: (
      error: Error | null,
      address?: string | Array<{ address: string; family: number }>,
      family?: number
    ) => void
  ) => void;
  parseFeedItems: (
    xml: string,
    source: Record<string, unknown>,
    options: { lookbackHours: number; maxItems: number; now: string }
  ) => Array<Record<string, unknown>>;
  parseArgs: (argv: string[]) => {
    feedTimeoutMs: number;
    hermesMaxTurns: number;
    retryEmpty: boolean;
    sourceBatchSize: number;
  };
  parseHermesOutput: (text: string) => Array<Record<string, unknown>>;
  runWorker: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  RADAR_STORAGE_MODE: process.env.RADAR_STORAGE_MODE,
};
const originalFetch = globalThis.fetch;

function mockPublicDnsResolution() {
  vi.spyOn(dns.promises, 'lookup').mockResolvedValue([
    { address: '93.184.216.34', family: 4 },
  ] as never);
}

function lookupFetchAddress(
  hostname: string,
  options: { all?: boolean; family?: number; hints?: number } = {}
) {
  return new Promise<{
    address?: string | Array<{ address: string; family: number }>;
    family?: number;
  }>((resolve, reject) => {
    lookupPublicFetchAddress(hostname, options, (error, address, family) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ address, family });
    });
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe('Arizona Radar worker command parsing', () => {
  it('parses bounded cron controls', () => {
    const args = parseArgs([
      'node',
      'scripts/arizona_radar/run.cjs',
      'run',
      '--hermes-max-turns=7',
      '--feed-timeout-ms=8000',
      '--retry-empty=0',
      '--source-batch-size=3',
    ]);

    expect(args.feedTimeoutMs).toBe(8000);
    expect(args.hermesMaxTurns).toBe(7);
    expect(args.retryEmpty).toBe(false);
    expect(args.sourceBatchSize).toBe(3);
  });

  it('uses the active source batch for feed rewriting', () => {
    const worker = fs.readFileSync(
      path.join(__dirname, '..', 'scripts', 'arizona_radar', 'run.cjs'),
      'utf8'
    );

    expect(worker).toContain('await collectDraftsFromFeeds(activeManifest, {');
    expect(worker).not.toContain('await collectDraftsFromFeeds(filteredManifest, {');
  });
});

describe('Arizona Radar feed fallback', () => {
  it('follows only manually validated public feed redirects', async () => {
    mockPublicDnsResolution();
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      if (String(url) === 'https://example.com/feed.xml') {
        return new Response('', {
          status: 302,
          headers: { location: 'https://example.com/final.xml?utm_source=test' },
        });
      }
      if (String(url) === 'https://example.com/final.xml?utm_source=test') {
        return new Response('<rss version="2.0"><channel /></rss>', {
          status: 200,
          headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
        });
      }

      throw new Error(`Unexpected fetch: ${String(url)}`);
    }) as typeof fetch;

    await expect(
      fetchText('https://example.com/feed.xml', 1000, { brandName: 'TestRadar' })
    ).resolves.toContain('<rss');

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://example.com/feed.xml',
      expect.objectContaining({
        dispatcher: expect.any(Object),
        headers: expect.objectContaining({
          'accept-encoding': 'identity',
        }),
        redirect: 'manual',
      })
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      'https://example.com/final.xml?utm_source=test',
      expect.objectContaining({
        dispatcher: expect.any(Object),
        redirect: 'manual',
      })
    );
  });

  it('infers a same-URL trailing slash when the safe dispatcher hides redirect location', async () => {
    mockPublicDnsResolution();
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      if (String(url) === 'https://whatnow.com/austin/restaurants/sample-austin-opening') {
        return new Response('', {
          status: 301,
        });
      }
      if (String(url) === 'https://whatnow.com/austin/restaurants/sample-austin-opening/') {
        return new Response('<html><article><p>Austin opening update.</p></article></html>', {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
      }

      throw new Error(`Unexpected fetch: ${String(url)}`);
    }) as typeof fetch;

    await expect(
      fetchText('https://whatnow.com/austin/restaurants/sample-austin-opening', 1000, {
        brandName: 'ChineseAustin',
      })
    ).resolves.toContain('Austin opening update');

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      'https://whatnow.com/austin/restaurants/sample-austin-opening/',
      expect.objectContaining({
        redirect: 'manual',
      })
    );
  });

  it.each([
    ['localhost redirect', 'http://localhost/admin'],
    ['credentialed redirect', 'https://user:pass@example.com/admin'],
    ['non-http redirect', 'file:///etc/passwd'],
    ['metadata literal redirect', 'http://169.254.169.254/latest/meta-data/'],
  ])('blocks unsafe feed redirects to %s', async (_label, location) => {
    mockPublicDnsResolution();
    globalThis.fetch = vi.fn(async () => {
      return new Response('', {
        status: 302,
        headers: { location },
      });
    }) as typeof fetch;

    await expect(
      fetchText('https://example.com/feed.xml', 1000, { brandName: 'TestRadar' })
    ).rejects.toThrow('Unsafe feed redirect.');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('blocks redirects whose target resolves to a private address', async () => {
    vi.spyOn(dns.promises, 'lookup').mockImplementation(async (hostname: string) => {
      if (hostname === 'private.example') {
        return [{ address: '10.0.0.7', family: 4 }] as never;
      }

      return [{ address: '93.184.216.34', family: 4 }] as never;
    });
    globalThis.fetch = vi.fn(async () => {
      return new Response('', {
        status: 302,
        headers: { location: 'https://private.example/feed.xml' },
      });
    }) as typeof fetch;

    await expect(
      fetchText('https://example.com/feed.xml', 1000, { brandName: 'TestRadar' })
    ).rejects.toThrow('Unsafe fetch URL.');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('stops following feed redirects after a low maximum', async () => {
    mockPublicDnsResolution();
    globalThis.fetch = vi.fn(async () => {
      return new Response('', {
        status: 302,
        headers: { location: 'https://example.com/next.xml' },
      });
    }) as typeof fetch;

    await expect(
      fetchText('https://example.com/feed.xml', 1000, { brandName: 'TestRadar' })
    ).rejects.toThrow('Too many feed redirects.');

    expect(globalThis.fetch).toHaveBeenCalledTimes(6);
  });

  it('rejects unsafe addresses from the connection-time lookup path', async () => {
    vi.spyOn(dns.promises, 'lookup').mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '169.254.169.254', family: 4 },
    ] as never);

    await expect(lookupFetchAddress('metadata.example')).rejects.toThrow('Unsafe fetch URL.');
  });

  it('returns only validated public addresses from the connection-time lookup path', async () => {
    mockPublicDnsResolution();

    await expect(lookupFetchAddress('example.com')).resolves.toEqual({
      address: '93.184.216.34',
      family: 4,
    });
    await expect(lookupFetchAddress('example.com', { all: true })).resolves.toEqual({
      address: [{ address: '93.184.216.34', family: 4 }],
      family: undefined,
    });
  });

  it('parses recent WordPress RSS items into rewrite seeds without copying article bodies', () => {
    const fixture = fs.readFileSync(
      path.join(__dirname, 'fixtures', 'whatnow-phoenix-feed.xml'),
      'utf8'
    );
    const drafts = parseFeedItems(
      fixture,
      {
        slug: 'what-now-phoenix',
        name: 'What Now Phoenix',
        url: 'https://whatnow.com/phoenix/',
        feedUrl: 'https://whatnow.com/phoenix/feed/',
        sourceType: 'local_media',
        sourcePolicy: 'summary_link',
        lane: 'openings',
      },
      {
        lookbackHours: 168,
        maxItems: 10,
        now: '2026-05-29T05:00:00.000Z',
      }
    );

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      sourceSlug: 'what-now-phoenix',
      sourceName: 'What Now Phoenix',
      sourcePublishedAt: '2026-05-27T03:39:37.000Z',
      canonicalUrl:
        'https://whatnow.com/phoenix/restaurants/sample-phoenix-storefront-opening-signal',
      heroImage: 'https://whatnow.com/wp-content/uploads/2026/05/project-leannation.jpg',
      sourceUrl:
        'https://whatnow.com/phoenix/restaurants/sample-phoenix-storefront-opening-signal',
      feedExcerpt: 'A Peoria storefront is planned for summer 2026.',
      feedCategory: 'Restaurants',
    });
    expect(String(drafts[0]?.feedExcerpt)).not.toContain(
      'Synthetic fixture sentence that must not be copied into generated radar copy.'
    );
    expect(drafts[0]).not.toHaveProperty('bodyEn');
  });

  it('ignores feed items whose article links point at unsafe URLs', () => {
    const drafts = parseFeedItems(
      `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <item>
            <title>Private endpoint should not be fetched</title>
            <link>http://127.0.0.1:3000/admin</link>
            <pubDate>Fri, 29 May 2026 10:00:00 GMT</pubDate>
            <description>A forged item that should not become a rewrite seed.</description>
          </item>
          <item>
            <title>Phoenix public news item remains eligible</title>
            <link>https://whatnow.com/phoenix/restaurants/public-item/?utm_source=test</link>
            <pubDate>Fri, 29 May 2026 10:00:00 GMT</pubDate>
            <description>A public item that can still become a city news seed.</description>
          </item>
        </channel>
      </rss>`,
      {
        slug: 'what-now-phoenix',
        name: 'What Now Phoenix',
        url: 'https://whatnow.com/phoenix/',
        feedUrl: 'https://whatnow.com/phoenix/feed/',
        sourceType: 'local_media',
        sourcePolicy: 'summary_link',
        lane: 'openings',
      },
      {
        lookbackHours: 48,
        maxItems: 10,
        now: '2026-05-30T10:00:00.000Z',
      }
    );

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      titleEn: 'Phoenix public news item remains eligible',
      canonicalUrl: 'https://whatnow.com/phoenix/restaurants/public-item',
    });
  });

  it('does not fetch feed URLs that resolve to private addresses', async () => {
    vi.spyOn(dns.promises, 'lookup').mockResolvedValue([
      { address: '10.0.0.5', family: 4 },
    ] as never);
    globalThis.fetch = vi.fn() as typeof fetch;

    const drafts = await collectDraftsFromFeeds(
      [
        {
          slug: 'private-feed',
          name: 'Private Feed',
          url: 'https://private.example/',
          feedUrl: 'https://private.example/feed/',
          sourceType: 'local_media',
          sourcePolicy: 'summary_link',
          lane: 'openings',
        },
      ],
      {
        lookbackHours: 48,
        maxItems: 10,
        now: '2026-05-30T10:00:00.000Z',
        timeoutMs: 1000,
      }
    );

    expect(drafts).toEqual([]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('does not fetch feed article URLs that resolve to private addresses', async () => {
    vi.spyOn(dns.promises, 'lookup').mockImplementation(async (hostname: string) => {
      if (hostname === 'private.example') {
        return [{ address: '127.0.0.1', family: 4 }] as never;
      }

      return [{ address: '93.184.216.34', family: 4 }] as never;
    });

    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      if (String(url) === 'https://whatnow.com/phoenix/feed/') {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
          <rss version="2.0">
            <channel>
              <item>
                <title>Private hostname should not be fetched</title>
                <link>https://private.example/admin</link>
                <pubDate>Fri, 29 May 2026 10:00:00 GMT</pubDate>
                <description>A forged item that should not be fetched.</description>
              </item>
            </channel>
          </rss>`,
          {
            status: 200,
            headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
          }
        );
      }

      throw new Error(`Unexpected fetch: ${String(url)}`);
    }) as typeof fetch;

    const drafts = await collectDraftsFromFeeds(
      [
        {
          slug: 'what-now-phoenix',
          name: 'What Now Phoenix',
          url: 'https://whatnow.com/phoenix/',
          feedUrl: 'https://whatnow.com/phoenix/feed/',
          sourceType: 'local_media',
          sourcePolicy: 'summary_link',
          lane: 'openings',
        },
      ],
      {
        lookbackHours: 48,
        maxItems: 10,
        now: '2026-05-30T10:00:00.000Z',
        timeoutMs: 1000,
      }
    );

    expect(drafts).toEqual([]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://whatnow.com/phoenix/feed/',
      expect.any(Object)
    );
  });

  it('publishes rewritten feed articles when broad Hermes returns no candidates', async () => {
    process.env.NODE_ENV = 'test';
    process.env.RADAR_STORAGE_MODE = 'file';
    mockPublicDnsResolution();

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-feed-fallback-'));
    const hermesBin = path.join(tempDir, 'hermes-rewrite');
    const promptPath = path.join(tempDir, 'prompt.txt');
    const storePath = path.join(tempDir, 'store.json');
    fs.writeFileSync(
      hermesBin,
      [
        '#!/usr/bin/env node',
        'const fs = require("node:fs");',
        `const promptPath = ${JSON.stringify(promptPath)};`,
        'const prompt = process.argv[process.argv.length - 1] || "";',
        'fs.appendFileSync(promptPath, `${prompt}\\n---CALL---\\n`, "utf8");',
        'if (prompt.includes("Rewrite these Arizona Radar RSS items")) {',
        '  console.log(JSON.stringify([{',
        '    sourceSlug: "what-now-phoenix",',
        '    sourceName: "What Now Phoenix",',
        '    sourceUrl: "https://whatnow.com/phoenix/restaurants/sample-phoenix-storefront-opening-signal",',
        '    canonicalUrl: "https://whatnow.com/phoenix/restaurants/sample-phoenix-storefront-opening-signal",',
        '    sourcePublishedAt: "2026-05-27T03:39:37.000Z",',
        '    titleEn: "Project LeanNation plans Peoria meal prep shop",',
        '    titleZh: "Project LeanNation 計畫在 Peoria 開設備餐門市",',
        '    excerptEn: "Project LeanNation Lake Pleasant is under construction in Peoria, with a summer 2026 opening planned after city approvals.",',
        '    excerptZh: "Project LeanNation Lake Pleasant 正在 Peoria 施工，待市府核准後計畫於 2026 年夏季開幕。",',
        '    bodyEn: [',
        '      "Project LeanNation Lake Pleasant is being built at 9785 W. Happy Valley Road in Peoria. Owners Kyle and Courtney Bridges are aiming for a summer 2026 opening, pending city approvals.",',
        '      "The Peoria shop would sell prepared meals and pair them with nutrition coaching. Memberships include InBody body composition scans and individual sessions with nutrition educators. The model is meant for customers who want healthier meals without building each week around cooking and planning.",',
        '      "The planned meal boxes include 12, 18, 24, or 30 meals for recurring pickup. Early customers can sign up for a founding membership with a $20 discount on each box.",',
        '      "For Arizona readers, the opening would add another health focused prepared food option in the northwest Valley. The store plans rotating meals, breakfast items, protein snacks, juices, shakes, and supplements. Menu examples include Baja Beef, Sicilian Shrimp, Nashville Hot Chicken, Balsamic Burger, and protein ball flavors."',
        '    ],',
        '    bodyZh: [',
        '      "Project LeanNation Lake Pleasant 正在 Peoria 的 9785 W. Happy Valley Road 施工。業主 Kyle 和 Courtney Bridges 目標是在市府核准後於 2026 年夏季開幕。",',
        '      "這家 Peoria 門市將銷售備餐產品，並搭配營養諮詢。會員包含 InBody 身體組成掃描，以及與營養教育人員的一對一諮詢。這種模式面向想吃得更健康、但不想每週花大量時間規劃和烹調的顧客。",',
        '      "規劃中的餐盒有 12、18、24 或 30 餐，可定期取餐。早期顧客可加入創始會員方案，每盒折扣 20 美元。",',
        '      "對亞利桑那讀者來說，這項開店計畫會讓西北谷增加一個健康備餐選擇。門市計畫供應輪替餐點、早餐、蛋白點心、果汁、奶昔與補充品。菜單例子包含 Baja Beef、Sicilian Shrimp、Nashville Hot Chicken、Balsamic Burger 與蛋白球口味。"',
        '    ],',
        '    heroImage: "https://whatnow.com/wp-content/uploads/2026/05/project-leannation.jpg",',
        '    topicFingerprint: "what-now-phoenix-project-leannation-peoria"',
        '  }]));',
        '} else {',
        '  console.log("[]");',
        '}',
      ].join('\n'),
      'utf8'
    );
    fs.chmodSync(hermesBin, 0o755);

    const fixture = fs.readFileSync(
      path.join(__dirname, 'fixtures', 'whatnow-phoenix-feed.xml'),
      'utf8'
    );
    const articleFixture = fs.readFileSync(
      path.join(__dirname, 'fixtures', 'whatnow-phoenix-article.html'),
      'utf8'
    );
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      if (String(url) === 'https://whatnow.com/phoenix/feed/') {
        return new Response(fixture, {
          status: 200,
          headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
        });
      }
      if (
        String(url) ===
        'https://whatnow.com/phoenix/restaurants/sample-phoenix-storefront-opening-signal'
      ) {
        return new Response(articleFixture, {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
      }

      throw new Error(`Unexpected fetch: ${String(url)}`);
    }) as typeof fetch;

    const result = await runWorker({
      command: 'run',
      draftMultiplier: 1,
      feedTimeoutMs: 1000,
      fixturePath: '',
      hermesBin,
      hermesMaxTurns: 1,
      hermesTimeoutMs: 1000,
      lookbackHours: 168,
      maxItems: 10,
      retryEmpty: false,
      sourceBatchSize: 0,
      sourceSlugs: '',
      storePath,
    });
    const store = JSON.parse(fs.readFileSync(storePath, 'utf8')) as {
      articles: Array<Record<string, unknown>>;
      runs: Array<Record<string, unknown>>;
    };

    expect(result.status).toBe('completed');
    expect(result.publishedCount).toBe(1);
    expect(store.articles).toHaveLength(1);
    expect(store.articles[0]).toMatchObject({
      sourceName: 'What Now Phoenix',
      sourcePolicy: 'summary_link',
      isPublished: true,
    });
    expect(store.articles[0].body).toHaveLength(4);
    expect(String(store.articles[0].body)).not.toMatch(
      /ChineseArizona detected|opening indicator|opening signal|source categorizes|pivotal|showcasing/i
    );
    expect(String(store.articles[0].body)).not.toMatch(/meal-prep|health-focused|one-on-one/i);
    expect(String(store.articles[0].body)).not.toContain(
      'A health-focused meal-prep concept is preparing to open in Peoria.'
    );
    expect(store.runs[0]).toMatchObject({
      status: 'completed',
      publishedCount: 1,
    });
    const capturedPrompt = fs.readFileSync(promptPath, 'utf8');
    expect(capturedPrompt).toContain('Rewrite these Arizona Radar RSS items');
    expect(capturedPrompt).toContain('full, original ChineseArizona articles');
    expect(capturedPrompt).toContain('Do not copy source sentences or make a close paraphrase');
    expect(capturedPrompt).toContain('Do not use common hyphenated word pairs');
    expect(capturedPrompt).toContain('Do not frame the rewrite as source attribution');
    expect(capturedPrompt).toContain('Project LeanNation Lake Pleasant is under construction');
  });

  it('passes Brightspot article body text into Austin feed rewrite prompts', async () => {
    process.env.NODE_ENV = 'test';
    process.env.RADAR_STORAGE_MODE = 'file';
    mockPublicDnsResolution();

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'austin-brightspot-feed-'));
    const hermesBin = path.join(tempDir, 'hermes-austin-rewrite');
    const promptPath = path.join(tempDir, 'prompt.txt');
    fs.writeFileSync(
      hermesBin,
      [
        '#!/usr/bin/env node',
        'const fs = require("node:fs");',
        `const promptPath = ${JSON.stringify(promptPath)};`,
        'const prompt = process.argv[process.argv.length - 1] || "";',
        'fs.writeFileSync(promptPath, prompt, "utf8");',
        'console.log(JSON.stringify([{',
        '  sourceSlug: "kut-austin",',
        '  sourceName: "KUT Austin",',
        '  sourceUrl: "https://www.kut.org/education/2026-06-01/austin-isd-librarian-cuts-spark-backlash-after-district-reverses-course",',
        '  canonicalUrl: "https://www.kut.org/education/2026-06-01/austin-isd-librarian-cuts-spark-backlash-after-district-reverses-course",',
        '  sourcePublishedAt: "2026-06-01T15:00:11.000Z",',
        '  titleEn: "Austin ISD librarian cuts draw backlash",',
        '  titleZh: "奥斯汀学区图书馆员调整引发反弹",',
        '  excerptEn: "Austin ISD is moving some campuses to shared librarian coverage after earlier budget-cut assurances.",',
        '  excerptZh: "奥斯汀学区在先前保证后，将部分校区改为共享图书馆员配置。",',
        '  bodyEn: ["Austin ISD told some smaller campuses they will share librarians next school year, reversing earlier assurances that library roles would be protected during budget planning. The change matters for families because it could reduce daily library access and student programming."],',
        '  bodyZh: ["奥斯汀学区通知部分较小校区，下一学年将共享图书馆员，推翻了先前在预算规划中保护图书馆职位的说法。这个变化与家庭有关，因为它可能减少学生日常使用图书馆和参加相关活动的机会。"],',
        '  heroImage: "https://npr.brightspotcdn.com/austin-library.jpg",',
        '  topicFingerprint: "austin-isd-shared-librarians-budget"',
        '}]))',
      ].join('\n'),
      'utf8'
    );
    fs.chmodSync(hermesBin, 0o755);

    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      if (String(url) === 'https://www.kut.org/kut-rss-feed-all-content.rss') {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
          <rss version="2.0">
            <channel>
              <item>
                <title>Austin ISD librarian cuts spark backlash after district reverses course</title>
                <link>https://www.kut.org/education/2026-06-01/austin-isd-librarian-cuts-spark-backlash-after-district-reverses-course</link>
                <pubDate>Mon, 01 Jun 2026 15:00:11 GMT</pubDate>
                <description>The Austin Independent School District will split librarians across some campuses.</description>
              </item>
            </channel>
          </rss>`,
          {
            status: 200,
            headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
          }
        );
      }
      if (
        String(url) ===
        'https://www.kut.org/education/2026-06-01/austin-isd-librarian-cuts-spark-backlash-after-district-reverses-course'
      ) {
        return new Response(
          `<html>
            <head>
              <meta property="og:image" content="https://npr.brightspotcdn.com/austin-library.jpg" />
            </head>
            <body>
              <article class="ArtP-mainContent">
                <div class="ArtP-articleBody">
                  <p>Weeks after Austin ISD assured families and staff that librarian positions would be protected from budget cuts, the district informed employees that some schools will only have a librarian part-time.</p>
                  <p>Emails reviewed by Austin Current show principals were told schools with fewer than 400 students and no state improvement plans will share one librarian between two campuses.</p>
                  <p>The move comes as Austin ISD works through a budget shortfall that could reach $181 million if no action is taken before trustees adopt a budget.</p>
                </div>
              </article>
            </body>
          </html>`,
          {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          }
        );
      }

      throw new Error(`Unexpected fetch: ${String(url)}`);
    }) as typeof fetch;

    const drafts = await collectDraftsFromFeeds(
      [
        {
          slug: 'kut-austin',
          name: 'KUT Austin',
          url: 'https://www.kut.org/',
          feedUrl: 'https://www.kut.org/kut-rss-feed-all-content.rss',
          sourceType: 'local_media',
          sourcePolicy: 'summary_link',
          lane: 'community',
        },
      ],
      {
        hermesBin,
        hermesMaxTurns: 1,
        hermesTimeoutMs: 1000,
        lookbackHours: 48,
        maxItems: 5,
        now: '2026-06-01T18:00:00.000Z',
        siteConfig: getSiteConfig('austin'),
        timeoutMs: 1000,
      }
    );

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      sourceName: 'KUT Austin',
      titleEn: 'Austin ISD librarian cuts draw backlash',
    });
    expect(fs.readFileSync(promptPath, 'utf8')).toContain(
      'Weeks after Austin ISD assured families and staff'
    );
  });

  it('does not run broad Hermes retry when rewritten feed articles fill the target', async () => {
    process.env.NODE_ENV = 'test';
    process.env.RADAR_STORAGE_MODE = 'file';
    mockPublicDnsResolution();

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-feed-target-'));
    const hermesBin = path.join(tempDir, 'hermes-rewrite-target');
    const promptPath = path.join(tempDir, 'prompt.txt');
    const storePath = path.join(tempDir, 'store.json');
    fs.writeFileSync(
      hermesBin,
      [
        '#!/usr/bin/env node',
        'const fs = require("node:fs");',
        `const promptPath = ${JSON.stringify(promptPath)};`,
        'const prompt = process.argv[process.argv.length - 1] || "";',
        'fs.appendFileSync(promptPath, `${prompt}\\n---CALL---\\n`, "utf8");',
        'if (!prompt.includes("Rewrite these Arizona Radar RSS items")) {',
        '  console.log("[]");',
        '  process.exit(0);',
        '}',
        'console.log(JSON.stringify([{',
        '  sourceSlug: "what-now-phoenix",',
        '  sourceName: "What Now Phoenix",',
        '  sourceUrl: "https://whatnow.com/phoenix/restaurants/sample-phoenix-storefront-opening-signal",',
        '  canonicalUrl: "https://whatnow.com/phoenix/restaurants/sample-phoenix-storefront-opening-signal",',
        '  sourcePublishedAt: "2026-05-27T03:39:37.000Z",',
        '  titleEn: "Project LeanNation plans Peoria meal prep shop",',
        '  titleZh: "Project LeanNation 計畫在 Peoria 開設備餐門市",',
        '  excerptEn: "Project LeanNation Lake Pleasant is under construction in Peoria, with a summer 2026 opening planned after city approvals.",',
        '  excerptZh: "Project LeanNation Lake Pleasant 正在 Peoria 施工，待市府核准後計畫於 2026 年夏季開幕。",',
        '  bodyEn: [',
        '    "Project LeanNation Lake Pleasant is being built at 9785 W. Happy Valley Road in Peoria. Owners Kyle and Courtney Bridges are aiming for a summer 2026 opening, pending city approvals.",',
        '    "The Peoria shop would sell prepared meals and pair them with nutrition coaching. Memberships include InBody body composition scans and individual sessions with nutrition educators. The model is meant for customers who want healthier meals without building each week around cooking and planning.",',
        '    "The planned meal boxes include 12, 18, 24, or 30 meals for recurring pickup. Early customers can sign up for a founding membership with a $20 discount on each box.",',
        '    "For Arizona readers, the opening would add another health focused prepared food option in the northwest Valley. The store plans rotating meals, breakfast items, protein snacks, juices, shakes, and supplements. Menu examples include Baja Beef, Sicilian Shrimp, Nashville Hot Chicken, Balsamic Burger, and protein ball flavors."',
        '  ],',
        '  bodyZh: [',
        '    "Project LeanNation Lake Pleasant 正在 Peoria 的 9785 W. Happy Valley Road 施工。業主 Kyle 和 Courtney Bridges 目標是在市府核准後於 2026 年夏季開幕。",',
        '    "這家 Peoria 門市將銷售備餐產品，並搭配營養諮詢。會員包含 InBody 身體組成掃描，以及與營養教育人員的一對一諮詢。這種模式面向想吃得更健康、但不想每週花大量時間規劃和烹調的顧客。",',
        '    "規劃中的餐盒有 12、18、24 或 30 餐，可定期取餐。早期顧客可加入創始會員方案，每盒折扣 20 美元。",',
        '    "對亞利桑那讀者來說，這項開店計畫會讓西北谷增加一個健康備餐選擇。門市計畫供應輪替餐點、早餐、蛋白點心、果汁、奶昔與補充品。菜單例子包含 Baja Beef、Sicilian Shrimp、Nashville Hot Chicken、Balsamic Burger 與蛋白球口味。"',
        '  ],',
        '  heroImage: "https://whatnow.com/wp-content/uploads/2026/05/project-leannation.jpg",',
        '  topicFingerprint: "what-now-phoenix-project-leannation-peoria"',
        '}]))',
      ].join('\n'),
      'utf8'
    );
    fs.chmodSync(hermesBin, 0o755);

    const fixture = fs.readFileSync(
      path.join(__dirname, 'fixtures', 'whatnow-phoenix-feed.xml'),
      'utf8'
    );
    const articleFixture = fs.readFileSync(
      path.join(__dirname, 'fixtures', 'whatnow-phoenix-article.html'),
      'utf8'
    );
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      if (String(url) === 'https://whatnow.com/phoenix/feed/') {
        return new Response(fixture, {
          status: 200,
          headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
        });
      }
      if (
        String(url) ===
        'https://whatnow.com/phoenix/restaurants/sample-phoenix-storefront-opening-signal'
      ) {
        return new Response(articleFixture, {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
      }

      throw new Error(`Unexpected fetch: ${String(url)}`);
    }) as typeof fetch;

    const result = await runWorker({
      command: 'run',
      draftMultiplier: 1,
      feedTimeoutMs: 1000,
      fixturePath: '',
      hermesBin,
      hermesMaxTurns: 1,
      hermesTimeoutMs: 1000,
      lookbackHours: 168,
      maxItems: 1,
      retryEmpty: true,
      sourceBatchSize: 0,
      sourceSlugs: '',
      storePath,
    });

    expect(result.status).toBe('completed');
    expect(result.publishedCount).toBe(1);
    const capturedPrompt = fs.readFileSync(promptPath, 'utf8');
    expect(capturedPrompt.match(/---CALL---/g)).toHaveLength(1);
    expect(capturedPrompt).toContain('Rewrite these Arizona Radar RSS items');
  });
});

describe('Arizona Radar Hermes output parsing', () => {
  it('extracts the first complete JSON payload when Hermes appends extra output', () => {
    const payload = extractJsonPayload(
      [
        '{"sourceName":"ABC15 Arizona","sourceUrl":"https://www.abc15.com/news","titleEn":"Phoenix update"}',
        '{"status":"completed","tokens":123}',
      ].join('\n')
    );

    expect(JSON.parse(payload)).toMatchObject({
      sourceName: 'ABC15 Arizona',
      sourceUrl: 'https://www.abc15.com/news',
    });
  });

  it('skips non-JSON bracketed text before the draft array', () => {
    const drafts = parseHermesOutput(
      [
        'candidate sources [not json]',
        '[',
        '  {"sourceName":"Phoenix Sky Harbor","sourceUrl":"https://www.skyharbor.com/newsroom/item","titleEn":"Airport update"}',
        ']',
      ].join('\n')
    );

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      sourceName: 'Phoenix Sky Harbor',
      titleEn: 'Airport update',
    });
  });

  it('accepts a single draft object as degraded Hermes output', () => {
    const drafts = parseHermesOutput(
      '{"sourceName":"What Now Phoenix","sourceUrl":"https://whatnow.com/phoenix/item","titleEn":"Opening update"}'
    );

    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.sourceName).toBe('What Now Phoenix');
  });
});
