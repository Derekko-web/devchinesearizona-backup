import { businessCategories } from '@/data/platform-data';
import { getDirectoryBusinesses, getDirectoryCategories } from '@/lib/directory';
import { t } from '@/lib/i18n';
import { defaultSiteProfile, hasLiveDirectoryData, type SiteProfile } from '@/lib/site-config';
import type { Business, BusinessCategory, Locale } from '@/lib/types';

// Pages with one or two listings read as thin, so they stay out of search.
export const MIN_INDEXABLE_CATEGORY_LISTINGS = 3;
export const MAX_SPONSORED_CATEGORY_SPOTS = 3;
const METRO_DIRECTORY_FETCH_LIMIT = 1000;

export type MetroCategoryCity = {
  city: string;
  slug: string;
  count: number;
};

export type MetroCategorySummary = {
  category: BusinessCategory;
  count: number;
  cities: MetroCategoryCity[];
  indexable: boolean;
};

export type MetroCategoryPageData = {
  summary: MetroCategorySummary;
  listings: Business[];
  otherCategories: MetroCategorySummary[];
};

type Copy = { en: string; zh: string };

const metroLabels: Record<string, Copy> = {
  arizona: { en: 'Phoenix Metro & Arizona', zh: '大鳳凰城與亞利桑那' },
  'los-angeles': { en: 'Greater Los Angeles', zh: '大洛杉磯地區' },
  'sf-bay': { en: 'the SF Bay Area', zh: '舊金山灣區' },
  austin: { en: 'Greater Austin', zh: '大奧斯汀地區' },
};

// `{metro}` is replaced with the site's metro label.
// Headings and intros describe the category, not the people in it: no
// "Chinese-speaking" / 華語 / 華人 claim about every listing, because most
// listings do not record a Chinese spoken language (issue #480). Each business
// page shows the languages on record.
const categoryCopy: Record<string, { heading: Copy; intro: Copy }> = {
  'real-estate': {
    heading: { en: 'Realtors & Real Estate', zh: '房地產經紀' },
    intro: {
      en: 'Real estate agents, mortgage help, and relocation support across {metro}. Each profile shows the languages on record, service area, and how to get in touch.',
      zh: '{metro}的地產經紀、貸款與搬遷協助。每個商家頁面都列出已知的服務語言、服務區域與聯絡方式。',
    },
  },
  dining: {
    heading: { en: 'Chinese Restaurants', zh: '中餐廳與美食' },
    intro: {
      en: 'Chinese restaurants, bakeries, bubble tea, and Asian grocery anchors across {metro}, from regional cooking to everyday takeout. Open a listing for hours, menus, and directions.',
      zh: '{metro}的中餐廳、烘焙坊、珍珠奶茶與亞洲超市，從地方菜系到日常外帶都有。點進商家頁面查看營業時間、菜單與路線。',
    },
  },
  medical: {
    heading: { en: 'Doctors & Clinics', zh: '醫師與診所' },
    intro: {
      en: 'Primary care, specialists, urgent care, pharmacies, and family health services across {metro}. Each profile shows the languages on record; confirm languages, insurance, and appointments directly with each office.',
      zh: '{metro}的家庭醫師、專科、急診、藥局與家庭健康服務。每個商家頁面列出已知的服務語言；請直接向診所確認語言、保險與預約細節。',
    },
  },
  'legal-finance': {
    heading: { en: 'Lawyers, Accountants & Insurance', zh: '律師、會計與保險' },
    intro: {
      en: 'Immigration, tax, business setup, insurance, and financial planning help across {metro}. Compare providers and check each profile for languages and contact details.',
      zh: '{metro}的移民、報稅、公司設立、保險與理財服務。比較各家服務，並在商家頁面確認語言與聯絡方式。',
    },
  },
  education: {
    heading: { en: 'Schools & Tutoring', zh: '學校與補習' },
    intro: {
      en: 'Chinese language schools, tutoring, test prep, and enrichment programs for families across {metro}.',
      zh: '{metro}家庭常用的中文學校、課業補習、考試準備與才藝課程。',
    },
  },
  shopping: {
    heading: { en: 'Asian Markets & Shops', zh: '亞洲超市與商店' },
    intro: {
      en: 'Asian supermarkets, bookstores, gift shops, and everyday retail across {metro}.',
      zh: '{metro}的亞洲超市、書店、禮品店與日常零售。',
    },
  },
  'local-services': {
    heading: { en: 'Local Services', zh: '在地服務' },
    intro: {
      en: 'Shipping, travel, printing, auto, and practical neighborhood services across {metro}.',
      zh: '{metro}的寄件、旅遊、印刷、汽車與日常社區服務。',
    },
  },
  'home-services': {
    heading: { en: 'Home Services', zh: '居家維修' },
    intro: {
      en: 'HVAC, plumbing, electrical, and move-in repair help across {metro}.',
      zh: '{metro}的冷暖氣、水電與入住前維修服務。',
    },
  },
  moving: {
    heading: { en: 'Movers', zh: '搬家服務' },
    intro: {
      en: 'Movers, settling-in help, and newcomer logistics across {metro}.',
      zh: '{metro}的搬家公司、安家協助與新移民生活安排。',
    },
  },
  'beauty-wellness': {
    heading: { en: 'Beauty & Wellness', zh: '美容養生' },
    intro: {
      en: 'Salons, massage, skincare, and personal wellness services across {metro}.',
      zh: '{metro}的髮廊、按摩、保養與個人養生服務。',
    },
  },
  'faith-community': {
    heading: { en: 'Chinese Churches & Temples', zh: '華人教會與寺廟' },
    intro: {
      en: 'Chinese churches, temples, fellowships, and community groups across {metro}.',
      zh: '{metro}的華人教會、寺廟、團契與社群組織。',
    },
  },
  travel: {
    heading: { en: 'Travel Services', zh: '旅遊服務' },
    intro: {
      en: 'Flights, ticketing, and family travel help across {metro}.',
      zh: '{metro}的機票、票務與家庭旅遊協助。',
    },
  },
  jobs: {
    heading: { en: 'Chinese Community Jobs & Careers', zh: '華人工作與職涯' },
    intro: {
      en: 'Career support, resume help, and hiring resources across {metro}.',
      zh: '{metro}的職涯支援、履歷協助與求職資源。',
    },
  },
};

function pick(locale: Locale, copy: Copy): string {
  return locale === 'zh' ? copy.zh : copy.en;
}

// Same shape as the city scope on directory ad campaigns, so "Monterey Park" -> "monterey-park".
export function slugifyCity(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function metroCategoryPath(categorySlug: string): string {
  return `/business/category/${categorySlug}`;
}

export function cityCategoryPath(city: string, categorySlug: string): string {
  return `/business/${slugifyCity(city)}/${categorySlug}`;
}

export function isIndexableListingCount(count: number): boolean {
  return count >= MIN_INDEXABLE_CATEGORY_LISTINGS;
}

export function getMetroLabel(site: SiteProfile, locale: Locale): string {
  const label = metroLabels[site.key];
  if (label) {
    return pick(locale, label);
  }

  return locale === 'zh' ? site.regionNameZh : site.regionName;
}

export function getLocalizedCityName(city: string, site: SiteProfile, locale: Locale): string {
  return locale === 'zh' ? site.directory.cityNamesZh[city] ?? city : city;
}

export function getMetroCategoryHeading(category: BusinessCategory, locale: Locale): string {
  const copy = categoryCopy[category.slug];
  if (copy) {
    return pick(locale, copy.heading);
  }

  return t(category.name, locale);
}

export function getMetroCategoryIntro(category: BusinessCategory, site: SiteProfile, locale: Locale): string {
  const template = categoryCopy[category.slug]?.intro;
  if (!template) {
    return t(category.description, locale);
  }

  return pick(locale, template).replace('{metro}', getMetroLabel(site, locale));
}

// Same intro as the metro-wide page, about one city: "...across Mesa, AZ."
export function getCityCategoryIntro(
  category: BusinessCategory,
  cityLabel: string,
  site: SiteProfile,
  locale: Locale
): string {
  const template = categoryCopy[category.slug]?.intro;
  if (!template) {
    return t(category.description, locale);
  }

  const place = locale === 'en' && site.stateCode ? `${cityLabel}, ${site.stateCode}` : cityLabel;
  return pick(locale, template).replace('{metro}', place);
}

// "3 listings in Mesa" / "梅薩共 3 筆商家"
export function formatCityListingCountLine(count: number, cityLabel: string, locale: Locale): string {
  if (locale === 'zh') {
    return `${cityLabel}共 ${count} 筆商家`;
  }

  return `${count} ${count === 1 ? 'listing' : 'listings'} in ${cityLabel}`;
}

export function getMetroCategoryTitle(category: BusinessCategory, site: SiteProfile, locale: Locale): string {
  const heading = getMetroCategoryHeading(category, locale);
  const metro = getMetroLabel(site, locale);
  return locale === 'zh' ? `${metro}${heading}` : `${heading} in ${metro}`;
}

export function getCityCategoryTitle(
  category: BusinessCategory,
  cityLabel: string,
  site: SiteProfile,
  locale: Locale
): string {
  const heading = getMetroCategoryHeading(category, locale);
  if (locale === 'zh') {
    return `${cityLabel}${heading}`;
  }

  return site.stateCode ? `${heading} in ${cityLabel}, ${site.stateCode}` : `${heading} in ${cityLabel}`;
}

export function formatListingCountLine(summary: MetroCategorySummary, locale: Locale): string {
  const cityCount = summary.cities.length;
  if (locale === 'zh') {
    return `共 ${summary.count} 筆商家，分布於 ${cityCount} 個城市`;
  }

  const listingWord = summary.count === 1 ? 'listing' : 'listings';
  const cityWord = cityCount === 1 ? 'city' : 'cities';
  return `${summary.count} ${listingWord} across ${cityCount} ${cityWord}`;
}

// A category gets a metro page when the site offers it or when listings already use it.
export function summarizeMetroCategories(
  businesses: Business[],
  categories: BusinessCategory[],
  site: SiteProfile
): MetroCategorySummary[] {
  const businessesByCategory = new Map<string, Business[]>();
  for (const business of businesses) {
    const group = businessesByCategory.get(business.categorySlug) ?? [];
    group.push(business);
    businessesByCategory.set(business.categorySlug, group);
  }

  return categories
    .filter(
      (category) =>
        site.directory.categorySlugs.includes(category.slug) || businessesByCategory.has(category.slug)
    )
    .map((category) => {
      const listings = businessesByCategory.get(category.slug) ?? [];
      const cityCounts = new Map<string, MetroCategoryCity>();
      for (const business of listings) {
        const slug = slugifyCity(business.city);
        if (!slug) {
          continue;
        }
        const existing = cityCounts.get(slug);
        if (existing) {
          existing.count += 1;
        } else {
          cityCounts.set(slug, { city: business.city.trim(), slug, count: 1 });
        }
      }
      const cities = Array.from(cityCounts.values()).sort(
        (left, right) => right.count - left.count || left.city.localeCompare(right.city)
      );

      return {
        category,
        count: listings.length,
        cities,
        indexable: isIndexableListingCount(listings.length),
      };
    });
}

export function findMetroCategoryCity(
  summary: MetroCategorySummary,
  citySegment: string
): MetroCategoryCity | undefined {
  const slug = slugifyCity(decodeSegment(citySegment));
  return summary.cities.find((city) => city.slug === slug);
}

// Sponsored listings get the labeled spots at the top; everything else stays in the organic list.
// Businesses that bought the sponsored category plan (#408) are seated first, since
// the plan is sold as one of these spots; other sponsored listings fill what is left.
export function splitSponsoredListings(
  listings: Business[],
  maxSpots = MAX_SPONSORED_CATEGORY_SPOTS
): { sponsored: Business[]; organic: Business[] } {
  const candidates = listings.filter((business) => business.sponsored);
  const planHolders = candidates.filter((business) =>
    business.paidPlans?.includes('sponsored-category')
  );
  const others = candidates.filter(
    (business) => !business.paidPlans?.includes('sponsored-category')
  );
  const sponsored = [...planHolders, ...others].slice(0, maxSpots);
  const sponsoredIds = new Set(sponsored.map((business) => business.id));

  return {
    sponsored,
    organic: listings.filter((business) => !sponsoredIds.has(business.id)),
  };
}

async function getSiteMetroCategories(site: SiteProfile): Promise<BusinessCategory[]> {
  const categories = await getDirectoryCategories(site);
  const known = new Set(categories.map((category) => category.slug));
  // Keep configured categories reachable even if the live category table is missing one.
  const configuredFallbacks = businessCategories.filter(
    (category) => site.directory.categorySlugs.includes(category.slug) && !known.has(category.slug)
  );

  return [...categories, ...configuredFallbacks];
}

async function loadMetroDirectory(site: SiteProfile) {
  const [categories, businesses] = await Promise.all([
    getSiteMetroCategories(site),
    getDirectoryBusinesses(
      { sort: 'featured' },
      { site, limit: METRO_DIRECTORY_FETCH_LIMIT, usePaidPromotion: true }
    ),
  ]);

  return {
    businesses,
    summaries: summarizeMetroCategories(businesses, categories, site),
  };
}

export async function getMetroCategorySummaries(
  site: SiteProfile = defaultSiteProfile,
  businesses?: Business[]
): Promise<MetroCategorySummary[]> {
  if (!hasLiveDirectoryData(site)) {
    return [];
  }

  if (businesses) {
    return summarizeMetroCategories(businesses, await getSiteMetroCategories(site), site);
  }

  return (await loadMetroDirectory(site)).summaries;
}

export async function getMetroCategoryPageData(
  categorySlug: string,
  site: SiteProfile = defaultSiteProfile
): Promise<MetroCategoryPageData | null> {
  if (!hasLiveDirectoryData(site)) {
    return null;
  }

  const { businesses, summaries } = await loadMetroDirectory(site);
  const summary = summaries.find((item) => item.category.slug === categorySlug);
  if (!summary) {
    return null;
  }

  return {
    summary,
    listings: businesses.filter((business) => business.categorySlug === categorySlug),
    otherCategories: summaries.filter((item) => item.category.slug !== categorySlug && item.count > 0),
  };
}
