import { businessCategories } from '@/data/platform-data';
import { t } from '@/lib/i18n';
import { getLocalizedCityName } from '@/lib/metro-categories';
import type { SiteProfile } from '@/lib/site-config';
import type { Business, Locale } from '@/lib/types';

// Search titles and schema.org types for business pages (issue #444). People
// search "Chinese-speaking realtor Phoenix" or 鳳凰城華人地產經紀, so the title
// names what the business does and where, not just its name.

type Copy = { en: string; zh: string };

// What a listing in each category is. Every label must be true for any
// listing in that category, so mixed categories get a broad label.
const businessTypeLabels: Record<string, Copy> = {
  'real-estate': { en: 'Real Estate', zh: '房地產' },
  medical: { en: 'Medical & Health Care', zh: '醫療保健' },
  'legal-finance': { en: 'Legal, Tax & Finance', zh: '法律、報稅與理財' },
  education: { en: 'Education & Tutoring', zh: '教育與補習' },
  'home-services': { en: 'Home Services', zh: '居家維修' },
  dining: { en: 'Restaurant & Food', zh: '餐飲' },
  shopping: { en: 'Shopping & Markets', zh: '購物與超市' },
  'beauty-wellness': { en: 'Beauty & Wellness', zh: '美容養生' },
  'local-services': { en: 'Local Services', zh: '在地服務' },
  moving: { en: 'Moving Services', zh: '搬家服務' },
  'faith-community': { en: 'Faith & Community', zh: '宗教與社群' },
  travel: { en: 'Travel Services', zh: '旅遊服務' },
  jobs: { en: 'Career Services', zh: '職涯服務' },
};

// schema.org LocalBusiness subtypes that hold for every listing in a category.
const businessSchemaTypes: Record<string, string> = {
  'real-estate': 'RealEstateAgent',
  medical: 'MedicalBusiness',
  'legal-finance': 'ProfessionalService',
  'home-services': 'HomeAndConstructionBusiness',
  dining: 'FoodEstablishment',
  shopping: 'Store',
  'beauty-wellness': 'HealthAndBeautyBusiness',
  moving: 'MovingCompany',
  travel: 'TravelAgency',
  jobs: 'EmploymentAgency',
};

const chineseSpokenLanguages = new Set(['Mandarin', 'Cantonese', 'Taiwanese', 'Chinese']);

function pick(locale: Locale, copy: Copy): string {
  return locale === 'zh' ? copy.zh : copy.en;
}

export function getBusinessTypeLabel(categorySlug: string, locale: Locale): string {
  const label = businessTypeLabels[categorySlug];
  if (label) {
    return pick(locale, label);
  }

  const category = businessCategories.find((item) => item.slug === categorySlug);
  return category ? t(category.name, locale) : pick(locale, { en: 'Local Business', zh: '在地商家' });
}

export function getBusinessSchemaType(categorySlug: string): string {
  return businessSchemaTypes[categorySlug] ?? 'LocalBusiness';
}

// "Chinese-speaking" only when the listing says so: a Chinese spoken language,
// or the bilingual-service flag the listing card already shows as a badge.
export function speaksChinese(business: Pick<Business, 'languages' | 'bilingual'>): boolean {
  return business.bilingual || business.languages.some((language) => chineseSpokenLanguages.has(language));
}

function cityLabel(business: Pick<Business, 'city'>, site: SiteProfile, locale: Locale): string {
  const city = business.city.trim();
  if (!city) {
    return '';
  }

  if (locale === 'zh') {
    return getLocalizedCityName(city, site, locale);
  }

  return site.stateCode ? `${city}, ${site.stateCode}` : city;
}

// EN: "Hedy Li – Chinese-Speaking Real Estate in Phoenix, AZ | ChineseArizona"
// ZH: "Hedy Li｜鳳凰城房地產・中文服務 | ChineseArizona"
export function buildBusinessSeoTitle(
  business: Pick<Business, 'name' | 'city' | 'categorySlug' | 'languages' | 'bilingual'>,
  site: SiteProfile,
  locale: Locale
): string {
  const name = t(business.name, locale);
  const label = getBusinessTypeLabel(business.categorySlug, locale);
  const city = cityLabel(business, site, locale);
  const chinese = speaksChinese(business);

  if (locale === 'zh') {
    return `${name}｜${city}${label}${chinese ? '・中文服務' : ''} | ${site.brandName}`;
  }

  const what = `${chinese ? 'Chinese-Speaking ' : ''}${label}`;
  return `${name} – ${city ? `${what} in ${city}` : what} | ${site.brandName}`;
}

// Used only when a listing has no short description of its own.
export function buildBusinessFallbackDescription(
  business: Pick<Business, 'name' | 'city' | 'categorySlug' | 'languages' | 'bilingual'>,
  site: SiteProfile,
  locale: Locale
): string {
  const name = t(business.name, locale);
  const label = getBusinessTypeLabel(business.categorySlug, locale);
  const city = cityLabel(business, site, locale);

  if (locale === 'zh') {
    return `${name}：${city}${label}。查看地址、電話、營業時間與服務語言。`;
  }

  return `${name}: ${label.toLowerCase()} in ${city || site.regionName}. See the address, phone, hours, and languages spoken.`;
}
