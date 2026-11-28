import { describe, expect, it } from 'vitest';

import {
  englishCanonicalPath,
  proxy,
  shouldBypassApexRedirect,
  shouldEmitNoIndexHeader,
  shouldRedirectToApex,
  shouldRejectServerActionRequest,
} from '@/proxy';

function buildRequest(
  url: string,
  host: string,
  options: {
    headers?: Record<string, string>;
    method?: string;
  } = {}
) {
  const nextUrl = new URL(url);

  return {
    headers: new Headers({ host, ...options.headers }),
    method: options.method ?? 'GET',
    nextUrl: {
      pathname: nextUrl.pathname,
      search: nextUrl.search,
      protocol: nextUrl.protocol,
      host: nextUrl.host,
      clone: () => new URL(url),
    },
  };
}

describe('proxy host handling', () => {
  it('redirects only the public www alias to the apex domain', () => {
    expect(shouldRedirectToApex('www.chinesearizona.com')).toBe(true);
    expect(shouldRedirectToApex('WWW.CHINESearizona.com:443')).toBe(true);
    expect(shouldRedirectToApex('dev.chinesearizona.com')).toBe(false);
    expect(shouldRedirectToApex('dev.chinesearizona.com:443')).toBe(false);
    expect(shouldRedirectToApex('chinesearizona.com')).toBe(false);
  });

  it('preserves the path and query string when redirecting www traffic', () => {
    const response = proxy(
      buildRequest(
        'https://www.chinesearizona.com/zh/community?tab=events',
        'www.chinesearizona.com'
      ) as never
    );

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(
      'https://chinesearizona.com/zh/community?tab=events'
    );
  });

  it('does not redirect ads.txt on the www alias', () => {
    const response = proxy(
      buildRequest('https://www.chinesearizona.com/ads.txt', 'www.chinesearizona.com') as never
    );

    expect(shouldBypassApexRedirect('/ads.txt')).toBe(true);
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('does not emit noindex response headers for the live Austin host', () => {
    const response = proxy(
      buildRequest('https://chineseaustin.com/', 'chineseaustin.com') as never
    );

    expect(shouldEmitNoIndexHeader('chineseaustin.com')).toBe(false);
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Robots-Tag')).toBeNull();
  });

  it('does not emit noindex response headers for the live dev host', () => {
    const response = proxy(
      buildRequest('https://dev.chinesearizona.com/', 'dev.chinesearizona.com') as never
    );

    expect(shouldEmitNoIndexHeader('dev.chinesearizona.com')).toBe(false);
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Robots-Tag')).toBeNull();
  });

  it('does not emit noindex response headers for the live Los Angeles host', () => {
    const response = proxy(
      buildRequest('https://chineselosangeles.com/', 'chineselosangeles.com') as never
    );

    expect(shouldEmitNoIndexHeader('chineselosangeles.com')).toBe(false);
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Robots-Tag')).toBeNull();
  });

  it('emits noindex response headers for unconfigured city hosts', () => {
    const response = proxy(
      buildRequest('https://chicago.example/', 'chicago.example') as never
    );

    expect(shouldEmitNoIndexHeader('chicago.example')).toBe(true);
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  });

  it('rejects synthetic server action probes before Next logs missing action errors', () => {
    const request = buildRequest('https://dev.chinesearizona.com/en', 'dev.chinesearizona.com', {
      headers: {
        'next-action': 'x',
      },
      method: 'POST',
    });
    const response = proxy(request as never);

    expect(shouldRejectServerActionRequest(request as never)).toBe(true);
    expect(response.status).toBe(400);
  });
});

describe('English URLs', () => {
  it('maps /en and /en/... to the unprefixed English URL and leaves everything else alone', () => {
    expect(englishCanonicalPath('/en')).toBe('/');
    expect(englishCanonicalPath('/en/')).toBe('/');
    expect(englishCanonicalPath('/en/business/category/medical')).toBe('/business/category/medical');
    expect(englishCanonicalPath('/english-classes')).toBeNull();
    expect(englishCanonicalPath('/zh/business')).toBeNull();
    expect(englishCanonicalPath('/business')).toBeNull();
    expect(englishCanonicalPath(undefined)).toBeNull();
  });

  it('permanently redirects /en pages to the unprefixed URL, keeping the query string', () => {
    const response = proxy(
      buildRequest('https://chinesearizona.com/en/business?category=medical&page=2', 'chinesearizona.com') as never
    );

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://chinesearizona.com/business?category=medical&page=2');
  });

  it('uses the public scheme and host behind our proxies, not the internal address', () => {
    const response = proxy(
      buildRequest('http://127.0.0.1:3001/en/business', 'chinesearizona.com', {
        headers: { 'x-forwarded-proto': 'https' },
      }) as never
    );

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://chinesearizona.com/business');
  });

  it('redirects the bare /en home page to /', () => {
    const response = proxy(buildRequest('https://chinesearizona.com/en', 'chinesearizona.com') as never);

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://chinesearizona.com/');
  });

  it('strips /en in the same hop as the www redirect', () => {
    const response = proxy(
      buildRequest('https://www.chinesearizona.com/en/news?lane=chinese', 'www.chinesearizona.com') as never
    );

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://chinesearizona.com/news?lane=chinese');
  });

  it('keeps serving Chinese pages under /zh', () => {
    const response = proxy(buildRequest('https://chinesearizona.com/zh/business', 'chinesearizona.com') as never);

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });
});
