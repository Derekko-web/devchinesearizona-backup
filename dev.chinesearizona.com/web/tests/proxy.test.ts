import { describe, expect, it } from 'vitest';

import {
  proxy,
  shouldBypassApexRedirect,
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
