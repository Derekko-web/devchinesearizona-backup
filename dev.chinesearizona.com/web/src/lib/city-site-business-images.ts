import type { SiteProfile } from '@/lib/site-config';
import type { Business, BusinessCategory, Locale } from '@/lib/types';

type ResolvedBusinessImages = {
  heroImage?: string | null;
  gallery: string[];
  usesContextualFallback: boolean;
  altLabel: string;
};

const CITY_IMAGE_SITE_KEYS = new Set(['austin', 'los-angeles', 'sf-bay']);

const businessSpecificCityImages: Record<string, string> = {
  'house-of-three-gorges-austin': '/city-site-images/house-of-three-gorges-austin.webp',
  'din-ho-chinese-bbq-austin': '/city-site-images/din-ho-chinese-bbq-austin.webp',
  'julies-noodles-austin': '/city-site-images/julies-noodles-austin.webp',
  'chens-noodle-house-austin': '/city-site-images/chens-noodle-house-austin.webp',
  'noodle-alley-cedar-park': '/city-site-images/noodle-alley-cedar-park.webp',
  'hunan-lion-round-rock': '/city-site-images/hunan-lion-round-rock.webp',
  'bamboo-bistro-pflugerville': '/city-site-images/bamboo-bistro-pflugerville.webp',
  'asia-market-austin': '/city-site-images/asia-market-austin.webp',
  'h-mart-austin': '/city-site-images/h-mart-austin.webp',
  '99-ranch-market-austin': '/city-site-images/99-ranch-market-austin.webp',
  'austin-chinese-school': '/city-site-images/austin-chinese-school.webp',
  'austin-great-wall-chinese-school': '/city-site-images/austin-great-wall-chinese-school.webp',
  'austin-quan-yin': '/city-site-images/austin-quan-yin.webp',
  'kung-acupuncture-austin': '/city-site-images/kung-acupuncture-austin.webp',
  'cheng-wooster-real-estate-austin': '/city-site-images/cheng-wooster-real-estate-austin.webp',
  'yz-cpa-austin': '/city-site-images/yz-cpa-austin.webp',
  'asian-american-resource-center-austin': '/city-site-images/asian-american-resource-center-austin.webp',
  'chinese-society-of-austin': '/city-site-images/chinese-society-of-austin.webp',
  'red-lotus-asian-grille-austin': '/city-site-images/red-lotus-asian-grille-austin.webp',
  'rice-bowl-cafe-austin': '/city-site-images/rice-bowl-cafe-austin.webp',
  'shan-china-bistro-and-bar-austin': '/city-site-images/shan-china-bistro-and-bar-austin.webp',
  'soupleaf-hot-pot-austin': '/city-site-images/soupleaf-hot-pot-austin.webp',
  'steamies-dumplings-austin': '/city-site-images/steamies-dumplings-austin.webp',
  'austin-table-tennis-club-austin': '/city-site-images/austin-table-tennis-club-austin.webp',
  'greater-austin-asian-chamber-of-commerce-austin': '/city-site-images/greater-austin-asian-chamber-of-commerce-austin.webp',
  'lotus-chinese-austin': '/city-site-images/lotus-chinese-austin.webp',
  'tso-chinese-takeout-delivery-round-rock': '/city-site-images/tso-chinese-takeout-delivery-round-rock.webp',
  'taiwan-center-for-mandarin-learning-at-austin-austin': '/city-site-images/taiwan-center-for-mandarin-learning-at-austin-austin.webp',
  'austin-chinese-church-austin': '/city-site-images/austin-chinese-church-austin.webp',
  'austin-christian-assembly-austin': '/city-site-images/austin-christian-assembly-austin.webp',
  'austin-taiwanese-presbyterian-church-austin': '/city-site-images/austin-taiwanese-presbyterian-church-austin.webp',
  'asian-family-support-services-of-austin-austin': '/city-site-images/asian-family-support-services-of-austin-austin.webp',
  'wu-chow-downtown-austin': '/city-site-images/wu-chow-downtown-austin.webp',
  'ct3-table-tennis-club-austin': '/city-site-images/ct3-table-tennis-club-austin.webp',
  'hunan-bistro-austin': '/city-site-images/hunan-bistro-austin.webp',
  'lunasia-dim-sum-house-alhambra': '/city-site-images/lunasia-dim-sum-house-alhambra.webp',
  'din-tai-fung-arcadia': '/city-site-images/din-tai-fung-arcadia.webp',
  'mama-lus-dumpling-house-monterey-park': '/city-site-images/mama-lus-dumpling-house-monterey-park.webp',
  'newport-seafood-san-gabriel': '/city-site-images/newport-seafood-san-gabriel.webp',
  '99-ranch-market-san-gabriel': '/city-site-images/99-ranch-market-san-gabriel.webp',
  'wing-hop-fung-arcadia': '/city-site-images/wing-hop-fung-arcadia.webp',
  'irn-realty-arcadia': '/city-site-images/irn-realty-arcadia.webp',
  'east-west-bank-pasadena': '/city-site-images/east-west-bank-pasadena.webp',
  'asian-americans-advancing-justice-southern-california': '/city-site-images/asian-americans-advancing-justice-southern-california.webp',
  'herald-christian-health-center-san-gabriel': '/city-site-images/herald-christian-health-center-san-gabriel.webp',
  'chinatown-service-center-los-angeles': '/city-site-images/chinatown-service-center-los-angeles.webp',
  'chinese-american-museum-los-angeles': '/city-site-images/chinese-american-museum-los-angeles.webp',
  'arcadia-chinese-school': '/city-site-images/arcadia-chinese-school.webp',
  'first-chinese-baptist-church-sgv': '/city-site-images/first-chinese-baptist-church-sgv.webp',
  'bistro-na-s-temple-city': '/city-site-images/bistro-na-s-temple-city.webp',
  'first-ave-education-arcadia': '/city-site-images/first-ave-education-arcadia.webp',
  'chinese-academy-of-los-angeles-los-angeles': '/city-site-images/chinese-academy-of-los-angeles-los-angeles.webp',
  'chinese-confucius-temple-school-los-angeles': '/city-site-images/chinese-confucius-temple-school-los-angeles.webp',
  'kit-leung-cpa-alhambra': '/city-site-images/kit-leung-cpa-alhambra.webp',
  'chinese-historical-society-of-southern-california-los-angeles': '/city-site-images/chinese-historical-society-of-southern-california-los-angeles.webp',
  'buddhist-tzu-chi-medical-foundation-alhambra-health-center-alhambra': '/city-site-images/buddhist-tzu-chi-medical-foundation-alhambra-health-center-alhambra.webp',
  'henry-s-w-chen-dds-dental-office-san-gabriel': '/city-site-images/henry-s-w-chen-dds-dental-office-san-gabriel.webp',
  'sgv-dentistry-san-gabriel': '/city-site-images/sgv-dentistry-san-gabriel.webp',
  'southern-california-chinese-lawyers-association-los-angeles': '/city-site-images/southern-california-chinese-lawyers-association-los-angeles.webp',
  'usc-pacific-asia-museum-pasadena': '/city-site-images/usc-pacific-asia-museum-pasadena.webp',
  'chinese-christian-herald-crusades-san-gabriel-center-san-gabriel': '/city-site-images/chinese-christian-herald-crusades-san-gabriel-center-san-gabriel.webp',
  'chinese-evangelical-free-church-of-los-angeles-monterey-park': '/city-site-images/chinese-evangelical-free-church-of-los-angeles-monterey-park.webp',
  'asian-youth-center-san-gabriel': '/city-site-images/asian-youth-center-san-gabriel.webp',
  'happy-lemon-alhambra-alhambra': '/city-site-images/happy-lemon-alhambra-alhambra.webp',
  'chicha-san-chen-san-gabriel-san-gabriel': '/city-site-images/chicha-san-chen-san-gabriel-san-gabriel.webp',
  'r-g-lounge-san-francisco': '/city-site-images/r-g-lounge-san-francisco.webp',
  'china-live-san-francisco': '/city-site-images/china-live-san-francisco.webp',
  'din-tai-fung-santa-clara': '/city-site-images/din-tai-fung-santa-clara.webp',
  '99-ranch-market-cupertino': '/city-site-images/99-ranch-market-cupertino.webp',
  'chinese-american-international-school-san-francisco': '/city-site-images/chinese-american-international-school-san-francisco.webp',
  'chinese-culture-center-san-francisco': '/city-site-images/chinese-culture-center-san-francisco.webp',
  'north-east-medical-services-stockton-clinic': '/city-site-images/north-east-medical-services-stockton-clinic.webp',
  'asian-health-services-oakland': '/city-site-images/asian-health-services-oakland.webp',
  'api-legal-outreach-san-francisco': '/city-site-images/api-legal-outreach-san-francisco.webp',
  'asian-law-alliance-san-jose': '/city-site-images/asian-law-alliance-san-jose.webp',
  'maxreal-sunnyvale': '/city-site-images/maxreal-sunnyvale.webp',
  'golden-express-bay-area-courier': '/city-site-images/golden-express-bay-area-courier.webp',
  'mister-jiu-s-san-francisco': '/city-site-images/mister-jiu-s-san-francisco.webp',
  'z-y-restaurant-san-francisco': '/city-site-images/z-y-restaurant-san-francisco.webp',
  'chinese-historical-society-of-america-san-francisco': '/city-site-images/chinese-historical-society-of-america-san-francisco.webp',
  'self-help-for-the-elderly-san-francisco': '/city-site-images/self-help-for-the-elderly-san-francisco.webp',
  'tzu-chi-northwest-region-san-jose-san-jose': '/city-site-images/tzu-chi-northwest-region-san-jose-san-jose.webp',
  'chinese-hospital-san-francisco': '/city-site-images/chinese-hospital-san-francisco.webp',
  'tong-de-health-center-san-francisco': '/city-site-images/tong-de-health-center-san-francisco.webp',
  'berryessa-chinese-school-san-jose': '/city-site-images/berryessa-chinese-school-san-jose.webp',
  'chinese-medicine-clinic-education-center-san-francisco': '/city-site-images/chinese-medicine-clinic-education-center-san-francisco.webp',
  'west-valley-chinese-language-school-cupertino': '/city-site-images/west-valley-chinese-language-school-cupertino.webp',
  'chinese-for-affirmative-action-san-francisco': '/city-site-images/chinese-for-affirmative-action-san-francisco.webp',
  'donaldina-cameron-house-san-francisco': '/city-site-images/donaldina-cameron-house-san-francisco.webp',
  'chung-chou-city-san-francisco': '/city-site-images/chung-chou-city-san-francisco.webp',
  'house-of-nanking-san-francisco': '/city-site-images/house-of-nanking-san-francisco.webp',
  'cupertino-chinese-school-cupertino': '/city-site-images/cupertino-chinese-school-cupertino.webp',
  'wai-lau-dds-san-francisco': '/city-site-images/wai-lau-dds-san-francisco.webp',
  'happy-lemon-cupertino-cupertino': '/city-site-images/happy-lemon-cupertino-cupertino.webp',
};

export function canUseCitySiteBusinessImageFallback(site?: SiteProfile): site is SiteProfile {
  return Boolean(site && CITY_IMAGE_SITE_KEYS.has(site.key));
}

export function getCitySiteBusinessSpecificImage(slug: string): string | undefined {
  return businessSpecificCityImages[slug];
}

export function getCitySiteContextImage(site?: SiteProfile): string | undefined {
  if (!canUseCitySiteBusinessImageFallback(site)) {
    return undefined;
  }

  return site.home.heroImageUrl;
}

function uniqueImages(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function withoutQueryString(value: string): string {
  return value.split('?')[0] ?? value;
}

function contextualImageVariants(site: SiteProfile): string[] {
  const baseImages = uniqueImages([
    site.home.mapImageUrl,
    site.home.relocationImageUrl,
    site.home.heroImageUrl,
    site.home.heroForegroundImageUrl,
  ]);

  if (baseImages.length >= 4) {
    return baseImages;
  }

  const primaryImage = baseImages[0] ?? site.home.heroImageUrl;
  return Array.from({ length: 4 }, (_, index) =>
    index === 0 ? primaryImage : `${primaryImage}?city-context=${index + 1}`
  );
}

function contextualAltLabel(
  business: Business,
  site: SiteProfile,
  category: BusinessCategory | undefined,
  locale: Locale
): string {
  const categoryLabel = category ? (locale === 'zh' ? category.name.zh ?? category.name.en : category.name.en) : undefined;

  if (locale === 'zh') {
    return `${site.regionNameZh}${categoryLabel ?? '城市'}指南圖像：${business.name.zh ?? business.name.en}`;
  }

  return `${site.regionName} ${categoryLabel ?? 'city'} guide image for ${business.name.en}`;
}

export function resolveCitySiteBusinessImages(
  business: Business,
  site: SiteProfile,
  options: {
    category?: BusinessCategory;
    locale: Locale;
    minimumGalleryImages?: number;
  }
): ResolvedBusinessImages {
  if (!canUseCitySiteBusinessImageFallback(site)) {
    return {
      heroImage: business.heroImage,
      gallery: business.gallery,
      usesContextualFallback: false,
      altLabel: business.name.en,
    };
  }

  const specificImage = getCitySiteBusinessSpecificImage(business.slug);
  const fallbackImages = contextualImageVariants(site);
  const heroImage = business.heroImage ?? specificImage ?? fallbackImages[0];
  const minimumGalleryImages = options.minimumGalleryImages ?? 0;
  const gallery = uniqueImages([
    ...business.gallery,
    ...(specificImage && specificImage !== heroImage ? [specificImage] : []),
    ...fallbackImages,
  ]).slice(0, Math.max(minimumGalleryImages, business.gallery.length));
  const contextualFallbackPaths = new Set(fallbackImages.map(withoutQueryString));
  const usesContextualFallback =
    !heroImage || contextualFallbackPaths.has(withoutQueryString(heroImage));

  return {
    heroImage,
    gallery,
    usesContextualFallback,
    altLabel: usesContextualFallback
      ? contextualAltLabel(business, site, options.category, options.locale)
      : business.name.en,
  };
}
