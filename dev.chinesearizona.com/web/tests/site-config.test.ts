import { describe, expect, it } from 'vitest';

import {
  defaultSiteProfile,
  hasLiveDirectoryData,
  hasLiveNewsData,
  resolveSiteProfileFromHost,
  shouldNoIndexSiteProfile,
  siteProfiles,
} from '@/lib/site-config';

describe('city site configuration', () => {
  it('keeps dev.chinesearizona.com on the live Arizona profile', () => {
    const site = resolveSiteProfileFromHost('dev.chinesearizona.com');

    expect(site).toBe(defaultSiteProfile);
    expect(site.launchState).toBe('live');
    expect(hasLiveDirectoryData(site)).toBe(true);
    expect(hasLiveNewsData(site)).toBe(true);
    expect(shouldNoIndexSiteProfile(site)).toBe(false);
    expect(site.seo.title.en).toBe(
      'ChineseArizona | Arizona Chinese Community Directory, News, and Resources'
    );
  });

  it('uses Austin-specific news sources without enabling directory fallback', () => {
    const site = resolveSiteProfileFromHost('www.chineseaustin.com');

    expect(site).toBe(siteProfiles.austin);
    expect(site.launchState).toBe('placeholder');
    expect(hasLiveDirectoryData(site)).toBe(false);
    expect(hasLiveNewsData(site)).toBe(true);
    expect(shouldNoIndexSiteProfile(site)).toBe(true);
    expect(site.directory.allowDefaultFallback).toBe(false);
    expect(site.news.allowDefaultFallback).toBe(false);
    expect(site.directory.listingSource.path).toBe('data/sites/austin/businesses.json');
    expect(site.news.routePath).toBe('/local-news');
    expect(site.news.archivePath).toBe('/local-news/archive');
    expect(site.news.articleDataSource.path).toBe('data/sites/austin/radar-runtime/store.json');
    expect(site.news.sourceManifest.path).toBe('src/data/austin-radar-source-manifest.json');
    expect(JSON.stringify(site)).not.toContain('generated-directory-businesses.json');
    expect(JSON.stringify(site)).not.toContain('generated-local-articles.json');
  });

  it('serves SF Bay news from SF Bay-specific sources without default fallback', () => {
    const site = resolveSiteProfileFromHost('www.chinesesfbay.com');

    expect(site).toBe(siteProfiles['sf-bay']);
    expect(site.launchState).toBe('live');
    expect(hasLiveNewsData(site)).toBe(true);
    expect(hasLiveDirectoryData(site)).toBe(false);
    expect(shouldNoIndexSiteProfile(site)).toBe(false);
    expect(site.news.routePath).toBe('/news');
    expect(site.news.archivePath).toBe('/news/archive');
    expect(site.news.allowDefaultFallback).toBe(false);
    expect(site.news.articleDataSource.path).toBe('data/sf-bay-radar-runtime/store.json');
    expect(site.news.articleDataSource.path).not.toBe('data/radar-runtime/store.json');
    expect(site.news.sourceManifest.path).toBe('src/data/sf-bay-radar-source-manifest.json');
    expect(JSON.stringify(site)).not.toContain('generated-local-articles.json');
    expect(site.seo.title.en).toContain('San Francisco Bay Area');
    expect(site.seo.description.en).toContain('San Francisco');
    expect(site.seo.description.en).not.toContain('Arizona');
  });

  it('connects chineselosangeles.com to Los Angeles-only directory and news sources', () => {
    const site = resolveSiteProfileFromHost('chineselosangeles.com');

    expect(site).toBe(siteProfiles['los-angeles']);
    expect(site.launchState).toBe('live');
    expect(site.brandName).toBe('ChineseLosAngeles');
    expect(hasLiveDirectoryData(site)).toBe(true);
    expect(hasLiveNewsData(site)).toBe(true);
    expect(shouldNoIndexSiteProfile(site)).toBe(false);
    expect(site.directory.allowDefaultFallback).toBe(false);
    expect(site.news.allowDefaultFallback).toBe(false);
    expect(site.directory.listingSource.path).toBe('src/data/los-angeles-directory-businesses.json');
    expect(site.directory.launchCities).toEqual(
      expect.arrayContaining(['Los Angeles', 'Alhambra', 'Arcadia', 'Monterey Park', 'San Gabriel'])
    );
    expect(site.directory.categorySlugs).toEqual(
      expect.arrayContaining(['dining', 'shopping', 'real-estate', 'legal-finance', 'medical'])
    );
    expect(site.news.routePath).toBe('/los-angeles-news');
    expect(site.news.articleDataSource.path).toBe(
      'data/sites/los-angeles/radar-runtime/store.json'
    );
    expect(site.news.sourceManifest.path).toBe(
      'src/data/los-angeles-radar-source-manifest.json'
    );
    expect(JSON.stringify(site.news)).not.toContain('generated-local-articles.json');
    expect(site.news.articleDataSource.path).not.toBe('data/radar-runtime/store.json');
    expect(JSON.stringify(site.directory)).not.toContain('generated-directory-businesses.json');
    expect(site.seo.title.en).toContain('Directory');
    expect(site.seo.description.en).toContain('Los Angeles');
    expect(site.seo.description.en).not.toContain('Arizona');
  });

  it('does not resolve unknown city hosts to ChineseArizona', () => {
    const site = resolveSiteProfileFromHost('chicagoguide.example');

    expect(site.key).toBe('unconfigured');
    expect(site.launchState).toBe('unconfigured');
    expect(site.brandName).not.toBe('ChineseArizona');
    expect(hasLiveDirectoryData(site)).toBe(false);
    expect(hasLiveNewsData(site)).toBe(false);
    expect(shouldNoIndexSiteProfile(site)).toBe(true);
    expect(site.directory.allowDefaultFallback).toBe(false);
    expect(site.news.allowDefaultFallback).toBe(false);
  });
});
