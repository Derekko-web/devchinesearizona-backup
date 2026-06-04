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

const losAngelesNeighborhoods: SiteNeighborhoodSpot[] = [
  {
    city: 'Los Angeles',
    cityZh: '洛杉磯',
    regionEn: 'Chinatown and Downtown',
    regionZh: '華埠與市中心',
    imageUrl: '/city-site-images/la-chinatown-downtown.webp',
  },
  {
    city: 'Alhambra',
    cityZh: '阿罕布拉',
    regionEn: 'West San Gabriel Valley',
    regionZh: '西聖蓋博谷',
    imageUrl: '/city-site-images/alhambra-main-street.webp',
  },
  {
    city: 'San Gabriel',
    cityZh: '聖蓋博',
    regionEn: 'San Gabriel Valley',
    regionZh: '聖蓋博谷',
    imageUrl: '/city-site-images/san-gabriel-valley-boulevard.webp',
  },
  {
    city: 'Arcadia',
    cityZh: '亞凱迪亞',
    regionEn: 'Santa Anita corridor',
    regionZh: 'Santa Anita 生活圈',
    imageUrl: '/city-site-images/arcadia-foothills.webp',
  },
];

const losAngelesFeaturedCards: SiteFeaturedShowcaseCard[] = [
  {
    slug: 'lunasia-dim-sum-house-alhambra',
    badge: 'Verified',
    categoryEn: 'Dining',
    categoryZh: '餐廳美食',
    nameEn: 'Lunasia Dim Sum House',
    nameZh: 'Lunasia 點心坊',
    imageUrl: '/city-site-images/lunasia-dim-sum-house-alhambra.webp',
    rating: 'Source-backed',
    reviewCount: 0,
    line1En: '500 W Main St',
    line1Zh: '500 W Main St',
    line2En: 'Alhambra, CA 91801',
    line2Zh: 'Alhambra, CA 91801',
  },
  {
    slug: 'irn-realty-arcadia',
    badge: 'Verified',
    categoryEn: 'Real Estate',
    categoryZh: '房地產',
    nameEn: 'IRN Realty Arcadia',
    nameZh: 'IRN Realty Arcadia 房地產',
    imageUrl: '/city-site-images/irn-realty-arcadia.webp',
    rating: 'Source-backed',
    reviewCount: 0,
    line1En: '556 Las Tunas Dr #101',
    line1Zh: '556 Las Tunas Dr #101',
    line2En: 'Arcadia, CA 91007',
    line2Zh: 'Arcadia, CA 91007',
  },
  {
    slug: 'chinatown-service-center-los-angeles',
    badge: 'Verified',
    categoryEn: 'Local Services',
    categoryZh: '在地服務',
    nameEn: 'Chinatown Service Center',
    nameZh: '華埠服務中心',
    imageUrl: '/city-site-images/chinatown-service-center-los-angeles.webp',
    rating: 'Source-backed',
    reviewCount: 0,
    line1En: '767 N Hill St',
    line1Zh: '767 N Hill St',
    line2En: 'Los Angeles, CA 90012',
    line2Zh: 'Los Angeles, CA 90012',
  },
  {
    slug: 'chinese-american-museum-los-angeles',
    badge: 'Verified',
    categoryEn: 'Education',
    categoryZh: '教育學習',
    nameEn: 'Chinese American Museum',
    nameZh: '洛杉磯華美博物館',
    imageUrl: '/city-site-images/chinese-american-museum-los-angeles.webp',
    rating: 'Source-backed',
    reviewCount: 0,
    line1En: '425 N Los Angeles St',
    line1Zh: '425 N Los Angeles St',
    line2En: 'Los Angeles, CA 90012',
    line2Zh: 'Los Angeles, CA 90012',
  },
];

const sfBayNeighborhoods: SiteNeighborhoodSpot[] = [
  {
    city: 'San Francisco',
    cityZh: '舊金山',
    regionEn: 'Chinatown and downtown',
    regionZh: '華埠與市中心',
    imageUrl: '/city-site-images/sf-chinatown-bay.webp',
  },
  {
    city: 'Oakland',
    cityZh: '奧克蘭',
    regionEn: 'East Bay',
    regionZh: '東灣',
    imageUrl: '/city-site-images/oakland-chinatown-street.webp',
  },
  {
    city: 'San Jose',
    cityZh: '聖荷西',
    regionEn: 'South Bay',
    regionZh: '南灣',
    imageUrl: '/city-site-images/san-jose-silicon-valley-plaza.webp',
  },
  {
    city: 'Cupertino',
    cityZh: '庫比蒂諾',
    regionEn: 'Silicon Valley',
    regionZh: '矽谷',
    imageUrl: '/city-site-images/cupertino-tech-avenue.webp',
  },
];

const sfBayFeaturedCards: SiteFeaturedShowcaseCard[] = [
  {
    slug: 'r-g-lounge-san-francisco',
    badge: 'Verified',
    categoryEn: 'Dining',
    categoryZh: '餐廳美食',
    nameEn: 'R&G Lounge',
    nameZh: '嶺南小館',
    imageUrl: '/city-site-images/r-g-lounge-san-francisco.webp',
    rating: 'Source-backed',
    reviewCount: 0,
    line1En: '631 Kearny St',
    line1Zh: '631 Kearny St',
    line2En: 'San Francisco, CA 94108',
    line2Zh: 'San Francisco, CA 94108',
  },
  {
    slug: '99-ranch-market-cupertino',
    badge: 'Verified',
    categoryEn: 'Shopping',
    categoryZh: '購物零售',
    nameEn: '99 Ranch Market Cupertino',
    nameZh: '大華超級市場 Cupertino',
    imageUrl: '/city-site-images/99-ranch-market-cupertino.webp',
    rating: 'Source-backed',
    reviewCount: 0,
    line1En: '10425 S De Anza Blvd',
    line1Zh: '10425 S De Anza Blvd',
    line2En: 'Cupertino, CA 95014',
    line2Zh: 'Cupertino, CA 95014',
  },
  {
    slug: 'chinese-american-international-school-san-francisco',
    badge: 'Verified',
    categoryEn: 'Education',
    categoryZh: '教育學習',
    nameEn: 'Chinese American International School',
    nameZh: '舊金山中美國際學校',
    imageUrl: '/city-site-images/chinese-american-international-school-san-francisco.webp',
    rating: 'Source-backed',
    reviewCount: 0,
    line1En: 'San Francisco',
    line1Zh: '舊金山',
    line2En: 'Bay Area education resource',
    line2Zh: '灣區教育資源',
  },
  {
    slug: 'asian-law-alliance-san-jose',
    badge: 'Verified',
    categoryEn: 'Legal',
    categoryZh: '法律服務',
    nameEn: 'Asian Law Alliance',
    nameZh: 'Asian Law Alliance',
    imageUrl: '/city-site-images/asian-law-alliance-san-jose.webp',
    rating: 'Source-backed',
    reviewCount: 0,
    line1En: '991 W Hedding St',
    line1Zh: '991 W Hedding St',
    line2En: 'San Jose, CA 95126',
    line2Zh: 'San Jose, CA 95126',
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
      categorySlugs: [
        'dining',
        'shopping',
        'real-estate',
        'legal-finance',
        'medical',
        'local-services',
        'education',
        'faith-community',
      ],
      citySelectSuffix: { en: 'CA', zh: 'CA' },
      defaultSearchCity: 'Los Angeles',
      launchCities: [
        'Los Angeles',
        'Alhambra',
        'Arcadia',
        'Monterey Park',
        'San Gabriel',
        'Pasadena',
        'Temple City',
      ],
      cityNamesZh: {
        'Los Angeles': '洛杉磯',
        Alhambra: '阿罕布拉',
        Arcadia: '亞凱迪亞',
        'Monterey Park': '蒙特利公園',
        'San Gabriel': '聖蓋博',
        Pasadena: '帕薩迪納',
        'Temple City': '天普市',
      },
      listingSource: {
        state: 'live',
        label: 'ChineseLosAngeles business directory',
        kind: 'static-json',
        path: 'src/data/los-angeles-directory-businesses.json',
        notes: 'Los Angeles-only static directory listings sourced from LA, SGV, and Southern California community business sources.',
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
        en: 'ChineseLosAngeles | Los Angeles Chinese Community Directory, News, and Resources',
        zh: 'ChineseLosAngeles | 洛杉磯華人商家、新聞與生活資源',
      },
      description: {
        en: 'Bilingual Los Angeles Chinese community directory, local news summaries, and source links for families, students, job seekers, and business owners across LA and the SGV.',
        zh: '面向洛杉磯與聖蓋博谷華人家庭、學生、求職者與商家的雙語商家目錄、本地新聞摘要與來源連結。',
      },
      canonicalBaseUrl: 'https://chineselosangeles.com',
    },
    publisher: {
      contactEmail: 'hello@chineselosangeles.com',
      updatedLabel: {
        en: 'Last updated: May 30, 2026',
        zh: '最後更新：2026 年 5 月 30 日',
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
        en: 'Source-backed directory listings, local summaries, and source links for LA and the San Gabriel Valley',
        zh: '整理洛杉磯與聖蓋博谷的來源佐證商家、本地摘要與來源連結',
      },
      intro: {
        en: 'Find LA-area Chinese restaurants, services, schools, clinics, culture, and local news from Los Angeles-specific sources.',
        zh: '從洛杉磯專屬來源查找華人餐飲、服務、學校、診所、文化據點與本地新聞。',
      },
      citySelectSuffix: { en: 'CA', zh: 'CA' },
      defaultSearchCity: 'Los Angeles',
      launchCities: [
        'Los Angeles',
        'Alhambra',
        'Arcadia',
        'Monterey Park',
        'San Gabriel',
        'Pasadena',
        'Temple City',
      ],
      cityNamesZh: {
        'Los Angeles': '洛杉磯',
        Alhambra: '阿罕布拉',
        Arcadia: '亞凱迪亞',
        'Monterey Park': '蒙特利公園',
        'San Gabriel': '聖蓋博',
        Pasadena: '帕薩迪納',
        'Temple City': '天普市',
      },
      heroImageUrl: '/city-site-images/los-angeles-community-hero.webp',
      heroImageAlt: {
        en: 'Los Angeles city guide image',
        zh: '洛杉磯城市指南圖片',
      },
      heroForegroundImageUrl: '/city-site-images/la-chinatown-downtown.webp',
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
        en: 'LA and SGV businesses, schools, clinics, and community resources',
        zh: '洛杉磯與聖蓋博谷商家、學校、診所與社群資源',
      },
      featuredCards: losAngelesFeaturedCards,
      neighborhoods: losAngelesNeighborhoods,
      mapImageUrl: '/city-site-images/san-gabriel-valley-boulevard.webp',
      mapImageAlt: {
        en: 'Los Angeles and San Gabriel Valley community guide image',
        zh: '洛杉磯與聖蓋博谷社區指南圖片',
      },
      relocationImageUrl: '/city-site-images/la-newcomer-corridor.webp',
      relocationImageAlt: {
        en: 'Los Angeles relocation and community guide image',
        zh: '洛杉磯安家與社區指南圖片',
      },
      storyCards: [
        {
          title: {
            en: 'LA opening radar starts with source-linked local summaries',
            zh: '洛杉磯新店雷達使用附來源連結的本地摘要',
          },
          href: '/los-angeles-news/los-angeles-opening-radar-local-source-watch',
          bodyText: {
            en: 'Restaurant, retail, and plaza updates stay tied to LA and SGV sources.',
            zh: '餐飲、零售與商場動態都保持連回洛杉磯與聖蓋博谷來源。',
          },
          date: {
            en: 'May 29, 2026',
            zh: '2026 年 5 月 29 日',
          },
        },
        {
          title: {
            en: 'SGV housing and transit watch stays LA-only',
            zh: '聖蓋博谷住房與交通觀察僅使用洛杉磯資料',
          },
          href: '/los-angeles-news/sgv-housing-transit-watch-source-linked-summaries',
          bodyText: {
            en: 'Neighborhood context covers school pickup, Metro access, freeway time, and parking.',
            zh: '街區脈絡涵蓋接送小孩、Metro、freeway 時間與停車。',
          },
          date: {
            en: 'May 29, 2026',
            zh: '2026 年 5 月 29 日',
          },
        },
        {
          title: {
            en: 'Directory highlights LA and SGV community anchors',
            zh: '目錄整理洛杉磯與聖蓋博谷社區據點',
          },
          bodyText: {
            en: 'Chinatown, Alhambra, San Gabriel, and Arcadia each get local discovery paths.',
            zh: '華埠、Alhambra、San Gabriel 與 Arcadia 都有本地探索入口。',
          },
          date: {
            en: 'May 29, 2026',
            zh: '2026 年 5 月 29 日',
          },
        },
      ],
      newcomerTitle: {
        en: 'Los Angeles Directory Connected',
        zh: '洛杉磯商家目錄已接入',
      },
      newcomerBody: {
        en: 'Directory listings and news summaries use Los Angeles-specific sources. Missing LA content is blocked instead of borrowing another city dataset.',
        zh: '商家目錄與新聞摘要使用洛杉磯專屬來源；缺少洛杉磯內容時會阻止顯示，不借用其他城市資料。',
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
      ],
      citySelectSuffix: { en: 'CA', zh: 'CA' },
      defaultSearchCity: 'San Francisco',
      launchCities: [
        'San Francisco',
        'Oakland',
        'San Jose',
        'Cupertino',
        'Sunnyvale',
        'Santa Clara',
      ],
      cityNamesZh: {
        'San Francisco': '舊金山',
        Oakland: '奧克蘭',
        'San Jose': '聖荷西',
        Cupertino: '庫比蒂諾',
        Sunnyvale: '桑尼維爾',
        'Santa Clara': '聖塔克拉拉',
      },
      listingSource: {
        state: 'live',
        label: 'SF Bay verified local directory fixtures',
        kind: 'static-json',
        path: 'src/data/generated-sf-bay-directory-businesses.json',
        notes: 'SF Bay-only real business and community-service listings. This source never reads ChineseArizona fixture data.',
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
        en: 'ChineseSFBay | San Francisco Bay Area Chinese Directory, News, and Resources',
        zh: 'ChineseSFBay | 舊金山灣區華人商家、新聞與生活資源',
      },
      description: {
        en: 'Bilingual Bay Area Chinese directory listings, source-linked news summaries, and practical local discovery for San Francisco, Oakland, San Jose, Cupertino, Sunnyvale, Santa Clara, and nearby communities.',
        zh: '為舊金山、奧克蘭、聖荷西、庫比蒂諾、桑尼維爾、聖塔克拉拉與灣區讀者整理雙語商家、本地新聞摘要與在地資訊。',
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
        en: 'Find SF Bay Chinese restaurants, Asian markets, schools, health services, legal help, housing support, and community resources.',
        zh: '查找灣區中餐、亞洲超市、中文學校、健康服務、法律協助、住房支援與社區資源。',
      },
      citySelectSuffix: { en: 'CA', zh: 'CA' },
      defaultSearchCity: 'San Francisco',
      launchCities: [
        'San Francisco',
        'Oakland',
        'San Jose',
        'Cupertino',
        'Sunnyvale',
        'Santa Clara',
      ],
      cityNamesZh: {
        'San Francisco': '舊金山',
        Oakland: '奧克蘭',
        'San Jose': '聖荷西',
        Cupertino: '庫比蒂諾',
        Sunnyvale: '桑尼維爾',
        'Santa Clara': '聖塔克拉拉',
      },
      heroImageUrl: '/city-site-images/sf-bay-community-hero.webp',
      heroImageAlt: {
        en: 'SF Bay city launch image',
        zh: '灣區城市首頁圖',
      },
      heroForegroundImageUrl: '/city-site-images/sf-chinatown-bay.webp',
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
      featuredCards: sfBayFeaturedCards,
      neighborhoods: sfBayNeighborhoods,
      mapImageUrl: '/city-site-images/san-jose-silicon-valley-plaza.webp',
      mapImageAlt: {
        en: 'SF Bay local source guide image',
        zh: '灣區本地來源指南圖片',
      },
      relocationImageUrl: '/city-site-images/sf-bay-newcomer-discovery.webp',
      relocationImageAlt: {
        en: 'SF Bay local discovery guide image',
        zh: '灣區在地發現指南圖片',
      },
      storyCards: [
        {
          title: {
            en: 'SF Bay source-linked news desk is live',
            zh: '灣區附來源連結新聞室已上線',
          },
          bodyText: {
            en: 'San Francisco, Oakland, San Jose, Peninsula, and South Bay summaries stay local.',
            zh: '舊金山、奧克蘭、聖荷西、半島與南灣摘要保持本地化。',
          },
          date: {
            en: 'May 30, 2026',
            zh: '2026 年 5 月 30 日',
          },
        },
        {
          title: {
            en: 'Bay Area directory separates city coverage',
            zh: '灣區目錄分開整理各城市覆蓋',
          },
          bodyText: {
            en: 'Chinatown, East Bay, South Bay, and Silicon Valley cards now use distinct signals.',
            zh: '華埠、東灣、南灣與矽谷卡片現在使用不同本地訊號。',
          },
          date: {
            en: 'May 30, 2026',
            zh: '2026 年 5 月 30 日',
          },
        },
        {
          title: {
            en: 'Community discovery focuses on Bay Area anchors',
            zh: '社區探索聚焦灣區生活據點',
          },
          bodyText: {
            en: 'Schools, services, groceries, legal help, and cultural resources are grouped by area.',
            zh: '學校、服務、超市、法律協助與文化資源按地區整理。',
          },
          date: {
            en: 'May 30, 2026',
            zh: '2026 年 5 月 30 日',
          },
        },
      ],
      newcomerTitle: {
        en: 'SF Bay Directory',
        zh: '灣區商家目錄',
      },
      newcomerBody: {
        en: 'ChineseSFBay now serves Bay Area directory listings and source-linked local summaries without falling back to Arizona content.',
        zh: 'ChineseSFBay 現已接入灣區商家目錄與附來源連結的本地摘要，不回退到亞利桑那內容。',
      },
    },
  },
  austin: {
    key: 'austin',
    launchState: 'live',
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
      en: 'A bilingual Austin platform with city-specific business listings, local source-linked news, and community resources for Austin, Round Rock, Cedar Park, Pflugerville, and Central Texas.',
      zh: '奥斯汀双语城市平台，提供奥斯汀、朗德罗克、雪松公园、普弗拉格维尔与中德州本地商家、新闻与社区资源。',
    },
    directory: {
      categorySlugs: [
        'dining',
        'shopping',
        'education',
        'medical',
        'real-estate',
        'legal-finance',
        'local-services',
        'faith-community',
      ],
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
        state: 'live',
        label: 'Austin business listing source',
        kind: 'static-json',
        path: 'src/data/sites/austin/businesses.json',
        notes: 'Austin-only public business and community listings collected from business-owned or public Austin-area sources.',
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
        en: 'Austin directory and news sources connected: May 30, 2026',
        zh: '奥斯汀商家目录与新闻来源已接入：2026 年 5 月 30 日',
      },
    },
    runtime: {
      rootPath: '/var/www/chineseaustin.com/web',
      dataPath: '/var/www/chineseaustin.com/data',
      logsPath: '/var/www/chineseaustin.com/logs',
    },
    home: {
      headline: {
        en: "Austin's Chinese Community Guide",
        zh: '奥斯汀华人生活指南',
      },
      kicker: {
        en: 'Businesses, schools, services, and local updates for Central Texas',
        zh: '中德州商家、学校、服务与本地资讯',
      },
      intro: {
        en: 'Find Austin-area Chinese restaurants, Asian markets, schools, health services, real estate help, tax support, and community resources.',
        zh: '查找奥斯汀地区中餐、亚洲超市、中文学校、健康服务、房产、报税与社区资源。',
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
      heroImageUrl: '/city-site-images/austin-community-hero.webp',
      heroImageAlt: {
        en: 'Austin city guide visual',
        zh: '奥斯汀城市指南视觉图',
      },
      heroForegroundImageUrl: '/city-site-images/austin-skyline-lake.webp',
      heroForegroundAlt: {
        en: 'ChineseAustin platform mark',
        zh: 'ChineseAustin 平台标识',
      },
      heroBadge: {
        en: 'AUSTIN, TEXAS',
        zh: '奥斯汀，德州',
      },
      heroBadgeSubcopy: {
        en: 'Austin listings only',
        zh: '仅奥斯汀本地条目',
      },
      focusTitle: {
        en: 'Austin Focused',
        zh: '奥斯汀聚焦',
      },
      focusBody: {
        en: 'Austin, Cedar Park, Round Rock, Pflugerville',
        zh: '奥斯汀、雪松公园、朗德罗克、普弗拉格维尔',
      },
      featuredCards: [
        {
          slug: 'house-of-three-gorges-austin',
          badge: 'Austin',
          categoryEn: 'Dining',
          categoryZh: '餐厅美食',
          nameEn: 'House of Three Gorges',
          nameZh: '三峡人家',
          imageUrl: '/city-site-images/house-of-three-gorges-austin.webp',
          rating: 'Local',
          reviewCount: 0,
          line1En: '8557 Research Blvd Ste 144',
          line1Zh: '8557 Research Blvd Ste 144',
          line2En: 'Austin, TX 78758',
          line2Zh: 'Austin, TX 78758',
        },
        {
          slug: 'h-mart-austin',
          badge: 'Lakeline',
          categoryEn: 'Shopping',
          categoryZh: '购物零售',
          nameEn: 'H Mart Austin',
          nameZh: 'H Mart 奥斯汀',
          imageUrl: '/city-site-images/h-mart-austin.webp',
          rating: 'Local',
          reviewCount: 0,
          line1En: '11301 Lakeline Blvd',
          line1Zh: '11301 Lakeline Blvd',
          line2En: 'Austin, TX 78717',
          line2Zh: 'Austin, TX 78717',
        },
        {
          slug: 'austin-chinese-school',
          badge: 'Education',
          categoryEn: 'Education',
          categoryZh: '教育学习',
          nameEn: 'Austin Chinese School',
          nameZh: '奥斯汀中文学校',
          imageUrl: '/city-site-images/austin-chinese-school.webp',
          rating: 'Local',
          reviewCount: 0,
          line1En: '7944 Great Northern Blvd',
          line1Zh: '7944 Great Northern Blvd',
          line2En: 'Austin, TX 78757',
          line2Zh: 'Austin, TX 78757',
        },
        {
          slug: 'cheng-wooster-real-estate-austin',
          badge: 'Housing',
          categoryEn: 'Real Estate',
          categoryZh: '地产服务',
          nameEn: 'Cheng Wooster Real Estate',
          nameZh: 'Cheng Wooster 奥斯汀房产',
          imageUrl: '/city-site-images/cheng-wooster-real-estate-austin.webp',
          rating: 'Local',
          reviewCount: 0,
          line1En: '13284 Pond Springs Rd Ste 405',
          line1Zh: '13284 Pond Springs Rd Ste 405',
          line2En: 'Austin, TX 78729',
          line2Zh: 'Austin, TX 78729',
        },
      ],
      neighborhoods: [
        {
          city: 'Austin',
          cityZh: '奥斯汀',
          regionEn: 'Central Texas',
          regionZh: '中德州',
          imageUrl: '/city-site-images/austin-skyline-lake.webp',
        },
        {
          city: 'Cedar Park',
          cityZh: '雪松公园',
          regionEn: 'Northwest Austin',
          regionZh: '奥斯汀西北',
          imageUrl: '/city-site-images/cedar-park-market-street.webp',
        },
        {
          city: 'Round Rock',
          cityZh: '朗德罗克',
          regionEn: 'North Austin Metro',
          regionZh: '奥斯汀北都会区',
          imageUrl: '/city-site-images/round-rock-downtown.webp',
        },
        {
          city: 'Pflugerville',
          cityZh: '普弗拉格维尔',
          regionEn: 'Northeast Austin Metro',
          regionZh: '奥斯汀东北都会区',
          imageUrl: '/city-site-images/pflugerville-lake-trail.webp',
        },
      ],
      mapImageUrl: '/city-site-images/pflugerville-lake-trail.webp',
      mapImageAlt: {
        en: 'Austin area source map',
        zh: '奥斯汀地区来源地图',
      },
      relocationImageUrl: '/city-site-images/austin-newcomer-services.webp',
      relocationImageAlt: {
        en: 'Austin relocation and services guide',
        zh: '奥斯汀安家与服务指南',
      },
      storyCards: [
        {
          title: {
            en: 'Austin news desk starts with Central Texas sources',
            zh: '奥斯汀新闻室从中德州本地来源开始',
          },
          bodyText: {
            en: 'Short bilingual briefs cover schools, restaurants, services, housing, and community resources.',
            zh: '简短双语摘要覆盖学校、餐饮、服务、住房与社区资源。',
          },
          date: {
            en: 'May 30, 2026',
            zh: '2026 年 5 月 30 日',
          },
        },
        {
          title: {
            en: 'Northwest Austin corridor watch',
            zh: '奥斯汀西北走廊观察',
          },
          bodyText: {
            en: 'Research Boulevard, Lakeline, Cedar Park, and family routines get clearer context.',
            zh: 'Research Boulevard、Lakeline、Cedar Park 与家庭生活路线有更清楚的脉络。',
          },
          date: {
            en: 'May 30, 2026',
            zh: '2026 年 5 月 30 日',
          },
        },
        {
          title: {
            en: 'Round Rock and Pflugerville resources expand coverage',
            zh: 'Round Rock 与 Pflugerville 资源扩展覆盖',
          },
          bodyText: {
            en: 'North-metro dining, services, and community resources are separated from central Austin.',
            zh: '北部都会区餐饮、服务与社区资源和奥斯汀市中心分开呈现。',
          },
          date: {
            en: 'May 30, 2026',
            zh: '2026 年 5 月 30 日',
          },
        },
      ],
      newcomerTitle: {
        en: 'New to Austin',
        zh: '初到奥斯汀',
      },
      newcomerBody: {
        en: 'Start with restaurants, Asian groceries, Chinese schools, community groups, health providers, housing help, and tax support built from Austin-specific public sources.',
        zh: '从中餐、亚洲超市、中文学校、社区组织、健康服务、住房与报税支持开始；资料来自奥斯汀本地公开来源。',
      },
    },
  },
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
