import { describe, expect, it, vi } from 'vitest';

import indexNow from '../src/data/indexnow.json';
import {
  buildBatches,
  buildPayload,
  describeStatus,
  ENDPOINT,
  parseArgs,
  parseSitemapUrls,
  readIndexNowConfig,
  refusalReason,
  run,
  selectSiteUrls,
} from '../scripts/indexnow-submit.mjs';

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
<url><loc>https://chinesearizona.com</loc><xhtml:link rel="alternate" hreflang="zh" href="https://chinesearizona.com/zh"/></url>
<url><loc>https://chinesearizona.com/business/hedy-li-phoenix</loc></url>
<url><loc>https://chinesearizona.com/zh/business/hedy-li-phoenix</loc></url>
<url><loc>https://chinesearizona.com/relocation-guide/az-moving-checklist</loc></url>
<url><loc>https://chinesearizona.com/hidden-arizona/places/the-wave</loc></url>
<url><loc>https://chinesearizona.com/business?category=medical&amp;page=2</loc></url>
<url><loc>https://dev.chinesearizona.com/business/x</loc></url>
<url><loc>http://chinesearizona.com/insecure</loc></url>
<url><loc>https://chineseaustin.com/business/y</loc></url>
<url><loc>https://chinesearizona.com/business/hedy-li-phoenix</loc></url>
</urlset>`;

function response(status, body = '', headers = {}) {
  return { ok: status >= 200 && status < 300, status, text: async () => body, headers: new Headers(headers) };
}

describe('IndexNow submission script', () => {
  it('reads page URLs from the sitemap, not hreflang alternates', () => {
    const urls = parseSitemapUrls(sitemap);
    expect(urls).toContain('https://chinesearizona.com/business?category=medical&page=2');
    expect(urls).not.toContain('https://chinesearizona.com/zh');
  });

  it('keeps only https://chinesearizona.com URLs, once each, optionally by path prefix', () => {
    const urls = selectSiteUrls(parseSitemapUrls(sitemap));
    expect(urls).toHaveLength(6);
    expect(urls.every((url) => url.startsWith('https://chinesearizona.com'))).toBe(true);

    const listingsAndGuides = selectSiteUrls(parseSitemapUrls(sitemap), ['/business', '/relocation-guide']);
    expect(listingsAndGuides).toEqual([
      'https://chinesearizona.com/business/hedy-li-phoenix',
      'https://chinesearizona.com/zh/business/hedy-li-phoenix',
      'https://chinesearizona.com/relocation-guide/az-moving-checklist',
      'https://chinesearizona.com/business?category=medical&page=2',
    ]);
  });

  it('splits into batches of at most 10,000 URLs', () => {
    const urls = Array.from({ length: 25_001 }, (_, index) => `https://chinesearizona.com/p/${index}`);
    expect(buildBatches(urls).map((batch) => batch.length)).toEqual([10_000, 10_000, 5_001]);
    expect(buildBatches(urls, 50_000)[0]).toHaveLength(10_000);
  });

  it('builds the documented request body with a root key file', () => {
    const config = readIndexNowConfig();
    expect(config.key).toBe(indexNow.key);
    expect(buildPayload(config, ['https://chinesearizona.com/a'])).toEqual({
      host: 'chinesearizona.com',
      key: indexNow.key,
      keyLocation: `https://chinesearizona.com/${indexNow.key}.txt`,
      urlList: ['https://chinesearizona.com/a'],
    });
    expect(describeStatus(202)).toContain('key check pending');
    expect(describeStatus(422)).toContain('not on this host');
  });

  it('refuses CI runs and any host but chinesearizona.com', () => {
    const base = parseArgs([]);
    expect(refusalReason(base, { CI: 'true' })).toMatch(/CI/);
    expect(refusalReason(base, { GITHUB_ACTIONS: 'true' })).toMatch(/CI/);
    expect(refusalReason(parseArgs(['--sitemap', 'https://dev.chinesearizona.com/sitemap.xml']), {})).toMatch(/Refusing/);
    expect(refusalReason(parseArgs(['--prefix', 'business']), {})).toMatch(/prefix/);
    expect(refusalReason(base, {})).toBeNull();
    expect(() => parseArgs(['--host', 'example.com'])).toThrow('Unknown option');
  });

  it('does nothing at all in CI', async () => {
    const fetchImpl = vi.fn();
    const result = await run({ argv: [], env: { CI: '1' }, fetchImpl, log: () => {} });
    expect(result.refused).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('only prints in a dry run', async () => {
    const fetchImpl = vi.fn(async () => response(200, sitemap));
    const lines = [];
    const result = await run({ argv: ['--dry-run'], env: {}, fetchImpl, log: (line) => lines.push(line) });

    expect(result.dryRun).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith('https://chinesearizona.com/sitemap.xml');
    expect(lines.join('\n')).toContain('6 chinesearizona.com URLs');
  });

  it('sends nothing until the key file is live', async () => {
    const fetchImpl = vi.fn(async (url) => (String(url).endsWith('.txt') ? response(404) : response(200, sitemap)));
    const result = await run({ argv: [], env: {}, fetchImpl, log: () => {} });

    expect(result.keyMissing).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalledWith(ENDPOINT, expect.anything());
  });

  it('posts each batch and reports accepted URLs and response codes', async () => {
    const posts = [];
    const fetchImpl = vi.fn(async (url, init) => {
      if (url === ENDPOINT) {
        posts.push(JSON.parse(init.body));
        expect(init.method).toBe('POST');
        expect(init.headers['Content-Type']).toBe('application/json; charset=utf-8');
        return response(posts.length === 1 ? 202 : 422);
      }
      return String(url).endsWith('.txt') ? response(200, `${indexNow.key}\n`) : response(200, sitemap);
    });
    const lines = [];
    const result = await run({ argv: ['--batch-size', '4'], env: {}, fetchImpl, log: (line) => lines.push(line) });

    expect(posts.map((post) => post.urlList.length)).toEqual([4, 2]);
    expect(result).toEqual({ submitted: 6, accepted: 4 });
    expect(lines.join('\n')).toContain('HTTP 202 (received, key check pending)');
    expect(lines.join('\n')).toContain('Done: 4 of 6 URLs accepted.');
  });

  it('stops on 429 and shows Retry-After', async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (url === ENDPOINT) {
        return response(429, '', { 'retry-after': '600' });
      }
      return String(url).endsWith('.txt') ? response(200, indexNow.key) : response(200, sitemap);
    });
    const lines = [];
    await run({ argv: ['--batch-size', '2'], env: {}, fetchImpl, log: (line) => lines.push(line) });

    expect(fetchImpl.mock.calls.filter(([url]) => url === ENDPOINT)).toHaveLength(1);
    expect(lines.join('\n')).toContain('Retry-After: 600');
  });
});

describe('IndexNow key file', () => {
  async function loadRoute(siteKey) {
    vi.resetModules();
    vi.doMock('@/lib/site-config.server', async () => {
      const { siteProfiles } = await import('@/lib/site-config');
      return { getCurrentSiteProfile: async () => siteProfiles[siteKey] };
    });
    return import(`../src/app/${indexNow.key}.txt/route.ts`);
  }

  it('serves only the key on the Arizona site, as UTF-8 text', async () => {
    const { GET } = await loadRoute('arizona');
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(await res.text()).toBe(indexNow.key);
  });

  it('answers 404 on the city sites', async () => {
    const { GET } = await loadRoute('austin');
    expect((await GET()).status).toBe(404);
  });

  it('uses a key the protocol accepts', () => {
    expect(indexNow.key).toMatch(/^[A-Za-z0-9-]{8,128}$/);
  });
});
