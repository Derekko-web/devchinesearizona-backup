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

  it('requires Austin-specific sources before Austin can serve content', () => {
    const site = resolveSiteProfileFromHost('www.chineseaustin.com');

    expect(site).toBe(siteProfiles.austin);
    expect(site.launchState).toBe('placeholder');
    expect(hasLiveDirectoryData(site)).toBe(false);
    expect(hasLiveNewsData(site)).toBe(false);
    expect(shouldNoIndexSiteProfile(site)).toBe(true);
    expect(site.directory.allowDefaultFallback).toBe(false);
    expect(site.news.allowDefaultFallback).toBe(false);
    expect(site.directory.listingSource.path).toBe('data/sites/austin/businesses.json');
    expect(site.news.articleDataSource.path).toBe('data/sites/austin/articles.json');
    expect(JSON.stringify(site)).not.toContain('generated-directory-businesses.json');
    expect(JSON.stringify(site)).not.toContain('generated-local-articles.json');
  });

  it('connects chineselosangeles.com to Los Angeles-only news sources', () => {
    const site = resolveSiteProfileFromHost('chineselosangeles.com');

    expect(site).toBe(siteProfiles['los-angeles']);
    expect(site.launchState).toBe('live');
    expect(site.brandName).toBe('ChineseLosAngeles');
    expect(hasLiveDirectoryData(site)).toBe(false);
    expect(hasLiveNewsData(site)).toBe(true);
    expect(shouldNoIndexSiteProfile(site)).toBe(false);
    expect(site.directory.allowDefaultFallback).toBe(false);
    expect(site.news.allowDefaultFallback).toBe(false);
    expect(site.news.routePath).toBe('/los-angeles-news');
    expect(site.news.articleDataSource.path).toBe(
      'data/sites/los-angeles/radar-runtime/store.json'
    );
    expect(site.news.sourceManifest.path).toBe(
      'src/data/los-angeles-radar-source-manifest.json'
    );
    expect(JSON.stringify(site.news)).not.toContain('generated-local-articles.json');
    expect(site.news.articleDataSource.path).not.toBe('data/radar-runtime/store.json');
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
