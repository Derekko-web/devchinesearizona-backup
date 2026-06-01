import {
  businessCategories,
  businesses as fixtureBusinesses,
} from '@/data/platform-data';
import { attachActiveDirectoryAdCampaigns } from '@/lib/directory-ads';
import { applyBusinessDirectoryOverride } from '@/lib/business-directory-overrides';
import {
  compareMostPopularDirectoryBusinesses,
  MOST_POPULAR_DIRECTORY_BUSINESS_SLUGS,
} from '@/lib/directory-highlights';
import { getStaticDirectoryBusinessesForSite } from '@/lib/site-directory-data';
import type {
  Business,
  BusinessCategory,
  DirectoryBusinessStatusFilter,
  DirectoryStatus,
  SortOption,
  VerificationState,
} from '@/lib/types';
import { formatPhoneNumber } from '@/lib/phone';
import { getDirectoryAiReplacementImage } from '@/lib/directory-ai-replacements';
import {
  canUseCitySiteBusinessImageFallback,
  getCitySiteBusinessSpecificImage,
  getCitySiteContextImage,
} from '@/lib/city-site-business-images';
import { defaultSiteProfile, hasLiveDirectoryData, type SiteProfile } from '@/lib/site-config';
import { getSupabaseClient, getSupabaseServiceClient, isSupabaseConfigured } from '@/lib/supabase';

export type DirectoryFilters = {
  q?: string;
  city?: string;
  category?: string;
  verifiedOnly?: boolean;
  language?: string;
  minRating?: number;
  businessStatus?: DirectoryBusinessStatusFilter;
  newcomerFriendlyOnly?: boolean;
  sort?: SortOption;
};

type DirectoryQueryOptions = {
  excludeSlug?: string;
  includeNonPublic?: boolean;
  limit?: number;
  site?: SiteProfile;
  usePaidPromotion?: boolean;
};

export type DirectoryPage = {
  businesses: Business[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type DirectoryCategoryRow = {
  slug: string;
  name_en: string;
  name_zh_tw?: string | null;
  description_en: string;
  description_zh_tw?: string | null;
  icon: BusinessCategory['icon'];
};

type DirectoryLocalizedTextRow = {
  en?: string | null;
  zh?: string | null;
};

type DirectoryHoursRow = {
  label?: string | null;
  value?: string | null;
};

type DirectoryBusinessRow = {
  id: string;
  slug: string;
  category_id?: string | null;
  name_en: string;
  name_zh_tw?: string | null;
  short_description_en?: string | null;
  short_description_zh_tw?: string | null;
  description_en?: string | null;
  description_zh_tw?: string | null;
  city: string;
  region?: string | null;
  address?: string | null;
  service_area_text?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  menu_url?: string | null;
  hero_image?: string | null;
  gallery?: string[] | null;
  services_json?: Array<DirectoryLocalizedTextRow | string> | null;
  languages?: string[] | null;
  search_aliases?: string[] | null;
  verified?: boolean | null;
  bilingual?: boolean | null;
  newcomer_friendly?: boolean | null;
  sponsored?: boolean | null;
  featured?: boolean | null;
  rating?: number | string | null;
  review_count?: number | null;
  price_range?: string | null;
  hours_json?: DirectoryHoursRow[] | null;
  lat?: number | string | null;
  lng?: number | string | null;
  last_updated?: string | null;
  status?: DirectoryStatus | null;
  verification_state?: VerificationState | null;
  category?: DirectoryCategoryRow | DirectoryCategoryRow[] | null;
  owner_profile?: { slug?: string | null } | Array<{ slug?: string | null }> | null;
};

export const launchCities = ['Phoenix', 'Chandler', 'Tempe', 'Mesa', 'Gilbert', 'Scottsdale'] as const;
export const launchCategoryShortcuts = [
  'real-estate',
  'moving',
  'medical',
  'education',
  'dining',
] as const;

const FEATURED_HOME_THRESHOLD = 4;
const DIRECTORY_PAGE_FETCH_LIMIT = 1000;
const SEARCH_DOMINANT_TOTAL_THRESHOLD = 100;
const SEARCH_DOMINANT_CATEGORY_THRESHOLD = 5;
type Coordinates = NonNullable<Business['coordinates']>;
type BusinessHoursState = 'open' | 'closed' | 'unknown';

const searchDominantCategories = [
  'real-estate',
  'legal-finance',
  'medical',
  'dining',
  'moving',
  'education',
] as const;
const BASE_DIRECTORY_SELECT_FIELDS = `
  id,
  slug,
  name_en,
  name_zh_tw,
  short_description_en,
  short_description_zh_tw,
  description_en,
  description_zh_tw,
  city,
  region,
  address,
  service_area_text,
  phone,
  email,
  website,
  hero_image,
  gallery,
  languages,
  search_aliases,
  verified,
  bilingual,
  newcomer_friendly,
  sponsored,
  featured,
  rating,
  review_count,
  lat,
  lng,
  last_updated,
  status,
  verification_state,
  owner_profile:profiles!businesses_owner_profile_id_fkey (
    slug
  ),
  category:business_categories!inner (
    slug,
    name_en,
    name_zh_tw,
    description_en,
    description_zh_tw,
    icon
  )
`;
const DIRECTORY_SELECT_FIELDS = `
  ${BASE_DIRECTORY_SELECT_FIELDS},
  menu_url,
  services_json,
  price_range,
  hours_json
`;

function normalize(value?: string | null): string {
  return value?.trim().toLowerCase() ?? '';
}

function getDirectoryDbClient() {
  return getSupabaseServiceClient() ?? getSupabaseClient();
}

const arizonaTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Phoenix',
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const weekdayIndexByLabel: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

export function countActiveDirectoryFilters(filters: DirectoryFilters): number {
  let count = 0;

  if (normalize(filters.q)) {
    count += 1;
  }
  if (filters.city) {
    count += 1;
  }
  if (filters.category) {
    count += 1;
  }
  if (filters.language) {
    count += 1;
  }
  if (filters.minRating) {
    count += 1;
  }
  if (filters.businessStatus) {
    count += 1;
  }
  if (filters.verifiedOnly) {
    count += 1;
  }
  if (filters.newcomerFriendlyOnly) {
    count += 1;
  }
  if (filters.sort && filters.sort !== 'featured') {
    count += 1;
  }

  return count;
}

function hostnameFor(url?: string | null): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function parseNumber(value?: string | number | null): number | undefined {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function parseServiceRows(rows?: DirectoryBusinessRow['services_json']): Business['services'] {
  if (!rows?.length) {
    return [];
  }

  return rows.reduce<Business['services']>((accumulator, row) => {
    if (typeof row === 'string') {
      const value = row.trim();
      if (value) {
        accumulator.push({ en: value });
      }
      return accumulator;
    }

    const english = row.en?.trim();
    const chinese = row.zh?.trim();
    if (!english && !chinese) {
      return accumulator;
    }

    accumulator.push({
      en: english ?? chinese ?? '',
      zh: chinese ?? english,
    });
    return accumulator;
  }, []);
}

function parseHoursRows(rows?: DirectoryBusinessRow['hours_json']): Business['hours'] {
  if (!rows?.length) {
    return [];
  }

  return rows.reduce<Business['hours']>((accumulator, row) => {
    const label = row.label?.trim();
    const value = row.value?.trim();
    if (!label || !value) {
      return accumulator;
    }

    accumulator.push({ label, value });
    return accumulator;
  }, []);
}

function getArizonaDateParts(date: Date) {
  const parts = arizonaTimeFormatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === 'weekday')?.value;
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '-1');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '-1');

  return {
    weekdayIndex: weekday ? weekdayIndexByLabel[normalize(weekday)] : undefined,
    minutesSinceMidnight: hour >= 0 && minute >= 0 ? hour * 60 + minute : undefined,
  };
}

function weekdayIndexesForLabel(label: string): number[] {
  const normalized = normalize(label);
  if (!normalized) {
    return [];
  }

  const rangeMatch = normalized.match(/^([a-z]+)\s*-\s*([a-z]+)$/);
  if (rangeMatch) {
    const start = weekdayIndexByLabel[rangeMatch[1]];
    const end = weekdayIndexByLabel[rangeMatch[2]];

    if (start === undefined || end === undefined) {
      return [];
    }

    if (start <= end) {
      return Array.from({ length: end - start + 1 }, (_, index) => start + index);
    }

    return [
      ...Array.from({ length: 7 - start }, (_, index) => start + index),
      ...Array.from({ length: end + 1 }, (_, index) => index),
    ];
  }

  return normalized
    .split(',')
    .map((part) => weekdayIndexByLabel[part.trim()])
    .filter((value): value is number => value !== undefined);
}

function parseClockMinutes(value: string): number | undefined {
  const twelveHourMatch = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHourMatch) {
    const hour = Number(twelveHourMatch[1]) % 12;
    const minute = Number(twelveHourMatch[2]);
    const isPm = twelveHourMatch[3].toUpperCase() === 'PM';
    return (isPm ? hour + 12 : hour) * 60 + minute;
  }

  const twentyFourHourMatch = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (twentyFourHourMatch) {
    return Number(twentyFourHourMatch[1]) * 60 + Number(twentyFourHourMatch[2]);
  }

  return undefined;
}

function parseTimeRange(value: string): { start: number; end: number } | undefined {
  const [startLabel, endLabel] = value.split(/\s*-\s*/);
  if (!startLabel || !endLabel) {
    return undefined;
  }

  const start = parseClockMinutes(startLabel);
  const end = parseClockMinutes(endLabel);
  if (start === undefined || end === undefined) {
    return undefined;
  }

  return { start, end };
}

function isMinutesWithinRange(
  minutesSinceMidnight: number,
  range: {
    start: number;
    end: number;
  }
): boolean {
  if (range.start === range.end) {
    return true;
  }

  if (range.start < range.end) {
    return minutesSinceMidnight >= range.start && minutesSinceMidnight < range.end;
  }

  return minutesSinceMidnight >= range.start || minutesSinceMidnight < range.end;
}

export function getBusinessHoursState(business: Business, date: Date = new Date()): BusinessHoursState {
  if (business.hours.length === 0) {
    return 'unknown';
  }

  const { weekdayIndex, minutesSinceMidnight } = getArizonaDateParts(date);
  if (weekdayIndex === undefined || minutesSinceMidnight === undefined) {
    return 'unknown';
  }

  let hasStructuredHoursForToday = false;

  for (const row of business.hours) {
    const weekdayIndexes = weekdayIndexesForLabel(row.label);
    if (!weekdayIndexes.includes(weekdayIndex)) {
      continue;
    }

    const normalizedValue = normalize(row.value);
    if (normalizedValue === 'closed') {
      hasStructuredHoursForToday = true;
      continue;
    }

    const range = parseTimeRange(row.value);
    if (!range) {
      continue;
    }

    hasStructuredHoursForToday = true;
    if (isMinutesWithinRange(minutesSinceMidnight, range)) {
      return 'open';
    }
  }

  return hasStructuredHoursForToday ? 'closed' : 'unknown';
}

function getDistanceMiles(from: Coordinates, to: Coordinates): number {
  const earthRadiusMiles = 3958.8;
  const latDelta = ((to.lat - from.lat) * Math.PI) / 180;
  const lngDelta = ((to.lng - from.lng) * Math.PI) / 180;
  const fromLat = (from.lat * Math.PI) / 180;
  const toLat = (to.lat * Math.PI) / 180;
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) ** 2;

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(haversine));
}

function getDistanceReferencePoint(
  businesses: Business[],
  filters: DirectoryFilters
): Coordinates | undefined {
  if (filters.sort !== 'distance' || !filters.city) {
    return undefined;
  }

  const cityBusinesses = businesses.filter(
    (business): business is Business & { coordinates: Coordinates } =>
      normalize(business.city) === normalize(filters.city) && Boolean(business.coordinates)
  );

  if (cityBusinesses.length === 0) {
    return undefined;
  }

  const totals = cityBusinesses.reduce(
    (accumulator, business) => ({
      lat: accumulator.lat + business.coordinates.lat,
      lng: accumulator.lng + business.coordinates.lng,
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: totals.lat / cityBusinesses.length,
    lng: totals.lng / cityBusinesses.length,
  };
}

export function compareFeaturedSignals(left: Business, right: Business, usePaidPromotion = false): number {
  const mostPopularDelta = compareMostPopularDirectoryBusinesses(left, right);
  if (mostPopularDelta !== 0) {
    return mostPopularDelta;
  }

  if (usePaidPromotion) {
    const leftPaidCampaign = left.activeDirectoryAdCampaign;
    const rightPaidCampaign = right.activeDirectoryAdCampaign;
    const paidCampaignDelta = Number(Boolean(rightPaidCampaign)) - Number(Boolean(leftPaidCampaign));
    if (paidCampaignDelta !== 0) {
      return paidCampaignDelta;
    }

    if (leftPaidCampaign && rightPaidCampaign) {
      const remainingBudgetDelta =
        rightPaidCampaign.remainingBudgetCents - leftPaidCampaign.remainingBudgetCents;
      if (remainingBudgetDelta !== 0) {
        return remainingBudgetDelta;
      }

      const activationDelta =
        new Date(rightPaidCampaign.startsAt).getTime() - new Date(leftPaidCampaign.startsAt).getTime();
      if (activationDelta !== 0) {
        return activationDelta;
      }
    }
  }

  const featuredDelta = Number(right.featured) - Number(left.featured);
  if (featuredDelta !== 0) {
    return featuredDelta;
  }

  const trustedDelta =
    Number(right.verificationState !== 'unverified') - Number(left.verificationState !== 'unverified');
  if (trustedDelta !== 0) {
    return trustedDelta;
  }

  const sponsoredDelta =
    Number(Boolean(right.legacySponsored ?? right.sponsored)) -
    Number(Boolean(left.legacySponsored ?? left.sponsored));
  if (sponsoredDelta !== 0) {
    return sponsoredDelta;
  }

  return 0;
}

function toCategoryRecord(row: DirectoryCategoryRow): BusinessCategory {
  return {
    slug: row.slug,
    name: {
      en: row.name_en,
      zh: row.name_zh_tw ?? row.name_en,
    },
    description: {
      en: row.description_en,
      zh: row.description_zh_tw ?? row.description_en,
    },
    icon: row.icon,
  };
}

function categoryFromRow(row: DirectoryBusinessRow): BusinessCategory | undefined {
  if (!row.category) {
    return undefined;
  }

  const category = Array.isArray(row.category) ? row.category[0] : row.category;
  return category ? toCategoryRecord(category) : undefined;
}

function ownerProfileSlugFromRow(row: DirectoryBusinessRow): string | undefined {
  if (!row.owner_profile) {
    return undefined;
  }

  const ownerProfile = Array.isArray(row.owner_profile) ? row.owner_profile[0] : row.owner_profile;
  const slug = ownerProfile?.slug?.trim();
  return slug || undefined;
}

function fixtureBusinessesEnabled(): boolean {
  return (
    process.env.DIRECTORY_USE_FIXTURES === '1' ||
    process.env.NODE_ENV === 'test' ||
    !isSupabaseConfigured()
  );
}

function getNonArizonaDirectoryImageFallback(business: Business, site?: SiteProfile): string | undefined {
  if (!canUseCitySiteBusinessImageFallback(site)) {
    return undefined;
  }

  return getCitySiteBusinessSpecificImage(business.slug) ?? getCitySiteContextImage(site);
}

function mapFixtureBusiness(business: Business, site?: SiteProfile): Business {
  const heroImage =
    getDirectoryAiReplacementImage(business.slug, business.heroImage) ??
    getNonArizonaDirectoryImageFallback(business, site);
  const gallery = business.gallery.length > 0 ? business.gallery : heroImage ? Array(4).fill(heroImage) : [];

  return applyBusinessDirectoryOverride({
    ...business,
    legacySponsored: business.legacySponsored ?? business.sponsored,
    serviceAreaText: business.serviceAreaText,
    phone: formatPhoneNumber(business.phone),
    heroImage,
    gallery,
    status: business.status ?? 'live',
    verificationState: business.verificationState ?? (business.verified ? 'editor_verified' : 'unverified'),
  });
}

function mapFixtureCategory(slug: string): BusinessCategory | undefined {
  return businessCategories.find((category) => category.slug === slug);
}

function rowToBusiness(row: DirectoryBusinessRow): Business {
  const category = categoryFromRow(row);
  const website = row.website ?? undefined;
  const verificationState = row.verification_state ?? (row.verified ? 'editor_verified' : 'unverified');

  return applyBusinessDirectoryOverride({
    id: row.id,
    slug: row.slug,
    name: {
      en: row.name_en,
      zh: row.name_zh_tw ?? row.name_en,
    },
    categorySlug: category?.slug ?? '',
    city: row.city,
    region: row.region ?? row.city,
    address: row.address ?? undefined,
    serviceAreaText: row.service_area_text ?? undefined,
    phone: formatPhoneNumber(row.phone),
    email: row.email ?? undefined,
    website,
    menuUrl: row.menu_url ?? undefined,
    heroImage: getDirectoryAiReplacementImage(row.slug, row.hero_image ?? undefined),
    gallery: row.gallery ?? [],
    shortDescription: {
      en: row.short_description_en ?? row.description_en ?? row.name_en,
      zh: row.short_description_zh_tw ?? row.short_description_en ?? row.description_zh_tw ?? row.description_en ?? row.name_en,
    },
    description: {
      en: row.description_en ?? row.short_description_en ?? row.name_en,
      zh: row.description_zh_tw ?? row.description_en ?? row.short_description_zh_tw ?? row.short_description_en ?? row.name_en,
    },
    services: parseServiceRows(row.services_json),
    languages: (row.languages ?? []) as Business['languages'],
    searchAliases: row.search_aliases ?? [],
    verified: row.verified ?? verificationState !== 'unverified',
    bilingual: row.bilingual ?? Boolean(row.languages?.some((item) => /mandarin|chinese|taiwanese/i.test(item))),
    newcomerFriendly: row.newcomer_friendly ?? false,
    sponsored: row.sponsored ?? false,
    legacySponsored: row.sponsored ?? false,
    featured: row.featured ?? false,
    ownerProfileSlug: ownerProfileSlugFromRow(row),
    rating: parseNumber(row.rating) ?? 0,
    reviewCount: row.review_count ?? 0,
    priceRange: row.price_range ?? undefined,
    lastUpdated: row.last_updated ?? new Date().toISOString(),
    status: row.status ?? 'pending_review',
    verificationState,
    hours: parseHoursRows(row.hours_json),
    coordinates:
      row.lat !== null && row.lat !== undefined && row.lng !== null && row.lng !== undefined
        ? {
            lat: parseNumber(row.lat) ?? 0,
            lng: parseNumber(row.lng) ?? 0,
          }
        : undefined,
  });
}

export function hasPlaceholderDomain(url?: string | null): boolean {
  const hostname = hostnameFor(url);
  if (!hostname) {
    return false;
  }

  return (
    hostname === 'example.com' ||
    hostname.endsWith('.example') ||
    hostname.endsWith('.invalid') ||
    hostname.includes('placeholder')
  );
}

export function hasPlaceholderPhone(phone?: string | null): boolean {
  if (!phone) {
    return false;
  }

  const digits = phone.replace(/\D/g, '');
  return digits.includes('555');
}

export function hasPublicContactMethod(business: Business): boolean {
  return Boolean(
    (business.phone && !hasPlaceholderPhone(business.phone)) ||
      (business.website && !hasPlaceholderDomain(business.website)) ||
      business.email?.trim()
  );
}

export function hasPublicLocation(business: Business): boolean {
  return Boolean(
    business.address ||
      business.serviceAreaText ||
      (business.verificationState === 'claimed' && business.city.trim())
  );
}

export function isPublicDirectoryBusiness(business: Business): boolean {
  if (!['live', 'stale'].includes(business.status ?? 'pending_review')) {
    return false;
  }

  if (hasPlaceholderPhone(business.phone) || hasPlaceholderDomain(business.website)) {
    return false;
  }

  if (!hasPublicLocation(business)) {
    return false;
  }

  if (hasPublicContactMethod(business)) {
    return true;
  }

  return business.verificationState === 'editor_verified';
}

function hasGeneratedDirectoryCopy(business: Business): boolean {
  const copy = `${business.shortDescription.en} ${business.description.en}`;
  return /generated from plaza directory sources|direct business contact details may still be incomplete/i.test(copy);
}

function hasSubstantialDirectoryCopy(business: Business): boolean {
  const normalizedDescription = business.description.en.replace(/\s+/g, ' ').trim();
  return normalizedDescription.length >= 180;
}

export function shouldNoIndexDirectoryBusiness(business: Business): boolean {
  if (!isPublicDirectoryBusiness(business)) {
    return true;
  }

  if (hasGeneratedDirectoryCopy(business)) {
    return true;
  }

  if (!hasPublicContactMethod(business)) {
    return true;
  }

  return !hasSubstantialDirectoryCopy(business);
}

export function qualifiesForHomepageFeature(business: Business): boolean {
  return (
    (business.status ?? 'pending_review') === 'live' &&
    Boolean(
      (business.phone && !hasPlaceholderPhone(business.phone)) ||
        (business.website && !hasPlaceholderDomain(business.website))
    ) &&
    Boolean(business.address || business.serviceAreaText) &&
    (business.verificationState === 'claimed' || business.verificationState === 'editor_verified')
  );
}

function sortBusinesses(
  left: Business,
  right: Business,
  sort: SortOption,
  referencePoint?: Coordinates,
  options: {
    usePaidPromotion?: boolean;
  } = {}
): number {
  if (sort === 'distance' && referencePoint) {
    const leftDistance = left.coordinates ? getDistanceMiles(referencePoint, left.coordinates) : Number.POSITIVE_INFINITY;
    const rightDistance = right.coordinates ? getDistanceMiles(referencePoint, right.coordinates) : Number.POSITIVE_INFINITY;
    const distanceDelta = leftDistance - rightDistance;
    if (distanceDelta !== 0) {
      return distanceDelta;
    }
  }

  if (sort === 'alphabetical') {
    const nameDelta = left.name.en.localeCompare(right.name.en, 'en', { sensitivity: 'base' });
    if (nameDelta !== 0) {
      return nameDelta;
    }
  }

  if (sort === 'rating') {
    const ratingDelta = right.rating - left.rating;
    if (ratingDelta !== 0) {
      return ratingDelta;
    }

    const reviewDelta = right.reviewCount - left.reviewCount;
    if (reviewDelta !== 0) {
      return reviewDelta;
    }
  }

  if (sort === 'reviewed') {
    const reviewDelta = right.reviewCount - left.reviewCount;
    if (reviewDelta !== 0) {
      return reviewDelta;
    }
  }

  if (sort === 'newest') {
    const updatedDelta = new Date(right.lastUpdated).getTime() - new Date(left.lastUpdated).getTime();
    if (updatedDelta !== 0) {
      return updatedDelta;
    }
  }

  const featuredSignalDelta = compareFeaturedSignals(left, right, options.usePaidPromotion);
  if (featuredSignalDelta !== 0) {
    return featuredSignalDelta;
  }

  const ratingDelta = right.rating - left.rating;
  if (ratingDelta !== 0) {
    return ratingDelta;
  }

  return right.reviewCount - left.reviewCount;
}

type DirectorySupabaseQuery = {
  contains(column: string, value: readonly unknown[]): DirectorySupabaseQuery;
  eq(column: string, value: unknown): DirectorySupabaseQuery;
  gte(column: string, value: unknown): DirectorySupabaseQuery;
  ilike(column: string, value: string): DirectorySupabaseQuery;
  in(column: string, values: readonly unknown[]): DirectorySupabaseQuery;
  limit(count: number): DirectorySupabaseQuery;
  neq(column: string, value: unknown): DirectorySupabaseQuery;
  order(column: string, options: { ascending: boolean }): DirectorySupabaseQuery;
  textSearch(
    column: string,
    query: string,
    options: {
      config: 'simple';
      type: 'websearch';
    }
  ): DirectorySupabaseQuery;
};

export function applyDirectoryQueryFilters<T extends DirectorySupabaseQuery>(
  query: T,
  filters: DirectoryFilters,
  options: DirectoryQueryOptions = {}
): T {
  let nextQuery = query;

  if (options.excludeSlug) {
    nextQuery = nextQuery.neq('slug', options.excludeSlug) as T;
  }

  if (!options.includeNonPublic) {
    nextQuery = nextQuery.in('status', ['live', 'stale']) as T;
  }

  if (filters.city) {
    nextQuery = nextQuery.ilike('city', filters.city) as T;
  }

  if (filters.category) {
    nextQuery = nextQuery.eq('category.slug', filters.category) as T;
  }

  if (filters.verifiedOnly) {
    nextQuery = nextQuery.neq('verification_state', 'unverified') as T;
  }

  if (filters.language) {
    nextQuery = nextQuery.contains('languages', [filters.language]) as T;
  }

  if (filters.minRating) {
    nextQuery = nextQuery.gte('rating', filters.minRating) as T;
  }

  if (filters.newcomerFriendlyOnly) {
    nextQuery = nextQuery.eq('newcomer_friendly', true) as T;
  }

  const search = normalize(filters.q);
  if (search) {
    nextQuery = nextQuery.textSearch('search_document', search, {
      config: 'simple',
      type: 'websearch',
    }) as T;
  }

  return nextQuery;
}

export function applyDirectoryQuerySort<T extends Pick<DirectorySupabaseQuery, 'order'>>(
  query: T,
  sort: SortOption
): T {
  if (sort === 'rating') {
    return query
      .order('rating', { ascending: false })
      .order('review_count', { ascending: false }) as unknown as T;
  }

  if (sort === 'reviewed') {
    return query.order('review_count', { ascending: false }) as unknown as T;
  }

  if (sort === 'alphabetical') {
    return query.order('name_en', { ascending: true }) as unknown as T;
  }

  if (sort === 'newest') {
    return query.order('last_updated', { ascending: false }) as unknown as T;
  }

  return query
    .order('featured', { ascending: false })
    .order('sponsored', { ascending: false })
    .order('rating', { ascending: false }) as unknown as T;
}

function applyClientFilters(
  businesses: Business[],
  filters: DirectoryFilters,
  options: DirectoryQueryOptions = {}
): Business[] {
  const sort = filters.sort ?? 'featured';
  const referencePoint = getDistanceReferencePoint(businesses, filters);
  const filtered = businesses.filter((business) => {
    if (options.excludeSlug && business.slug === options.excludeSlug) {
      return false;
    }

    if (!options.includeNonPublic && !isPublicDirectoryBusiness(business)) {
      return false;
    }

    if (filters.category && business.categorySlug !== filters.category) {
      return false;
    }

    if (filters.verifiedOnly && business.verificationState === 'unverified') {
      return false;
    }

    if (filters.language && !business.languages.includes(filters.language as never)) {
      return false;
    }

    if (filters.minRating && business.rating < filters.minRating) {
      return false;
    }

    if (filters.businessStatus) {
      const hoursState = getBusinessHoursState(business);
      if (filters.businessStatus === 'open_now' && hoursState !== 'open') {
        return false;
      }
      if (filters.businessStatus === 'closed_now' && hoursState !== 'closed') {
        return false;
      }
    }

    if (filters.newcomerFriendlyOnly && !business.newcomerFriendly) {
      return false;
    }

    return true;
  });

  return filtered
    .sort((left, right) => sortBusinesses(left, right, sort, referencePoint, options))
    .slice(0, options.limit);
}

function dedupeDirectoryBusinessRowsBySlug(rows: DirectoryBusinessRow[]): DirectoryBusinessRow[] {
  const seen = new Set<string>();

  return rows.filter((row) => {
    if (seen.has(row.slug)) {
      return false;
    }

    seen.add(row.slug);
    return true;
  });
}

async function runSupabaseBusinessQuery(
  filters: DirectoryFilters,
  options: DirectoryQueryOptions,
  selectFields: string
): Promise<{ data: DirectoryBusinessRow[] | null; error: unknown }> {
  const client = getDirectoryDbClient();
  if (!client) {
    return { data: null, error: null };
  }

  const sort = filters.sort ?? 'featured';
  let query = client.from('businesses').select(selectFields);
  query = applyDirectoryQueryFilters(query, filters, options);
  query = applyDirectoryQuerySort(query, sort);
  query = query.limit(options.limit ?? 250);

  const { data, error } = await query;
  return {
    data: data as DirectoryBusinessRow[] | null,
    error,
  };
}

async function runSupabaseBusinessQueryWithFallback(
  filters: DirectoryFilters,
  options: DirectoryQueryOptions = {}
): Promise<DirectoryBusinessRow[] | null> {
  let result = await runSupabaseBusinessQuery(filters, options, DIRECTORY_SELECT_FIELDS);
  if (result.error || !result.data) {
    result = await runSupabaseBusinessQuery(filters, options, BASE_DIRECTORY_SELECT_FIELDS);
  }

  return result.error || !result.data ? null : result.data;
}

async function querySupabaseMostPopularBusinesses(
  filters: DirectoryFilters,
  options: DirectoryQueryOptions = {}
): Promise<DirectoryBusinessRow[] | null> {
  const client = getDirectoryDbClient();
  if (!client) {
    return null;
  }
  const activeClient = client;

  async function runPriorityQuery(selectFields: string) {
    let query = activeClient
      .from('businesses')
      .select(selectFields)
      .in('slug', [...MOST_POPULAR_DIRECTORY_BUSINESS_SLUGS]);

    query = applyDirectoryQueryFilters(query, filters, options);
    query = query.limit(MOST_POPULAR_DIRECTORY_BUSINESS_SLUGS.length);

    const { data, error } = await query;
    return {
      data: data as DirectoryBusinessRow[] | null,
      error,
    };
  }

  let result = await runPriorityQuery(DIRECTORY_SELECT_FIELDS);
  if (result.error || !result.data) {
    result = await runPriorityQuery(BASE_DIRECTORY_SELECT_FIELDS);
  }

  return result.error || !result.data ? null : result.data;
}

async function querySupabaseBusinesses(
  filters: DirectoryFilters,
  options: DirectoryQueryOptions = {}
): Promise<Business[] | null> {
  if (!getDirectoryDbClient()) {
    return null;
  }

  const data = await runSupabaseBusinessQueryWithFallback(filters, options);
  if (!data) {
    return null;
  }

  const mostPopularRows = await querySupabaseMostPopularBusinesses(filters, options);
  const mergedRows = dedupeDirectoryBusinessRowsBySlug([
    ...(mostPopularRows ?? []),
    ...data,
  ]);

  return applyClientFilters(
    await attachActiveDirectoryAdCampaigns(mergedRows.map(rowToBusiness)),
    filters,
    options
  );
}

function queryStaticBusinesses(
  sourceBusinesses: Business[],
  filters: DirectoryFilters,
  options: DirectoryQueryOptions = {}
): Business[] {
  const sort = filters.sort ?? 'featured';
  const search = normalize(filters.q);
  const mapped = sourceBusinesses.map((business) => mapFixtureBusiness(business, options.site));
  const referencePoint = getDistanceReferencePoint(mapped, filters);
  const filtered = mapped.filter((business) => {
    if (options.excludeSlug && business.slug === options.excludeSlug) {
      return false;
    }

    if (filters.city && normalize(business.city) !== normalize(filters.city)) {
      return false;
    }

    if (filters.category && business.categorySlug !== filters.category) {
      return false;
    }

    if (filters.verifiedOnly && business.verificationState === 'unverified') {
      return false;
    }

    if (filters.language && !business.languages.includes(filters.language as never)) {
      return false;
    }

    if (filters.minRating && business.rating < filters.minRating) {
      return false;
    }

    if (filters.businessStatus) {
      const hoursState = getBusinessHoursState(business);
      if (filters.businessStatus === 'open_now' && hoursState !== 'open') {
        return false;
      }
      if (filters.businessStatus === 'closed_now' && hoursState !== 'closed') {
        return false;
      }
    }

    if (filters.newcomerFriendlyOnly && !business.newcomerFriendly) {
      return false;
    }

    if (!options.includeNonPublic && !isPublicDirectoryBusiness(business)) {
      return false;
    }

    if (!search) {
      return true;
    }

    const haystack = [
      business.name.en,
      business.name.zh ?? '',
      business.shortDescription.en,
      business.shortDescription.zh ?? '',
      business.description.en,
      business.description.zh ?? '',
      business.city,
      business.region,
      ...business.searchAliases,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(search);
  });

  return filtered
    .sort((left, right) => sortBusinesses(left, right, sort, referencePoint, options))
    .slice(0, options.limit);
}

function queryFixtureBusinesses(filters: DirectoryFilters, options: DirectoryQueryOptions = {}): Business[] {
  return queryStaticBusinesses(fixtureBusinesses, filters, options);
}

function querySiteStaticBusinesses(
  site: SiteProfile,
  filters: DirectoryFilters,
  options: DirectoryQueryOptions = {}
): Business[] {
  const businesses = getStaticDirectoryBusinessesForSite(site);
  if (businesses) {
    return queryStaticBusinesses(businesses, filters, options);
  }

  return [];
}

function shouldUseDefaultDirectorySource(site: SiteProfile): boolean {
  return site.key === defaultSiteProfile.key && site.directory.allowDefaultFallback;
}

export async function getDirectoryBusinesses(
  filters: DirectoryFilters = {},
  options: DirectoryQueryOptions = {}
): Promise<Business[]> {
  const site = options.site ?? defaultSiteProfile;
  if (!hasLiveDirectoryData(site)) {
    return [];
  }

  if (!shouldUseDefaultDirectorySource(site)) {
    return querySiteStaticBusinesses(site, filters, options);
  }

  if (fixtureBusinessesEnabled()) {
    return queryFixtureBusinesses(filters, options);
  }

  const results = await querySupabaseBusinesses(filters, options);
  if (results) {
    return results;
  }

  return queryFixtureBusinesses(filters, options);
}

export async function getDirectoryPage(
  filters: DirectoryFilters = {},
  page = 1,
  pageSize = 24,
  options: DirectoryQueryOptions = {}
): Promise<DirectoryPage> {
  const normalizedPageSize = Math.max(1, Math.floor(pageSize));
  const requestedPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  // Public-directory gating still happens client-side, so we page after loading the filtered set.
  const businesses = await getDirectoryBusinesses(filters, {
    ...options,
    limit: DIRECTORY_PAGE_FETCH_LIMIT,
  });
  const totalCount = businesses.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const startIndex = (currentPage - 1) * normalizedPageSize;

  return {
    businesses: businesses.slice(startIndex, startIndex + normalizedPageSize),
    currentPage,
    pageSize: normalizedPageSize,
    totalCount,
    totalPages,
  };
}

export async function getDirectoryBusinessBySlug(slug: string, options: DirectoryQueryOptions = {}): Promise<Business | undefined> {
  const site = options.site ?? defaultSiteProfile;
  if (!hasLiveDirectoryData(site)) {
    return undefined;
  }

  if (!shouldUseDefaultDirectorySource(site)) {
    const business = querySiteStaticBusinesses(site, {}, { ...options, includeNonPublic: true }).find(
      (item) => item.slug === slug
    );
    if (!business) {
      return undefined;
    }

    return options.includeNonPublic || isPublicDirectoryBusiness(business) ? business : undefined;
  }

  if (fixtureBusinessesEnabled()) {
    const business = queryFixtureBusinesses({}, { includeNonPublic: true }).find((item) => item.slug === slug);
    if (!business) {
      return undefined;
    }

    return options.includeNonPublic || isPublicDirectoryBusiness(business) ? business : undefined;
  }

  const client = getDirectoryDbClient();
  if (client) {
    const initialResult = await client
      .from('businesses')
      .select(DIRECTORY_SELECT_FIELDS)
      .eq('slug', slug)
      .maybeSingle();
    let data = initialResult.data as DirectoryBusinessRow | null;
    let error = initialResult.error;

    if (error || !data) {
      const legacyResult = await client
        .from('businesses')
        .select(BASE_DIRECTORY_SELECT_FIELDS)
        .eq('slug', slug)
        .maybeSingle();

      data = legacyResult.data as DirectoryBusinessRow | null;
      error = legacyResult.error;
    }

    if (!error && data) {
      const [business] = await attachActiveDirectoryAdCampaigns([rowToBusiness(data)]);
      if (options.includeNonPublic || isPublicDirectoryBusiness(business)) {
        return business;
      }
      return undefined;
    }
  }

  const business = queryFixtureBusinesses({}, { includeNonPublic: true }).find((item) => item.slug === slug);
  if (!business) {
    return undefined;
  }

  return options.includeNonPublic || isPublicDirectoryBusiness(business) ? business : undefined;
}

export async function getDirectoryCategories(site: SiteProfile = defaultSiteProfile): Promise<BusinessCategory[]> {
  if (!hasLiveDirectoryData(site)) {
    return [];
  }

  if (!shouldUseDefaultDirectorySource(site)) {
    const allowedSlugs = new Set(site.directory.categorySlugs);
    return businessCategories.filter((category) => allowedSlugs.has(category.slug));
  }

  if (fixtureBusinessesEnabled()) {
    return businessCategories;
  }

  const client = getDirectoryDbClient();
  if (client) {
    const { data, error } = await client
      .from('business_categories')
      .select('slug, name_en, name_zh_tw, description_en, description_zh_tw, icon')
      .order('name_en', { ascending: true });

    if (!error && data) {
      return data.map((row) => toCategoryRecord(row as DirectoryCategoryRow));
    }
  }

  return businessCategories;
}

export async function getDirectoryBusinessCategoriesBySlug(
  site: SiteProfile = defaultSiteProfile
): Promise<Record<string, BusinessCategory>> {
  const categories = await getDirectoryCategories(site);
  return categories.reduce<Record<string, BusinessCategory>>((accumulator, category) => {
    accumulator[category.slug] = category;
    return accumulator;
  }, {});
}

export async function getDirectoryFilterOptions(site: SiteProfile = defaultSiteProfile) {
  const [categories, businesses] = await Promise.all([
    getDirectoryCategories(site),
    getDirectoryBusinesses({}, { limit: 500, site }),
  ]);

  const cities = Array.from(new Set(businesses.map((business) => business.city))).sort((left, right) =>
    left.localeCompare(right)
  );
  const languages = Array.from(
    new Set(
      businesses.flatMap((business) => business.languages)
    )
  ).sort((left, right) => left.localeCompare(right));

  return {
    categories,
    cities,
    languages,
  };
}

export async function getHomepageFeaturedBusinesses(site: SiteProfile = defaultSiteProfile): Promise<Business[]> {
  const businesses = await getDirectoryBusinesses({ sort: 'featured' }, { limit: 24, site });
  const featured = businesses.filter(qualifiesForHomepageFeature).slice(0, FEATURED_HOME_THRESHOLD);
  return featured.length >= FEATURED_HOME_THRESHOLD ? featured : [];
}

export async function getDirectoryCoverageSummary(site: SiteProfile = defaultSiteProfile) {
  const businesses = await getDirectoryBusinesses({}, { limit: 1000, site });
  const counts = businesses.reduce<Record<string, number>>((accumulator, business) => {
    accumulator[business.categorySlug] = (accumulator[business.categorySlug] ?? 0) + 1;
    return accumulator;
  }, {});

  const hasSearchDominantCoverage =
    businesses.length >= SEARCH_DOMINANT_TOTAL_THRESHOLD &&
    searchDominantCategories.every((category) => (counts[category] ?? 0) >= SEARCH_DOMINANT_CATEGORY_THRESHOLD);

  return {
    totalLiveListings: businesses.length,
    countsByCategory: counts,
    hasSearchDominantCoverage,
  };
}

export async function getDirectoryBusinessSlugs(site: SiteProfile = defaultSiteProfile): Promise<string[]> {
  if (!hasLiveDirectoryData(site)) {
    return [];
  }

  if (!shouldUseDefaultDirectorySource(site)) {
    return querySiteStaticBusinesses(site, {}, {}).map((business) => business.slug);
  }

  if (fixtureBusinessesEnabled()) {
    return queryFixtureBusinesses({}, {}).map((business) => business.slug);
  }

  const client = getDirectoryDbClient();
  if (client) {
    const { data, error } = await client
      .from('businesses')
      .select('slug, city, status, verification_state, phone, website, email, address, service_area_text')
      .in('status', ['live', 'stale']);

    if (!error && data) {
      return data
        .map((row) =>
          rowToBusiness({
            ...row,
            id: row.slug,
            name_en: row.slug,
            city: row.city ?? '',
          } as DirectoryBusinessRow)
        )
        .filter(isPublicDirectoryBusiness)
        .map((business) => business.slug);
    }
  }

  return queryFixtureBusinesses({}, {}).map((business) => business.slug);
}

export function getCategoryForBusiness(business: Business): BusinessCategory | undefined {
  return mapFixtureCategory(business.categorySlug);
}
