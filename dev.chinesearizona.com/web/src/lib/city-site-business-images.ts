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
  'austin-chinese-school': '/city-site-images/austin-chinese-school.webp',
  'cheng-wooster-real-estate-austin': '/city-site-images/cheng-wooster-real-estate-austin.webp',
  'chinatown-service-center-los-angeles': '/city-site-images/chinatown-service-center-los-angeles.webp',
  'chinese-american-museum-los-angeles': '/city-site-images/chinese-american-museum-los-angeles.webp',
  'h-mart-austin': '/city-site-images/h-mart-austin.webp',
  'house-of-three-gorges-austin': '/city-site-images/house-of-three-gorges-austin.webp',
  'irn-realty-arcadia': '/city-site-images/irn-realty-arcadia.webp',
  'lunasia-dim-sum-house-alhambra': '/city-site-images/lunasia-dim-sum-house-alhambra.webp',
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
