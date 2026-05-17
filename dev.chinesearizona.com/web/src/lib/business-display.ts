import { businessHoursLabel, businessHoursValue, t } from '@/lib/i18n';
import type { Business, Locale, LocalizedText } from '@/lib/types';

type HoursPreview = {
  items: string[];
  remainingCount: number;
};

const MENU_HOST_PATTERN =
  /(menufy|toasttab|clover|beyondmenu|eatstreet|grubhub|doordash|ubereats|chownow|qmenu|menupix|sirved|spotapps)/i;
const MENU_PATH_PATTERN = /\/(menu|order|ordering|online-order|pickup|takeout|delivery)(?:[/?#]|$)/i;
const MENU_CONTEXT_PATTERN = /\b(menu|order online|online ordering|delivery|takeout|carryout|pickup)\b/i;
const DESCRIPTION_SERVICE_PATTERNS: Array<{ pattern: RegExp; label: LocalizedText }> = [
  { pattern: /\b(order online|online ordering)\b/i, label: { en: 'Online ordering', zh: '線上點餐' } },
  { pattern: /\bdelivery\b/i, label: { en: 'Delivery', zh: '外送' } },
  { pattern: /\b(takeout|carryout|pickup)\b/i, label: { en: 'Takeout', zh: '外帶' } },
  { pattern: /\bdine[ -]?in\b/i, label: { en: 'Dine-in', zh: '內用' } },
  { pattern: /\bcatering\b/i, label: { en: 'Catering', zh: '外燴' } },
  { pattern: /\bappointment(s)?\b/i, label: { en: 'Appointments', zh: '可預約' } },
];
const GENERIC_SERVICE_WORDS = new Set([
  'arizona',
  'az',
  'business',
  'businesses',
  'cafe',
  'chinese',
  'company',
  'cuisine',
  'english',
  'food',
  'local',
  'mandarin',
  'menu',
  'restaurant',
  'restaurants',
  'service',
  'services',
  'taiwanese',
  'traditional',
  'website',
]);

function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeForComparison(value)
    .split(/[\s-]+/)
    .filter(Boolean);
}

function isMostlyLowercase(value: string): boolean {
  const letters = value.match(/[A-Za-z]/g);
  if (!letters?.length) {
    return false;
  }

  const uppercaseLetters = value.match(/[A-Z]/g) ?? [];
  return uppercaseLetters.length <= 1;
}

function titleCaseWords(words: string[]): string {
  return words
    .map((word) => {
      if (word.length <= 2) {
        return word.toUpperCase();
      }

      return `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`;
    })
    .join(' ');
}

function hasCjkText(value: string): boolean {
  return /[\u3400-\u9fff]/.test(value);
}

export function formatBusinessServiceHighlightLabel(
  business: Business,
  sourceLabel: string,
  localizedLabel: string
): string | undefined {
  const source = sourceLabel.trim();
  const localized = localizedLabel.trim();

  if (!source) {
    return undefined;
  }

  if (!localized) {
    return undefined;
  }

  if (hasCjkText(source)) {
    return localized;
  }

  const blockedTokens = new Set([
    ...tokenize(business.name.en),
    ...tokenize(business.city),
    ...tokenize(business.region),
    ...tokenize(business.categorySlug),
  ]);
  const sourceTokens = tokenize(source);
  const meaningfulTokens = sourceTokens.filter((token) => !blockedTokens.has(token));

  if (!meaningfulTokens.length) {
    return undefined;
  }

  const usefulTokens = meaningfulTokens.filter((token) => !GENERIC_SERVICE_WORDS.has(token));
  if (!usefulTokens.length) {
    return undefined;
  }

  if (hasCjkText(localized)) {
    return localized;
  }

  if (!isMostlyLowercase(localized) && usefulTokens.length === meaningfulTokens.length) {
    return localized;
  }

  return titleCaseWords(usefulTokens);
}

function pushUnique(accumulator: string[], value: string | undefined) {
  if (!value) {
    return;
  }

  if (!accumulator.some((item) => item.toLowerCase() === value.toLowerCase())) {
    accumulator.push(value);
  }
}

export function getBusinessDescriptionServiceHighlights(
  business: Business,
  locale: Locale,
  limit = 3,
  existingHighlights: string[] = []
): string[] {
  const highlights = [...existingHighlights];
  const descriptionText = [business.shortDescription.en, business.description.en].join(' ');

  for (const item of DESCRIPTION_SERVICE_PATTERNS) {
    if (item.pattern.test(descriptionText)) {
      pushUnique(highlights, t(item.label, locale));
    }
    if (highlights.length >= limit) {
      return highlights.slice(0, limit);
    }
  }

  return highlights.slice(0, limit);
}

export function getBusinessHoursPreview(hours: Business['hours'], locale: Locale, limit = 2): HoursPreview {
  const items = hours
    .slice(0, limit)
    .filter((row) => row.label && row.value)
    .map((row) => `${businessHoursLabel(row.label, locale)}: ${businessHoursValue(row.value, locale)}`);

  return {
    items,
    remainingCount: Math.max(0, hours.length - items.length),
  };
}

export function getBusinessDirectionsUrl(
  business: Pick<Business, 'address' | 'city' | 'coordinates' | 'name' | 'serviceAreaText'>
): string | undefined {
  const destination =
    business.coordinates
      ? `${business.coordinates.lat},${business.coordinates.lng}`
      : business.address ?? `${business.name.en} ${business.city} Arizona ${business.serviceAreaText ?? ''}`.trim();

  return destination
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
    : undefined;
}

export function getBusinessMenuUrl(
  business: Pick<
    Business,
    'categorySlug' | 'description' | 'menuUrl' | 'searchAliases' | 'shortDescription' | 'website'
  >
): string | undefined {
  if (business.menuUrl) {
    return business.menuUrl;
  }

  if (!business.website) {
    return undefined;
  }

  const normalizedWebsite = business.website.trim();
  try {
    const url = new URL(normalizedWebsite);
    const websiteContext = `${url.hostname}${url.pathname}`;
    if (MENU_HOST_PATTERN.test(websiteContext) || MENU_PATH_PATTERN.test(url.pathname)) {
      return normalizedWebsite;
    }
  } catch {
    return undefined;
  }

  if (business.categorySlug !== 'dining') {
    return undefined;
  }

  const searchContext = [
    business.shortDescription.en,
    business.description.en,
    ...business.searchAliases,
  ].join(' ');

  return MENU_CONTEXT_PATTERN.test(searchContext) ? normalizedWebsite : undefined;
}

export function getBusinessServiceHighlights(
  business: Business,
  locale: Locale,
  limit = 3
): string[] {
  const highlights: string[] = [];

  for (const service of business.services) {
    pushUnique(
      highlights,
      formatBusinessServiceHighlightLabel(business, service.en, t(service, locale))
    );
    if (highlights.length >= limit) {
      return highlights.slice(0, limit);
    }
  }

  return getBusinessDescriptionServiceHighlights(business, locale, limit, highlights);
}
