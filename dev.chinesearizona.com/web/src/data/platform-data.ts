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
import { businessReviewOverrides } from '@/data/business-review-overrides';
import generatedAustinLocalArticles from '@/data/generated-austin-local-articles.json';
import generatedDirectoryBusinesses from '@/data/generated-directory-businesses.json';
import generatedLosAngelesLocalArticles from '@/data/generated-los-angeles-local-articles.json';
import generatedLocalArticles from '@/data/generated-local-articles.json';
import generatedSfBayDirectoryBusinesses from '@/data/generated-sf-bay-directory-businesses.json';
import generatedSfBayLocalArticles from '@/data/generated-sf-bay-local-articles.json';
import losAngelesDirectoryBusinessesData from '@/data/los-angeles-directory-businesses.json';
import generatedSignalDeskQueue from '@/data/generated-signal-desk-queue.json';
import { applyBusinessDirectoryOverride } from '@/lib/business-directory-overrides';
import monitoredSourcesData from '@/data/monitored-sources.json';
import { formatPhoneNumber } from '@/lib/phone';

type JsonArrayImport<T> = T[] | { default: T[] };

function unwrapJsonArray<T>(value: JsonArrayImport<T>, label: string): T[] {
  const arrayValue = Array.isArray(value) ? value : value.default;

  if (!Array.isArray(arrayValue)) {
    throw new Error(`${label} must be an array`);
  }

  return arrayValue;
}

export type ImportedBusiness = Omit<
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
  sourceUrls?: string[];
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

export function normalizeImportedBusiness(business: ImportedBusiness): Business {
  const reviewOverride = businessReviewOverrides[business.slug];
  const businessFields = { ...business };
  delete businessFields.sourceUrls;

  return applyBusinessDirectoryOverride({
    ...businessFields,
    address: business.address ?? undefined,
    serviceAreaText: business.serviceAreaText ?? undefined,
    phone: formatPhoneNumber(business.phone),
    email: business.email ?? undefined,
    website: business.website ?? undefined,
    menuUrl: business.menuUrl ?? undefined,
    priceRange: business.priceRange ?? undefined,
    coordinates: business.coordinates ?? undefined,
    verified: true,
    newcomerFriendly: business.newcomerFriendly ?? false,
    verificationState: 'editor_verified',
    rating: reviewOverride?.rating ?? business.rating,
    reviewCount: reviewOverride?.reviewCount ?? business.reviewCount,
  });
}

const scrapedBusinesses = (generatedDirectoryBusinesses as ImportedBusiness[])
  .map(normalizeImportedBusiness);

export const losAngelesBusinesses: Business[] = (losAngelesDirectoryBusinessesData as ImportedBusiness[])
  .map(normalizeImportedBusiness);

export const sfBayBusinesses: Business[] = (generatedSfBayDirectoryBusinesses as ImportedBusiness[])
  .map(normalizeImportedBusiness);

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
    slug: 'faith-community',
    name: { en: 'Faith & Community', zh: '信仰社群' },
    description: {
      en: 'Churches, temples, fellowships, and community faith anchors.',
      zh: '教會、寺院、團契與在地信仰社群據點。',
    },
    icon: 'users',
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
    title: { en: 'Arizona Moving Checklist for the First 30 Days', zh: '搬來亞利桑那 30 天安家清單' },
    excerpt: {
      en: 'A step by step landing plan for housing, MVD, schools, healthcare, utilities, heat safety, and Chinese community routines.',
      zh: '把住房、MVD、學校、醫療、公用事業、高溫安全與華人生活圈排進一份可執行時程。',
    },
    heroImage:
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
    readTime: '13 min',
    publishedAt: '2026-04-02T09:00:00.000Z',
    updatedAt: '2026-05-14T09:00:00.000Z',
    body: [
      {
        en: 'The first month in Arizona works best when families separate urgent tasks from tasks that can wait. Housing, electricity, vehicle paperwork, school enrollment, health coverage, and heat safety should come first. Restaurant lists and weekend plans are easier once the legal and household basics are stable.',
        zh: '搬來亞利桑那的第一個月，先分清楚哪些事必須立刻處理。住房、電力、車輛文件、入學、醫療保險與高溫安全要排在前面。餐廳與週末活動可以等基本生活穩住後再慢慢找。',
      },
      {
        en: 'Chinese-speaking newcomers should treat translation as part of the move. Bring legal names exactly as they appear on passports, visas, I-94 records, Social Security records, leases, insurance cards, school transcripts, and vaccine records. A small spelling mismatch can slow down MVD, school, bank, and medical intake.',
        zh: '華語家庭要把翻譯與姓名一致性當成搬家流程的一部分。護照、簽證、I-94、社安資料、租約、保險卡、成績單與疫苗紀錄上的英文姓名最好一致。拼音或中間名不一致，常會拖慢 MVD、學校、銀行與診所建檔。',
      },
      {
        en: 'Greater Phoenix is spread out. Before committing to a lease, drive the real weekday route between home, school, work, grocery shopping, and weekend Chinese classes. A beautiful house that adds 45 minutes each way can make the whole week harder.',
        zh: '大鳳凰城範圍很大。簽租約前，請在平日實際開一次住家、學校、公司、買菜與週末中文課的路線。房子本身再漂亮，如果每天多出 45 分鐘通勤，整週生活都會被壓縮。',
      },
    ],
    quickChecklist: [
      {
        en: 'Before arrival, collect passports, visas, I-94 records, Social Security cards or SSN letters, marriage or name change records, school transcripts, immunization records, leases, titles, registrations, and insurance cards.',
        zh: '抵達前整理護照、簽證、I-94、社安卡或 SSN 文件、婚姻或改名文件、成績單、疫苗紀錄、租約、車輛 title、registration 與保險卡。',
      },
      {
        en: 'Book temporary housing long enough to visit neighborhoods at commute time and to confirm school boundaries before a long lease.',
        zh: '短租時間要留夠，方便在實際通勤時段看社區，也能在簽長租前確認學區邊界。',
      },
      {
        en: 'Start electric, water, trash, and internet service before the key handoff. Keep confirmation numbers in one shared folder.',
        zh: '交屋或拿鑰匙前先申請電、水、垃圾與網路服務，確認號碼集中放在同一個共享資料夾。',
      },
      {
        en: 'Use AZ MVD Now and ADOT pages to confirm the current driver license, ID, title, registration, emissions, and insurance steps.',
        zh: '用 AZ MVD Now 與 ADOT 官方頁確認最新駕照、身分證、title、registration、排放檢測與保險步驟。',
      },
      {
        en: 'Call the school or district before arrival and ask which documents they require for enrollment, residency, immunizations, ELL screening, gifted testing, IEP, or 504 support.',
        zh: '抵達前先聯絡學校或學區，問清楚入學、居住證明、疫苗、英語學習評估、資優測試、IEP 或 504 支援需要哪些文件。',
      },
      {
        en: 'Choose a primary care doctor, pediatrician, dentist, urgent care, pharmacy, and nearest ER before the first illness happens.',
        zh: '在家人生病前先選好家庭醫師、小兒科、牙醫、urgent care、藥局與最近的 ER。',
      },
      {
        en: 'Build a heat kit for each car: water, hats, sunscreen, snacks, phone battery, flashlight, and any prescription medication.',
        zh: '每台車都放高溫應急包：水、帽子、防曬、零食、行動電源、手電筒與必要處方藥。',
      },
    ],
    detailSections: [
      {
        title: { en: 'Before you arrive', zh: '抵達前' },
        intro: {
          en: 'Use the weeks before the move to reduce uncertainty. Many Arizona tasks require an address, but you can still prepare documents, timing, and service accounts.',
          zh: '搬家前幾週先降低不確定性。許多亞利桑那手續需要地址，但文件、時程與帳戶可以先準備。',
        },
        bullets: [
          {
            en: 'Create one digital folder with PDFs or clear photos of every identity, immigration, school, vaccine, vehicle, insurance, lease, and employment document. Keep original documents with you during travel, not in the moving truck.',
            zh: '建立一個雲端資料夾，放身分、移民、學校、疫苗、車輛、保險、租約與工作文件的 PDF 或清晰照片。正本隨身帶，不要放搬家公司車上。',
          },
          {
            en: 'If children are moving from China, Taiwan, Hong Kong, Singapore, or another US state, ask the current school for transcripts, grade placement notes, special education records, and any English translation the receiving school can review.',
            zh: '孩子若從中國、台灣、香港、新加坡或美國其他州轉學，請原學校準備成績單、年級銜接說明、特殊教育文件，以及新學校可讀的英文翻譯。',
          },
          {
            en: 'Check whether your target address is APS or SRP for electricity, and which city bills water, sewer, trash, and recycling. Apartment communities often handle some services, single-family homes usually require more accounts.',
            zh: '先查目標地址是 APS 還是 SRP 供電，以及哪個城市負責水、污水、垃圾與回收。公寓常代收部分服務，透天通常要自己開更多帳戶。',
          },
          {
            en: 'Ask a landlord or realtor for average summer electric bills, HOA rules, pool service expectations, pest control history, and whether the AC was serviced before summer.',
            zh: '向房東或房仲詢問夏季平均電費、HOA 規則、泳池維護、除蟲紀錄，以及冷氣是否在夏季前保養過。',
          },
        ],
      },
      {
        title: { en: 'First week in Arizona', zh: '抵達第一週' },
        bullets: [
          {
            en: 'Confirm utilities are active, then photograph meter readings, appliance condition, AC filters, water heater, irrigation controls, smoke detectors, and any move-in damage.',
            zh: '確認公用事業已開通後，拍下電表水表、家電狀況、冷氣濾網、熱水器、灌溉控制、煙霧警報器與入住損傷。',
          },
          {
            en: 'Drive the school drop-off and pickup route before the first day. Many campuses have one-way queues, separate kindergarten pickup, or parking rules that are not obvious on a map.',
            zh: '開學前先實際走一次接送路線。許多校園有單向排隊、幼兒園獨立接送或停車規則，地圖上看不出來。',
          },
          {
            en: 'Open or update your Arizona auto insurance before registering a car. ADOT states Arizona requires liability insurance for vehicles driven on Arizona roads.',
            zh: '車輛 registration 前先辦好或更新亞利桑那車險。ADOT 明確要求在亞利桑那道路行駛的車輛要有責任險。',
          },
          {
            en: 'Save the nearest 24 hour pharmacy, urgent care, hospital ER, Chinese grocery, and backup grocery. In summer, a short grocery route matters more than it seems.',
            zh: '存好最近的 24 小時藥局、urgent care、醫院 ER、華人超市與備用超市。夏季時短買菜路線比想像中重要。',
          },
        ],
      },
      {
        title: { en: 'First month', zh: '第一個月' },
        bullets: [
          {
            en: 'Finish MVD tasks early. New residents who bring an out of state vehicle should register it as soon as they become Arizona residents, and Phoenix or Tucson area vehicles may need emissions testing first.',
            zh: 'MVD 事項要早做。外州車搬來後，成為亞利桑那居民就應盡快 registration；在 Phoenix 或 Tucson 都會區的車，可能要先做排放檢測。',
          },
          {
            en: 'Enroll children, then ask how the school handles English learner screening, home language surveys, bus routes, aftercare, lunch accounts, parent portals, and translation support.',
            zh: '孩子入學後，詢問學校如何處理英語學習評估、家庭語言表、校車、課後照顧、午餐帳戶、家長系統與翻譯支援。',
          },
          {
            en: 'Pick one weekend Chinese program or community anchor to visit, then decide after observing traffic, class style, age fit, and parent communication. Do not choose only by the nearest address.',
            zh: '先挑一個週末中文課或社群據點實際參觀，再看交通、課程風格、年齡適配與家長溝通。不要只看哪個地址最近。',
          },
          {
            en: 'Update banks, payroll, insurance, pharmacies, schools, voter registration if eligible, and tax records with your Arizona address.',
            zh: '把銀行、薪資、保險、藥局、學校、符合資格的選民登記，以及稅務資料改成亞利桑那地址。',
          },
        ],
      },
    ],
    practicalNotes: [
      {
        en: 'Do not send a deposit for a rental before confirming the listing, ownership, lease terms, and payment method. Rental scams remain common enough that the Arizona Attorney General publishes warnings.',
        zh: '不要在確認房源、屋主、租約與付款方式前匯押金。租屋詐騙仍很常見，亞利桑那 Attorney General 也定期提醒。',
      },
      {
        en: 'Do not wait until June or July to discover that an AC unit is weak. Ask for service records and test cooling while the home is occupied.',
        zh: '不要等到六月或七月才發現冷氣不夠力。入住時就問保養紀錄，實際測試降溫。',
      },
      {
        en: 'Do not assume a Chinese WeChat recommendation is verified. Ask for license numbers, official websites, written estimates, and local references.',
        zh: '不要把微信群推薦直接當成已驗證。請索取執照號碼、官方網站、書面估價與在地案例。',
      },
    ],
    officialResources: [
      {
        label: { en: 'ADOT new to Arizona guide', zh: 'ADOT 新居民 MVD 指南' },
        url: 'https://azdot.gov/mvd/services/driver-license-ID/new-to-arizona',
        source: 'Arizona Department of Transportation',
      },
      {
        label: { en: 'AZ MVD Now', zh: 'AZ MVD Now 官方入口' },
        url: 'https://azmvdnow.gov',
        source: 'Arizona MVD',
      },
      {
        label: { en: 'Arizona School Report Cards', zh: '亞利桑那學校成績卡' },
        url: 'https://azreportcards.azed.gov',
        source: 'Arizona Department of Education',
      },
      {
        label: { en: 'ADHS school immunization requirements', zh: 'ADHS 學校疫苗要求' },
        url: 'https://www.azdhs.gov/phs/immunization/school-childcare/requirements.htm',
        source: 'Arizona Department of Health Services',
      },
      {
        label: { en: 'Arizona Heat resource hub', zh: '亞利桑那高溫資源中心' },
        url: 'https://heat.azdhs.gov/',
        source: 'Arizona Department of Health Services',
      },
    ],
    relatedBusinessSlugs: ['elite-az-realty-team', 'desert-bridge-relocation'],
    relatedEventSlugs: ['newcomer-coffee-east-valley'],
  },
  {
    slug: 'az-drivers-license-guide',
    section: 'transportation',
    title: { en: 'Arizona Driver License, ID, Vehicle Title, and Registration Setup', zh: '亞利桑那駕照、身分證、車輛 title 與 registration 辦理' },
    excerpt: {
      en: 'What new residents should prepare for MVD, Travel ID, emissions testing, Arizona insurance, and vehicle paperwork.',
      zh: '整理新居民辦理 MVD、Travel ID、排放檢測、亞利桑那車險與車輛文件前要準備的事。',
    },
    heroImage:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
    readTime: '10 min',
    publishedAt: '2026-04-01T12:00:00.000Z',
    updatedAt: '2026-05-14T12:00:00.000Z',
    body: [
      {
        en: 'Arizona MVD is manageable if you treat it as a document problem. The common delays are missing residency proof, mismatched legal names, insurance that is still tied to another state, and emissions testing that should have happened before the registration visit.',
        zh: '亞利桑那 MVD 不難，關鍵是文件。常見延誤來自居住證明不足、法律姓名不一致、車險仍綁在外州，以及應該先做的排放檢測沒有做。',
      },
      {
        en: 'ADOT says a person may be considered an Arizona resident if they work in Arizona, register to vote, place children in school without nonresident tuition, stay seven months or more in a calendar year, or meet other listed conditions. Once you are a resident and operate an out of state vehicle here, plan to register it in Arizona.',
        zh: 'ADOT 說明，如果你在亞利桑那工作、登記投票、讓孩子以居民身分入學、在同一曆年住滿七個月或符合其他條件，可能被視為亞利桑那居民。成為居民後，外州車在本州使用就要安排亞利桑那 registration。',
      },
    ],
    quickChecklist: [
      {
        en: 'Create or activate an AZ MVD Now account after your first MVD visit so future address, renewal, title, and registration tasks are easier.',
        zh: '第一次 MVD 辦理後，建立或啟用 AZ MVD Now 帳戶，之後地址、renewal、title 與 registration 會方便很多。',
      },
      {
        en: 'Bring proof of authorized presence, your current out of state driver license or ID, Social Security number, and any legal name change document.',
        zh: '帶上合法居留證明、目前外州駕照或 ID、Social Security number，以及任何法律改名文件。',
      },
      {
        en: 'For Arizona Travel ID, prepare one identity document, your Social Security number, and two Arizona residency documents from different sources.',
        zh: '若辦 Arizona Travel ID，準備一份身分文件、Social Security number，以及兩份來自不同來源的亞利桑那居住證明。',
      },
      {
        en: 'For each vehicle, bring the current title, current registration, lienholder information if any, Arizona insurance, and emissions test results if required.',
        zh: '每台車準備目前 title、registration、若有貸款則準備 lienholder 資訊、亞利桑那車險，以及需要時的排放檢測結果。',
      },
      {
        en: 'If the vehicle is in the Phoenix or Tucson emissions area, check emissions before the MVD appointment. ADOT says test results are sent electronically to MVD.',
        zh: '若車輛位於 Phoenix 或 Tucson 排放檢測區，先確認是否要檢測。ADOT 說檢測結果會電子傳給 MVD。',
      },
    ],
    detailSections: [
      {
        title: { en: 'Driver license and Arizona Travel ID', zh: '駕照與 Arizona Travel ID' },
        bullets: [
          {
            en: 'Decide whether you need a standard Arizona driver license or a Travel ID. Since May 7, 2025, domestic flights require a REAL ID compliant credential, a US passport, or another TSA approved document.',
            zh: '先決定要普通亞利桑那駕照還是 Travel ID。自 2025 年 5 月 7 日起，美國國內航班需要 REAL ID 合規證件、護照或 TSA 認可文件。',
          },
          {
            en: 'For Chinese names, make one legal name plan before visiting MVD. Use the same order and spelling across passport, immigration documents, Social Security, bank, lease, and insurance records.',
            zh: '中文姓名請在去 MVD 前先統一英文法律姓名。護照、移民文件、社安、銀行、租約與保險上的拼法與順序最好一致。',
          },
          {
            en: 'If you have a current out of state license, ADOT says a written or road test is normally not required, though MVD may require one in some cases.',
            zh: '若持有有效外州駕照，ADOT 說通常不需要筆試或路考，但 MVD 在特定情況仍可要求測驗。',
          },
          {
            en: 'Travel IDs are mailed. ADOT advises applying at least two weeks before travel so the card can arrive in time.',
            zh: 'Travel ID 會郵寄。ADOT 建議至少在旅行前兩週辦理，避免卡片來不及收到。',
          },
        ],
      },
      {
        title: { en: 'Vehicle title and registration', zh: '車輛 title 與 registration' },
        bullets: [
          {
            en: 'If you bought a vehicle in Arizona, state law requires you to apply for title within 15 days of purchase. Dealers usually handle this, private sales require more attention.',
            zh: '若在亞利桑那買車，州法要求購買後 15 天內申請 title。車行通常代辦，私人交易要自己更仔細處理。',
          },
          {
            en: 'If your out of state vehicle will be operated in Arizona, ADOT says it must be registered as soon as you become an Arizona resident.',
            zh: '若外州車要在亞利桑那使用，ADOT 說成為亞利桑那居民後應盡快 registration。',
          },
          {
            en: 'Arizona titles are often electronic. If you need a paper title later for a move or sale, check AZ MVD Now for title replacement options.',
            zh: '亞利桑那 title 常以電子方式保存。若日後搬家或賣車需要紙本 title，可到 AZ MVD Now 查看補發方式。',
          },
          {
            en: 'If the title has a lien, ask the lender early for written permission or documents needed to add or delete a name.',
            zh: '若車輛有貸款或 lien，提早向 lender 索取新增或移除姓名所需的書面同意或文件。',
          },
        ],
      },
      {
        title: { en: 'Insurance and emissions', zh: '車險與排放檢測' },
        bullets: [
          {
            en: 'Arizona requires liability insurance for every motor vehicle operated on Arizona roads. ADOT lists minimum limits of $25,000 bodily injury for one person, $50,000 for two or more people, and $15,000 property damage.',
            zh: '亞利桑那要求在本州道路行駛的車輛要有責任險。ADOT 列出的最低額度為單人身體傷害 25,000 美元、兩人以上 50,000 美元，以及財損 15,000 美元。',
          },
          {
            en: 'After registration, ADOT says you have 30 days to submit proof of Arizona insurance. Do not rely on a former state policy unless the insurer confirms Arizona coverage.',
            zh: 'registration 後，ADOT 說有 30 天可提交亞利桑那保險證明。不要假設外州保單可用，除非保險公司確認涵蓋亞利桑那。',
          },
          {
            en: 'Emissions testing is required in the Phoenix and Tucson metro areas for many vehicles, including some commuters into those areas. Vehicle age, fuel type, model year, and weight can change the requirement.',
            zh: 'Phoenix 與 Tucson 都會區許多車輛需要排放檢測，通勤進入這些區域的車也可能需要。車齡、燃料、年份與重量都會影響要求。',
          },
          {
            en: 'A check engine light can cause a failed emissions test. Fix warning lights before testing to avoid another visit.',
            zh: 'check engine 燈亮可能導致排放檢測不過。先處理警示燈，再去檢測。',
          },
        ],
      },
    ],
    practicalNotes: [
      {
        en: 'Authorized third party MVD offices can be convenient, but fees and services vary. Confirm the service you need before going.',
        zh: 'Authorized third party MVD 地點有時方便，但費用與服務不同。出發前先確認該地點能辦你的事項。',
      },
      {
        en: 'Do not use a friend or relative address unless you actually live there and can support the residency proof. MVD proof combinations matter.',
        zh: '除非你真的住在親友地址並能提供證明，不要隨便使用。MVD 對居住證明組合很在意。',
      },
    ],
    officialResources: [
      {
        label: { en: 'ADOT new to Arizona', zh: 'ADOT 新居民頁' },
        url: 'https://azdot.gov/mvd/services/driver-license-ID/new-to-arizona',
        source: 'Arizona Department of Transportation',
      },
      {
        label: { en: 'Arizona Travel ID requirements', zh: 'Arizona Travel ID 文件要求' },
        url: 'https://azdot.gov/mvd/services/driver-services/arizona-travel-id',
        source: 'Arizona Department of Transportation',
      },
      {
        label: { en: 'Vehicle title and registration', zh: '車輛 title 與 registration' },
        url: 'https://azdot.gov/motor-vehicles/new-az/applying-title-and-registration',
        source: 'Arizona Department of Transportation',
      },
      {
        label: { en: 'Arizona emissions testing', zh: '亞利桑那排放檢測' },
        url: 'https://azdot.gov/mvd/services/vehicle-services/vehicle-registration/emissions',
        source: 'Arizona Department of Transportation',
      },
      {
        label: { en: 'Arizona insurance requirements', zh: '亞利桑那車險要求' },
        url: 'https://azdot.gov/faq/what-mandatory-insurance',
        source: 'Arizona Department of Transportation',
      },
    ],
    relatedBusinessSlugs: ['desert-bridge-relocation'],
    relatedEventSlugs: [],
  },
  {
    slug: 'east-valley-school-guide',
    section: 'schools',
    title: { en: 'Arizona School Enrollment Guide for Chinese-Speaking Families', zh: '華語家庭亞利桑那入學指南' },
    excerpt: {
      en: 'How to handle district boundaries, open enrollment, charter schools, immunizations, ELL support, and weekend Chinese programs.',
      zh: '整理學區邊界、open enrollment、charter school、疫苗、ELL 支援與週末中文課該怎麼處理。',
    },
    heroImage:
      'https://images.unsplash.com/photo-1497486751825-1233686d5d80?auto=format&fit=crop&w=1200&q=80',
    readTime: '12 min',
    publishedAt: '2026-04-04T07:00:00.000Z',
    updatedAt: '2026-05-14T07:00:00.000Z',
    body: [
      {
        en: 'Arizona school choice is flexible, but that flexibility creates work for parents. A home may belong to one district school boundary, another nearby school may accept open enrollment, and a charter school may run its own lottery or waitlist.',
        zh: '亞利桑那選校彈性大，但家長要做的功課也更多。同一個住家地址有指定學區學校，附近其他公立學校可能開放 open enrollment，charter school 又可能有自己的抽籤或候補。',
      },
      {
        en: 'For Chinese-speaking families, the practical question is not only test scores. Ask how the school handles English learner screening, parent communication, bullying concerns, gifted placement, math acceleration, special education, aftercare, transportation, and absence policies for international travel.',
        zh: '華語家庭選校不只看分數。要問學校如何處理英語學習評估、家長溝通、霸凌疑慮、資優、數學加速、特殊教育、課後照顧、交通，以及回亞洲探親時的缺席規則。',
      },
    ],
    quickChecklist: [
      {
        en: 'Before signing a lease, use the district boundary tool and call the school office to confirm the address. Online maps can be outdated.',
        zh: '簽租約前使用學區邊界工具，並直接打給學校辦公室確認地址。網路地圖可能過期。',
      },
      {
        en: 'Prepare proof of age, parent or guardian ID, proof of residency, immunization records, transcripts, withdrawal records if available, IEP or 504 plans, and custody documents if applicable.',
        zh: '準備年齡證明、父母或監護人 ID、居住證明、疫苗紀錄、成績單、若有轉出紀錄、IEP 或 504，以及必要的監護文件。',
      },
      {
        en: 'Ask whether the school uses a Home Language Survey and AZELLA placement for English learner services.',
        zh: '詢問學校是否使用家庭語言調查表與 AZELLA 來判定英語學習服務。',
      },
      {
        en: 'If the child has vaccine records from outside the US, ask a pediatrician or school nurse to review them before the first day.',
        zh: '若孩子疫苗紀錄來自美國以外，開學前請小兒科或校護先看是否符合要求。',
      },
      {
        en: 'Compare aftercare, bus routes, lunch accounts, parent portal language access, and pickup traffic, not only rankings.',
        zh: '比較課後照顧、校車、午餐帳戶、家長系統語言支援與接送動線，不要只看排名。',
      },
    ],
    detailSections: [
      {
        title: { en: 'District, open enrollment, and charter school choices', zh: '學區、open enrollment 與 charter school' },
        bullets: [
          {
            en: 'Start with the assigned district school for your address, then compare open enrollment options. Arizona law allows open enrollment, but seats, deadlines, transportation, and priority rules vary by district.',
            zh: '先確認住址指定學校，再比較 open enrollment。亞利桑那法律允許 open enrollment，但名額、截止日、交通與優先規則依學區不同。',
          },
          {
            en: 'Use Arizona School Report Cards for official data, then visit the campus if possible. Report cards help with context, but they do not show pickup traffic, teacher communication, or whether your child feels safe.',
            zh: '用 Arizona School Report Cards 看官方資料，再盡量實地參觀。成績卡可提供背景，但看不到接送塞車、老師溝通與孩子是否有安全感。',
          },
          {
            en: 'Charter schools are public schools with separate enrollment procedures. Use the Arizona State Board for Charter Schools search to confirm address, grades served, and academic performance.',
            zh: 'Charter school 是公立學校，但入學程序獨立。可用 Arizona State Board for Charter Schools 搜尋地址、年級與學業表現。',
          },
          {
            en: 'In Chandler and Gilbert, some families target highly ranked campuses and underestimate how competitive open enrollment can be. Submit early and keep a backup plan.',
            zh: '在 Chandler 與 Gilbert，有些家庭只盯熱門學校，低估 open enrollment 競爭。請早送件，也保留備案。',
          },
        ],
      },
      {
        title: { en: 'Enrollment documents and immunizations', zh: '入學文件與疫苗' },
        bullets: [
          {
            en: 'Most schools ask for proof of age, residency, immunization, and parent or guardian identity. The exact accepted residency documents are local, so verify with the school or district.',
            zh: '多數學校會要求年齡、居住、疫苗與父母或監護人身分證明。可接受的居住證明因地而異，請向學校或學區確認。',
          },
          {
            en: 'ADHS school immunization materials explain that students must meet age and grade requirements, be in valid catch-up status, or have a valid exemption on file.',
            zh: 'ADHS 學校疫苗資料說明，學生需要符合年齡與年級疫苗要求、處於有效補打狀態，或有有效豁免表。',
          },
          {
            en: 'Translate vaccine records clearly. Include vaccine name, date, clinic, and country. If a record uses Chinese vaccine names, ask a clinic to map them to US names before enrollment week.',
            zh: '疫苗紀錄要翻譯清楚，包含疫苗名稱、日期、診所與國家。若紀錄使用中文疫苗名稱，開學週前請診所協助對應美國名稱。',
          },
          {
            en: 'For middle school and high school students, bring course descriptions and math placement evidence. This helps avoid repeating material or missing prerequisites.',
            zh: '國中與高中學生要帶課程說明與數學程度證明，避免重複學已會內容，或錯過先修要求。',
          },
        ],
      },
      {
        title: { en: 'Language support and Chinese education', zh: '語言支援與中文教育' },
        bullets: [
          {
            en: 'ADE says AZELLA is used for placement and annual reassessment for students identified as second language learners through the Home Language Survey.',
            zh: 'ADE 說明，透過家庭語言調查被識別為第二語言學習者的學生，會使用 AZELLA 進行安置與年度重新評估。',
          },
          {
            en: 'Ask the school how parent notices are translated. Some systems default to Spanish only, so Mandarin or Traditional Chinese support may require a request.',
            zh: '詢問學校家長通知如何翻譯。有些系統預設只有西班牙文，國語或繁體中文支援可能需要主動提出。',
          },
          {
            en: 'Weekend Chinese options include Chinese Linguistic School of Phoenix, AZ Hope Chinese School, Eastern Art Academy, Arizona Art Academy, and other programs. Visit classes before paying a full semester.',
            zh: '週末中文與文化課可比較 Chinese Linguistic School of Phoenix、AZ Hope Chinese School、新東方中文藝術學院、Arizona Art Academy 等。繳整學期前先試聽或參觀。',
          },
          {
            en: 'For younger children, balance heritage language with rest. A long Saturday commute after a full school week may hurt more than it helps.',
            zh: '年紀小的孩子要在中文維持與休息之間取平衡。整週上學後週六長途通勤，有時得不償失。',
          },
        ],
      },
    ],
    practicalNotes: [
      {
        en: 'Do not rent or buy based only on a real estate listing that names a school. Boundary changes and open enrollment rules can make that claim incomplete.',
        zh: '不要只根據房源廣告標的學校租房或買房。學區邊界變動與 open enrollment 規則可能讓這個說法不完整。',
      },
      {
        en: 'Do not wait until the first day of school to address missing immunization records. Missing records can delay attendance.',
        zh: '不要等到開學當天才處理疫苗紀錄不足。缺資料可能影響入學或出勤。',
      },
    ],
    officialResources: [
      {
        label: { en: 'Arizona School Report Cards', zh: '亞利桑那學校成績卡' },
        url: 'https://azreportcards.azed.gov',
        source: 'Arizona Department of Education',
      },
      {
        label: { en: 'ADE open enrollment complaint information', zh: 'ADE open enrollment 申訴資訊' },
        url: 'https://www.azed.gov/adeinfo/open-enrollment-complaint',
        source: 'Arizona Department of Education',
      },
      {
        label: { en: 'Arizona charter school search', zh: '亞利桑那 charter school 搜尋' },
        url: 'https://asbcs.az.gov/resources/school-search',
        source: 'Arizona State Board for Charter Schools',
      },
      {
        label: { en: 'ADHS school immunization requirements', zh: 'ADHS 學校疫苗要求' },
        url: 'https://www.azdhs.gov/phs/immunization/school-childcare/requirements.htm',
        source: 'Arizona Department of Health Services',
      },
      {
        label: { en: 'ADE English learner office', zh: 'ADE 英語學習者辦公室' },
        url: 'https://www.azed.gov/oelas',
        source: 'Arizona Department of Education',
      },
      {
        label: { en: 'AZELLA assessment', zh: 'AZELLA 英語評估' },
        url: 'https://www.azed.gov/assessment/azella',
        source: 'Arizona Department of Education',
      },
    ],
    relatedBusinessSlugs: ['elite-az-realty-team', 'arizona-chinese-language-academy'],
    relatedEventSlugs: ['family-resource-fair-gilbert'],
  },
  {
    slug: 'arizona-utilities-guide',
    section: 'utilities',
    title: { en: 'Arizona Utilities Setup: Electric, Water, Trash, Internet, and Summer Bills', zh: '亞利桑那公用事業設定：電、水、垃圾、網路與夏季帳單' },
    excerpt: {
      en: 'How to identify APS or SRP, start city water and trash, avoid move-in gaps, and prepare for summer AC costs.',
      zh: '確認 APS 或 SRP、開通城市水與垃圾服務、避免入住斷檔，並預估夏季冷氣費。',
    },
    heroImage:
      'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1200&q=80',
    readTime: '10 min',
    publishedAt: '2026-04-03T08:00:00.000Z',
    updatedAt: '2026-05-14T08:00:00.000Z',
    body: [
      {
        en: 'Arizona utility setup is local. Electricity may be APS or SRP. Water, sewer, trash, recycling, bulk pickup, and wastewater are usually handled by the city or town, but apartment communities and HOAs may bundle some services.',
        zh: '亞利桑那公用事業很在地。電力可能是 APS 或 SRP；水、污水、垃圾、回收、大型垃圾與 wastewater 通常由市鎮處理，但公寓與 HOA 可能會包部分服務。',
      },
      {
        en: 'The most expensive newcomer mistake is treating Arizona like a mild climate. Summer AC is essential, not optional. Ask about electric rate plans, insulation, shade, window exposure, AC age, filter size, and the highest bill from last summer.',
        zh: '新居民最容易犯的錯，是把亞利桑那當成氣候溫和的地方。夏季冷氣是必要支出，不是可有可無。請問清楚電價方案、隔熱、遮蔭、窗戶朝向、冷氣年份、濾網尺寸與去年夏天最高電費。',
      },
    ],
    quickChecklist: [
      {
        en: 'Ask landlord, seller, or property manager which electric provider serves the address. Set up electric service before move-in day.',
        zh: '向房東、賣方或物業管理確認地址由哪家電力公司服務，入住前先開通電力。',
      },
      {
        en: 'Open city water, sewer, trash, and recycling accounts. Chandler asks new utility customers to call at least one business day before service is needed.',
        zh: '開通城市水、污水、垃圾與回收帳戶。Chandler 要求新帳戶至少在需要服務前一個工作日致電辦理。',
      },
      {
        en: 'Schedule internet early. New build communities and outer suburbs can have fewer provider options than central neighborhoods.',
        zh: '網路要提早約。新建社區與外圍郊區的供應商選擇可能比市中心少。',
      },
      {
        en: 'Photograph the AC thermostat, filter, breaker panel, water shutoff, irrigation timer, pool equipment, and garage opener on day one.',
        zh: '入住第一天拍下冷氣溫控器、濾網、電箱、總水閥、灌溉定時器、泳池設備與車庫門機。',
      },
      {
        en: 'Ask whether the home has a water softener, reverse osmosis system, irrigation schedule, yard watering restrictions, or HOA maintenance rules.',
        zh: '詢問是否有軟水機、RO 淨水、灌溉時間、庭院澆水限制或 HOA 維護規則。',
      },
    ],
    detailSections: [
      {
        title: { en: 'Electricity: APS, SRP, and rate plans', zh: '電力：APS、SRP 與電價方案' },
        bullets: [
          {
            en: 'APS and SRP service territories are address specific. A city name alone does not tell you the provider. Chandler, Gilbert, Mesa, Scottsdale, Phoenix, and Peoria can vary by neighborhood.',
            zh: 'APS 與 SRP 的服務區要看地址，不能只看城市名。Chandler、Gilbert、Mesa、Scottsdale、Phoenix 與 Peoria 不同社區可能不同。',
          },
          {
            en: 'Compare basic, time of use, demand, and budget billing options after you understand your schedule. Families with children at home in late afternoon may not save money on the same plan as a single office worker.',
            zh: '了解家庭作息後再比較 basic、time of use、demand 與 budget billing。下午有孩子在家的家庭，不一定適合同一個上班族省錢方案。',
          },
          {
            en: 'If anyone uses electric medical equipment, review provider medical preparedness or assistance programs before summer.',
            zh: '若家中有人使用用電醫療設備，夏季前先了解電力公司的醫療準備或補助方案。',
          },
          {
            en: 'During move-in, run the AC long enough to confirm airflow in bedrooms. A home can feel fine in the living room but hot in west-facing upstairs rooms.',
            zh: '入住時讓冷氣運轉一段時間，確認臥室出風。客廳涼不代表西曬或二樓房間夠涼。',
          },
        ],
      },
      {
        title: { en: 'Water, trash, and city accounts', zh: '水、垃圾與城市帳戶' },
        bullets: [
          {
            en: 'Phoenix, Chandler, Gilbert, Tempe, Mesa, Scottsdale, and Peoria each have their own utility billing process. Start on the city page, not a generic search result.',
            zh: 'Phoenix、Chandler、Gilbert、Tempe、Mesa、Scottsdale 與 Peoria 都有自己的帳單流程。請從城市官方頁開始，不要只點一般搜尋結果。',
          },
          {
            en: 'Many cities require a service address, mailing address, activation date, phone number, ID, and deposit or activation fee. Requirements vary, so verify the exact city page.',
            zh: '許多城市會要求服務地址、郵寄地址、開通日期、電話、ID，以及押金或開通費。各城市不同，請看官方頁。',
          },
          {
            en: 'Learn trash day, recycling rules, bulk pickup, and hazardous waste rules early. Arizona garages fill up quickly after a move.',
            zh: '早點查垃圾日、回收規則、大型垃圾與有害廢棄物規定。亞利桑那搬家後車庫很容易堆滿。',
          },
          {
            en: 'For single-family homes, locate the main water shutoff before a leak. Summer irrigation leaks can waste a lot of water before anyone notices.',
            zh: '透天住宅要先找到總水閥。夏季灌溉漏水可能在發現前浪費大量水。',
          },
        ],
      },
      {
        title: { en: 'Internet, mobile, and home systems', zh: '網路、手機與居家系統' },
        bullets: [
          {
            en: 'Ask neighbors which providers actually perform well at that address. Fiber availability can stop at the edge of a subdivision.',
            zh: '問鄰居該地址哪家網路真的穩。光纖可能只到社區邊緣，隔幾條街就不同。',
          },
          {
            en: 'If adults work remotely, overlap internet installation with a mobile hotspot plan for the first week.',
            zh: '若大人遠端工作，第一週請讓網路安裝與手機熱點備案重疊。',
          },
          {
            en: 'Change garage, gate, alarm, thermostat, smart lock, and HOA portal access after move-in. Ask for all remotes and codes in writing.',
            zh: '入住後更改車庫門、社區門禁、警報、溫控器、智慧鎖與 HOA 系統權限。所有遙控器與密碼請書面確認。',
          },
        ],
      },
    ],
    practicalNotes: [
      {
        en: 'Do not assume the landlord pays water or trash. Read the lease line by line and ask how each account transfers at move-in and move-out.',
        zh: '不要假設房東負責水或垃圾。逐條看租約，問清楚每個帳戶入住與退租如何交接。',
      },
      {
        en: 'Do not set thermostats unrealistically low in July without understanding the bill. Comfort, health, insulation, and cost all matter.',
        zh: '七月不要在不了解電費的情況下把冷氣設很低。舒適、健康、隔熱與成本都要一起考慮。',
      },
    ],
    officialResources: [
      {
        label: { en: 'APS start, stop, and move service', zh: 'APS 開通、停止與搬移服務' },
        url: 'https://www.aps.com/en/Residential/Account/Start-Stop-and-Move-Service',
        source: 'Arizona Public Service',
      },
      {
        label: { en: 'SRP residential customer service', zh: 'SRP 住宅客服' },
        url: 'https://www.srpnet.com/customer-service/contact-us',
        source: 'Salt River Project',
      },
      {
        label: { en: 'SRP residential price plans', zh: 'SRP 住宅電價方案' },
        url: 'https://www.srpnet.com/price-plans/residential-electric/compare-plans',
        source: 'Salt River Project',
      },
      {
        label: { en: 'City of Phoenix Water Services', zh: 'Phoenix 水務服務' },
        url: 'https://www.phoenix.gov/waterservices/',
        source: 'City of Phoenix',
      },
      {
        label: { en: 'City of Chandler Utility Services', zh: 'Chandler 公用事業服務' },
        url: 'https://www.chandleraz.gov/residents/utility-services',
        source: 'City of Chandler',
      },
      {
        label: { en: 'Town of Gilbert Utilities', zh: 'Gilbert 公用事業' },
        url: 'https://www.gilbertaz.gov/departments/finance-mgmt-services/utilities',
        source: 'Town of Gilbert',
      },
    ],
    relatedBusinessSlugs: ['profix-home-services', 'desert-bridge-relocation'],
    relatedEventSlugs: [],
  },
  {
    slug: 'where-tsmc-families-look-first',
    section: 'housing',
    title: {
      en: 'Where Newcomer Families Look First: Peoria, North Phoenix, East Valley, and Central Phoenix',
      zh: '新移居家庭先比較哪裡：Peoria、北鳳凰城、東谷與市中心圈',
    },
    excerpt: {
      en: 'A practical comparison of commute pressure, school routines, Chinese community access, rent versus buy decisions, utilities, and HOA issues.',
      zh: '用通勤、學校節奏、華人生活圈、租買取捨、公用事業與 HOA 來比較落腳區。',
    },
    heroImage:
      'https://images.unsplash.com/photo-1472224371017-08207f84aaae?auto=format&fit=crop&w=1200&q=80',
    readTime: '14 min',
    publishedAt: '2026-04-12T09:00:00.000Z',
    updatedAt: '2026-05-14T09:00:00.000Z',
    body: [
      {
        en: 'Most relocation decisions in Greater Phoenix are tradeoffs between commute, school fit, budget, Chinese community access, airport access, and summer home costs. The best address is the one that makes the whole week workable.',
        zh: '大鳳凰城安家通常是在通勤、學校、預算、華人生活圈、機場與夏季住宅成本之間取捨。好的地址是能讓整週生活順起來的地址。',
      },
      {
        en: 'TSMC-linked workers often start with Peoria and North Phoenix because of commute. Families who rely on Chinese groceries, weekend schools, and East Valley parent networks often compare Chandler, Gilbert, Mesa, and Tempe. Scottsdale and central Phoenix may fit families who prioritize medical access, airport access, established neighborhoods, or shorter central commutes.',
        zh: '與 TSMC 相關的工作家庭常先看 Peoria 與北鳳凰城，因為通勤近。需要華人超市、週末中文課與東谷家長圈的家庭，常比較 Chandler、Gilbert、Mesa 與 Tempe。Scottsdale 與 Phoenix 中心區則可能適合重視醫療、機場、成熟社區或市中心通勤的家庭。',
      },
    ],
    quickChecklist: [
      {
        en: 'Drive the real commute during the hour you will travel. Do this twice if possible, once on Tuesday through Thursday and once near school pickup time.',
        zh: '在你真正會出門的時間試開通勤路線。可行的話試兩次，一次在週二到週四，一次接近學校接送時間。',
      },
      {
        en: 'Compare the lease or mortgage payment with summer electric, water, landscaping, pool, HOA, pest control, and commute costs.',
        zh: '比較租金或房貸時，把夏季電費、水費、園藝、泳池、HOA、除蟲與通勤成本都算進去。',
      },
      {
        en: 'Ask whether the home is in an HOA, then read rules for parking, rentals, exterior changes, landscaping, trash bins, and short term guests.',
        zh: '確認房子是否有 HOA，並閱讀停車、出租、外觀改動、庭院、垃圾桶與短住客人的規則。',
      },
      {
        en: 'Check school boundaries and open enrollment before signing. Nearby does not always mean assigned.',
        zh: '簽約前確認學區邊界與 open enrollment。離得近不代表一定是指定學校。',
      },
      {
        en: 'Map Chinese groceries, Costco, pediatrician, urgent care, weekend school, and airport route from the address.',
        zh: '從地址出發標出華人超市、Costco、小兒科、urgent care、週末中文課與機場路線。',
      },
    ],
    detailSections: [
      {
        title: { en: 'City and area tradeoffs', zh: '城市與區域取捨' },
        bullets: [
          {
            en: 'Peoria and North Phoenix can reduce commute stress for north side semiconductor and supplier jobs, but Chinese groceries and weekend Chinese programs may require longer drives than East Valley families expect.',
            zh: 'Peoria 與北鳳凰城可降低北邊半導體與供應鏈工作的通勤壓力，但華人超市與週末中文課可能比東谷家庭習慣的距離遠。',
          },
          {
            en: 'Chandler is a common first stop for Chinese-speaking families because it has East Valley schools, Chinese groceries nearby, restaurants, business services, and many bilingual networks.',
            zh: 'Chandler 是許多華語家庭第一個比較的城市，因為東谷學校、華人超市、餐廳、商家服務與雙語人脈較集中。',
          },
          {
            en: 'Gilbert often attracts families looking for newer homes and family routines. Check commute direction, HOA fees, and whether the specific school is assigned or open enrollment.',
            zh: 'Gilbert 常吸引想要新房與家庭生活節奏的家庭。請確認通勤方向、HOA 費，以及目標學校是指定還是 open enrollment。',
          },
          {
            en: 'Mesa has the Asian District and more varied price points, but school and neighborhood fit change street by street. It is worth touring in person.',
            zh: 'Mesa 有 Asian District，也有較多價位選擇，但學校與社區感受差異很大，建議實地看。',
          },
          {
            en: 'Tempe is useful for ASU, light rail, and airport access, but student area noise, older housing, and parking can matter.',
            zh: 'Tempe 對 ASU、light rail 與機場方便，但學生區噪音、老房與停車也要考慮。',
          },
          {
            en: 'Scottsdale can fit families prioritizing medical access, established neighborhoods, and resort area amenities, but rent and purchase costs are often higher.',
            zh: 'Scottsdale 適合重視醫療、成熟社區與生活設施的家庭，但租金與房價常較高。',
          },
        ],
      },
      {
        title: { en: 'Renting before buying', zh: '先租再買' },
        bullets: [
          {
            en: 'Renting for 6 to 12 months gives families time to test schools, commute, summer electric bills, monsoon drainage, airport routines, and whether they actually use nearby amenities.',
            zh: '先租 6 到 12 個月，可以測試學校、通勤、夏季電費、季風排水、機場動線，以及附近設施是否真的常用。',
          },
          {
            en: 'For rentals, confirm who pays water, trash, sewer, landscaping, pool service, pest control, HOA fines, and repair call fees.',
            zh: '租房時確認誰付水、垃圾、污水、園藝、泳池、除蟲、HOA 罰款與維修叫修費。',
          },
          {
            en: 'For buying, review the Arizona buyer advisory, HOA documents, insurance quotes, roof age, AC age, termite history, pool condition, and flood or drainage concerns.',
            zh: '買房時閱讀 Arizona buyer advisory，檢查 HOA 文件、保險估價、屋頂年份、冷氣年份、白蟻紀錄、泳池狀況與淹水或排水問題。',
          },
          {
            en: 'Ask for prior summer electric bills. A low purchase price can hide high monthly operating costs if insulation, AC, windows, or shade are weak.',
            zh: '請求查看過去夏季電費。若隔熱、冷氣、窗戶或遮蔭不足，低房價可能被高月支出抵消。',
          },
        ],
      },
      {
        title: { en: 'Chinese community and weekly life', zh: '華人生活圈與每週節奏' },
        bullets: [
          {
            en: 'A Chinese grocery within 10 minutes changes weekday dinner. A Chinese school 45 minutes away changes every Saturday. Map both before choosing.',
            zh: '10 分鐘內有華人超市會改變平日晚餐；45 分鐘外的中文學校會改變每個週六。選區前把兩者都標出來。',
          },
          {
            en: 'If grandparents visit often, compare airport drive time, guest parking, bedroom layout, bathroom access, and nearby Mandarin-speaking doctors.',
            zh: '若長輩常來，請比較機場車程、訪客停車、臥室格局、浴室便利性與附近華語醫師。',
          },
          {
            en: 'WeChat groups can help with discovery, but confirm school, lease, contractor, and immigration claims through official or licensed sources.',
            zh: '微信群有助於找資訊，但學校、租約、承包商與移民相關說法要回到官方或有執照來源確認。',
          },
        ],
      },
    ],
    practicalNotes: [
      {
        en: 'Do not compare cities by average commute only. One freeway crash, school pickup queue, or summer storm can change the day.',
        zh: '不要只用平均通勤比較城市。一次 freeway 事故、接送排隊或夏季暴雨就能改變整天。',
      },
      {
        en: 'Do not assume newer homes have lower bills. Size, windows, shade, pool pumps, thermostats, and rate plans matter.',
        zh: '不要假設新房電費一定低。坪數、窗戶、遮蔭、泳池馬達、溫控設定與電價方案都會影響。',
      },
    ],
    officialResources: [
      {
        label: { en: 'Arizona Residential Landlord and Tenant Act', zh: '亞利桑那房東房客法' },
        url: 'https://housing.az.gov/general-public/landlord-and-tenant-act',
        source: 'Arizona Department of Housing',
      },
      {
        label: { en: 'Arizona buyer advisory', zh: '亞利桑那買方提醒' },
        url: 'https://www.aaronline.com/manage-risk/buyer-advisory-3/',
        source: 'Arizona Association of REALTORS',
      },
      {
        label: { en: 'Arizona HOA consumer information', zh: '亞利桑那 HOA 消費者資訊' },
        url: 'https://azre.gov/consumers/homeowners-associations',
        source: 'Arizona Department of Real Estate',
      },
      {
        label: { en: 'Arizona School Report Cards', zh: '亞利桑那學校成績卡' },
        url: 'https://azreportcards.azed.gov',
        source: 'Arizona Department of Education',
      },
      {
        label: { en: 'Arizona rental scam warning', zh: '亞利桑那租屋詐騙提醒' },
        url: 'https://www.azag.gov/press-release/attorney-general-mayes-warns-consumers-about-rental-scams',
        source: 'Arizona Attorney General',
      },
    ],
    relatedBusinessSlugs: ['elite-az-realty-team', 'desert-bridge-relocation', 'arizona-chinese-language-academy'],
    relatedEventSlugs: ['family-resource-fair-gilbert'],
  },
  {
    slug: 'arizona-healthcare-setup',
    section: 'healthcare',
    title: { en: 'Healthcare Setup in Arizona for Newcomer Families', zh: '新移居家庭的亞利桑那醫療設定' },
    excerpt: {
      en: 'How to handle insurance, AHCCCS or KidsCare, Mandarin-speaking providers, urgent care, pharmacies, immunizations, and medical translation.',
      zh: '整理保險、AHCCCS 或 KidsCare、華語醫療、urgent care、藥局、疫苗與醫療翻譯。',
    },
    heroImage:
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
    readTime: '11 min',
    publishedAt: '2026-05-14T07:20:00.000Z',
    updatedAt: '2026-05-14T07:20:00.000Z',
    body: [
      {
        en: 'Healthcare should be set up before the first fever, dental pain, allergy flare, or sports physical. Arizona has large hospital systems, many urgent care clinics, and major pharmacy chains, but insurance networks decide what is affordable.',
        zh: '醫療安排應該在第一次發燒、牙痛、過敏或運動體檢前完成。亞利桑那有大型醫療系統、許多 urgent care 與連鎖藥局，但真正影響費用的是保險 network。',
      },
      {
        en: 'A move can trigger health insurance decisions. Employer coverage, HealthCare.gov marketplace coverage, AHCCCS, KidsCare, Medicare, and school immunization requirements all have different rules. Use official portals for eligibility, dates, and documents.',
        zh: '搬家會觸發醫療保險決策。雇主保險、HealthCare.gov marketplace、AHCCCS、KidsCare、Medicare 與學校疫苗要求規則不同。資格、日期與文件請用官方入口確認。',
      },
    ],
    quickChecklist: [
      {
        en: 'Confirm whether your current insurance works in Arizona. If not, ask about a special enrollment period, employer coverage start date, COBRA, marketplace coverage, or AHCCCS eligibility.',
        zh: '確認現有保險是否在亞利桑那可用。若不可用，詢問 special enrollment period、雇主保險開始日、COBRA、marketplace 或 AHCCCS 資格。',
      },
      {
        en: 'Choose a primary care doctor, pediatrician, dentist, eye doctor, urgent care, ER, and pharmacy inside your network.',
        zh: '在保險 network 內選家庭醫師、小兒科、牙醫、眼科、urgent care、ER 與藥局。',
      },
      {
        en: 'Transfer prescriptions before running out. Bring medicine names, dosage, diagnosis, and English labels when possible.',
        zh: '處方藥快用完前先轉藥局。盡量準備藥名、劑量、診斷與英文標籤。',
      },
      {
        en: 'Ask clinics about interpreter services before the appointment, especially for elderly parents or complex diagnoses.',
        zh: '看診前先問診所是否提供口譯，尤其長輩或複雜病情更需要。',
      },
      {
        en: 'Have a school nurse or pediatrician review overseas vaccine records before enrollment deadlines.',
        zh: '入學期限前請校護或小兒科查看海外疫苗紀錄。',
      },
    ],
    detailSections: [
      {
        title: { en: 'Insurance paths', zh: '保險路徑' },
        bullets: [
          {
            en: 'If coverage comes through an employer, ask for the start date, network name, ID cards, dependent enrollment deadline, and whether your preferred doctors are in network.',
            zh: '若透過雇主保險，詢問生效日、network 名稱、保險卡、家屬加入截止日，以及偏好醫師是否 in network。',
          },
          {
            en: 'HealthCare.gov says certain life events, including moving, may allow a Special Enrollment Period. Use the official screener because timing and prior coverage rules matter.',
            zh: 'HealthCare.gov 說搬家等生活事件可能符合 Special Enrollment Period。請用官方篩選工具確認，因為時間與原有保險規則很重要。',
          },
          {
            en: 'AHCCCS is Arizona Medicaid. Health-e-Arizona Plus handles online applications for AHCCCS, KidsCare, Nutrition Assistance, and Cash Assistance.',
            zh: 'AHCCCS 是亞利桑那 Medicaid。Health-e-Arizona Plus 可線上申請 AHCCCS、KidsCare、營養補助與現金補助。',
          },
          {
            en: 'KidsCare may cover eligible children under 19 who are not eligible for other AHCCCS coverage. Check income and immigration rules on the AHCCCS page.',
            zh: 'KidsCare 可能涵蓋未滿 19 歲、但不符合其他 AHCCCS 的合資格兒童。收入與移民資格請查 AHCCCS 官方頁。',
          },
        ],
      },
      {
        title: { en: 'Finding Mandarin-speaking care', zh: '尋找華語醫療' },
        bullets: [
          {
            en: 'Start with your insurance provider directory, then call the clinic. Directory language fields can be outdated, and a doctor may speak Mandarin while front desk staff does not.',
            zh: '先用保險公司 provider directory，再打電話確認。語言欄位可能過期，有時醫師會國語但前台不會。',
          },
          {
            en: 'For older adults, ask whether the clinic offers professional medical interpretation. Family members can help with comfort, but complex care needs accurate medical language.',
            zh: '長輩看診時，詢問是否有專業醫療口譯。家人可陪伴，但複雜醫療需要準確術語。',
          },
          {
            en: 'For pediatrics, ask about school forms, vaccine catch-up, sports physicals, ADHD or autism referrals, allergy plans, and after-hours nurse lines.',
            zh: '小兒科要問學校表格、補打疫苗、運動體檢、ADHD 或自閉症轉介、過敏計畫與下班後 nurse line。',
          },
          {
            en: 'For dentistry, verify whether pediatric dental, orthodontics, wisdom teeth, and emergency visits are covered separately from medical insurance.',
            zh: '牙科要確認兒童牙科、矯正、智齒與急診牙科是否由不同保險涵蓋。',
          },
        ],
      },
      {
        title: { en: 'Urgent care, ER, pharmacies, and records', zh: 'Urgent care、ER、藥局與病歷' },
        bullets: [
          {
            en: 'Use urgent care for many same-day issues, but use the ER for severe symptoms, breathing trouble, stroke signs, chest pain, serious injuries, or life-threatening conditions.',
            zh: '許多當日問題可先用 urgent care，但嚴重症狀、呼吸困難、中風徵兆、胸痛、重大外傷或危及生命狀況要去 ER。',
          },
          {
            en: 'Save your insurance nurse line and telehealth options. They can help decide whether a condition can wait, needs urgent care, or needs an ER.',
            zh: '存好保險 nurse line 與 telehealth 選項，可協助判斷是否能等、要 urgent care 或要 ER。',
          },
          {
            en: 'Keep a medication list in English and Chinese for each family member, including allergies and past surgeries.',
            zh: '為每位家人準備中英文用藥清單，包括過敏與手術史。',
          },
          {
            en: 'Ask how to access records through the patient portal. Download vaccine records, visit summaries, and lab results before changing doctors.',
            zh: '詢問如何使用 patient portal。換醫師前先下載疫苗、就診摘要與檢驗結果。',
          },
        ],
      },
    ],
    practicalNotes: [
      {
        en: 'Do not choose a doctor only because they speak Mandarin if they are out of network. Out of network bills can be expensive.',
        zh: '不要只因醫師會說國語就選，如果 out of network，帳單可能很高。',
      },
      {
        en: 'Do not rely on informal translation for consent, diagnosis, surgery, or medication changes. Ask for professional interpretation.',
        zh: '同意書、診斷、手術或藥物調整不要只靠非正式翻譯。請要求專業口譯。',
      },
    ],
    officialResources: [
      {
        label: { en: 'HealthCare.gov Special Enrollment screener', zh: 'HealthCare.gov 特殊投保期篩選' },
        url: 'https://www.healthcare.gov/have-coverage/',
        source: 'HealthCare.gov',
      },
      {
        label: { en: 'AHCCCS application information', zh: 'AHCCCS 申請資訊' },
        url: 'https://www.azahcccs.gov/Members/GetCovered/apply.html',
        source: 'Arizona Health Care Cost Containment System',
      },
      {
        label: { en: 'Health-e-Arizona Plus', zh: 'Health-e-Arizona Plus' },
        url: 'https://www.healthearizonaplus.gov/',
        source: 'State of Arizona',
      },
      {
        label: { en: 'Arizona DES medical assistance', zh: '亞利桑那 DES 醫療補助' },
        url: 'https://des.az.gov/services/basic-needs/medical-assistance/how-to-apply',
        source: 'Arizona Department of Economic Security',
      },
      {
        label: { en: 'ADHS immunization program', zh: 'ADHS 疫苗資訊' },
        url: 'https://www.azdhs.gov/phs/immunization/',
        source: 'Arizona Department of Health Services',
      },
    ],
    relatedBusinessSlugs: ['desert-spring-family-medicine'],
    relatedEventSlugs: [],
  },
  {
    slug: 'phoenix-asia-flight-playbook',
    section: 'transportation',
    title: {
      en: 'Phoenix Transportation Guide: Cars, Transit, Airport, Monsoon, and Asia Trips',
      zh: '鳳凰城交通指南：開車、公車輕軌、機場、季風與亞洲航班',
    },
    excerpt: {
      en: 'How newcomers should plan daily driving, Valley Metro limits, Sky Harbor routines, dust storm safety, and return trips to Asia.',
      zh: '整理新居民如何安排日常開車、Valley Metro 限制、Sky Harbor 動線、沙塵暴安全與亞洲返鄉行程。',
    },
    heroImage:
      'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80',
    readTime: '11 min',
    publishedAt: '2026-04-13T07:30:00.000Z',
    updatedAt: '2026-05-14T07:30:00.000Z',
    body: [
      {
        en: 'Most Greater Phoenix households need a car. Valley Metro bus and light rail are useful in specific corridors, especially parts of Phoenix, Tempe, and Mesa, but many school, grocery, medical, and job routines still require driving.',
        zh: '大鳳凰城多數家庭需要車。Valley Metro 公車與輕軌在特定走廊有用，尤其 Phoenix、Tempe、Mesa 部分地區，但學校、買菜、醫療與工作日常很多仍要開車。',
      },
      {
        en: 'Transportation planning here is also weather planning. Summer heat, monsoon rain, dust storms, tire pressure, battery health, and shaded parking affect daily life more than many newcomers expect.',
        zh: '在這裡規劃交通，也是在規劃天氣。夏季高溫、季風暴雨、沙塵暴、胎壓、電瓶與遮蔭停車，對日常影響比很多新居民想像中大。',
      },
    ],
    quickChecklist: [
      {
        en: 'Keep water, sun protection, snacks, phone battery, flashlight, and medication in every car.',
        zh: '每台車都放水、防曬、零食、行動電源、手電筒與藥物。',
      },
      {
        en: 'Check tires and car battery before summer. Arizona heat is hard on both.',
        zh: '夏季前檢查輪胎與電瓶。亞利桑那高溫很傷這兩項。',
      },
      {
        en: 'Use Valley Metro for routes that match light rail or frequent bus service. Test it before relying on it for school or work.',
        zh: '若路線剛好符合 light rail 或高頻公車，可使用 Valley Metro；但上學或上班前先試搭。',
      },
      {
        en: 'Save Sky Harbor terminal, parking, cell phone lot, and PHX Sky Train information before picking up visiting relatives.',
        zh: '接長輩或親友前先存好 Sky Harbor terminal、停車、cell phone lot 與 PHX Sky Train 資訊。',
      },
      {
        en: 'For Asia trips, compare total travel stress, not only ticket price. Overnight connection, baggage rules, and return arrival time matter.',
        zh: '規劃亞洲航班時，比較總體壓力，不只票價。過夜轉機、行李規則與返程抵達時間都重要。',
      },
    ],
    detailSections: [
      {
        title: { en: 'Daily driving and commute corridors', zh: '日常開車與通勤走廊' },
        bullets: [
          {
            en: 'The Loop 101, Loop 202, I-10, I-17, US 60, and SR 51 shape many commutes. Test the exact direction at the exact time because reverse commute assumptions can be wrong.',
            zh: 'Loop 101、Loop 202、I-10、I-17、US 60 與 SR 51 影響許多通勤。請用實際方向與時間測試，反向通勤不一定輕鬆。',
          },
          {
            en: 'School pickup can be the real bottleneck. A 20 minute office commute can become a 55 minute routine after adding pickup lines and aftercare closing time.',
            zh: '學校接送常是真正瓶頸。20 分鐘上班通勤，加上接送排隊與課後班關門時間，可能變成 55 分鐘生活流程。',
          },
          {
            en: 'In summer, shaded parking matters. Car seats, steering wheels, groceries, medicine, and electronics heat up quickly.',
            zh: '夏季遮蔭停車很重要。汽車座椅、方向盤、食物、藥品與電子產品都會快速升溫。',
          },
        ],
      },
      {
        title: { en: 'Transit and airport use', zh: '大眾交通與機場' },
        bullets: [
          {
            en: 'Valley Metro works best when both ends of the trip are near reliable bus, light rail, or streetcar service. It is less practical for many suburb to suburb trips.',
            zh: 'Valley Metro 最適合起點與終點都靠近可靠公車、輕軌或 streetcar 的路線。郊區到郊區通常較不方便。',
          },
          {
            en: 'Light rail can be useful for ASU Tempe, downtown Phoenix, downtown Mesa, airport connections through the PHX Sky Train, and some events where parking is difficult.',
            zh: 'Light rail 對 ASU Tempe、市中心 Phoenix、市中心 Mesa、透過 PHX Sky Train 轉機場，以及停車困難的活動有用。',
          },
          {
            en: 'Sky Harbor has Terminal 3 and Terminal 4. Check airline terminal and parking before leaving because wrong terminal assumptions waste time.',
            zh: 'Sky Harbor 有 Terminal 3 與 Terminal 4。出門前確認航空公司 terminal 與停車，不要憑印象。',
          },
          {
            en: 'For visiting parents from Asia, write pickup instructions in Chinese with terminal, door number, phone plan, Wi-Fi backup, and what to do if baggage is delayed.',
            zh: '接亞洲來的父母或長輩時，請用中文寫好 terminal、門號、電話方案、Wi-Fi 備案，以及行李延誤怎麼辦。',
          },
        ],
      },
      {
        title: { en: 'Monsoon and heat driving', zh: '季風與高溫開車' },
        bullets: [
          {
            en: 'ADOT says the safest dust storm choice is not to drive into it. If you are caught, pull completely off the paved road when safe, turn off lights, set the brake, take your foot off the brake, keep seatbelts on, and wait.',
            zh: 'ADOT 提醒，遇到沙塵暴最安全是不要開進去。若已被捲入，安全時完全離開鋪面，關閉所有車燈，拉手煞車，腳離開煞車，繫好安全帶等待。',
          },
          {
            en: 'Monsoon rain can create flooded washes and road closures. Do not drive around road closed signs or across flooded washes.',
            zh: '季風暴雨可能造成 wash 淹水與道路封閉。不要繞過封路標誌，也不要開過淹水 wash。',
          },
          {
            en: 'Check AZ511 before longer summer drives, especially I-10 between Phoenix and Tucson, northern Arizona trips, or monsoon afternoons.',
            zh: '夏季長途前查 AZ511，尤其 Phoenix 到 Tucson 的 I-10、北亞利桑那旅行或季風午後。',
          },
        ],
      },
    ],
    practicalNotes: [
      {
        en: 'Do not leave children, elders, pets, electronics, medicine, or groceries in a parked car. Interior heat rises fast.',
        zh: '不要把孩子、長輩、寵物、電子產品、藥物或食物留在停放車內。車內溫度上升很快。',
      },
      {
        en: 'Do not assume a cheap flight is better if it adds a risky connection for elderly parents or young children.',
        zh: '不要只因票價便宜就選轉機壓力大的航班，長輩與幼兒尤其要考慮體力。',
      },
    ],
    officialResources: [
      {
        label: { en: 'Valley Metro maps and schedules', zh: 'Valley Metro 路線與時刻表' },
        url: 'https://www.valleymetro.org/maps-schedules',
        source: 'Valley Metro',
      },
      {
        label: { en: 'Phoenix Sky Harbor official site', zh: '鳳凰城 Sky Harbor 官網' },
        url: 'https://www.skyharbor.com/',
        source: 'Phoenix Sky Harbor',
      },
      {
        label: { en: 'ADOT Pull Aside, Stay Alive', zh: 'ADOT 沙塵暴安全' },
        url: 'https://azdot.gov/news/when-dust-storms-hit-pull-aside-stay-alive',
        source: 'Arizona Department of Transportation',
      },
      {
        label: { en: 'AZ511 traveler information', zh: 'AZ511 路況資訊' },
        url: 'https://www.az511.gov/',
        source: 'Arizona Department of Transportation',
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
  {
    slug: 'chinese-community-settling-guide',
    section: 'community',
    title: { en: 'Chinese Community Life in Greater Phoenix: Groceries, Schools, Groups, and Weekend Routines', zh: '大鳳凰城華人生活：超市、中文學校、社群與週末節奏' },
    excerpt: {
      en: 'A practical guide to finding Chinese groceries, weekend language programs, restaurants, temples, churches, parent groups, and scam-aware community help.',
      zh: '實用整理華人超市、週末中文課、餐廳、寺廟教會、家長群與防詐社群求助方式。',
    },
    heroImage:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
    readTime: '9 min',
    publishedAt: '2026-05-14T07:40:00.000Z',
    updatedAt: '2026-05-14T07:40:00.000Z',
    body: [
      {
        en: 'Chinese community life in Arizona is decentralized. There is no single Chinatown that solves everything. Families usually build a routine across Chandler, Mesa, Tempe, Phoenix, Scottsdale, Gilbert, Peoria, and online groups.',
        zh: '亞利桑那華人生活不是集中在單一唐人街。多數家庭會在 Chandler、Mesa、Tempe、Phoenix、Scottsdale、Gilbert、Peoria 與線上社群之間建立自己的日常。',
      },
      {
        en: 'The useful newcomer move is to map weekly needs: groceries, school, doctor, commute, weekend Chinese class, religious or cultural community, and airport trips. Community feels closer when the routine is realistic.',
        zh: '新居民最該做的是把每週需求畫出來：買菜、學校、醫師、通勤、週末中文課、宗教或文化社群、機場。路線實際可行，社群才會變近。',
      },
    ],
    quickChecklist: [
      {
        en: 'Visit at least two Chinese or Asian grocery clusters before choosing a long-term neighborhood.',
        zh: '選長住地前，至少實際逛兩個華人或亞洲超市生活圈。',
      },
      {
        en: 'Try one weekend Chinese class or culture program before paying for the semester.',
        zh: '繳一整學期前，先試上一個週末中文或文化課。',
      },
      {
        en: 'Join WeChat or parent groups slowly. Verify advice about housing, schools, contractors, immigration, tax, and investments outside the group.',
        zh: '加入微信群或家長群要慢慢來。住房、學校、承包商、移民、稅務與投資建議要在群外核實。',
      },
      {
        en: 'Save a bilingual doctor, dentist, realtor, insurance agent, tax preparer, and repair contact before urgent need.',
        zh: '在急用前先存好雙語醫師、牙醫、房仲、保險、報稅與維修聯絡人。',
      },
      {
        en: 'Track Lunar New Year, Mid-Autumn, school performances, church events, temple events, and city cultural events through official organizer pages.',
        zh: '農曆新年、中秋、學校演出、教會活動、寺廟活動與城市文化活動，請追蹤主辦方官方頁。',
      },
    ],
    detailSections: [
      {
        title: { en: 'Groceries and daily shopping', zh: '超市與日常採買' },
        bullets: [
          {
            en: 'Chandler has major Chinese grocery access, including 99 Ranch Market and nearby Asian restaurants and services. It is one reason many East Valley families start there.',
            zh: 'Chandler 有大型華人超市與周邊亞洲餐飲服務，包括 99 Ranch Market，這也是許多東谷家庭先看 Chandler 的原因。',
          },
          {
            en: 'Mesa has the Asian District and destinations such as Mekong Plaza and H Mart. It can be a strong food and shopping anchor even for families who live in Gilbert or Tempe.',
            zh: 'Mesa 有 Asian District，以及 Mekong Plaza、H Mart 等據點。即使住 Gilbert 或 Tempe，也常把 Mesa 當成採買中心。',
          },
          {
            en: 'Lee Lee has locations in Chandler, Peoria, and Tucson. Peoria access matters for north and west side families who do not want every grocery run to cross the Valley.',
            zh: 'Lee Lee 在 Chandler、Peoria 與 Tucson 有據點。對北邊與西邊家庭來說，Peoria 據點能減少跨城採買。',
          },
          {
            en: 'For new arrivals from Asia, use the first grocery trips to learn substitute ingredients, store return policies, frozen food quality, rice brands, and pharmacy proximity.',
            zh: '剛從亞洲來時，前幾次買菜順便了解替代食材、退貨政策、冷凍食品品質、米品牌與附近藥局。',
          },
        ],
      },
      {
        title: { en: 'Weekend Chinese schools and culture programs', zh: '週末中文學校與文化課' },
        bullets: [
          {
            en: 'Chinese Linguistic School of Phoenix, AZ Hope Chinese School, Eastern Art Academy, Arizona Art Academy, and other programs differ by language style, age range, location, homework, performance expectations, and parent community.',
            zh: 'Chinese Linguistic School of Phoenix、AZ Hope Chinese School、新東方中文藝術學院、Arizona Art Academy 等，在語言風格、年齡、地點、作業、演出要求與家長社群上都不同。',
          },
          {
            en: 'Ask whether the program teaches simplified or traditional characters, Mandarin pronunciation, AP Chinese preparation, culture classes, dance, music, or adult classes.',
            zh: '詢問課程使用簡體或繁體、國語發音、AP Chinese 準備、文化課、舞蹈、音樂或成人班。',
          },
          {
            en: 'For bilingual children, choose a program that matches the family goal. Heritage maintenance, reading and writing, conversational confidence, AP credit, and cultural belonging are different goals.',
            zh: '雙語孩子要按家庭目標選課。維持 heritage language、讀寫、口說自信、AP 學分與文化歸屬感是不同目標。',
          },
        ],
      },
      {
        title: { en: 'Community groups and safety', zh: '社群與安全' },
        bullets: [
          {
            en: 'WeChat groups are useful for fast local knowledge, but they are not a substitute for licensed advice. Use them to find leads, then verify independently.',
            zh: '微信群對快速找在地資訊有用，但不能取代有執照的專業意見。把群當線索來源，再自行核實。',
          },
          {
            en: 'Watch for rental deposits, fake utility calls, immigration shortcuts, investment pitches, and contractors asking for large upfront cash payments.',
            zh: '留意租屋押金、假冒公用事業電話、移民捷徑、投資話術，以及要求大量現金預付的承包商。',
          },
          {
            en: 'Religious and cultural communities can help with belonging. Compare Mandarin, Cantonese, Taiwanese, English, youth, and elder support before committing to a weekly drive.',
            zh: '宗教與文化社群可幫助融入。固定每週通勤前，先比較國語、粵語、台語、英文、青少年與長輩支援。',
          },
        ],
      },
    ],
    practicalNotes: [
      {
        en: 'Do not assume the largest online group is the safest group. Look for moderation, real names, clear rules, and members who point people back to official sources.',
        zh: '不要假設最大線上群就是最安全的群。請看是否有管理、真實姓名、明確規則，以及是否會提醒大家查官方來源。',
      },
      {
        en: 'Do not overschedule children in the first semester. New school, heat, English, and weekend Chinese work can add up quickly.',
        zh: '第一學期不要把孩子排太滿。新學校、高溫、英文與週末中文課很快會累積壓力。',
      },
    ],
    officialResources: [
      {
        label: { en: 'Chinese Linguistic School of Phoenix', zh: '鳳凰城中文學校' },
        url: 'https://clsphoenix.org/',
        source: 'Chinese Linguistic School of Phoenix',
      },
      {
        label: { en: 'AZ Hope Chinese School', zh: '亞利桑那希望中文學校' },
        url: 'https://www.azhopechineseschool.org/',
        source: 'AZ Hope Chinese School',
      },
      {
        label: { en: 'Arizona Art Academy', zh: 'Arizona Art Academy' },
        url: 'https://www.arizonaartacademy.com/',
        source: 'Arizona Art Academy',
      },
      {
        label: { en: 'Lee Lee International Supermarkets', zh: 'Lee Lee 國際超市' },
        url: 'https://www.leeleesupermarket.com/',
        source: 'Lee Lee International Supermarkets',
      },
      {
        label: { en: 'Mekong Plaza', zh: 'Mekong Plaza' },
        url: 'https://www.mekongplaza.com/',
        source: 'Mekong Plaza',
      },
      {
        label: { en: 'Arizona Attorney General consumer resources', zh: '亞利桑那消費者防詐資源' },
        url: 'https://www.azag.gov/consumer',
        source: 'Arizona Attorney General',
      },
    ],
    relatedBusinessSlugs: ['arizona-chinese-language-academy', 'lotus-travel-center', 'desert-bridge-relocation'],
    relatedEventSlugs: ['family-resource-fair-gilbert', 'newcomer-coffee-east-valley'],
  },
  {
    slug: 'az-safety-legal-resource-directory',
    section: 'safety',
    title: { en: 'Arizona Safety, Legal, Tax, and Official Resource Directory for Newcomers', zh: '亞利桑那新居民安全、法律、稅務與官方資源目錄' },
    excerpt: {
      en: 'The official links and plain-language notes newcomers need for heat, monsoon, tenant rights, scams, voter registration, taxes, emergency help, and local services.',
      zh: '整理新居民需要的官方連結與白話說明：高溫、季風、房客權益、詐騙、選民登記、稅務、緊急求助與在地服務。',
    },
    heroImage:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    readTime: '12 min',
    publishedAt: '2026-05-14T07:55:00.000Z',
    updatedAt: '2026-05-14T07:55:00.000Z',
    body: [
      {
        en: 'This directory is for tasks where official sources matter. Laws, deadlines, fees, eligibility, forms, and emergency resources change. Use ChineseArizona to understand what the link is for, then verify the current rule on the linked agency page.',
        zh: '這份目錄用於必須看官方來源的事項。法律、期限、費用、資格、表格與緊急資源會變。ChineseArizona 幫你理解每個連結用途，最新規則請回到官方頁確認。',
      },
      {
        en: 'For Chinese-speaking families, the biggest safety issues are often practical: heat, driving in dust, rental scams, door-to-door solar or utility claims, contractor deposits, medical translation, and knowing when to call 911, 988, 211, a city service line, or a lawyer.',
        zh: '對華語家庭來說，最常見的安全問題很實際：高溫、沙塵暴開車、租屋詐騙、上門太陽能或公用事業話術、承包商押金、醫療翻譯，以及知道什麼時候打 911、988、211、市政服務或找律師。',
      },
    ],
    quickChecklist: [
      {
        en: 'Call 911 for immediate police, fire, or medical emergencies. Call or text 988 for suicide, mental health, or substance crisis support.',
        zh: '遇到立即警消醫療緊急狀況打 911。自殺、心理健康或藥物危機可撥打或簡訊 988。',
      },
      {
        en: 'Use 211 Arizona for heat relief, shelter, food, utility assistance, and local social service referrals.',
        zh: '使用 211 Arizona 查高溫避暑、庇護、食物、公用事業補助與社福轉介。',
      },
      {
        en: 'Use ADHS and Heat.AZ.gov for heat warnings, cooling centers, hydration stations, and summer planning.',
        zh: '用 ADHS 與 Heat.AZ.gov 查高溫警示、cooling centers、飲水站與夏季準備。',
      },
      {
        en: 'Use ADOT monsoon and AZ511 resources before and during summer storm travel.',
        zh: '夏季風暴前後使用 ADOT monsoon 與 AZ511 路況資訊。',
      },
      {
        en: 'Use Arizona Department of Housing for the Residential Landlord and Tenant Act, and consult legal aid or an attorney for disputes.',
        zh: '用 Arizona Department of Housing 查 Residential Landlord and Tenant Act，房東房客爭議請諮詢法律援助或律師。',
      },
      {
        en: 'Use Arizona Department of Revenue for part-year resident tax basics, especially if you moved mid-year from California or another state.',
        zh: '用 Arizona Department of Revenue 查 part-year resident 稅務，尤其從加州或其他州年中搬來時。',
      },
    ],
    detailSections: [
      {
        title: { en: 'Heat and weather safety', zh: '高溫與天氣安全' },
        bullets: [
          {
            en: 'ADHS describes Arizona as one of the hottest places on earth from May to September. Plan outdoor work, school pickups, sports, hiking, and elder errands around heat risk.',
            zh: 'ADHS 說亞利桑那 5 到 9 月是地球上最炎熱的地區之一。戶外工作、接送、運動、健行與長輩外出都要依高溫風險安排。',
          },
          {
            en: 'Use heat relief maps for cooling centers and hydration stations, especially for visiting relatives, elders, outdoor workers, and anyone whose AC fails.',
            zh: '查看 heat relief 地圖找 cooling centers 與飲水站，尤其長輩來訪、戶外工作者或家中冷氣故障時。',
          },
          {
            en: 'During monsoon season, dust can reduce visibility quickly. ADOT says not to drive into dust storms and gives specific Pull Aside, Stay Alive steps.',
            zh: '季風季節沙塵可快速降低能見度。ADOT 提醒不要開進沙塵暴，並提供 Pull Aside, Stay Alive 步驟。',
          },
          {
            en: 'Flooded washes are dangerous even when water looks shallow. Do not drive around road closed signs.',
            zh: 'wash 淹水即使看起來不深也危險。不要繞過封路標誌。',
          },
        ],
      },
      {
        title: { en: 'Tenant rights, scams, and consumer protection', zh: '房客權益、詐騙與消費保護' },
        bullets: [
          {
            en: 'Arizona Department of Housing provides the Residential Landlord and Tenant Act. It explains rights and obligations, but landlord-tenant disputes are usually private matters and may require legal help.',
            zh: 'Arizona Department of Housing 提供 Residential Landlord and Tenant Act。它說明權利義務，但房東房客爭議通常屬私人事項，可能需要法律協助。',
          },
          {
            en: 'The Arizona Attorney General warns about rental scams that copy legitimate listings or ask for money before a property is seen. Verify ownership and avoid pressure payments.',
            zh: 'Arizona Attorney General 提醒，租屋詐騙常複製真房源或要求看房前付款。請核實屋主，避免被催促轉帳。',
          },
          {
            en: 'For contractors, solar, roof, pool, or AC work, ask for license numbers, written scope, payment schedule, permit responsibility, and proof of insurance.',
            zh: '承包商、太陽能、屋頂、泳池或冷氣工程，請索取執照號碼、書面範圍、付款時程、permit 責任與保險證明。',
          },
          {
            en: 'Social media and messaging app investment pitches are high risk. The Attorney General has warned about investment scams on Meta platforms, including WhatsApp.',
            zh: '社群媒體與通訊軟體投資話術風險高。Attorney General 已提醒 Meta 平台含 WhatsApp 上的投資詐騙。',
          },
        ],
      },
      {
        title: { en: 'Civic, tax, and local government setup', zh: '公民、稅務與地方政府' },
        bullets: [
          {
            en: 'Eligible voters can register online through AZ MVD Now if they have an Arizona driver license or non-operating ID. The Secretary of State explains proof of citizenship and ballot differences.',
            zh: '符合資格且有亞利桑那駕照或 non-operating ID 的選民，可透過 AZ MVD Now 線上登記。Secretary of State 說明公民證明與選票差異。',
          },
          {
            en: 'Arizona Department of Revenue explains that part-year residents report income earned while Arizona residents and Arizona source income before or after the move.',
            zh: 'Arizona Department of Revenue 說明，part-year resident 需申報成為亞利桑那居民期間的收入，以及搬來前後的亞利桑那來源收入。',
          },
          {
            en: 'Save your city service portal for water, trash, code enforcement, street issues, parks, library cards, permits, and non-emergency reports.',
            zh: '保存所在城市服務入口，用於水、垃圾、code enforcement、道路問題、公園、圖書證、permit 與非緊急通報。',
          },
          {
            en: 'For families with immigration, cross-border tax, or business ownership questions, use licensed professionals. Community advice can help you find names, not replace professional review.',
            zh: '涉及移民、跨境稅務或企業持有時，請找有執照專業人士。社群建議可以幫你找人名，但不能取代專業審查。',
          },
        ],
      },
    ],
    practicalNotes: [
      {
        en: 'Do not use this directory as legal, tax, medical, or immigration advice. Use it to get to the right official or professional source faster.',
        zh: '本目錄不是法律、稅務、醫療或移民建議，而是幫你更快找到正確官方或專業來源。',
      },
      {
        en: 'Do not ignore small official notices from city, MVD, school, court, HOA, or utility providers. Many Arizona processes move by mailed notice or portal message.',
        zh: '不要忽略城市、MVD、學校、法院、HOA 或公用事業的小通知。許多亞利桑那流程靠郵件或系統訊息推進。',
      },
    ],
    officialResources: [
      {
        label: { en: 'Arizona Heat resource hub', zh: '亞利桑那高溫資源中心' },
        url: 'https://heat.azdhs.gov/',
        source: 'Arizona Department of Health Services',
      },
      {
        label: { en: 'ADOT Pull Aside, Stay Alive', zh: 'ADOT 沙塵暴安全' },
        url: 'https://azdot.gov/news/when-dust-storms-hit-pull-aside-stay-alive',
        source: 'Arizona Department of Transportation',
      },
      {
        label: { en: '211 Arizona', zh: '211 Arizona 社福資源' },
        url: 'https://211arizona.org/',
        source: '211 Arizona',
      },
      {
        label: { en: '988 Suicide and Crisis Lifeline', zh: '988 心理危機專線' },
        url: 'https://988lifeline.org/',
        source: '988 Lifeline',
      },
      {
        label: { en: 'Arizona Residential Landlord and Tenant Act', zh: '亞利桑那房東房客法' },
        url: 'https://housing.az.gov/general-public/landlord-and-tenant-act',
        source: 'Arizona Department of Housing',
      },
      {
        label: { en: 'Arizona Attorney General consumer resources', zh: '亞利桑那消費者防詐資源' },
        url: 'https://www.azag.gov/consumer',
        source: 'Arizona Attorney General',
      },
      {
        label: { en: 'Arizona voter registration', zh: '亞利桑那選民登記' },
        url: 'https://azsos.gov/elections/voters/registering-vote',
        source: 'Arizona Secretary of State',
      },
      {
        label: { en: 'Arizona individual income tax', zh: '亞利桑那個人所得稅' },
        url: 'https://azdor.gov/individuals',
        source: 'Arizona Department of Revenue',
      },
    ],
    relatedBusinessSlugs: ['chen-cpa-associates', 'desert-bridge-relocation', 'profix-home-services'],
    relatedEventSlugs: [],
  },
];

export const localArticles: Article[] = unwrapJsonArray(
  generatedLocalArticles as JsonArrayImport<ImportedArticle>,
  'generated-local-articles'
).map((article) =>
  normalizeImportedArticle(article)
);

export const austinLocalArticles: Article[] = unwrapJsonArray(
  generatedAustinLocalArticles as JsonArrayImport<ImportedArticle>,
  'generated-austin-local-articles'
).map((article) =>
  normalizeImportedArticle(article)
);

export const losAngelesLocalArticles: Article[] = unwrapJsonArray(
  generatedLosAngelesLocalArticles as JsonArrayImport<ImportedArticle>,
  'generated-los-angeles-local-articles'
).map((article) =>
  normalizeImportedArticle(article)
);

export const sfBayLocalArticles: Article[] = unwrapJsonArray(
  generatedSfBayLocalArticles as JsonArrayImport<ImportedArticle>,
  'generated-sf-bay-local-articles'
).map((article) =>
  normalizeImportedArticle(article)
);

export const monitoredSources = monitoredSourcesData as MonitoredSource[];

export const signalDeskQueue = generatedSignalDeskQueue as SignalDeskQueueItem[];

export const articles: Article[] = localArticles;

export const events: Event[] = [
  {
    slug: 'spring-festival-gala-arizona-art-academy-2026',
    title: { en: '2026 Spring Festival Gala: Chinese New Year Show', 'zh': '2026 春節聯歡晚會：中國新年演出' },
    excerpt: {
      en: 'Arizona Art Academy\'s annual Chandler gala celebrates Lunar New Year with Chinese dance, martial arts, and guest performances.',
      'zh': 'Arizona Art Academy 在 Chandler 舉辦的年度春節晚會，以中國舞、武術與特別演出慶祝農曆新年。',
    },
    description: [
      {
        en: 'The Chandler Center for the Arts event page describes this as a Year of the Horse celebration featuring a Chinese hand-shadow master, a local magician, traditional martial arts, and cultural dance.',
        'zh': 'Chandler Center for the Arts 的官方活動頁把這場演出列為「馬年」春節慶祝活動，內容包含中國手影藝術、在地魔術演出、傳統武術與文化舞蹈。',
      },
      {
        en: 'It is the kind of annual Spring Festival program Arizona\'s Chinese community actually shows up for, so it fits this page much better than made-up placeholder meetups.',
        'zh': '這類年度春節節目本來就是亞利桑那華人社群真正會參與的活動，也比先前那些虛構示意聚會更適合放在這個頁面。',
      },
    ],
    heroImage:
      'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1200&q=80',
    organizer: 'Arizona Art Academy',
    verifiedOrganizer: true,
    venueName: 'Chandler Center for the Arts',
    address: '250 N Arizona Ave, Chandler, AZ 85225',
    city: 'Chandler',
    startDate: '2026-01-31T19:00:00-07:00',
    ticketUrl: 'https://www.chandlercenter.org/events/2026-spring-festival-gala-chinese-new-year-show-presented-arizona-art-academy',
    languageNote: {
      en: 'Use the Chandler Center page for current ticket and seating details.',
      'zh': '請以 Chandler Center 官方頁面上的票務與座位資訊為準。',
    },
    relatedBusinessSlugs: [],
    tags: ['spring festival', 'lunar new year', 'performance', 'chandler'],
  },
  {
    slug: 'phoenix-chinese-week-lunar-new-year-festival-2026',
    title: { en: 'Phoenix Chinese Week 2026 Lunar New Year Festival', 'zh': '鳳凰城中國周 2026 農曆新年文化節' },
    excerpt: {
      en: 'The 36th annual Phoenix Chinese Week festival brings live performances, food, exhibits, and hands-on Chinese cultural activities to downtown Phoenix.',
      'zh': '第 36 屆鳳凰城中國周把舞台演出、美食、文化展區與多種華人文化體驗活動帶到市中心 Phoenix。',
    },
    description: [
      {
        en: 'Phoenix Chinese Week\'s official festival page says the event is presented in cooperation with the City of Phoenix and Phoenix Sister Cities Commission and includes dragon and lion dances, music, tai chi, martial arts, children\'s activities, and food vendors.',
        'zh': 'Phoenix Chinese Week 官方活動頁說明，這場文化節與鳳凰城市府及 Phoenix Sister Cities Commission 合作舉辦，內容包含舞龍舞獅、音樂、太極、武術、兒童活動與餐飲攤位。',
      },
      {
        en: 'This is exactly the sort of real community festival people look for when they ask what Arizona\'s Chinese community is actually doing around Spring Festival.',
        'zh': '如果有人想知道亞利桑那華人社群在春節期間真正會辦什麼活動，這就是最有代表性的實際案例之一。',
      },
    ],
    heroImage:
      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80',
    organizer: 'Phoenix Chinese Week',
    verifiedOrganizer: true,
    venueName: 'Heritage Square',
    address: '113 N 6th St, Phoenix, AZ 85004',
    city: 'Phoenix',
    startDate: '2026-02-14T09:00:00-07:00',
    endDate: '2026-02-15T17:00:00-07:00',
    ticketUrl: 'https://phoenixchineseweek.org/pages/festival-details',
    languageNote: {
      en: 'The official page includes festival details, schedule references, directions, and related Phoenix Chinese Week programming.',
      'zh': '官方頁面整理了活動說明、節目資訊、交通位置與中國周相關延伸活動。',
    },
    relatedBusinessSlugs: [],
    tags: ['phoenix chinese week', 'spring festival', 'lunar new year', 'phoenix'],
  },
  {
    slug: 'ua-lunar-new-year-celebration-2026',
    title: { en: 'University of Arizona Lunar New Year Celebration 2026', 'zh': '亞利桑那大學 2026 農曆新年慶祝活動' },
    excerpt: {
      en: 'The University of Arizona Chinese Language Program hosts a Tucson Lunar New Year celebration with games, music, lion dance, and Chinese food.',
      'zh': '亞利桑那大學中文課程在 Tucson 舉辦農曆新年活動，內容包含遊戲、音樂、舞獅與中式餐點。',
    },
    description: [
      {
        en: 'The Department of East Asian Studies describes it as an afternoon of traditional Chinese games, authentic music, lion dance performances, and cuisine hosted by the Chinese Language Program.',
        'zh': '亞利桑那大學東亞研究系把這場活動介紹為一個由中文課程主辦的下午慶典，包含傳統中國遊戲、音樂、舞獅表演與中式美食。',
      },
      {
        en: 'It also gives the page one real Tucson entry, so the community calendar is not overly Phoenix-only.',
        'zh': '它也讓這份活動名單不只侷限於鳳凰城，對整個亞利桑那華人社群來說更完整。',
      },
    ],
    heroImage:
      'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1200&q=80',
    organizer: 'University of Arizona Chinese Language Program',
    verifiedOrganizer: true,
    venueName: 'Poetry Center, Rubel Room',
    address: '1508 E Helen St, Tucson, AZ 85721',
    city: 'Tucson',
    startDate: '2026-02-16T15:30:00-07:00',
    endDate: '2026-02-16T17:30:00-07:00',
    ticketUrl: 'https://eas.arizona.edu/events/lunar-new-year-celebration-2026',
    languageNote: {
      en: 'No prior experience is needed; the official university page frames it as a welcoming public celebration.',
      'zh': '官方大學頁面把它定位為開放且友善的慶祝活動，不需要先有中文或文化背景。',
    },
    relatedBusinessSlugs: [],
    tags: ['lunar new year', 'tucson', 'university of arizona', 'community'],
  },
  {
    slug: 'arizona-dragon-boat-festival-2026',
    title: { en: 'Arizona Dragon Boat Festival 2026', 'zh': '2026 亞利桑那龍舟節' },
    excerpt: {
      en: 'A long-running Tempe festival rooted in Chinese dragon boat tradition, with races, cultural performances, food vendors, and teams from across the region.',
      'zh': '在 Tempe 舉辦、源自中國龍舟文化的年度活動，包含比賽、文化表演、美食攤位與各地隊伍參與。',
    },
    description: [
      {
        en: 'Tempe Tourism and AZDBA both describe the 2026 event as the 20th annual Arizona Dragon Boat Festival at Tempe Town Lake, bringing racing and cultural programming together in one weekend.',
        'zh': 'Tempe Tourism 與 AZDBA 都把 2026 年的活動列為第 20 屆亞利桑那龍舟節，在 Tempe Town Lake 以一個週末結合競賽與文化節目。',
      },
      {
        en: 'This is one of the clearest real-world Chinese cultural events in Arizona, so it belongs here far more than a made-up night market showcase.',
        'zh': '這是亞利桑那最具代表性的真實華人文化活動之一，顯然比先前虛構的夜市示意活動更應該放在這裡。',
      },
    ],
    heroImage:
      'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80',
    organizer: 'Arizona Dragon Boat Association',
    verifiedOrganizer: true,
    venueName: 'Tempe Town Lake and Tempe Beach Park',
    address: '550 E Tempe Town Lake, Tempe, AZ 85281',
    city: 'Tempe',
    startDate: '2026-03-28T08:00:00-07:00',
    ticketUrl: 'https://azdba.org/festival/',
    languageNote: {
      en: 'Use the AZDBA festival page for race registration, logistics, and updated entertainment details.',
      'zh': '請以 AZDBA 官方活動頁查看隊伍報名、交通安排與最新表演資訊。',
    },
    relatedBusinessSlugs: [],
    tags: ['dragon boat', 'duanwu', 'tempe', 'festival'],
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
