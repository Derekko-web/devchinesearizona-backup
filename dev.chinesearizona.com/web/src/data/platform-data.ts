import type {
  Article,
  Business,
  BusinessCategory,
  CommunityPost,
  Event,
  Guide,
  MonitoredSource,
  Profile,
  Review,
  SignalDeskQueueItem,
} from '@/lib/types';
import { businessImageOverrides, type BusinessImageOverride } from '@/data/business-image-overrides';
import { businessReviewOverrides } from '@/data/business-review-overrides';
import generatedBusinessImageOverrides from '@/data/generated-business-image-overrides.json';
import generatedDirectoryBusinesses from '@/data/generated-directory-businesses.json';
import generatedLocalArticles from '@/data/generated-local-articles.json';
import generatedSignalDeskQueue from '@/data/generated-signal-desk-queue.json';
import monitoredSourcesData from '@/data/monitored-sources.json';
import generatedBusinessImageAudit from '../../data/scrape-staging/business-image-audit.json';
import { formatPhoneNumber } from '@/lib/phone';

type ImportedBusiness = Omit<
  Business,
  'address' | 'serviceAreaText' | 'phone' | 'email' | 'website' | 'menuUrl' | 'priceRange' | 'coordinates'
> & {
  address?: string | null;
  serviceAreaText?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  menuUrl?: string | null;
  priceRange?: string | null;
  coordinates?: Business['coordinates'] | null;
};

export type ImportedArticle = Omit<
  Article,
  | 'updatedAt'
  | 'sourceName'
  | 'sourceUrl'
  | 'sourceId'
  | 'republishedWithPermission'
  | 'series'
  | 'freshnessTier'
  | 'sourcePolicy'
  | 'relatedCategorySlugs'
  | 'ctaBusinessSlugs'
  | 'personaTargets'
  | 'sourceLinks'
> & {
  updatedAt?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  sourceId?: string | null;
  republishedWithPermission?: boolean | null;
  series?: Article['series'] | null;
  freshnessTier?: Article['freshnessTier'] | null;
  sourcePolicy?: Article['sourcePolicy'] | null;
  relatedCategorySlugs?: string[] | null;
  ctaBusinessSlugs?: string[] | null;
  personaTargets?: Article['personaTargets'] | null;
  sourceLinks?: Article['sourceLinks'] | null;
};

type ImportedBusinessImageAuditRow = {
  slug: string;
  currentHeroUrl?: string | null;
  outcome: 'resolved_missing' | 'replaced_suspicious' | 'needs_manual_review';
};

const businessImageAuditBySlug = Object.fromEntries(
  (generatedBusinessImageAudit as ImportedBusinessImageAuditRow[]).map((row) => [row.slug, row])
) as Record<string, ImportedBusinessImageAuditRow | undefined>;

function normalizeImportedBusiness(business: ImportedBusiness): Business {
  const reviewOverride = businessReviewOverrides[business.slug];

  return {
    ...business,
    address: business.address ?? undefined,
    serviceAreaText: business.serviceAreaText ?? undefined,
    phone: formatPhoneNumber(business.phone),
    email: business.email ?? undefined,
    website: business.website ?? undefined,
    menuUrl: business.menuUrl ?? undefined,
    priceRange: business.priceRange ?? undefined,
    coordinates: business.coordinates ?? undefined,
    verified: true,
    newcomerFriendly: false,
    verificationState: 'editor_verified',
    rating: reviewOverride?.rating ?? business.rating,
    reviewCount: reviewOverride?.reviewCount ?? business.reviewCount,
  };
}

function applyBusinessImageOverrides(business: Business): Business {
  const generatedOverride = (generatedBusinessImageOverrides as Record<string, BusinessImageOverride>)[business.slug];
  const override = businessImageOverrides[business.slug] ?? generatedOverride;
  if (!override) {
    const auditRow = businessImageAuditBySlug[business.slug];
    if (auditRow?.outcome === 'needs_manual_review' && auditRow.currentHeroUrl && business.heroImage === auditRow.currentHeroUrl) {
      return {
        ...business,
        heroImage: undefined,
        gallery: business.gallery.filter((image) => image !== business.heroImage),
      };
    }
    return business;
  }

  const gallery = override.gallery ?? business.gallery;

  return {
    ...business,
    heroImage: override.heroImage,
    gallery: gallery.filter((image) => image !== override.heroImage),
  };
}

const scrapedBusinesses = (generatedDirectoryBusinesses as ImportedBusiness[])
  .map(normalizeImportedBusiness)
  .map(applyBusinessImageOverrides);

export function normalizeImportedArticle(article: ImportedArticle): Article {
  const sourceName = article.sourceName ?? undefined;
  const sourceUrl = article.sourceUrl ?? undefined;

  return {
    ...article,
    updatedAt: article.updatedAt ?? undefined,
    series: article.series ?? 'community-wire',
    freshnessTier: article.freshnessTier ?? 'archive',
    sourcePolicy: article.sourcePolicy ?? 'republish_with_permission',
    relatedCategorySlugs: article.relatedCategorySlugs ?? [],
    ctaBusinessSlugs: article.ctaBusinessSlugs ?? [],
    personaTargets: article.personaTargets ?? ['local_families'],
    sourceLinks:
      article.sourceLinks ??
      (sourceUrl
        ? [
            {
              label: {
                en: sourceName ?? 'Source',
                zh: sourceName ?? '來源',
              },
              url: sourceUrl,
              source: sourceName ?? 'Source',
            },
          ]
        : []),
    authorProfileSlug: article.authorProfileSlug ?? undefined,
    sourceName,
    sourceUrl,
    sourceId: article.sourceId ?? undefined,
    republishedWithPermission: article.republishedWithPermission ?? false,
  };
}

export const businessCategories: BusinessCategory[] = [
  {
    slug: 'real-estate',
    name: { en: 'Real Estate', 'zh': '房地產' },
    description: {
      en: 'Housing, home buying, mortgages, and relocation support.',
      'zh': '房屋買賣、貸款與搬遷安家服務。',
    },
    icon: 'home',
  },
  {
    slug: 'medical',
    name: { en: 'Medical', 'zh': '醫療保健' },
    description: {
      en: 'Primary care, specialists, urgent care, and family health support.',
      'zh': '家庭醫師、專科、急診與健康支援。',
    },
    icon: 'heart',
  },
  {
    slug: 'legal-finance',
    name: { en: 'Legal & Finance', 'zh': '法律財務' },
    description: {
      en: 'Immigration, tax, business setup, and financial planning.',
      'zh': '移民、報稅、公司設立與財務規劃。',
    },
    icon: 'scale',
  },
  {
    slug: 'dining',
    name: { en: 'Dining', 'zh': '餐廳美食' },
    description: {
      en: 'Restaurants, bakeries, bubble tea, and grocery anchors.',
      'zh': '餐廳、小吃、手搖飲與亞洲超市。',
    },
    icon: 'utensils',
  },
  {
    slug: 'shopping',
    name: { en: 'Shopping', zh: '購物零售' },
    description: {
      en: 'Markets, bookstores, gifts, everyday retail, and plaza shopping anchors.',
      zh: '超市、書店、禮品店、日常零售與商場主力店。',
    },
    icon: 'briefcase',
  },
  {
    slug: 'beauty-wellness',
    name: { en: 'Beauty & Wellness', zh: '美容養生' },
    description: {
      en: 'Salons, massage, skincare, and personal wellness services.',
      zh: '髮廊、按摩、保養與個人養生服務。',
    },
    icon: 'heart',
  },
  {
    slug: 'local-services',
    name: { en: 'Local Services', zh: '在地服務' },
    description: {
      en: 'Shipping, travel, print, and practical neighborhood support.',
      zh: '寄件、旅遊、列印與日常社區支援服務。',
    },
    icon: 'wrench',
  },
  {
    slug: 'home-services',
    name: { en: 'Home Services', 'zh': '居家維修' },
    description: {
      en: 'HVAC, plumbing, electrical, and move-in repairs.',
      'zh': '冷氣、水電、修繕與入住前整理。',
    },
    icon: 'wrench',
  },
  {
    slug: 'moving',
    name: { en: 'Moving & Relocation', 'zh': '搬遷物流' },
    description: {
      en: 'Moving, settling in, and newcomer logistics.',
      'zh': '搬家、安家與新移居民支援。',
    },
    icon: 'truck',
  },
  {
    slug: 'education',
    name: { en: 'Education', 'zh': '教育學習' },
    description: {
      en: 'Schools, tutoring, language programs, and enrichment.',
      'zh': '學校、補習、中文教育與才藝課程。',
    },
    icon: 'graduation-cap',
  },
  {
    slug: 'travel',
    name: { en: 'Travel', zh: '旅遊交通' },
    description: {
      en: 'Flights, ticketing support, airport planning, and long-haul family travel help.',
      zh: '機票、機場動線、長途返鄉與家庭旅行支援。',
    },
    icon: 'plane',
  },
  {
    slug: 'jobs',
    name: { en: 'Jobs & Career', zh: '工作職涯' },
    description: {
      en: 'Career support, resume help, and newcomer hiring navigation.',
      zh: '職涯支援、履歷協助與新居民求職導航。',
    },
    icon: 'briefcase',
  },
];

export const profiles: Profile[] = [
  {
    slug: 'grace-lin',
    name: 'Grace Lin',
    nameZh: '林雅惠',
    role: 'business_owner',
    city: 'Chandler',
    languages: ['English', 'Mandarin', 'Traditional Chinese', 'Taiwanese'],
    bio: {
      en: 'Relocation specialist helping Chinese-speaking and California families settle near Chandler, North Phoenix, and the TSMC corridor.',
      'zh': '專注協助華語家庭與加州搬遷住戶落腳 Chandler、北鳳凰城與 TSMC 周邊。',
    },
    avatarColor: 'bg-brand-700',
    trustLevel: 'trusted',
  },
  {
    slug: 'dr-jason-wu',
    name: 'Jason Wu, MD',
    nameZh: '吳醫師',
    role: 'business_owner',
    city: 'Phoenix',
    languages: ['English', 'Mandarin', 'Traditional Chinese'],
    bio: {
      en: 'Family physician serving multilingual households and new Arizona residents.',
      'zh': '服務多語家庭與新搬來亞利桑那居民的家庭醫師。',
    },
    avatarColor: 'bg-emerald-700',
    trustLevel: 'trusted',
  },
  {
    slug: 'phoenix-community-team',
    name: 'Phoenix Community Team',
    nameZh: '鳳城社群編輯部',
    role: 'editor',
    city: 'Mesa',
    languages: ['English', 'Mandarin', 'Traditional Chinese'],
    bio: {
      en: 'Editorial team curating newcomer guides, community calendars, and verified local updates.',
      'zh': '整理新手指南、活動月曆與在地可信資訊的編輯團隊。',
    },
    avatarColor: 'bg-slate-700',
    trustLevel: 'trusted',
  },
  {
    slug: 'newcomer-derek',
    name: 'Derek Chen',
    nameZh: '陳德睿',
    role: 'member',
    city: 'Tempe',
    languages: ['English', 'Mandarin'],
    bio: {
      en: 'New arrival from Irvine sharing practical moving notes and apartment leads.',
      'zh': '剛從 Irvine 搬來，分享搬家心得與租屋資訊。',
    },
    avatarColor: 'bg-orange-700',
    trustLevel: 'new',
  },
];

const curatedBusinesses: Business[] = [
  {
    id: 'biz_1',
    slug: 'elite-az-realty-team',
    name: { en: 'Elite AZ Realty Team', 'zh': '精英亞城房產團隊' },
    categorySlug: 'real-estate',
    city: 'Chandler',
    region: 'Greater Phoenix',
    address: '3200 N Central Ave, Phoenix, AZ 85012',
    phone: '(602) 555-0198',
    email: 'hello@eliteazrealty.com',
    website: 'https://example.com/elite-az-realty-team',
    heroImage:
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=1200&q=80',
    ],
    shortDescription: {
      en: 'Relocation-focused real estate advisors for Chinese-speaking families, TSMC hires, and California movers.',
      'zh': '專為華語家庭、TSMC 新進員工與加州搬遷族群服務的房產顧問。',
    },
    description: {
      en: 'Elite AZ Realty Team helps newcomers evaluate Chandler, Gilbert, and North Phoenix neighborhoods with bilingual guidance on commute patterns, school boundaries, utility setup, and closing timelines.',
      'zh': 'Elite AZ Realty Team 以雙語方式協助新居民評估 Chandler、Gilbert 與北鳳凰城社區，包含通勤、學區、公用事業設定與交屋時程。',
    },
    services: [
      { en: 'Home buying strategy', 'zh': '購屋策略規劃' },
      { en: 'Rental landing plans', 'zh': '先租後買安家方案' },
      { en: 'School-boundary walk-throughs', 'zh': '學區邊界解說' },
    ],
    languages: ['English', 'Mandarin', 'Traditional Chinese', 'Taiwanese'],
    searchAliases: ['realtor chandler', 'tsmc relocation', '房仲', '華語房產顧問'],
    verified: true,
    bilingual: true,
    newcomerFriendly: true,
    sponsored: true,
    featured: true,
    ownerProfileSlug: 'grace-lin',
    rating: 4.9,
    reviewCount: 124,
    lastUpdated: '2026-04-05T10:00:00.000Z',
    hours: [
      { label: 'Mon-Fri', value: '9:00 AM - 6:30 PM' },
      { label: 'Sat', value: '10:00 AM - 4:00 PM' },
      { label: 'Sun', value: 'By appointment' },
    ],
    coordinates: { lat: 33.4484, lng: -112.074 },
  },
  {
    id: 'biz_2',
    slug: 'taste-of-taiwan',
    name: { en: 'Taste of Taiwan', 'zh': '台灣古早味' },
    categorySlug: 'dining',
    city: 'Tempe',
    region: 'Greater Phoenix',
    address: '1800 W Main St, Mesa, AZ 85201',
    phone: '(480) 555-0122',
    website: 'https://example.com/taste-of-taiwan',
    heroImage:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1555126634-ae23594bab69?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    ],
    shortDescription: {
      en: 'Authentic Taiwanese comfort food with dependable bilingual service and family-friendly hours.',
      'zh': '道地台式家常味，雙語服務穩定，適合家庭聚餐。',
    },
    description: {
      en: 'From beef noodle soup to lu rou fan and boba, Taste of Taiwan is a reliable anchor for locals showing visiting family around the East Valley.',
      'zh': '從牛肉麵、滷肉飯到珍珠奶茶，Taste of Taiwan 是東谷地區接待家人朋友的穩定據點。',
    },
    services: [
      { en: 'Family-style dine in', 'zh': '家庭聚餐內用' },
      { en: 'Takeout for school nights', 'zh': '平日晚餐外帶' },
      { en: 'Catering trays', 'zh': '團體外燴餐盤' },
    ],
    languages: ['English', 'Mandarin', 'Traditional Chinese'],
    searchAliases: ['taiwanese restaurant tempe', '牛肉麵', 'boba near asu'],
    verified: false,
    bilingual: true,
    newcomerFriendly: true,
    sponsored: false,
    featured: true,
    ownerProfileSlug: 'phoenix-community-team',
    rating: 4.7,
    reviewCount: 89,
    lastUpdated: '2026-03-28T12:00:00.000Z',
    hours: [
      { label: 'Sun-Thu', value: '11:00 AM - 9:00 PM' },
      { label: 'Fri-Sat', value: '11:00 AM - 10:00 PM' },
    ],
    coordinates: { lat: 33.4255, lng: -111.94 },
  },
  {
    id: 'biz_3',
    slug: 'chen-cpa-associates',
    name: { en: 'Chen CPA & Associates', 'zh': '陳氏會計師事務所' },
    categorySlug: 'legal-finance',
    city: 'Phoenix',
    region: 'Greater Phoenix',
    address: '411 N Central Ave, Phoenix, AZ 85004',
    phone: '(602) 555-0136',
    email: 'tax@chencpa.example',
    website: 'https://example.com/chen-cpa',
    heroImage:
      'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1200&q=80',
    ],
    shortDescription: {
      en: 'Cross-border tax planning for entrepreneurs, W-2 families, and Taiwan-linked households.',
      'zh': '為創業者、受薪家庭與台美跨境家庭提供報稅與規劃。',
    },
    description: {
      en: 'Chen CPA & Associates specializes in Arizona state filings, small-business bookkeeping, and cross-border planning for families balancing Taiwan and US assets.',
      'zh': '陳氏會計師事務所專長為亞州州稅、公司帳務與台美資產配置的跨境規劃。',
    },
    services: [
      { en: 'Individual tax prep', 'zh': '個人報稅' },
      { en: 'LLC and S-corp planning', 'zh': 'LLC 與 S-Corp 規劃' },
      { en: 'Cross-border consultations', 'zh': '跨境稅務諮詢' },
    ],
    languages: ['English', 'Mandarin', 'Traditional Chinese'],
    searchAliases: ['chinese cpa phoenix', '報稅', 'taiwan tax planning arizona'],
    verified: true,
    bilingual: true,
    newcomerFriendly: true,
    sponsored: false,
    featured: true,
    ownerProfileSlug: 'phoenix-community-team',
    rating: 5,
    reviewCount: 33,
    lastUpdated: '2026-04-02T15:00:00.000Z',
    hours: [
      { label: 'Mon-Fri', value: '8:30 AM - 5:30 PM' },
      { label: 'Sat', value: 'By appointment' },
    ],
    coordinates: { lat: 33.4531, lng: -112.0738 },
  },
  {
    id: 'biz_4',
    slug: 'desert-spring-family-medicine',
    name: { en: 'Desert Spring Family Medicine', 'zh': '沙漠泉家庭醫學' },
    categorySlug: 'medical',
    city: 'Phoenix',
    region: 'North Phoenix',
    address: '2140 E Rose Garden Ln, Phoenix, AZ 85024',
    phone: '(602) 555-0150',
    website: 'https://example.com/desert-spring-family-medicine',
    heroImage:
      'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
    ],
    shortDescription: {
      en: 'Family medicine clinic with multilingual staff and strong new-patient onboarding.',
      'zh': '具多語櫃檯與完善新病患流程的家庭醫學診所。',
    },
    description: {
      en: 'Desert Spring helps new residents establish primary care quickly, with pediatric referrals, annual checkups, and easy refill coordination.',
      'zh': 'Desert Spring 協助新居民快速建立家庭醫師關係，並串接小兒科轉診、健檢與慢性處方續領。',
    },
    services: [
      { en: 'Primary care intake', 'zh': '家庭醫學初診' },
      { en: 'Pediatric referral support', 'zh': '小兒科轉介' },
      { en: 'Wellness visits', 'zh': '年度健檢' },
    ],
    languages: ['English', 'Mandarin'],
    searchAliases: ['mandarin doctor phoenix', '家庭醫師', 'primary care phoenix chinese'],
    verified: true,
    bilingual: true,
    newcomerFriendly: true,
    sponsored: false,
    featured: false,
    ownerProfileSlug: 'dr-jason-wu',
    rating: 4.8,
    reviewCount: 52,
    lastUpdated: '2026-04-06T09:00:00.000Z',
    hours: [
      { label: 'Mon-Thu', value: '8:00 AM - 5:00 PM' },
      { label: 'Fri', value: '8:00 AM - 2:00 PM' },
    ],
    coordinates: { lat: 33.6759, lng: -112.0382 },
  },
  {
    id: 'biz_5',
    slug: 'profix-home-services',
    name: { en: 'ProFix Home Services', 'zh': '專業居家維修' },
    categorySlug: 'home-services',
    city: 'Chandler',
    region: 'East Valley',
    address: 'Mobile Service, Chandler, AZ',
    phone: '(480) 555-0175',
    website: 'https://example.com/profix-home-services',
    heroImage:
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
    ],
    shortDescription: {
      en: 'HVAC, plumbing, and move-in repair support for desert homes.',
      'zh': '針對沙漠型住宅提供冷氣、水電與入住維修支援。',
    },
    description: {
      en: 'ProFix is a strong first call for AC tune-ups, water softener installs, and small repair items that surprise first-time Arizona homeowners.',
      'zh': '對第一次住亞利桑那透天厝的家庭來說，ProFix 很適合處理冷氣、水質軟化器與各種入住後的小修繕。',
    },
    services: [
      { en: 'AC tune-ups', 'zh': '冷氣保養' },
      { en: 'Water softener installs', 'zh': '軟水設備安裝' },
      { en: 'Move-in punch lists', 'zh': '入住清單修繕' },
    ],
    languages: ['English', 'Mandarin'],
    searchAliases: ['ac repair chandler', '水電維修', 'desert home repair'],
    verified: false,
    bilingual: true,
    newcomerFriendly: true,
    sponsored: false,
    featured: false,
    ownerProfileSlug: 'phoenix-community-team',
    rating: 4.6,
    reviewCount: 41,
    lastUpdated: '2026-03-15T11:00:00.000Z',
    hours: [
      { label: 'Mon-Sat', value: '7:30 AM - 6:00 PM' },
      { label: 'Emergency', value: 'Available on request' },
    ],
    coordinates: { lat: 33.3062, lng: -111.8413 },
  },
  {
    id: 'biz_6',
    slug: 'desert-bridge-relocation',
    name: { en: 'Desert Bridge Relocation', 'zh': '沙橋搬遷顧問' },
    categorySlug: 'moving',
    city: 'Phoenix',
    region: 'Statewide',
    address: '2415 E Camelback Rd, Phoenix, AZ 85016',
    phone: '(602) 555-0182',
    website: 'https://example.com/desert-bridge-relocation',
    heroImage:
      'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
    ],
    shortDescription: {
      en: 'Move coordination, utility setup checklists, and soft-landing support for families arriving from other states or abroad.',
      'zh': '為跨州與海外搬遷家庭提供搬家協調、公用事業清單與安家支援。',
    },
    description: {
      en: 'Desert Bridge coordinates pre-move timelines, utility handoffs, DMV checklist prep, and vendor introductions so families land with less friction.',
      'zh': 'Desert Bridge 協助安排搬家時程、公用事業銜接、MVD 文件準備與推薦廠商，讓新家庭更順利落地。',
    },
    services: [
      { en: 'Move timeline planning', 'zh': '搬遷時程規劃' },
      { en: 'Utility onboarding checklist', 'zh': '公用事業設定清單' },
      { en: 'School enrollment support', 'zh': '入學準備支援' },
    ],
    languages: ['English', 'Mandarin', 'Traditional Chinese'],
    searchAliases: ['relocation service phoenix', '搬家顧問', 'new to arizona help'],
    verified: true,
    bilingual: true,
    newcomerFriendly: true,
    sponsored: false,
    featured: true,
    ownerProfileSlug: 'phoenix-community-team',
    rating: 4.9,
    reviewCount: 27,
    lastUpdated: '2026-04-08T17:00:00.000Z',
    hours: [
      { label: 'Mon-Fri', value: '9:00 AM - 5:00 PM' },
      { label: 'Sat', value: 'Virtual appointments' },
    ],
    coordinates: { lat: 33.5093, lng: -112.0285 },
  },
  {
    id: 'biz_7',
    slug: 'arizona-chinese-language-academy',
    name: { en: 'Arizona Chinese Language Academy', 'zh': '亞利桑那中文學苑' },
    categorySlug: 'education',
    city: 'Tempe',
    region: 'East Valley',
    address: '1405 E Warner Rd, Tempe, AZ 85284',
    phone: '(480) 555-0144',
    website: 'https://example.com/arizona-chinese-language-academy',
    heroImage:
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80',
    ],
    shortDescription: {
      en: 'Weekend Chinese learning, cultural classes, and newcomer family connections.',
      'zh': '週末中文、文化課程與新家庭社群連結。',
    },
    description: {
      en: 'Arizona Chinese Language Academy serves children growing up bilingual and gives newcomer parents an easy entry point into community life.',
      'zh': '亞利桑那中文學苑服務雙語成長孩子，也讓新搬來的家長更容易進入在地社群。',
    },
    services: [
      { en: 'Weekend Chinese school', 'zh': '週末中文班' },
      { en: 'Culture and dance programs', 'zh': '文化與舞蹈課程' },
      { en: 'Parent newcomer network', 'zh': '家長新手互助網絡' },
    ],
    languages: ['English', 'Mandarin', 'Traditional Chinese'],
    searchAliases: ['chinese school tempe', '中文學校', 'taiwanese family classes'],
    verified: true,
    bilingual: true,
    newcomerFriendly: true,
    sponsored: false,
    featured: true,
    ownerProfileSlug: 'phoenix-community-team',
    rating: 4.8,
    reviewCount: 61,
    lastUpdated: '2026-04-01T08:00:00.000Z',
    hours: [
      { label: 'Sat', value: '9:00 AM - 3:00 PM' },
      { label: 'Sun', value: 'Special programs' },
    ],
    coordinates: { lat: 33.3334, lng: -111.9141 },
  },
  {
    id: 'biz_8',
    slug: 'tucson-orchid-immigration-law',
    name: { en: 'Tucson Orchid Immigration Law', 'zh': '圖森蘭亭移民法律' },
    categorySlug: 'legal-finance',
    city: 'Tucson',
    region: 'Southern Arizona',
    address: '177 N Church Ave, Tucson, AZ 85701',
    phone: '(520) 555-0104',
    website: 'https://example.com/tucson-orchid-law',
    heroImage:
      'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80',
    ],
    shortDescription: {
      en: 'Immigration and business setup counsel for families expanding beyond Phoenix.',
      'zh': '服務鳳凰城以外地區家庭的移民與公司設立法律顧問。',
    },
    description: {
      en: 'A useful Tucson anchor for families and founders who need bilingual legal context outside the Phoenix metro.',
      'zh': '若家庭或創業者落腳 Tucson，這是一家提供雙語法律脈絡的實用據點。',
    },
    services: [
      { en: 'Immigration filings', 'zh': '移民申請' },
      { en: 'Business entity setup', 'zh': '公司設立' },
      { en: 'Contract review', 'zh': '合約審閱' },
    ],
    languages: ['English', 'Mandarin', 'Traditional Chinese'],
    searchAliases: ['tucson immigration lawyer', '移民律師', 'southern arizona attorney'],
    verified: false,
    bilingual: true,
    newcomerFriendly: true,
    sponsored: false,
    featured: false,
    ownerProfileSlug: 'phoenix-community-team',
    rating: 4.7,
    reviewCount: 18,
    lastUpdated: '2026-03-22T14:00:00.000Z',
    hours: [
      { label: 'Mon-Fri', value: '9:00 AM - 5:00 PM' },
    ],
    coordinates: { lat: 32.2232, lng: -110.9747 },
  },
  {
    id: 'biz_9',
    slug: 'lotus-travel-center',
    name: { en: 'Lotus Travel Center', zh: '蓮華旅遊中心' },
    categorySlug: 'travel',
    city: 'Phoenix',
    region: 'Greater Phoenix',
    address: '4500 N 7th Ave, Phoenix, AZ 85013',
    phone: '(602) 555-0166',
    email: 'hello@lotustravel.example',
    website: 'https://example.com/lotus-travel-center',
    heroImage:
      'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=1200&q=80',
    ],
    shortDescription: {
      en: 'Bilingual airfare, route planning, and family travel support for Arizona-based Asia trips.',
      zh: '提供雙語機票、轉機路線與返鄉探親旅行支援。',
    },
    description: {
      en: 'Lotus Travel Center helps families compare connector airports, baggage rules, and school-break timing when Phoenix does not offer the exact route they want.',
      zh: '當鳳凰城沒有理想直飛航線時，Lotus Travel Center 會協助家庭比較轉機機場、行李規則與寒暑假檔期。',
    },
    services: [
      { en: 'Asia itinerary planning', zh: '亞洲航線規劃' },
      { en: 'Family and student fares', zh: '家庭與學生票務' },
      { en: 'Bilingual airport prep', zh: '雙語機場行前說明' },
    ],
    languages: ['English', 'Mandarin', 'Traditional Chinese'],
    searchAliases: ['phoenix asia flights', 'travel agency phoenix chinese', '返台機票'],
    verified: true,
    bilingual: true,
    newcomerFriendly: true,
    sponsored: false,
    featured: false,
    ownerProfileSlug: 'phoenix-community-team',
    rating: 4.7,
    reviewCount: 22,
    lastUpdated: '2026-04-09T09:30:00.000Z',
    hours: [
      { label: 'Mon-Fri', value: '9:30 AM - 6:00 PM' },
      { label: 'Sat', value: '10:00 AM - 2:00 PM' },
    ],
    coordinates: { lat: 33.5008, lng: -112.0827 },
  },
  {
    id: 'biz_10',
    slug: 'sonoran-career-bridge',
    name: { en: 'Sonoran Career Bridge', zh: '索諾蘭職涯橋梁' },
    categorySlug: 'jobs',
    city: 'Peoria',
    region: 'West Valley',
    address: '9875 N 85th Ave, Peoria, AZ 85345',
    phone: '(623) 555-0118',
    website: 'https://example.com/sonoran-career-bridge',
    heroImage:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    ],
    shortDescription: {
      en: 'Resume, interview, and supplier-hiring guidance for newcomers entering Arizona’s manufacturing growth corridor.',
      zh: '協助新居民銜接亞州製造成長走廊的履歷、面試與供應鏈求職資訊。',
    },
    description: {
      en: 'Sonoran Career Bridge focuses on bilingual resume polish, hiring-event prep, and practical introductions for families exploring semiconductor-adjacent roles.',
      zh: 'Sonoran Career Bridge 專注雙語履歷修整、徵才活動準備，以及半導體周邊職缺的實用導覽。',
    },
    services: [
      { en: 'Resume review', zh: '履歷健檢' },
      { en: 'Hiring event prep', zh: '徵才活動準備' },
      { en: 'Career transition workshops', zh: '轉職工作坊' },
    ],
    languages: ['English', 'Mandarin'],
    searchAliases: ['tsmc jobs arizona', 'bilingual resume help', '求職輔導 peoria'],
    verified: true,
    bilingual: true,
    newcomerFriendly: true,
    sponsored: false,
    featured: false,
    ownerProfileSlug: 'phoenix-community-team',
    rating: 4.6,
    reviewCount: 17,
    lastUpdated: '2026-04-08T13:00:00.000Z',
    hours: [
      { label: 'Mon-Fri', value: '9:00 AM - 5:30 PM' },
      { label: 'Sat', value: 'By appointment' },
    ],
    coordinates: { lat: 33.5752, lng: -112.241 },
  },
];

export const businesses: Business[] = [...curatedBusinesses, ...scrapedBusinesses];

export const reviews: Review[] = [
  {
    id: 'rev_1',
    businessSlug: 'elite-az-realty-team',
    authorSlug: 'newcomer-derek',
    rating: 5,
    title: {
      en: 'Made our Chandler move much less stressful',
      'zh': '讓我們搬到 Chandler 的過程安心很多',
    },
    content: {
      en: 'Grace translated builder paperwork, explained school zones, and even flagged which neighborhoods feel easiest for two-working-parent schedules.',
      'zh': 'Grace 幫我們翻譯建商文件、說明學區，也提醒哪些社區更適合雙薪家庭的生活節奏。',
    },
    createdAt: '2026-04-07T10:00:00.000Z',
  },
  {
    id: 'rev_2',
    businessSlug: 'chen-cpa-associates',
    authorSlug: 'grace-lin',
    rating: 5,
    title: {
      en: 'Clear advice for cross-border families',
      'zh': '對台美家庭來說解釋非常清楚',
    },
    content: {
      en: 'They helped a client family understand state tax timing after relocating mid-year from California.',
      'zh': '他們協助一個家庭理解從加州中途搬來亞州後的州稅時程。',
    },
    createdAt: '2026-04-04T08:00:00.000Z',
  },
  {
    id: 'rev_3',
    businessSlug: 'desert-spring-family-medicine',
    authorSlug: 'phoenix-community-team',
    rating: 4,
    title: {
      en: 'Helpful for getting established quickly',
      'zh': '很適合剛搬來時快速建立就醫關係',
    },
    content: {
      en: 'The office handled new patient intake smoothly and had referral context for pediatric specialists nearby.',
      'zh': '診所的新病患流程順暢，也能提供附近小兒專科的轉介資訊。',
    },
    createdAt: '2026-03-30T11:00:00.000Z',
  },
];

export const guides: Guide[] = [
  {
    slug: 'az-moving-checklist',
    section: 'moving',
    title: { en: 'Arizona Moving Checklist for the First 30 Days', 'zh': '搬來亞利桑那前 30 天安家清單' },
    excerpt: {
      en: 'A practical sequence for housing, MVD, utilities, schools, healthcare, and desert-home basics.',
      'zh': '涵蓋住房、MVD、公用事業、學校、醫療與沙漠住宅注意事項的實用時程。',
    },
    heroImage:
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
    readTime: '8 min',
    publishedAt: '2026-04-02T09:00:00.000Z',
    updatedAt: '2026-04-10T09:00:00.000Z',
    body: [
      {
        en: 'Treat your move as three layers: soft landing, legal setup, and local routines. Secure temporary housing first, then book MVD and utilities, then build the weekly systems that make Arizona feel manageable.',
        'zh': '把搬家分成三層：先安頓、再完成法規與帳務、最後建立日常生活節奏。先把住處穩住，再安排 MVD 與公用事業，最後建立每週例行。',
      },
      {
        en: 'Families arriving from Taiwan or California often underestimate commute spread and heat. Before signing a lease, test commute times at the hour you will actually drive and check parking shade, school pick-up patterns, and grocery access.',
        'zh': '從台灣或加州搬來的家庭常低估通勤距離與高溫影響。簽約前應在實際通勤時段試開一次，也要看停車遮蔭、學校接送動線與買菜便利性。',
      },
      {
        en: 'Use official city and state links for time-sensitive steps, then rely on the directory for trusted local people who can help you translate or execute those steps.',
        'zh': '涉及時效性的流程要以官方網站為主，再搭配目錄中的在地專業人士協助翻譯與執行。',
      },
    ],
    officialResources: [
      {
        label: { en: 'Arizona MVD appointments', 'zh': '亞利桑那 MVD 預約' },
        url: 'https://azmvdnow.gov',
        source: 'Arizona MVD',
      },
      {
        label: { en: 'City of Chandler utility services', 'zh': 'Chandler 公用事業服務' },
        url: 'https://www.chandleraz.gov/residents/utility-services',
        source: 'City of Chandler',
      },
    ],
    relatedBusinessSlugs: ['elite-az-realty-team', 'desert-bridge-relocation'],
    relatedEventSlugs: ['newcomer-coffee-east-valley'],
  },
  {
    slug: 'az-drivers-license-guide',
    section: 'transportation',
    title: { en: "How to Handle Arizona Driver's License Setup as a New Resident", 'zh': '新居民如何處理亞利桑那駕照申辦' },
    excerpt: {
      en: 'What to gather before your appointment and which parts should always be checked against official MVD guidance.',
      'zh': '預約前該準備什麼，以及哪些部分一定要回到官方 MVD 指引確認。',
    },
    heroImage:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
    readTime: '6 min',
    publishedAt: '2026-04-01T12:00:00.000Z',
    updatedAt: '2026-04-10T12:00:00.000Z',
    body: [
      {
        en: 'The safest way to prepare is to use the current Arizona MVD document list and appointment site directly. Requirements can change, and the exact proof combinations matter.',
        'zh': '最安全的做法是直接查看最新 Arizona MVD 文件清單與預約系統。要求可能變動，而且證明文件的組合很重要。',
      },
      {
        en: 'Use this guide to understand the workflow, not to replace the official checklist. Pay special attention to residency documents, name consistency, and whether you are converting from another US state or arriving with international documents.',
        'zh': '這份指南是幫你理解流程，不是取代官方清單。要特別注意居住證明、姓名一致性，以及你是從美國其他州轉入，還是帶國際文件辦理。',
      },
    ],
    officialResources: [
      {
        label: { en: 'Arizona DL/ID requirements PDF', 'zh': '亞利桑那駕照／身分證需求 PDF' },
        url: 'https://apps.azdot.gov/files/mvd/mvd-forms-lib/96-0155.pdf',
        source: 'Arizona Department of Transportation',
      },
      {
        label: { en: 'AZ MVD Now', 'zh': 'AZ MVD Now 官方入口' },
        url: 'https://azmvdnow.gov',
        source: 'Arizona MVD',
      },
    ],
    relatedBusinessSlugs: ['desert-bridge-relocation'],
    relatedEventSlugs: [],
  },
  {
    slug: 'east-valley-school-guide',
    section: 'schools',
    title: { en: 'How Families Evaluate Chandler and Gilbert School Fit', 'zh': '家庭如何評估 Chandler 與 Gilbert 的學校適配度' },
    excerpt: {
      en: 'A practical framework for district boundaries, commute logic, after-school flow, and Chinese-language community access.',
      'zh': '從學區邊界、通勤、課後節奏到中文社群資源的實用評估框架。',
    },
    heroImage:
      'https://images.unsplash.com/photo-1497486751825-1233686d5d80?auto=format&fit=crop&w=1200&q=80',
    readTime: '7 min',
    publishedAt: '2026-04-04T07:00:00.000Z',
    updatedAt: '2026-04-09T07:00:00.000Z',
    body: [
      {
        en: 'School choice is rarely just about rankings. In Arizona, families should weigh district boundaries, drive times, after-school coverage, language support, and weekend community access together.',
        'zh': '選學校不只是看排名。在亞利桑那，學區邊界、接送時間、課後照顧、語言支援與週末社群連結都要一起考慮。',
      },
      {
        en: 'If both parents work, test the full day: school start, office commute, grocery stop, and evening activity distance. Small map differences can create a much bigger weekly burden than newcomers expect.',
        'zh': '如果雙親都上班，請測試完整一天：上學、通勤、買菜與晚間活動的距離。地圖上看似小差異，常會變成每週很大的負擔。',
      },
    ],
    officialResources: [
      {
        label: { en: 'Arizona School Report Cards', 'zh': '亞利桑那學校成績卡' },
        url: 'https://azreportcards.azed.gov',
        source: 'Arizona Department of Education',
      },
    ],
    relatedBusinessSlugs: ['elite-az-realty-team', 'arizona-chinese-language-academy'],
    relatedEventSlugs: ['family-resource-fair-gilbert'],
  },
  {
    slug: 'arizona-utilities-guide',
    section: 'utilities',
    title: { en: 'Utilities in Arizona: What Newcomers Should Verify Before Move-In', 'zh': '亞利桑那公用事業：入住前新居民要先確認的事' },
    excerpt: {
      en: 'A plain-language guide to verifying electric, water, and service transfer details with the right city and provider pages.',
      'zh': '用白話整理電、水與服務轉移該去哪個官方頁面確認。',
    },
    heroImage:
      'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1200&q=80',
    readTime: '5 min',
    publishedAt: '2026-04-03T08:00:00.000Z',
    updatedAt: '2026-04-11T08:00:00.000Z',
    body: [
      {
        en: 'Arizona utility setup is fragmented by city and provider. The key is not memorizing a single rule, but making sure you confirm your exact provider, service start date, and account handoff before keys change hands.',
        'zh': '亞利桑那的公用事業分散在不同城市與供應商。重點不是背規則，而是入住前確認你的供應商、開通日期與帳戶交接。',
      },
      {
        en: 'If you are moving into a single-family home, also ask about irrigation, soft water systems, and summer AC maintenance from day one.',
        'zh': '若入住透天住宅，也要從第一天就確認灌溉、軟水系統與夏季冷氣保養。',
      },
    ],
    officialResources: [
      {
        label: { en: 'City of Phoenix Water Services', 'zh': 'Phoenix Water Services' },
        url: 'https://www.phoenix.gov/waterservices/',
        source: 'City of Phoenix',
      },
      {
        label: { en: 'Town of Gilbert Utilities Hub', 'zh': 'Gilbert 公用事業入口' },
        url: 'https://www.gilbertaz.gov/departments/finance-mgmt-services/utilities/utilitieshub',
        source: 'Town of Gilbert',
      },
      {
        label: { en: 'City of Chandler Utility Services', 'zh': 'Chandler 公用事業服務' },
        url: 'https://www.chandleraz.gov/residents/utility-services',
        source: 'City of Chandler',
      },
    ],
    relatedBusinessSlugs: ['profix-home-services', 'desert-bridge-relocation'],
    relatedEventSlugs: [],
  },
  {
    slug: 'where-tsmc-families-look-first',
    section: 'housing',
    title: {
      en: 'Where TSMC Families Start Looking First: Peoria, North Phoenix, and East Valley Tradeoffs',
      zh: 'TSMC 家庭最先比較的落腳區：Peoria、北鳳凰城與東谷取捨',
    },
    excerpt: {
      en: 'A newcomer-friendly way to compare commute pressure, school rhythm, Chinese community access, and airport convenience before a lease or purchase.',
      zh: '在簽租約或買房前，用新居民視角比較通勤壓力、學校節奏、華人社群與機場便利性。',
    },
    heroImage:
      'https://images.unsplash.com/photo-1472224371017-08207f84aaae?auto=format&fit=crop&w=1200&q=80',
    readTime: '7 min',
    publishedAt: '2026-04-12T09:00:00.000Z',
    updatedAt: '2026-04-15T09:00:00.000Z',
    body: [
      {
        en: 'Most TSMC-linked families are not choosing between one perfect neighborhood and one bad one. They are usually comparing three different lifestyle packages: a shorter fab commute, stronger East Valley Chinese community anchors, or easier access to airport and central-city services.',
        zh: '多數與 TSMC 相關的家庭並不是在一個完美社區和一個不理想社區之間做選擇，而是在三種生活組合中取捨：更短的廠區通勤、更成熟的東谷華人生活圈，或更方便的機場與市中心服務。',
      },
      {
        en: 'That is why this guide treats housing as a weekly systems decision. Commute times, school pickup flow, Saturday Chinese classes, and a realistic grocery run often matter more than a map radius alone.',
        zh: '因此這份指南把住房視為每週生活系統的選擇。通勤時間、接送小孩動線、週末中文課，以及實際買菜路線，往往比地圖上的半徑更重要。',
      },
      {
        en: 'Use official city and school data for time-sensitive facts, then pair that with bilingual directory providers who can help you translate the tradeoffs into a workable landing plan.',
        zh: '涉及時效性的資訊請先看官方城市與學校資料，再搭配雙語目錄中的在地服務者，把這些取捨轉成真正可執行的安家方案。',
      },
    ],
    officialResources: [
      {
        label: { en: 'Arizona School Report Cards', zh: '亞利桑那學校成績卡' },
        url: 'https://azreportcards.azed.gov',
        source: 'Arizona Department of Education',
      },
      {
        label: { en: 'City of Peoria official site', zh: 'Peoria 市政府官網' },
        url: 'https://www.peoriaaz.gov/',
        source: 'City of Peoria',
      },
    ],
    relatedBusinessSlugs: ['elite-az-realty-team', 'desert-bridge-relocation', 'arizona-chinese-language-academy'],
    relatedEventSlugs: ['family-resource-fair-gilbert'],
  },
  {
    slug: 'phoenix-asia-flight-playbook',
    section: 'transportation',
    title: {
      en: 'Phoenix to Asia Flight Playbook for Families, Students, and Frequent Return Trips',
      zh: '鳳凰城往返亞洲的航班攻略：家庭、學生與高頻返鄉都適用',
    },
    excerpt: {
      en: 'How to think about connector airports, baggage stress, school-break timing, and when a travel specialist saves more time than searching alone.',
      zh: '如何評估轉機機場、行李壓力、寒暑假檔期，以及什麼時候該交給旅行顧問而不是自己硬搜。',
    },
    heroImage:
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1200&q=80',
    readTime: '6 min',
    publishedAt: '2026-04-13T07:30:00.000Z',
    updatedAt: '2026-04-15T07:30:00.000Z',
    body: [
      {
        en: 'Phoenix is workable for Asia travel, but the best plan depends on who is traveling and how often. Families optimize for fewer painful transfers, students care about price windows, and frequent return trips need predictable airport routines more than one perfect itinerary.',
        zh: '鳳凰城出發前往亞洲是可行的，但最佳方案取決於誰在旅行、多久一次。家庭會優先考慮少折騰的轉機，學生在意價格區間，而高頻返鄉的人更需要穩定可預測的機場流程。',
      },
      {
        en: 'That is why route news alone is not enough. ChineseArizona treats airport access, parking timing, baggage rules, and connector choices as one planning bundle so readers can make calmer decisions before a big trip.',
        zh: '因此只看航線新聞還不夠。ChineseArizona 把機場動線、停車時機、行李規則與轉機選擇視為同一套決策，讓讀者在長途旅行前更能冷靜安排。',
      },
      {
        en: 'For official updates, always confirm the airport and TSA pages directly. Use the directory when you need bilingual help comparing options for parents, kids, or group travel schedules.',
        zh: '涉及官方變動時，一定要直接確認機場與 TSA 頁面。若需要雙語協助比較長輩、小孩或多人同行的安排，再回到目錄找可信任的在地服務。',
      },
    ],
    officialResources: [
      {
        label: { en: 'Phoenix Sky Harbor official site', zh: '鳳凰城機場官網' },
        url: 'https://www.skyharbor.com/',
        source: 'Phoenix Sky Harbor',
      },
      {
        label: { en: 'TSA travel guidance', zh: 'TSA 旅行指引' },
        url: 'https://www.tsa.gov/travel',
        source: 'Transportation Security Administration',
      },
    ],
    relatedBusinessSlugs: ['lotus-travel-center', 'desert-bridge-relocation'],
    relatedEventSlugs: [],
  },
];

export const localArticles: Article[] = (generatedLocalArticles as Article[]).map((article) =>
  normalizeImportedArticle(article as ImportedArticle)
);

export const monitoredSources = monitoredSourcesData as MonitoredSource[];

export const signalDeskQueue = generatedSignalDeskQueue as SignalDeskQueueItem[];

export const articles: Article[] = localArticles;

export const events: Event[] = [
  {
    slug: 'newcomer-coffee-east-valley',
    title: { en: 'Newcomer Coffee for East Valley Families', 'zh': '東谷新住民家庭咖啡聚' },
    excerpt: {
      en: 'A low-pressure meetup for families moving from Taiwan or California into Chandler, Gilbert, Mesa, or Tempe.',
      'zh': '給剛從台灣或加州搬到 Chandler、Gilbert、Mesa、Tempe 家庭的輕鬆交流聚會。',
    },
    description: [
      {
        en: 'Bring your questions about schools, commute tradeoffs, and where to start with doctors, groceries, and community groups. Hosted in bilingual format with trusted local volunteers.',
        'zh': '歡迎帶著關於學校、通勤、醫療、買菜與社群組織的問題來參加。現場以雙語進行，也有可信的在地志工分享。',
      },
    ],
    heroImage:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
    organizer: 'ChineseArizona Community',
    verifiedOrganizer: true,
    venueName: 'Peixoto Coffee',
    address: '11 W Boston St, Chandler, AZ 85225',
    city: 'Chandler',
    startDate: '2026-04-20T10:00:00-07:00',
    endDate: '2026-04-20T12:00:00-07:00',
    languageNote: {
      en: 'English + Traditional Chinese discussion tables',
      'zh': '提供英文與繁體中文交流桌',
    },
    relatedBusinessSlugs: ['elite-az-realty-team', 'desert-bridge-relocation'],
    tags: ['newcomers', 'families', 'east valley'],
  },
  {
    slug: 'family-resource-fair-gilbert',
    title: { en: 'Gilbert Family Resource Fair', 'zh': 'Gilbert 家庭資源博覽會' },
    excerpt: {
      en: 'School, healthcare, after-school, and parent-network resources in one place.',
      'zh': '把學校、醫療、課後與家長網絡資源集中在同一場。',
    },
    description: [
      {
        en: 'This event focuses on family settling needs with kid-friendly programming and local organizations that understand bilingual households.',
        'zh': '這場活動聚焦在家庭安頓需求，現場也安排適合孩子的活動，以及理解雙語家庭需求的在地組織。',
      },
    ],
    heroImage:
      'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
    organizer: 'Arizona Chinese Language Academy',
    verifiedOrganizer: true,
    venueName: 'Gilbert Community Center',
    address: '130 N Oak St, Gilbert, AZ 85233',
    city: 'Gilbert',
    startDate: '2026-05-03T09:30:00-07:00',
    endDate: '2026-05-03T13:00:00-07:00',
    ticketUrl: 'https://example.com/family-resource-fair-gilbert',
    languageNote: {
      en: 'Bilingual event details with family volunteers on-site',
      'zh': '提供雙語資訊，現場有家庭志工協助',
    },
    relatedBusinessSlugs: ['arizona-chinese-language-academy', 'desert-spring-family-medicine'],
    tags: ['schools', 'family', 'gilbert'],
  },
  {
    slug: 'phoenix-night-market-showcase',
    title: { en: 'Phoenix Night Market Showcase', 'zh': '鳳凰城夜市文化展演' },
    excerpt: {
      en: 'A food-forward cultural night with vendor discovery and community performances.',
      'zh': '以美食為主軸，結合攤位探索與社群演出的文化夜市。',
    },
    description: [
      {
        en: 'A good event for newcomers who want a fast snapshot of Arizona Chinese and Taiwanese community energy without needing to know existing groups first.',
        'zh': '對新居民來說，這是不用先加入特定社群，就能快速感受亞州華人與台灣社群活力的活動。',
      },
    ],
    heroImage:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
    organizer: 'Phoenix Community Team',
    verifiedOrganizer: true,
    venueName: 'Mesa Amphitheatre Grounds',
    address: '263 N Center St, Mesa, AZ 85201',
    city: 'Mesa',
    startDate: '2026-05-17T18:00:00-07:00',
    endDate: '2026-05-17T22:00:00-07:00',
    ticketUrl: 'https://example.com/phoenix-night-market-showcase',
    languageNote: {
      en: 'Mostly bilingual signage and MC segments',
      'zh': '多數攤位與主持皆有雙語資訊',
    },
    relatedBusinessSlugs: ['taste-of-taiwan'],
    tags: ['food', 'culture', 'mesa'],
  },
];

export const communityPosts: CommunityPost[] = [
  {
    slug: 'east-valley-new-parent-group',
    type: 'board',
    title: { en: 'East Valley New Parent Group Looking for More Families', 'zh': '東谷新手爸媽群組招募更多家庭加入' },
    excerpt: {
      en: 'Small bilingual parent circle meeting twice a month around Chandler and Gilbert.',
      'zh': '每月在 Chandler 與 Gilbert 聚兩次的小型雙語家長圈。',
    },
    body: [
      {
        en: 'We started this group for families who moved recently and want a calmer alternative to giant chat groups. We usually compare school routines, pediatrician experiences, and kid activities.',
        'zh': '我們成立這個群組，是想給剛搬來的家庭一個比大型聊天群更平靜的交流方式。平常會分享學校作息、小兒科經驗與孩子活動。',
      },
    ],
    authorSlug: 'newcomer-derek',
    city: 'Chandler',
    createdAt: '2026-04-12T09:00:00.000Z',
    updatedAt: '2026-04-12T09:00:00.000Z',
    reportCount: 0,
    autoHidden: false,
    trustLevel: 'new',
    tags: ['parents', 'newcomers'],
    linkUrl: 'https://example.com/east-valley-new-parent-group',
  },
  {
    slug: 'used-minivan-east-valley',
    type: 'classified',
    title: { en: '2018 Minivan Available in East Valley', 'zh': '東谷出售 2018 年廂型車' },
    excerpt: {
      en: 'Well-maintained family vehicle, useful for new arrivals before deciding on a long-term car plan.',
      'zh': '保養良好的家庭用車，適合剛搬來、還在規劃長期車輛方案的家庭。',
    },
    body: [
      {
        en: 'Posting on behalf of a family relocating again this summer. Clean title, available for local inspection, and close to ASU/Tempe pickup if needed.',
        'zh': '代替今夏再度搬家的家庭刊登。產權清楚，可本地看車，如有需要也可在 ASU/Tempe 附近交車。',
      },
    ],
    authorSlug: 'newcomer-derek',
    city: 'Tempe',
    createdAt: '2026-04-10T16:30:00.000Z',
    updatedAt: '2026-04-10T16:30:00.000Z',
    reportCount: 1,
    autoHidden: false,
    trustLevel: 'new',
    price: '$18,500',
    tags: ['car', 'classified'],
    linkUrl: 'https://example.com/used-minivan-east-valley',
  },
  {
    slug: 'mesa-translation-volunteers',
    type: 'board',
    title: { en: 'Mesa Volunteer Translation Team for New Residents', 'zh': 'Mesa 新居民志工翻譯支援' },
    excerpt: {
      en: 'Trusted volunteers offering light orientation help for appointments and paperwork prep.',
      'zh': '可信任志工提供輕量的預約與文件準備說明。',
    },
    body: [
      {
        en: 'We do not replace professional legal or medical interpretation, but we can help newcomers understand where to start and which office they should contact first.',
        'zh': '我們不取代專業法律或醫療口譯，但可以協助新居民先理解該從哪裡開始、應該先聯絡哪個單位。',
      },
    ],
    authorSlug: 'phoenix-community-team',
    city: 'Mesa',
    createdAt: '2026-04-07T13:00:00.000Z',
    updatedAt: '2026-04-08T13:00:00.000Z',
    reportCount: 0,
    autoHidden: false,
    trustLevel: 'trusted',
    tags: ['volunteers', 'translation'],
    linkUrl: 'https://example.com/mesa-translation-volunteers',
  },
];
