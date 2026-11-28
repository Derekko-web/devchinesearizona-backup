import type { Business, LocalizedText } from '@/lib/types';

// What the site may say about a listing (CEO decisions, 2026-11-27, issue #457).
//
// - Star ratings and review counts: shown only when they come from reviews
//   collected on our own site. We collect none yet, so pages show none and emit
//   no aggregateRating. The stored rating / review_count numbers were copied
//   from Google on the old WordPress site; they stay in the data, unused.
// - "Verified": only when an owner has claimed the listing. Editors imported
//   most listings from public sources with verification_state 'editor_verified'
//   as a default, so that state alone is shown as "Listed from public sources".
// - "Bilingual" and Chinese-speaking wording: only when `languages` records a
//   Chinese spoken language. The `bilingual` column is not evidence.
//
// Who may buy a plan is a separate rule (verificationState !== 'unverified' in
// ListingPlanPanel and DirectoryAdCampaignPanel) and does not change here.

export type ListingTrustLevel = 'owner_verified' | 'public_sources' | 'unverified';

type TrustFields = Pick<Business, 'ownerProfileSlug' | 'verificationState'>;

export function hasOwnerClaim(business: TrustFields): boolean {
  return Boolean(business.ownerProfileSlug) || business.verificationState === 'claimed';
}

export function getListingTrustLevel(business: TrustFields): ListingTrustLevel {
  if (hasOwnerClaim(business)) {
    return 'owner_verified';
  }

  return business.verificationState === 'editor_verified' ? 'public_sources' : 'unverified';
}

const listingTrustCopy: Record<ListingTrustLevel, { label: LocalizedText; explanation: LocalizedText }> = {
  owner_verified: {
    label: { en: 'Verified', zh: '認證商家' },
    explanation: {
      en: 'The business owner claimed this listing and we approved the claim.',
      zh: '業主已認領此商家頁面，並經我們審核通過。',
    },
  },
  public_sources: {
    label: { en: 'Listed from public sources', zh: '資料來自公開來源' },
    explanation: {
      en: "We put this listing together from public information, such as the business's own website and map listings. The owner has not confirmed it yet.",
      zh: '此頁資料整理自商家網站、地圖等公開資訊，尚未經業主確認。',
    },
  },
  unverified: {
    label: { en: 'Unverified', zh: '未驗證' },
    explanation: {
      en: 'We have not checked this listing yet.',
      zh: '我們尚未核對此商家頁面的資料。',
    },
  },
};

export function listingTrustLabel(level: ListingTrustLevel): LocalizedText {
  return listingTrustCopy[level].label;
}

export function listingTrustExplanation(level: ListingTrustLevel): LocalizedText {
  return listingTrustCopy[level].explanation;
}

// As stored in `businesses.languages`. "Chinese" means a source said Chinese
// without naming a dialect; it counts the same as the others.
export const CHINESE_SPOKEN_LANGUAGE_VALUES = ['Mandarin', 'Cantonese', 'Taiwanese', 'Chinese'] as const;

const chineseSpokenLanguages = new Set(CHINESE_SPOKEN_LANGUAGE_VALUES.map((language) => language.toLowerCase()));

// "Traditional Chinese" is a written language, so it does not count as spoken.
export function hasChineseSpokenLanguage(languages: readonly string[]): boolean {
  return languages.some((language) => chineseSpokenLanguages.has(language.trim().toLowerCase()));
}

// The directory's language filter. Choosing "Chinese" means any Chinese spoken
// language; a named dialect matches only that dialect.
export function matchesLanguageFilter(languages: readonly string[], filter: string): boolean {
  if (filter === 'Chinese') {
    return hasChineseSpokenLanguage(languages);
  }

  return languages.includes(filter);
}
