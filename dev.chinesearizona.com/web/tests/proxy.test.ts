import { describe, expect, it } from 'vitest';

import { proxy, shouldRedirectToApex } from '@/proxy';

function buildRequest(url: string, host: string) {
  return {
    headers: new Headers({ host }),
    nextUrl: {
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
});
