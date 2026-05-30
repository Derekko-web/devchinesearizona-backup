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
  imageUrl: string;
  rating: string;
  reviewCount: number;
  line1En: string;
  line1Zh: string;
  line2En: string;
  line2Zh: string;
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

const arizonaFeaturedCards: SiteFeaturedShowcaseCard[] = [
  {
    slug: 'bido-cafe',
    badge: 'Verified',
    categoryEn: 'Dining',
    categoryZh: '餐厅美食',
    nameEn: 'Bido Cafe',
    nameZh: 'Bido Cafe',
    imageUrl: '/directory-ai-replacements/bido-cafe.webp',
    rating: '4.8',
    reviewCount: 24,
    line1En: '2050 N Alma School Rd #11',
    line1Zh: '2050 N Alma School Rd #11',
    line2En: 'Chandler, AZ 85224',
    line2Zh: 'Chandler, AZ 85224',
  },
  {
    slug: 'hedy-li-phoenix',
    badge: 'Verified',
    categoryEn: 'Real Estate',
    categoryZh: '地产服务',
    nameEn: 'Hedy Li',
    nameZh: 'Hedy Li',
    imageUrl: '/directory-ai-replacements/hedy-li-phoenix.webp',
    rating: '4.9',
    reviewCount: 47,
    line1En: 'Phoenix Metro Area',
    line1Zh: '凤凰城都会区',
    line2En: '',
    line2Zh: '',
  },
  {
    slug: 'old-town-taste-tempe',
    badge: 'Claimed',
    categoryEn: 'Beverages',
    categoryZh: '饮品甜点',
    nameEn: 'Old Town Taste',
    nameZh: 'Old Town Taste',
    imageUrl: '/directory-ai-replacements/old-town-taste-tempe-v2.webp',
    rating: '4.7',
    reviewCount: 51,
    line1En: '1845 E Broadway Rd',
    line1Zh: '1845 E Broadway Rd',
    line2En: 'Tempe, AZ 85281',
    line2Zh: 'Tempe, AZ 85281',
  },
  {
    slug: 'china-magic-noodle-house-chandler',
    badge: 'Verified',
    categoryEn: 'Dining',
    categoryZh: '餐厅美食',
    nameEn: 'China Magic Noodle House',
    nameZh: 'China Magic Noodle House',
    imageUrl: '/directory-ai-replacements/china-magic-noodle-house-chandler.webp',
    rating: '4.7',
    reviewCount: 46,
    line1En: '2015 N Dobson Rd Unit 2',
    line1Zh: '2015 N Dobson Rd Unit 2',
    line2En: 'Chandler, AZ 85224',
    line2Zh: 'Chandler, AZ 85224',
  },
];

const arizonaNeighborhoods: SiteNeighborhoodSpot[] = [
  {
    city: 'Chandler',
    cityZh: '钱德勒',
    regionEn: 'East Valley',
    regionZh: '东谷',
    imageUrl: '/home-neighborhood/chandler-card.webp',
  },
  {
    city: 'Tempe',
    cityZh: '坦佩',
    regionEn: 'ASU corridor',
    regionZh: '大学走廊',
    imageUrl: '/home-neighborhood/tempe-card.webp',
  },
  {
    city: 'Phoenix',
    cityZh: '凤凰城',
    regionEn: 'Greater Phoenix',
    regionZh: '都会区',
    imageUrl: '/home-neighborhood/phoenix-card.webp',
  },
  {
    city: 'Scottsdale',
    cityZh: '斯科茨代尔',
    regionEn: 'North East Valley',
    regionZh: '东北谷',
    imageUrl: '/home-neighborhood/scottsdale-card.webp',
  },
];

export const siteProfiles: Record<SiteKey, SiteProfile> = {
  arizona: {
    key: 'arizona',
    launchState: 'live',
    domains: ['chinesearizona.com', 'www.chinesearizona.com', 'dev.chinesearizona.com'],
    domain: 'chinesearizona.com',
    url: 'https://chinesearizona.com',
    cityName: 'Phoenix',
    stateRegion: 'Arizona',
    stateCode: 'AZ',
    countryCode: 'US',
    supportedLocales: ['en', 'zh'],
    brandName: 'ChineseArizona',
    brandNameZh: '亞利桑那華人',
    brandParts: {
      enPrefix: 'Chinese',
      enAccent: 'Arizona',
      zhPrefix: '亞利桑那',
      zhAccent: '華人',
    },
    regionName: 'Arizona',
    regionNameZh: '亞利桑那',
    guideTagline: {
      en: 'Arizona bilingual guide',
      zh: '亞利桑那雙語指南',
    },
    localCoverageLabel: {
      en: 'Arizona-first coverage',
      zh: '本地優先',
    },
    description: {
      en: 'A modern bilingual Arizona platform for trusted local businesses, newcomer resources, community events, and local Chinese-language discovery.',
      zh: '服務亞利桑那華人與新移民的雙語平台，整合可信商家、生活資源、社群活動與在地發現。',
    },
    directory: {
      categorySlugs: [
        'dining',
        'real-estate',
        'local-services',
        'education',
        'medical',
        'legal-finance',
        'home-services',
        'shopping',
        'moving',
      ],
      citySelectSuffix: { en: 'AZ', zh: 'AZ' },
      defaultSearchCity: 'Tempe',
      launchCities: ['Phoenix', 'Chandler', 'Tempe', 'Mesa', 'Gilbert', 'Scottsdale'],
      cityNamesZh: {
        Phoenix: '凤凰城',
        Chandler: '钱德勒',
        Tempe: '坦佩',
        Mesa: '梅萨',
        Gilbert: '吉尔伯特',
        Scottsdale: '斯科茨代尔',
      },
      listingSource: {
        state: 'live',
        label: 'ChineseArizona business directory',
        kind: 'supabase',
        path: 'src/data/generated-directory-businesses.json',
        env: ['NEXT_PUBLIC_SUPABASE_URL'],
        notes: 'Arizona-only listings generated from Arizona directory sources and owner submissions.',
      },
      allowDefaultFallback: true,
    },
    news: {
      routePath: '/arizona-news',
      archivePath: '/arizona-news/archive',
      articleDataSource: {
        state: 'live',
        label: 'Arizona Radar and editorial articles',
        kind: 'runtime-json',
        path: 'src/data/generated-local-articles.json',
        env: ['NEXT_PUBLIC_SUPABASE_URL'],
        notes: 'Arizona-only generated articles, Radar items, and licensed imported articles.',
      },
      sourceManifest: {
        state: 'live',
        label: 'Arizona Radar monitored sources',
        kind: 'static-json',
        path: 'src/data/radar-source-manifest.json',
        notes: 'Arizona-specific source manifest and scoring rules.',
      },
      allowDefaultFallback: true,
    },
    seo: {
      title: {
        en: 'ChineseArizona | Arizona Chinese Community Directory, News, and Resources',
        zh: 'ChineseArizona | 亞利桑那華人商家、新聞與生活資源',
      },
      description: {
        en: 'A modern bilingual Arizona platform for trusted local businesses, newcomer resources, community events, and local Chinese-language discovery.',
        zh: '服務亞利桑那華人與新移民的雙語平台，整合可信商家、生活資源、社群活動與在地發現。',
      },
      canonicalBaseUrl: 'https://chinesearizona.com',
    },
    publisher: {
      contactEmail: 'hello@chinesearizona.com',
      updatedLabel: {
        en: 'Last updated: May 17, 2026',
        zh: '最後更新：2026 年 5 月 17 日',
      },
    },
    runtime: {
      rootPath: '/var/www/dev.chinesearizona.com/web',
      dataPath: '/var/www/dev.chinesearizona.com/web/src/data',
      logsPath: '/var/www/dev.chinesearizona.com/logs',
    },
    home: {
      headline: {
        en: "Your Guide to Arizona's Chinese Community",
        zh: '亚利桑那华人社区指南',
      },
      kicker: {
        en: "Connect with Arizona's Chinese community and discover local highlights",
        zh: '连接亚利桑那华人社区，发现本地精彩',
      },
      intro: {
        en: 'Find trusted businesses, local services, and community connections.',
        zh: '找到可信商家、在地服务与社区连结。',
      },
      citySelectSuffix: { en: 'AZ', zh: 'AZ' },
      defaultSearchCity: 'Tempe',
      launchCities: ['Phoenix', 'Chandler', 'Tempe', 'Mesa', 'Gilbert', 'Scottsdale'],
      cityNamesZh: {
        Phoenix: '凤凰城',
        Chandler: '钱德勒',
        Tempe: '坦佩',
        Mesa: '梅萨',
        Gilbert: '吉尔伯特',
        Scottsdale: '斯科茨代尔',
      },
      heroImageUrl: '/directory-ai-replacements/old-town-taste-tempe-v2.webp',
      heroImageAlt: {
        en: 'Featured Arizona Chinese cuisine',
        zh: '亚利桑那华人美食',
      },
      heroForegroundImageUrl: '/hero/tempe-landscape-transparent-cropped.png',
      heroForegroundAlt: {
        en: 'Tempe landscape',
        zh: '坦佩城市风景',
      },
      heroForegroundTransparent: true,
      heroBadge: {
        en: 'TEMPE, ARIZONA',
        zh: '坦佩，亚利桑那',
      },
      heroBadgeSubcopy: {
        en: 'City of sunshine · Active community',
        zh: '阳光之城 · 活力社区',
      },
      focusTitle: {
        en: 'AZ Focused',
        zh: '亚省聚焦',
      },
      focusBody: {
        en: 'Local neighborhoods and services',
        zh: '在地社区与服务',
      },
      featuredCards: arizonaFeaturedCards,
      neighborhoods: arizonaNeighborhoods,
      mapImageUrl: '/home-neighborhood/map-reference.png',
      mapImageAlt: {
        en: 'Arizona neighborhood map',
        zh: '亚利桑那社区地图',
      },
      relocationImageUrl: '/home-neighborhood/relocation-cactus.webp',
      relocationImageAlt: {
        en: 'Arizona desert landscape',
        zh: '亚利桑那沙漠风景',
      },
      newcomerTitle: {
        en: 'New to Arizona?',
        zh: '初来亚利桑那？',
      },
      newcomerBody: {
        en: 'Your guide to settling in, finding services, schools, and more.',
        zh: '从学校到服务，把安家路线上需要的信息整理清楚。',
      },
    },
  },
  'los-angeles': {
    key: 'los-angeles',
    launchState: 'live',
    domains: ['chineselosangeles.com', 'www.chineselosangeles.com'],
    domain: 'chineselosangeles.com',
    url: 'https://chineselosangeles.com',
    cityName: 'Los Angeles',
    stateRegion: 'California',
    stateCode: 'CA',
    countryCode: 'US',
    supportedLocales: ['en', 'zh'],
    brandName: 'ChineseLosAngeles',
    brandNameZh: '洛杉磯華人',
    brandParts: {
      enPrefix: 'Chinese',
      enAccent: 'LosAngeles',
      zhPrefix: '洛杉磯',
      zhAccent: '華人',
    },
    regionName: 'Los Angeles',
    regionNameZh: '洛杉磯',
    guideTagline: {
      en: 'Los Angeles bilingual guide',
      zh: '洛杉磯雙語指南',
    },
    localCoverageLabel: {
      en: 'Los Angeles-first coverage',
      zh: '洛杉磯本地優先',
    },
    description: {
      en: 'A bilingual Los Angeles platform for local news summaries, source links, and Chinese community discovery across LA and the San Gabriel Valley.',
      zh: '服務洛杉磯與聖蓋博谷華人社群的雙語平台，提供本地新聞摘要、來源連結與生活發現。',
    },
    directory: {
      categorySlugs: ['dining', 'real-estate', 'local-services', 'education', 'medical'],
      citySelectSuffix: { en: 'CA', zh: 'CA' },
      defaultSearchCity: 'Los Angeles',
      launchCities: ['Los Angeles', 'Alhambra', 'Arcadia', 'Monterey Park', 'Pasadena'],
      cityNamesZh: {
        'Los Angeles': '洛杉磯',
        Alhambra: '阿罕布拉',
        Arcadia: '亞凱迪亞',
        'Monterey Park': '蒙特利公園',
        Pasadena: '帕薩迪納',
      },
      listingSource: {
        state: 'required',
        label: 'Los Angeles business listing source',
        kind: 'static-json',
        path: 'data/sites/los-angeles/businesses.json',
        notes: 'Must be populated from Los Angeles-specific listing sources before this site can serve a directory.',
      },
      allowDefaultFallback: false,
    },
    news: {
      routePath: '/los-angeles-news',
      archivePath: '/los-angeles-news/archive',
      articleDataSource: {
        state: 'live',
        label: 'Los Angeles Radar generated summaries',
        kind: 'runtime-json',
        path: 'data/sites/los-angeles/radar-runtime/store.json',
        notes: 'Los Angeles-only generated summary articles and Radar runtime data. Does not read any other city runtime or generated article files.',
      },
      sourceManifest: {
        state: 'live',
        label: 'Los Angeles Radar monitored sources',
        kind: 'static-json',
        path: 'src/data/los-angeles-radar-source-manifest.json',
        notes: 'Los Angeles, SGV, Southern California, LAX, and official-source manifest for summary/link-only generation.',
      },
      allowDefaultFallback: false,
    },
    seo: {
      title: {
        en: 'ChineseLosAngeles | Los Angeles Chinese Community News and Resources',
        zh: 'ChineseLosAngeles | 洛杉磯華人新聞與生活資源',
      },
      description: {
        en: 'Bilingual Los Angeles local news summaries and source links for Chinese families, students, job seekers, and business owners across LA and the SGV.',
        zh: '面向洛杉磯與聖蓋博谷華人家庭、學生、求職者與商家的雙語本地新聞摘要與來源連結。',
      },
      canonicalBaseUrl: 'https://chineselosangeles.com',
    },
    publisher: {
      contactEmail: 'hello@chineselosangeles.com',
      updatedLabel: {
        en: 'Last updated: May 29, 2026',
        zh: '最後更新：2026 年 5 月 29 日',
      },
    },
    runtime: {
      rootPath: '/var/www/chineselosangeles.com/web',
      dataPath: '/var/www/chineselosangeles.com/data',
      logsPath: '/var/www/chineselosangeles.com/logs',
    },
    home: {
      headline: {
        en: 'Los Angeles Chinese Community Guide',
        zh: '洛杉磯華人社區指南',
      },
      kicker: {
        en: 'Local summaries and source links for LA and the San Gabriel Valley',
        zh: '整理洛杉磯與聖蓋博谷的本地摘要與來源連結',
      },
      intro: {
        en: 'Follow Los Angeles openings, housing, transit, official updates, and community signals from LA-specific sources.',
        zh: '從洛杉磯專屬來源追蹤本地新店、住房、交通、官方更新與社群訊號。',
      },
      citySelectSuffix: { en: 'CA', zh: 'CA' },
      defaultSearchCity: 'Los Angeles',
      launchCities: ['Los Angeles', 'Alhambra', 'Arcadia', 'Monterey Park', 'Pasadena'],
      cityNamesZh: {
        'Los Angeles': '洛杉磯',
        Alhambra: '阿罕布拉',
        Arcadia: '亞凱迪亞',
        'Monterey Park': '蒙特利公園',
        Pasadena: '帕薩迪納',
      },
      heroImageUrl: '/window.svg',
      heroImageAlt: {
        en: 'Los Angeles city guide image',
        zh: '洛杉磯城市指南圖片',
      },
      heroForegroundImageUrl: '/globe.svg',
      heroForegroundAlt: {
        en: 'Los Angeles platform mark',
        zh: '洛杉磯平台標記',
      },
      heroBadge: {
        en: 'LOS ANGELES, CALIFORNIA',
        zh: '洛杉磯，加州',
      },
      heroBadgeSubcopy: {
        en: 'LA and SGV local signals',
        zh: '洛杉磯與聖蓋博谷本地訊號',
      },
      focusTitle: {
        en: 'LA Focused',
        zh: '洛杉磯聚焦',
      },
      focusBody: {
        en: 'Local neighborhoods and source-linked summaries',
        zh: '本地街區與來源連結摘要',
      },
      featuredCards: [],
      neighborhoods: [],
      mapImageUrl: '/globe.svg',
      mapImageAlt: {
        en: 'Los Angeles source map placeholder',
        zh: '洛杉磯來源地圖占位',
      },
      relocationImageUrl: '/window.svg',
      relocationImageAlt: {
        en: 'Los Angeles relocation placeholder',
        zh: '洛杉磯安家占位圖',
      },
      newcomerTitle: {
        en: 'Los Angeles Sources Connected',
        zh: '洛杉磯來源已接入',
      },
      newcomerBody: {
        en: 'News is generated from Los Angeles-specific feeds and official sources as original summaries with source links.',
        zh: '新聞由洛杉磯專屬 feeds 與官方來源生成為原創摘要，並附來源連結。',
      },
    },
  },
  'sf-bay': {
    key: 'sf-bay',
    launchState: 'live',
    domains: ['chinesesfbay.com', 'www.chinesesfbay.com'],
    domain: 'chinesesfbay.com',
    url: 'https://chinesesfbay.com',
    cityName: 'San Francisco',
    stateRegion: 'San Francisco Bay Area',
    stateCode: 'CA',
    countryCode: 'US',
    supportedLocales: ['en', 'zh'],
    brandName: 'ChineseSFBay',
    brandNameZh: '舊金山灣區華人',
    brandParts: {
      enPrefix: 'Chinese',
      enAccent: 'SFBay',
      zhPrefix: '灣區',
      zhAccent: '華人',
    },
    regionName: 'SF Bay',
    regionNameZh: '灣區',
    guideTagline: {
      en: 'SF Bay bilingual guide',
      zh: '灣區雙語指南',
    },
    localCoverageLabel: {
      en: 'Bay Area-first coverage',
      zh: '灣區本地優先',
    },
    description: {
      en: 'A bilingual San Francisco Bay Area platform for local Chinese community news, source-linked summaries, and practical city discovery.',
      zh: '服務舊金山灣區華人社群的雙語平台，聚焦本地新聞、來源連結摘要與實用城市資訊。',
    },
    directory: {
      categorySlugs: [
        'dining',
        'real-estate',
        'local-services',
        'education',
        'medical',
        'legal-finance',
        'shopping',
        'travel',
      ],
      citySelectSuffix: { en: 'CA', zh: 'CA' },
      defaultSearchCity: 'San Francisco',
      launchCities: [
        'San Francisco',
        'Oakland',
        'San Jose',
        'Fremont',
        'Sunnyvale',
        'Santa Clara',
      ],
      cityNamesZh: {
        'San Francisco': '舊金山',
        Oakland: '奧克蘭',
        'San Jose': '聖荷西',
        Fremont: '佛利蒙',
        Sunnyvale: '桑尼維爾',
        'Santa Clara': '聖塔克拉拉',
      },
      listingSource: {
        state: 'required',
        label: 'SF Bay business listing source',
        kind: 'static-json',
        path: 'data/sites/sf-bay/businesses.json',
        notes: 'Must be populated from SF Bay-specific listing sources before this site can serve a directory.',
      },
      allowDefaultFallback: false,
    },
    news: {
      routePath: '/news',
      archivePath: '/news/archive',
      articleDataSource: {
        state: 'live',
        label: 'SF Bay Radar and generated local summaries',
        kind: 'runtime-json',
        path: 'data/sf-bay-radar-runtime/store.json',
        env: ['SF_BAY_RADAR_STORE_PATH'],
        notes: 'SF Bay-only generated summary/link articles and runtime radar output. This site never reads the Arizona radar store.',
      },
      sourceManifest: {
        state: 'live',
        label: 'SF Bay Radar monitored sources',
        kind: 'static-json',
        path: 'src/data/sf-bay-radar-source-manifest.json',
        notes: 'San Francisco Bay Area source manifest with local media, official, airport, business, and signal-only sources.',
      },
      allowDefaultFallback: false,
    },
    seo: {
      title: {
        en: 'ChineseSFBay | San Francisco Bay Area Chinese Community News and Resources',
        zh: 'ChineseSFBay | 舊金山灣區華人新聞與生活資源',
      },
      description: {
        en: 'Source-linked bilingual news summaries and practical local discovery for San Francisco, Oakland, San Jose, Fremont, Sunnyvale, Santa Clara, and the wider Bay Area.',
        zh: '為舊金山、奧克蘭、聖荷西、佛利蒙、桑尼維爾、聖塔克拉拉與灣區讀者整理有來源連結的雙語新聞摘要與在地資訊。',
      },
      canonicalBaseUrl: 'https://chinesesfbay.com',
    },
    publisher: {
      contactEmail: 'hello@chinesesfbay.com',
      updatedLabel: {
        en: 'Last updated: May 30, 2026',
        zh: '最後更新：2026 年 5 月 30 日',
      },
    },
    runtime: {
      rootPath: '/var/www/chinesesfbay.com/web',
      dataPath: '/var/www/chinesesfbay.com/data',
      logsPath: '/var/www/chinesesfbay.com/logs',
    },
    home: {
      headline: {
        en: 'Your Guide to the SF Bay Chinese Community',
        zh: '舊金山灣區華人生活指南',
      },
      kicker: {
        en: 'Source-linked Bay Area news and local discovery',
        zh: '有來源連結的灣區新聞與在地發現',
      },
      intro: {
        en: 'Follow local summaries for San Francisco, Oakland, San Jose, the Peninsula, and South Bay without copying third-party articles.',
        zh: '追蹤舊金山、奧克蘭、聖荷西、半島與南灣的本地摘要，不轉載第三方全文。',
      },
      citySelectSuffix: { en: 'CA', zh: 'CA' },
      defaultSearchCity: 'San Francisco',
      launchCities: [
        'San Francisco',
        'Oakland',
        'San Jose',
        'Fremont',
        'Sunnyvale',
        'Santa Clara',
      ],
      cityNamesZh: {
        'San Francisco': '舊金山',
        Oakland: '奧克蘭',
        'San Jose': '聖荷西',
        Fremont: '佛利蒙',
        Sunnyvale: '桑尼維爾',
        'Santa Clara': '聖塔克拉拉',
      },
      heroImageUrl: '/window.svg',
      heroImageAlt: {
        en: 'SF Bay city launch image',
        zh: '灣區城市首頁圖',
      },
      heroForegroundImageUrl: '/globe.svg',
      heroForegroundAlt: {
        en: 'SF Bay local platform mark',
        zh: '灣區平台標記',
      },
      heroBadge: {
        en: 'SF BAY, CALIFORNIA',
        zh: '舊金山灣區，加州',
      },
      heroBadgeSubcopy: {
        en: 'Local source links only',
        zh: '僅使用本地來源連結',
      },
      focusTitle: {
        en: 'Bay Area Focused',
        zh: '灣區聚焦',
      },
      focusBody: {
        en: 'Local news, openings, official updates',
        zh: '本地新聞、新店與官方更新',
      },
      featuredCards: [],
      neighborhoods: [],
      mapImageUrl: '/globe.svg',
      mapImageAlt: {
        en: 'SF Bay source map placeholder',
        zh: '灣區來源地圖占位',
      },
      relocationImageUrl: '/window.svg',
      relocationImageAlt: {
        en: 'SF Bay local discovery placeholder',
        zh: '灣區在地發現占位',
      },
      newcomerTitle: {
        en: 'SF Bay News',
        zh: '灣區新聞',
      },
      newcomerBody: {
        en: 'ChineseSFBay publishes short original summaries with source links and fails empty when Bay Area data is missing.',
        zh: 'ChineseSFBay 發佈附來源連結的原創短摘要；灣區資料缺失時顯示空狀態，不回退到亞利桑那內容。',
      },
    },
  },
  austin: {
    key: 'austin',
    launchState: 'placeholder',
    domains: ['chineseaustin.com', 'www.chineseaustin.com'],
    domain: 'chineseaustin.com',
    url: 'https://chineseaustin.com',
    cityName: 'Austin',
    stateRegion: 'Texas',
    stateCode: 'TX',
    countryCode: 'US',
    supportedLocales: ['en', 'zh'],
    brandName: 'ChineseAustin',
    brandNameZh: '奥斯汀华人',
    brandParts: {
      enPrefix: 'Chinese',
      enAccent: 'Austin',
      zhPrefix: '奥斯汀',
      zhAccent: '华人',
    },
    regionName: 'Austin',
    regionNameZh: '奥斯汀',
    guideTagline: {
      en: 'Austin bilingual guide',
      zh: '奥斯汀双语指南',
    },
    localCoverageLabel: {
      en: 'Austin-first coverage',
      zh: '奥斯汀本地优先',
    },
    description: {
      en: 'A bilingual Austin platform profile with city-specific news sources for Austin, Round Rock, Cedar Park, Pflugerville, and Central Texas.',
      zh: '奥斯汀双语城市平台配置，使用奥斯汀、朗德罗克、雪松公园、普弗拉格维尔与中德州专属新闻来源。',
    },
    directory: {
      categorySlugs: ['dining', 'real-estate', 'local-services', 'education', 'medical'],
      citySelectSuffix: { en: 'TX', zh: 'TX' },
      defaultSearchCity: 'Austin',
      launchCities: ['Austin', 'Cedar Park', 'Round Rock', 'Pflugerville'],
      cityNamesZh: {
        Austin: '奥斯汀',
        'Cedar Park': '雪松公园',
        'Round Rock': '朗德罗克',
        Pflugerville: '普弗拉格维尔',
      },
      listingSource: {
        state: 'required',
        label: 'Austin business listing source',
        kind: 'static-json',
        path: 'data/sites/austin/businesses.json',
        notes: 'Must be populated from Austin-specific listing sources before this site can serve a directory.',
      },
      allowDefaultFallback: false,
    },
    news: {
      routePath: '/local-news',
      archivePath: '/local-news/archive',
      articleDataSource: {
        state: 'live',
        label: 'Austin Radar article data',
        kind: 'runtime-json',
        path: 'data/sites/austin/radar-runtime/store.json',
        notes: 'Austin-only summary/link articles generated from Austin source settings and editorial review.',
      },
      sourceManifest: {
        state: 'live',
        label: 'Austin monitored source manifest',
        kind: 'static-json',
        path: 'src/data/austin-radar-source-manifest.json',
        notes: 'Austin-specific RSS, official, local media, and signal-only source settings.',
      },
      allowDefaultFallback: false,
    },
    seo: {
      title: {
        en: 'ChineseAustin | Austin Chinese Community Directory, News, and Resources',
        zh: 'ChineseAustin | 奥斯汀华人商家、新闻与生活资源',
      },
      description: {
        en: 'Austin Chinese community news, source-linked local summaries, business resources, and bilingual newcomer context for Central Texas.',
        zh: '奥斯汀华人社区新闻、附来源链接的本地摘要、商家资源与中德州双语生活资讯。',
      },
      canonicalBaseUrl: 'https://chineseaustin.com',
    },
    publisher: {
      contactEmail: 'hello@chineseaustin.com',
      updatedLabel: {
        en: 'Austin news sources connected: May 30, 2026',
        zh: '奥斯汀新闻来源已接入：2026 年 5 月 30 日',
      },
    },
    runtime: {
      rootPath: '/var/www/chineseaustin.com/web',
      dataPath: '/var/www/chineseaustin.com/data',
      logsPath: '/var/www/chineseaustin.com/logs',
    },
    home: {
      headline: {
        en: 'ChineseAustin Launch Placeholder',
        zh: 'ChineseAustin 上线占位配置',
      },
      kicker: {
        en: 'Austin-specific content sources are required before launch',
        zh: '上线前必须接入奥斯汀专属内容来源',
      },
      intro: {
        en: 'This example reuses platform code only. It does not reuse ChineseArizona listings, articles, or generated data.',
        zh: '此示例只复用平台代码，不复用 ChineseArizona 商家、文章或生成数据。',
      },
      citySelectSuffix: { en: 'TX', zh: 'TX' },
      defaultSearchCity: 'Austin',
      launchCities: ['Austin', 'Cedar Park', 'Round Rock', 'Pflugerville'],
      cityNamesZh: {
        Austin: '奥斯汀',
        'Cedar Park': '雪松公园',
        'Round Rock': '朗德罗克',
        Pflugerville: '普弗拉格维尔',
      },
      heroImageUrl: '/window.svg',
      heroImageAlt: {
        en: 'Placeholder city launch image',
        zh: '城市上线占位图',
      },
      heroForegroundImageUrl: '/globe.svg',
      heroForegroundAlt: {
        en: 'Placeholder city platform mark',
        zh: '城市平台占位图标',
      },
      heroBadge: {
        en: 'AUSTIN, TEXAS',
        zh: '奥斯汀，德州',
      },
      heroBadgeSubcopy: {
        en: 'Launch blocked until local data exists',
        zh: '本地数据完成前禁止上线',
      },
      focusTitle: {
        en: 'Austin Focused',
        zh: '奥斯汀聚焦',
      },
      focusBody: {
        en: 'Local neighborhoods and services',
        zh: '在地社区与服务',
      },
      featuredCards: [],
      neighborhoods: [],
      mapImageUrl: '/globe.svg',
      mapImageAlt: {
        en: 'Austin source map placeholder',
        zh: '奥斯汀来源地图占位',
      },
      relocationImageUrl: '/window.svg',
      relocationImageAlt: {
        en: 'Austin relocation source placeholder',
        zh: '奥斯汀搬迁来源占位',
      },
      newcomerTitle: {
        en: 'Data Required',
        zh: '需要本地数据',
      },
      newcomerBody: {
        en: 'Add Austin listing sources, news feeds, SEO copy, runtime paths, and generated article data before enabling this site.',
        zh: '启用此站前，请先添加奥斯汀商家来源、新闻源、SEO 文案、运行路径与生成文章数据。',
      },
    },
  },
};

export const defaultSiteProfile = siteProfiles.arizona;

function isLocalHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1';
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
    brandNameZh: '未配置城市站点',
    brandParts: {
      enPrefix: 'City',
      enAccent: 'Site',
      zhPrefix: '城市',
      zhAccent: '站点',
    },
    regionName: 'Unconfigured',
    regionNameZh: '未配置',
    guideTagline: {
      en: 'City config required',
      zh: '需要城市配置',
    },
    localCoverageLabel: {
      en: 'No city data connected',
      zh: '尚未接入城市数据',
    },
    description: {
      en: 'This hostname is not connected to a live city configuration and cannot serve default ChineseArizona content.',
      zh: '此主机名尚未连接可上线的城市配置，不能提供默认 ChineseArizona 内容。',
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
        zh: '未配置城市站点',
      },
      description: {
        en: 'City-specific SEO copy is required before this hostname can launch.',
        zh: '此主机名上线前必须配置城市专属 SEO 文案。',
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
        zh: '此主机名已阻止默认内容回退',
      },
      intro: {
        en: 'Add city-specific business, article, SEO, branding, and runtime settings before launch.',
        zh: '上线前请添加城市专属商家、文章、SEO、品牌与运行设置。',
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
        zh: '未配置城市标记',
      },
      heroBadge: {
        en: 'UNCONFIGURED',
        zh: '未配置',
      },
      heroBadgeSubcopy: {
        en: 'No default fallback',
        zh: '无默认回退',
      },
      focusTitle: {
        en: 'Config Required',
        zh: '需要配置',
      },
      focusBody: {
        en: 'City content sources missing',
        zh: '缺少城市内容来源',
      },
      featuredCards: [],
      neighborhoods: [],
      mapImageUrl: '/globe.svg',
      mapImageAlt: {
        en: 'Unconfigured map placeholder',
        zh: '未配置地图占位',
      },
      relocationImageUrl: '/window.svg',
      relocationImageAlt: {
        en: 'Unconfigured relocation placeholder',
        zh: '未配置搬迁占位',
      },
      newcomerTitle: {
        en: 'Launch Blocked',
        zh: '上线已阻止',
      },
      newcomerBody: {
        en: 'This profile exists only to prevent accidental fallback to ChineseArizona content.',
        zh: '此配置仅用于防止意外回退到 ChineseArizona 内容。',
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

export function resolveSiteProfileFromHost(host?: string | null): SiteProfile {
  const normalizedHost = normalizeHost(host);

  if (!normalizedHost || isLocalHost(normalizedHost)) {
    return defaultSiteProfile;
  }

  for (const profile of Object.values(siteProfiles)) {
    if (profile.domains.some((domain) => normalizeHost(domain) === normalizedHost)) {
      return profile;
    }
  }

  return createUnconfiguredSiteProfile(normalizedHost);
}
