import type { Locale } from '@/lib/types';

export const MAX_BUSINESS_GALLERY_IMAGES = 12;

function fieldLabel(field: 'hero' | 'gallery', locale: Locale): string {
  if (locale === 'zh') {
    return field === 'hero' ? '封面照片網址' : '圖集照片網址';
  }

  return field === 'hero' ? 'Cover photo URL' : 'Gallery photo URL';
}

function invalidUrlMessage(field: 'hero' | 'gallery', locale: Locale): string {
  if (locale === 'zh') {
    return `${fieldLabel(field, locale)}必須是有效的 http 或 https 網址。`;
  }

  return `${fieldLabel(field, locale)} must be a valid http or https URL.`;
}

function tooManyPhotosMessage(locale: Locale): string {
  if (locale === 'zh') {
    return `圖集最多可加入 ${MAX_BUSINESS_GALLERY_IMAGES} 張照片。`;
  }

  return `Gallery supports up to ${MAX_BUSINESS_GALLERY_IMAGES} photos.`;
}

function instagramThumbnailWarning(locale: Locale): string {
  if (locale === 'zh') {
    return '這看起來像 Instagram 的小型頭像連結。拿來當封面時容易模糊或被大幅裁切，而且 Instagram CDN 連結可能會過期；建議改用較大的橫向照片。';
  }

  return 'This looks like a small Instagram profile image URL. It may appear blurry or heavily cropped as a cover photo, and Instagram CDN links can expire. Use a larger landscape image if possible.';
}

function instagramCdnWarning(locale: Locale): string {
  if (locale === 'zh') {
    return '這看起來像 Instagram CDN 圖片連結。這類連結可能會過期或變更，若可以，建議改用商家網站或較穩定圖片來源上的照片。';
  }

  return 'This looks like an Instagram CDN image URL. These links can expire or change, so a website-hosted image is usually more reliable.';
}

export function formatBusinessGalleryInput(gallery?: string[] | null): string {
  return (gallery ?? []).join('\n');
}

export function getBusinessHeroImageWarning(
  value: string | null | undefined,
  locale: Locale = 'en'
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname.endsWith('cdninstagram.com')) {
    return null;
  }

  const stp = (parsed.searchParams.get('stp') ?? '').toLowerCase();
  const looksLikeSmallSquareVariant =
    /(?:^|_)s(?:96|100|150|180|240|320|480)x(?:96|100|150|180|240|320|480)(?:_|$)/.test(stp) ||
    parsed.pathname.includes('/t51.82787-19/');

  if (looksLikeSmallSquareVariant) {
    return instagramThumbnailWarning(locale);
  }

  if (parsed.searchParams.has('oe') || parsed.searchParams.has('oh')) {
    return instagramCdnWarning(locale);
  }

  return null;
}

export function normalizeBusinessPhotoUrl(
  value: string | null | undefined,
  field: 'hero' | 'gallery',
  locale: Locale = 'en'
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(invalidUrlMessage(field, locale));
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(invalidUrlMessage(field, locale));
  }

  return parsed.toString();
}

export function parseBusinessPhotoSet(
  input: {
    heroImage?: string | null;
    gallery?: string[] | null;
    galleryText?: string | null;
  },
  locale: Locale = 'en'
): {
  heroImage?: string;
  gallery: string[];
} {
  const uniqueGallery: string[] = [];
  const seenGallery = new Set<string>();
  const galleryCandidates = Array.isArray(input.gallery)
    ? input.gallery
    : (input.galleryText ?? '').split(/\r?\n/);

  for (const rawValue of galleryCandidates) {
    const normalized = normalizeBusinessPhotoUrl(rawValue, 'gallery', locale);
    if (!normalized || seenGallery.has(normalized)) {
      continue;
    }

    seenGallery.add(normalized);
    uniqueGallery.push(normalized);
  }

  if (uniqueGallery.length > MAX_BUSINESS_GALLERY_IMAGES) {
    throw new Error(tooManyPhotosMessage(locale));
  }

  let heroImage = normalizeBusinessPhotoUrl(input.heroImage, 'hero', locale);
  let gallery = uniqueGallery;

  if (!heroImage && gallery.length > 0) {
    [heroImage, ...gallery] = gallery;
  }

  if (heroImage) {
    gallery = gallery.filter((url) => url !== heroImage);
  }

  return {
    heroImage,
    gallery,
  };
}
