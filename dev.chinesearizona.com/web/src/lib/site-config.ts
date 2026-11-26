import { arizonaSiteProfile } from '@/lib/site-profiles/arizona';
import { austinSiteProfile } from '@/lib/site-profiles/austin';
import { losAngelesSiteProfile } from '@/lib/site-profiles/los-angeles';
import { sfBaySiteProfile } from '@/lib/site-profiles/sf-bay';
import type { SiteKey, SiteProfile } from '@/lib/site-profiles/types';

export type {
  SiteKey,
  SiteLaunchState,
  SiteContentState,
  LocalizedText,
  SiteBrandParts,
  SiteNeighborhoodSpot,
  SiteFeaturedShowcaseCard,
  SiteHomeStoryCard,
  SiteHomeProfile,
  SiteContentSource,
  SiteDirectoryConfig,
  SiteNewsConfig,
  SiteSeoConfig,
  SitePublisherConfig,
  SiteRuntimeConfig,
  SiteProfile,
} from '@/lib/site-profiles/types';

// Each city's settings live in their own file under src/lib/site-profiles.
export const siteProfiles: Record<SiteKey, SiteProfile> = {
  arizona: arizonaSiteProfile,
  'los-angeles': losAngelesSiteProfile,
  'sf-bay': sfBaySiteProfile,
  austin: austinSiteProfile,
};

export const defaultSiteProfile = siteProfiles.arizona;

function isLocalHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1';
}

function isRequestInfrastructureHost(host: string): boolean {
  return isLocalHost(host) || host.endsWith('.local') || host.endsWith('.invalid');
}

function createUnconfiguredSiteProfile(host: string): SiteProfile {
  const domain = host || 'unconfigured.local';
  const origin = domain.endsWith('.local') ? `http://${domain}` : `https://${domain}`;

  return {
    key: 'unconfigured',
    launchState: 'unconfigured',
    domains: domain ? [domain] : [],
    domain,
    url: origin,
    cityName: 'Unconfigured',
    stateRegion: 'Unconfigured',
    stateCode: '',
    countryCode: 'US',
    supportedLocales: ['en', 'zh'],
    brandName: 'Unconfigured City Site',
    brandNameZh: '未配置城市站點',
    brandParts: {
      enPrefix: 'City',
      enAccent: 'Site',
      zhPrefix: '城市',
      zhAccent: '站點',
    },
    regionName: 'Unconfigured',
    regionNameZh: '未配置',
    guideTagline: {
      en: 'City config required',
      zh: '需要城市配置',
    },
    localCoverageLabel: {
      en: 'No city data connected',
      zh: '尚未接入城市數據',
    },
    description: {
      en: 'This hostname is not connected to a live city configuration and cannot serve default ChineseArizona content.',
      zh: '此主機名尚未連接可上線的城市配置，不能提供默認 ChineseArizona 內容。',
    },
    directory: {
      categorySlugs: [],
      citySelectSuffix: { en: '', zh: '' },
      defaultSearchCity: '',
      launchCities: [],
      cityNamesZh: {},
      listingSource: {
        state: 'required',
        label: 'Unconfigured business listing source',
        kind: 'manual',
        notes: 'Create a city-specific listing source before routing this hostname to the platform.',
      },
      allowDefaultFallback: false,
    },
    news: {
      routePath: '/local-news',
      archivePath: '/local-news/archive',
      articleDataSource: {
        state: 'required',
        label: 'Unconfigured article data source',
        kind: 'manual',
        notes: 'Create city-specific news feeds and generated article data before routing this hostname to the platform.',
      },
      sourceManifest: {
        state: 'required',
        label: 'Unconfigured source manifest',
        kind: 'manual',
        notes: 'Create city-specific scraper and feed settings before launch.',
      },
      allowDefaultFallback: false,
    },
    seo: {
      title: {
        en: 'Unconfigured City Site',
        zh: '未配置城市站點',
      },
      description: {
        en: 'City-specific SEO copy is required before this hostname can launch.',
        zh: '此主機名上線前必須配置城市專屬 SEO 文案。',
      },
      canonicalBaseUrl: origin,
    },
    publisher: {
      contactEmail: defaultSiteProfile.publisher.contactEmail,
      updatedLabel: defaultSiteProfile.publisher.updatedLabel,
    },
    runtime: {
      rootPath: `/var/www/${domain}/web`,
      dataPath: `/var/www/${domain}/data`,
      logsPath: `/var/www/${domain}/logs`,
    },
    home: {
      headline: {
        en: 'City Configuration Required',
        zh: '需要城市配置',
      },
      kicker: {
        en: 'This hostname is intentionally blocked from default content fallback',
        zh: '此主機名已阻止默認內容回退',
      },
      intro: {
        en: 'Add city-specific business, article, SEO, branding, and runtime settings before launch.',
        zh: '上線前請添加城市專屬商家、文章、SEO、品牌與運行設置。',
      },
      citySelectSuffix: { en: '', zh: '' },
      defaultSearchCity: '',
      launchCities: [],
      cityNamesZh: {},
      heroImageUrl: '/window.svg',
      heroImageAlt: {
        en: 'Unconfigured city placeholder',
        zh: '未配置城市占位',
      },
      heroForegroundImageUrl: '/globe.svg',
      heroForegroundAlt: {
        en: 'Unconfigured city mark',
        zh: '未配置城市標記',
      },
      heroBadge: {
        en: 'UNCONFIGURED',
        zh: '未配置',
      },
      heroBadgeSubcopy: {
        en: 'No default fallback',
        zh: '無默認回退',
      },
      focusTitle: {
        en: 'Config Required',
        zh: '需要配置',
      },
      focusBody: {
        en: 'City content sources missing',
        zh: '缺少城市內容來源',
      },
      featuredCards: [],
      neighborhoods: [],
      mapImageUrl: '/globe.svg',
      mapImageAlt: {
        en: 'Unconfigured map placeholder',
        zh: '未配置地圖佔位',
      },
      relocationImageUrl: '/window.svg',
      relocationImageAlt: {
        en: 'Unconfigured relocation placeholder',
        zh: '未配置搬遷佔位',
      },
      newcomerTitle: {
        en: 'Launch Blocked',
        zh: '上線已阻止',
      },
      newcomerBody: {
        en: 'This profile exists only to prevent accidental fallback to ChineseArizona content.',
        zh: '此配置僅用於防止意外回退到 ChineseArizona 內容。',
      },
    },
  };
}

export function hasLiveDirectoryData(site: SiteProfile): boolean {
  return site.directory.listingSource.state === 'live';
}

export function hasLiveNewsData(site: SiteProfile): boolean {
  return site.news.articleDataSource.state === 'live' && site.news.sourceManifest.state === 'live';
}

export function shouldNoIndexSiteProfile(site: SiteProfile): boolean {
  return site.launchState !== 'live';
}

export function normalizeHost(value?: string | null): string {
  if (!value) {
    return '';
  }

  const firstHost = value.split(',')[0]?.trim().toLowerCase() ?? '';
  const withoutProtocol = firstHost.replace(/^https?:\/\//, '');
  const withoutPort = withoutProtocol.split('/')[0]?.replace(/:\d+$/, '') ?? '';
  return withoutPort.startsWith('www.') ? withoutPort.slice(4) : withoutPort;
}

function resolveConfiguredSiteProfileFromHost(host?: string | null): SiteProfile | undefined {
  const normalizedHost = normalizeHost(host);

  if (!normalizedHost || isLocalHost(normalizedHost)) {
    return undefined;
  }

  return Object.values(siteProfiles).find((profile) =>
    profile.domains.some((domain) => normalizeHost(domain) === normalizedHost)
  );
}

export function resolveSiteProfileFromHost(host?: string | null): SiteProfile {
  const normalizedHost = normalizeHost(host);

  if (!normalizedHost || isLocalHost(normalizedHost)) {
    return defaultSiteProfile;
  }

  const configuredSite = resolveConfiguredSiteProfileFromHost(normalizedHost);
  if (configuredSite) {
    return configuredSite;
  }

  return createUnconfiguredSiteProfile(normalizedHost);
}

export function resolveSiteProfileFromHostCandidates(
  hosts: Array<string | null | undefined>
): SiteProfile {
  const normalizedHosts = hosts.map((host) => normalizeHost(host)).filter(Boolean);
  const firstPublicHostIndex = normalizedHosts.findIndex(
    (host) => !isRequestInfrastructureHost(host)
  );

  if (firstPublicHostIndex === -1) {
    return defaultSiteProfile;
  }

  const firstPublicHost = normalizedHosts[firstPublicHostIndex];
  const firstPublicProfile = resolveConfiguredSiteProfileFromHost(firstPublicHost);
  if (firstPublicProfile) {
    return firstPublicProfile;
  }

  for (const normalizedHost of normalizedHosts.slice(firstPublicHostIndex + 1)) {
    if (isRequestInfrastructureHost(normalizedHost)) {
      continue;
    }

    const profile = resolveConfiguredSiteProfileFromHost(normalizedHost);
    if (profile && profile.key !== defaultSiteProfile.key) {
      return profile;
    }
  }

  return createUnconfiguredSiteProfile(firstPublicHost);
}

function isPublicRequestHost(host: string): boolean {
  return Boolean(host && !isRequestInfrastructureHost(host));
}

export function resolveSiteProfileFromRequestHosts({
  host,
  forwardedHost,
}: {
  host?: string | null;
  forwardedHost?: string | null;
}): SiteProfile {
  const normalizedHost = normalizeHost(host);
  const normalizedForwardedHost = normalizeHost(forwardedHost);
  const hostProfile = resolveConfiguredSiteProfileFromHost(host);
  if (hostProfile && hostProfile.key !== defaultSiteProfile.key) {
    return hostProfile;
  }

  if (isPublicRequestHost(normalizedHost) && !hostProfile) {
    return createUnconfiguredSiteProfile(normalizedHost);
  }

  const forwardedHostProfile = resolveConfiguredSiteProfileFromHost(forwardedHost);
  if (forwardedHostProfile && forwardedHostProfile.key !== defaultSiteProfile.key) {
    return forwardedHostProfile;
  }

  if (hostProfile) {
    if (isPublicRequestHost(normalizedForwardedHost) && !forwardedHostProfile) {
      return createUnconfiguredSiteProfile(normalizedForwardedHost);
    }

    return hostProfile;
  }

  if (forwardedHostProfile) {
    return forwardedHostProfile;
  }

  if (isPublicRequestHost(normalizedForwardedHost)) {
    return createUnconfiguredSiteProfile(normalizedForwardedHost);
  }

  return defaultSiteProfile;
}
