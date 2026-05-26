export type SiteKey = 'arizona' | 'austin' | 'los-angeles' | 'sf-bay';

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

export type SiteProfile = {
  key: SiteKey;
  domains: string[];
  domain: string;
  url: string;
  brandName: string;
  brandNameZh: string;
  brandParts: SiteBrandParts;
  regionName: string;
  regionNameZh: string;
  guideTagline: LocalizedText;
  localCoverageLabel: LocalizedText;
  description: LocalizedText;
  home: SiteHomeProfile;
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

function guideCard({
  slug,
  href,
  badge,
  categoryEn,
  categoryZh,
  nameEn,
  nameZh,
  imageUrl,
  line1En,
  line1Zh,
  line2En,
  line2Zh,
}: Omit<SiteFeaturedShowcaseCard, 'rating' | 'reviewCount'>): SiteFeaturedShowcaseCard {
  return {
    slug,
    href,
    badge,
    categoryEn,
    categoryZh,
    nameEn,
    nameZh,
    imageUrl,
    rating: '4.8',
    reviewCount: 36,
    line1En,
    line1Zh,
    line2En,
    line2Zh,
  };
}

const austinImage =
  'https://images.unsplash.com/photo-1531218150217-54595bc2b934?auto=format&fit=crop&w=1600&q=80';
const losAngelesImage =
  'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?auto=format&fit=crop&w=1600&q=80';
const sfBayImage =
  'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1600&q=80';

export const siteProfiles: Record<SiteKey, SiteProfile> = {
  arizona: {
    key: 'arizona',
    domains: ['chinesearizona.com', 'www.chinesearizona.com', 'dev.chinesearizona.com'],
    domain: 'chinesearizona.com',
    url: 'https://chinesearizona.com',
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
  austin: {
    key: 'austin',
    domains: ['chineseaustin.com', 'www.chineseaustin.com'],
    domain: 'chineseaustin.com',
    url: 'https://chineseaustin.com',
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
      en: 'A bilingual Austin guide for Chinese, Taiwanese, Mandarin-speaking, and Asia-connected families, students, professionals, and business owners.',
      zh: '服务奥斯汀华人、台湾人、中文使用者与亚洲连结家庭的双语在地指南。',
    },
    home: {
      headline: {
        en: "Your Guide to Austin's Chinese Community",
        zh: '奥斯汀华人社区指南',
      },
      kicker: {
        en: "Connect with Austin's Chinese community and discover local highlights",
        zh: '连接奥斯汀华人社区，发现本地精彩',
      },
      intro: {
        en: 'Find trusted businesses, neighborhood resources, and community connections across the Austin area.',
        zh: '寻找奥斯汀地区可信商家、社区资源与生活连结。',
      },
      citySelectSuffix: { en: 'TX', zh: 'TX' },
      defaultSearchCity: 'Austin',
      launchCities: ['Austin', 'Cedar Park', 'Round Rock', 'Pflugerville', 'Georgetown', 'San Marcos'],
      cityNamesZh: {
        Austin: '奥斯汀',
        'Cedar Park': '雪松公园',
        'Round Rock': '朗德罗克',
        Pflugerville: '普弗拉格维尔',
        Georgetown: '乔治城',
        'San Marcos': '圣马科斯',
      },
      heroImageUrl: austinImage,
      heroImageAlt: {
        en: 'Austin skyline and local community life',
        zh: '奥斯汀城市与社区生活',
      },
      heroForegroundImageUrl: austinImage,
      heroForegroundAlt: {
        en: 'Austin city view',
        zh: '奥斯汀城市风景',
      },
      heroBadge: {
        en: 'AUSTIN, TEXAS',
        zh: '奥斯汀，德州',
      },
      heroBadgeSubcopy: {
        en: 'Tech city · Growing community',
        zh: '科技城市 · 活力社区',
      },
      focusTitle: {
        en: 'Austin Focused',
        zh: '奥斯汀聚焦',
      },
      focusBody: {
        en: 'Local neighborhoods and services',
        zh: '在地社区与服务',
      },
      featuredCards: [
        guideCard({
          slug: 'austin-dining-guide',
          href: '/business?category=dining&sort=featured',
          badge: 'Verified',
          categoryEn: 'Dining',
          categoryZh: '餐厅美食',
          nameEn: 'Austin Dining Guide',
          nameZh: '奥斯汀美食指南',
          imageUrl: austinImage,
          line1En: 'North Austin, Lakeline, and downtown',
          line1Zh: '北奥斯汀、Lakeline 与市中心',
          line2En: 'Chinese, Taiwanese, hot pot, and bakery stops',
          line2Zh: '中餐、台菜、火锅与烘焙推荐',
        }),
        guideCard({
          slug: 'austin-real-estate-guide',
          href: '/business?category=real-estate&sort=featured',
          badge: 'Verified',
          categoryEn: 'Real Estate',
          categoryZh: '地产服务',
          nameEn: 'Austin Real Estate Guide',
          nameZh: '奥斯汀地产服务',
          imageUrl: austinImage,
          line1En: 'Cedar Park, Round Rock, and Bee Cave',
          line1Zh: '雪松公园、朗德罗克与 Bee Cave',
          line2En: 'Neighborhood context for newcomer families',
          line2Zh: '为新移民家庭整理社区脉络',
        }),
        guideCard({
          slug: 'austin-schools-guide',
          href: '/business?category=education&sort=featured',
          badge: 'Claimed',
          categoryEn: 'Education',
          categoryZh: '教育培训',
          nameEn: 'Austin Schools & Enrichment',
          nameZh: '奥斯汀教育与课外',
          imageUrl: austinImage,
          line1En: 'Chinese schools, tutoring, and enrichment',
          line1Zh: '中文学校、补习与课外活动',
          line2En: 'For families comparing school corridors',
          line2Zh: '帮助家庭比较学区与生活圈',
        }),
        guideCard({
          slug: 'austin-services-guide',
          href: '/business?category=local-services&sort=featured',
          badge: 'Verified',
          categoryEn: 'Local Services',
          categoryZh: '生活服务',
          nameEn: 'Austin Local Services',
          nameZh: '奥斯汀生活服务',
          imageUrl: austinImage,
          line1En: 'Mandarin-friendly providers and shops',
          line1Zh: '中文友善服务与商家',
          line2En: 'Useful contacts for everyday life',
          line2Zh: '整理日常生活常用资讯',
        }),
      ],
      neighborhoods: [
        { city: 'Austin', cityZh: '奥斯汀', regionEn: 'Central Austin', regionZh: '市中心', imageUrl: austinImage },
        { city: 'Cedar Park', cityZh: '雪松公园', regionEn: 'Northwest corridor', regionZh: '西北走廊', imageUrl: austinImage },
        { city: 'Round Rock', cityZh: '朗德罗克', regionEn: 'North suburbs', regionZh: '北部近郊', imageUrl: austinImage },
        { city: 'Pflugerville', cityZh: '普弗拉格维尔', regionEn: 'Family neighborhoods', regionZh: '家庭社区', imageUrl: austinImage },
      ],
      mapImageUrl: austinImage,
      mapImageAlt: {
        en: 'Austin community areas',
        zh: '奥斯汀社区范围',
      },
      relocationImageUrl: austinImage,
      relocationImageAlt: {
        en: 'Austin relocation landscape',
        zh: '奥斯汀搬迁生活风景',
      },
      newcomerTitle: {
        en: 'New to Austin?',
        zh: '初来奥斯汀？',
      },
      newcomerBody: {
        en: 'Use the guide to compare neighborhoods, find services, and settle into Austin life.',
        zh: '用指南比较社区、寻找服务，并更快安顿奥斯汀生活。',
      },
    },
  },
  'los-angeles': {
    key: 'los-angeles',
    domains: ['chineselosangeles.com', 'www.chineselosangeles.com'],
    domain: 'chineselosangeles.com',
    url: 'https://chineselosangeles.com',
    brandName: 'ChineseLosAngeles',
    brandNameZh: '洛杉矶华人',
    brandParts: {
      enPrefix: 'Chinese',
      enAccent: 'LosAngeles',
      zhPrefix: '洛杉矶',
      zhAccent: '华人',
    },
    regionName: 'Los Angeles',
    regionNameZh: '洛杉矶',
    guideTagline: {
      en: 'Los Angeles bilingual guide',
      zh: '洛杉矶双语指南',
    },
    localCoverageLabel: {
      en: 'Los Angeles-first coverage',
      zh: '洛杉矶本地优先',
    },
    description: {
      en: 'A bilingual Los Angeles guide for Chinese, Taiwanese, Mandarin-speaking, Cantonese-speaking, and Asia-connected communities across Southern California.',
      zh: '服务洛杉矶与南加州华人、台湾人、中文与粤语使用者的双语在地指南。',
    },
    home: {
      headline: {
        en: "Your Guide to Los Angeles' Chinese Community",
        zh: '洛杉矶华人社区指南',
      },
      kicker: {
        en: "Connect with Los Angeles' Chinese community and discover local highlights",
        zh: '连接洛杉矶华人社区，发现本地精彩',
      },
      intro: {
        en: 'Find trusted businesses, neighborhood resources, and community connections across Greater Los Angeles.',
        zh: '寻找大洛杉矶地区可信商家、社区资源与生活连结。',
      },
      citySelectSuffix: { en: 'CA', zh: 'CA' },
      defaultSearchCity: 'Los Angeles',
      launchCities: ['Los Angeles', 'Monterey Park', 'Alhambra', 'San Gabriel', 'Arcadia', 'Irvine'],
      cityNamesZh: {
        'Los Angeles': '洛杉矶',
        'Monterey Park': '蒙特利公园',
        Alhambra: '阿罕布拉',
        'San Gabriel': '圣盖博',
        Arcadia: '亚凯迪亚',
        Irvine: '尔湾',
      },
      heroImageUrl: losAngelesImage,
      heroImageAlt: {
        en: 'Los Angeles skyline and Chinese community neighborhoods',
        zh: '洛杉矶城市与华人社区',
      },
      heroForegroundImageUrl: losAngelesImage,
      heroForegroundAlt: {
        en: 'Los Angeles city view',
        zh: '洛杉矶城市风景',
      },
      heroBadge: {
        en: 'LOS ANGELES, CALIFORNIA',
        zh: '洛杉矶，加州',
      },
      heroBadgeSubcopy: {
        en: 'SGV roots · Southern California reach',
        zh: '圣盖博谷根基 · 南加州生活圈',
      },
      focusTitle: {
        en: 'LA Focused',
        zh: '洛杉矶聚焦',
      },
      focusBody: {
        en: 'Local neighborhoods and services',
        zh: '在地社区与服务',
      },
      featuredCards: [
        guideCard({
          slug: 'los-angeles-dining-guide',
          href: '/business?category=dining&sort=featured',
          badge: 'Verified',
          categoryEn: 'Dining',
          categoryZh: '餐厅美食',
          nameEn: 'Los Angeles Dining Guide',
          nameZh: '洛杉矶美食指南',
          imageUrl: losAngelesImage,
          line1En: 'SGV, Koreatown, West LA, and Irvine',
          line1Zh: '圣盖博谷、韩国城、西洛杉矶与尔湾',
          line2En: 'Regional Chinese, Taiwanese, dessert, and tea stops',
          line2Zh: '中餐、台菜、甜品与茶饮推荐',
        }),
        guideCard({
          slug: 'los-angeles-real-estate-guide',
          href: '/business?category=real-estate&sort=featured',
          badge: 'Verified',
          categoryEn: 'Real Estate',
          categoryZh: '地产服务',
          nameEn: 'LA Real Estate Guide',
          nameZh: '洛杉矶地产服务',
          imageUrl: losAngelesImage,
          line1En: 'SGV, Pasadena, Irvine, and coastal corridors',
          line1Zh: '圣盖博谷、帕萨迪纳、尔湾与沿海走廊',
          line2En: 'Neighborhood context for buying and renting',
          line2Zh: '买房租房与社区比较',
        }),
        guideCard({
          slug: 'los-angeles-schools-guide',
          href: '/business?category=education&sort=featured',
          badge: 'Claimed',
          categoryEn: 'Education',
          categoryZh: '教育培训',
          nameEn: 'LA Schools & Enrichment',
          nameZh: '洛杉矶教育与课外',
          imageUrl: losAngelesImage,
          line1En: 'Chinese schools, tutoring, arts, and test prep',
          line1Zh: '中文学校、补习、艺术与升学',
          line2En: 'Resources for families across metro LA',
          line2Zh: '面向大洛杉矶家庭的教育资源',
        }),
        guideCard({
          slug: 'los-angeles-services-guide',
          href: '/business?category=medical&sort=featured',
          badge: 'Verified',
          categoryEn: 'Healthcare',
          categoryZh: '医疗健康',
          nameEn: 'LA Healthcare & Services',
          nameZh: '洛杉矶医疗与生活服务',
          imageUrl: losAngelesImage,
          line1En: 'Mandarin and Cantonese-friendly providers',
          line1Zh: '普通话与粤语友善服务',
          line2En: 'Everyday support across Southern California',
          line2Zh: '整理南加州日常生活支持',
        }),
      ],
      neighborhoods: [
        { city: 'Monterey Park', cityZh: '蒙特利公园', regionEn: 'SGV core', regionZh: '圣盖博谷核心', imageUrl: losAngelesImage },
        { city: 'Alhambra', cityZh: '阿罕布拉', regionEn: 'SGV dining corridor', regionZh: '华人餐饮走廊', imageUrl: losAngelesImage },
        { city: 'San Gabriel', cityZh: '圣盖博', regionEn: 'Community anchor', regionZh: '社区据点', imageUrl: losAngelesImage },
        { city: 'Irvine', cityZh: '尔湾', regionEn: 'Orange County', regionZh: '橙县', imageUrl: losAngelesImage },
      ],
      mapImageUrl: losAngelesImage,
      mapImageAlt: {
        en: 'Los Angeles community areas',
        zh: '洛杉矶社区范围',
      },
      relocationImageUrl: losAngelesImage,
      relocationImageAlt: {
        en: 'Los Angeles relocation landscape',
        zh: '洛杉矶搬迁生活风景',
      },
      newcomerTitle: {
        en: 'New to Los Angeles?',
        zh: '初来洛杉矶？',
      },
      newcomerBody: {
        en: 'Compare neighborhoods, find services, and understand the local Chinese community map.',
        zh: '比较社区、寻找服务，并快速理解洛杉矶华人生活圈。',
      },
    },
  },
  'sf-bay': {
    key: 'sf-bay',
    domains: ['chinesesfbay.com', 'www.chinesesfbay.com'],
    domain: 'chinesesfbay.com',
    url: 'https://chinesesfbay.com',
    brandName: 'ChineseSFBay',
    brandNameZh: '湾区华人',
    brandParts: {
      enPrefix: 'Chinese',
      enAccent: 'SFBay',
      zhPrefix: '湾区',
      zhAccent: '华人',
    },
    regionName: 'San Francisco Bay Area',
    regionNameZh: '湾区',
    guideTagline: {
      en: 'Bay Area bilingual guide',
      zh: '湾区双语指南',
    },
    localCoverageLabel: {
      en: 'Bay Area-first coverage',
      zh: '湾区本地优先',
    },
    description: {
      en: 'A bilingual San Francisco Bay Area guide for Chinese, Taiwanese, Mandarin-speaking, Cantonese-speaking, and Asia-connected communities.',
      zh: '服务旧金山湾区华人、台湾人、中文与粤语使用者的双语在地指南。',
    },
    home: {
      headline: {
        en: "Your Guide to the Bay Area's Chinese Community",
        zh: '湾区华人社区指南',
      },
      kicker: {
        en: "Connect with the Bay Area's Chinese community and discover local highlights",
        zh: '连接湾区华人社区，发现本地精彩',
      },
      intro: {
        en: 'Find trusted businesses, neighborhood resources, and community connections across the San Francisco Bay Area.',
        zh: '寻找旧金山湾区可信商家、社区资源与生活连结。',
      },
      citySelectSuffix: { en: 'CA', zh: 'CA' },
      defaultSearchCity: 'Cupertino',
      launchCities: ['San Francisco', 'Cupertino', 'San Jose', 'Fremont', 'Milpitas', 'Oakland'],
      cityNamesZh: {
        'San Francisco': '旧金山',
        Cupertino: '库比蒂诺',
        'San Jose': '圣荷西',
        Fremont: '佛利蒙',
        Milpitas: '米尔皮塔斯',
        Oakland: '奥克兰',
      },
      heroImageUrl: sfBayImage,
      heroImageAlt: {
        en: 'San Francisco Bay Area skyline and community life',
        zh: '旧金山湾区城市与社区生活',
      },
      heroForegroundImageUrl: sfBayImage,
      heroForegroundAlt: {
        en: 'Bay Area city view',
        zh: '湾区城市风景',
      },
      heroBadge: {
        en: 'SAN FRANCISCO BAY AREA',
        zh: '旧金山湾区',
      },
      heroBadgeSubcopy: {
        en: 'Peninsula, South Bay, East Bay',
        zh: '半岛、南湾、东湾',
      },
      focusTitle: {
        en: 'Bay Area Focused',
        zh: '湾区聚焦',
      },
      focusBody: {
        en: 'Local neighborhoods and services',
        zh: '在地社区与服务',
      },
      featuredCards: [
        guideCard({
          slug: 'bay-area-dining-guide',
          href: '/business?category=dining&sort=featured',
          badge: 'Verified',
          categoryEn: 'Dining',
          categoryZh: '餐厅美食',
          nameEn: 'Bay Area Dining Guide',
          nameZh: '湾区美食指南',
          imageUrl: sfBayImage,
          line1En: 'San Francisco, Cupertino, Fremont, and San Jose',
          line1Zh: '旧金山、库比蒂诺、佛利蒙与圣荷西',
          line2En: 'Regional Chinese, Taiwanese, tea, and bakery stops',
          line2Zh: '中餐、台菜、茶饮与烘焙推荐',
        }),
        guideCard({
          slug: 'bay-area-real-estate-guide',
          href: '/business?category=real-estate&sort=featured',
          badge: 'Verified',
          categoryEn: 'Real Estate',
          categoryZh: '地产服务',
          nameEn: 'Bay Area Housing Guide',
          nameZh: '湾区住房与地产',
          imageUrl: sfBayImage,
          line1En: 'Peninsula, South Bay, and East Bay',
          line1Zh: '半岛、南湾与东湾',
          line2En: 'Neighborhood context for buying and renting',
          line2Zh: '买房租房与社区比较',
        }),
        guideCard({
          slug: 'bay-area-schools-guide',
          href: '/business?category=education&sort=featured',
          badge: 'Claimed',
          categoryEn: 'Education',
          categoryZh: '教育培训',
          nameEn: 'Bay Area Schools & Enrichment',
          nameZh: '湾区教育与课外',
          imageUrl: sfBayImage,
          line1En: 'Chinese schools, tutoring, music, and STEM',
          line1Zh: '中文学校、补习、音乐与 STEM',
          line2En: 'Resources for family-heavy neighborhoods',
          line2Zh: '面向家庭社区的教育资源',
        }),
        guideCard({
          slug: 'bay-area-services-guide',
          href: '/business?category=local-services&sort=featured',
          badge: 'Verified',
          categoryEn: 'Local Services',
          categoryZh: '生活服务',
          nameEn: 'Bay Area Local Services',
          nameZh: '湾区生活服务',
          imageUrl: sfBayImage,
          line1En: 'Mandarin and Cantonese-friendly providers',
          line1Zh: '普通话与粤语友善服务',
          line2En: 'Useful contacts across the Bay',
          line2Zh: '整理湾区日常生活常用资讯',
        }),
      ],
      neighborhoods: [
        { city: 'Cupertino', cityZh: '库比蒂诺', regionEn: 'South Bay', regionZh: '南湾', imageUrl: sfBayImage },
        { city: 'San Jose', cityZh: '圣荷西', regionEn: 'South Bay anchor', regionZh: '南湾据点', imageUrl: sfBayImage },
        { city: 'Fremont', cityZh: '佛利蒙', regionEn: 'East Bay', regionZh: '东湾', imageUrl: sfBayImage },
        { city: 'San Francisco', cityZh: '旧金山', regionEn: 'City core', regionZh: '城市核心', imageUrl: sfBayImage },
      ],
      mapImageUrl: sfBayImage,
      mapImageAlt: {
        en: 'Bay Area community areas',
        zh: '湾区社区范围',
      },
      relocationImageUrl: sfBayImage,
      relocationImageAlt: {
        en: 'Bay Area relocation landscape',
        zh: '湾区搬迁生活风景',
      },
      newcomerTitle: {
        en: 'New to the Bay Area?',
        zh: '初来湾区？',
      },
      newcomerBody: {
        en: 'Compare neighborhoods, find services, and settle into Bay Area life with local context.',
        zh: '用在地脉络比较社区、寻找服务，并更快安顿湾区生活。',
      },
    },
  },
};

export const defaultSiteProfile = siteProfiles.arizona;

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

  if (!normalizedHost) {
    return defaultSiteProfile;
  }

  for (const profile of Object.values(siteProfiles)) {
    if (profile.domains.some((domain) => normalizeHost(domain) === normalizedHost)) {
      return profile;
    }
  }

  return defaultSiteProfile;
}
