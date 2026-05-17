import { describe, expect, it } from 'vitest';

import { localeFromPath, stripLocaleFromPath, switchLocaleInPathname, withLocale } from '@/lib/routing';

describe('routing helpers', () => {
  it('prefixes localized paths for both supported locales', () => {
    expect(withLocale('en', '/business')).toBe('/en/business');
    expect(withLocale('zh', '/business')).toBe('/zh/business');
    expect(withLocale('zh', '/hidden-arizona')).toBe('/zh/hidden-arizona');
  });

  it('strips locale prefixes from incoming paths', () => {
    expect(stripLocaleFromPath('/zh/community/news/post')).toBe('/community/news/post');
    expect(stripLocaleFromPath('/en/business')).toBe('/business');
  });

  it('switches locales while preserving the path', () => {
    expect(switchLocaleInPathname('/zh/community', 'en')).toBe('/en/community');
    expect(switchLocaleInPathname('/business/elite-az-realty-team', 'zh')).toBe(
      '/zh/business/elite-az-realty-team'
    );
    expect(switchLocaleInPathname('/hidden-arizona/places/the-wave', 'zh')).toBe(
      '/zh/hidden-arizona/places/the-wave'
    );
  });

  it('preserves query params when switching locales', () => {
    expect(switchLocaleInPathname('/zh/business', 'en', 'city=Mesa&language=Mandarin')).toBe(
      '/en/business?city=Mesa&language=Mandarin'
    );
  });

  it('resolves locale from both root and prefixed paths', () => {
    expect(localeFromPath('/')).toBe('en');
    expect(localeFromPath('/en/community')).toBe('en');
    expect(localeFromPath('/zh/community')).toBe('zh');
  });
});
