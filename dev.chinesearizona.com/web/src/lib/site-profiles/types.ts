import type { Locale } from '@/lib/types';

export type SiteKey = 'arizona' | 'los-angeles' | 'sf-bay' | 'austin';
export type SiteLaunchState = 'live' | 'placeholder' | 'unconfigured';
export type SiteContentState = 'live' | 'required';

export type LocalizedText = {
  en: string;
  zh: string;
};

export type SiteBrandParts = {
  enPrefix: string;
  enAccent: string;
  zhPrefix: string;
  zhAccent: string;
};

export type SiteNeighborhoodSpot = {
  city: string;
  cityZh: string;
  regionEn: string;
  regionZh: string;
  imageUrl: string;
};

export type SiteFeaturedShowcaseCard = {
  slug: string;
  href?: string;
  badge: string;
  categoryEn: string;
  categoryZh: string;
  nameEn: string;
  nameZh: string;
  // Empty shows neutral art.
  imageUrl: string;
  rating: string;
  reviewCount: number;
  line1En: string;
  line1Zh: string;
  line2En: string;
  line2Zh: string;
};

export type SiteHomeStoryCard = {
  title: LocalizedText;
  bodyText: LocalizedText;
  date: LocalizedText;
  href?: string;
};

export type SiteHomeProfile = {
  headline: LocalizedText;
  kicker: LocalizedText;
  intro: LocalizedText;
  citySelectSuffix: LocalizedText;
  defaultSearchCity: string;
  launchCities: string[];
  cityNamesZh: Record<string, string>;
  heroImageUrl: string;
  heroImageAlt: LocalizedText;
  heroForegroundImageUrl: string;
  heroForegroundAlt: LocalizedText;
  heroForegroundTransparent?: boolean;
  heroBadge: LocalizedText;
  heroBadgeSubcopy: LocalizedText;
  focusTitle: LocalizedText;
  focusBody: LocalizedText;
  featuredCards: SiteFeaturedShowcaseCard[];
  neighborhoods: SiteNeighborhoodSpot[];
  mapImageUrl: string;
  mapImageAlt: LocalizedText;
  relocationImageUrl: string;
  relocationImageAlt: LocalizedText;
  storyCards?: SiteHomeStoryCard[];
  newcomerTitle: LocalizedText;
  newcomerBody: LocalizedText;
};

export type SiteContentSource = {
  state: SiteContentState;
  label: string;
  kind: 'static-json' | 'supabase' | 'scraper' | 'rss' | 'runtime-json' | 'manual';
  path?: string;
  env?: string[];
  notes: string;
};

export type SiteDirectoryConfig = {
  categorySlugs: string[];
  citySelectSuffix: LocalizedText;
  defaultSearchCity: string;
  launchCities: string[];
  cityNamesZh: Record<string, string>;
  listingSource: SiteContentSource;
  allowDefaultFallback: boolean;
};

export type SiteNewsConfig = {
  routePath: string;
  archivePath: string;
  articleDataSource: SiteContentSource;
  sourceManifest: SiteContentSource;
  allowDefaultFallback: boolean;
};

export type SiteSeoConfig = {
  title: LocalizedText;
  description: LocalizedText;
  canonicalBaseUrl: string;
};

export type SitePublisherConfig = {
  contactEmail: string;
  updatedLabel: LocalizedText;
};

export type SiteRuntimeConfig = {
  rootPath: string;
  dataPath: string;
  logsPath: string;
};

export type SiteProfile = {
  key: SiteKey | 'unconfigured';
  launchState: SiteLaunchState;
  domains: string[];
  domain: string;
  url: string;
  cityName: string;
  stateRegion: string;
  stateCode: string;
  countryCode: string;
  supportedLocales: Locale[];
  brandName: string;
  brandNameZh: string;
  brandParts: SiteBrandParts;
  regionName: string;
  regionNameZh: string;
  guideTagline: LocalizedText;
  localCoverageLabel: LocalizedText;
  description: LocalizedText;
  home: SiteHomeProfile;
  directory: SiteDirectoryConfig;
  news: SiteNewsConfig;
  seo: SiteSeoConfig;
  publisher: SitePublisherConfig;
  runtime: SiteRuntimeConfig;
};
