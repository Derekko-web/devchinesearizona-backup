import businessDirectoryOverridesData from '@/data/business-directory-overrides.json';
import type { Business, DirectoryStatus } from '@/lib/types';

export type BusinessDirectoryOverride = {
  shortDescription?: string;
  description?: string;
  website?: string | null;
  status?: DirectoryStatus;
  sourceUrls?: string[];
};

const PLACEHOLDER_COPY_PATTERNS = [
  /Owner-submitted directory listing approved by staff\./i,
  /AZ AANHPI Directory/i,
] as const;

export const businessDirectoryOverrides = businessDirectoryOverridesData as Record<
  string,
  BusinessDirectoryOverride
>;

function isPlaceholderCopy(value?: string | null): boolean {
  if (!value) {
    return false;
  }

  return PLACEHOLDER_COPY_PATTERNS.some((pattern) => pattern.test(value));
}

function resolveLocalizedOverrideText(
  current: Business['shortDescription'] | Business['description'],
  nextEnglish: string
) {
  const nextChinese =
    current.zh && current.zh !== current.en && !isPlaceholderCopy(current.zh) ? current.zh : nextEnglish;

  return {
    en: nextEnglish,
    zh: nextChinese,
  };
}

export function getBusinessDirectoryOverride(slug: string): BusinessDirectoryOverride | undefined {
  return businessDirectoryOverrides[slug];
}

export function applyBusinessDirectoryOverride(business: Business): Business {
  const override = getBusinessDirectoryOverride(business.slug);
  if (!override) {
    return business;
  }

  const nextShortDescription = override.shortDescription
    ? resolveLocalizedOverrideText(business.shortDescription, override.shortDescription)
    : business.shortDescription;
  const nextDescription = override.description
    ? resolveLocalizedOverrideText(business.description, override.description)
    : business.description;

  return {
    ...business,
    website: override.website === null ? undefined : (override.website ?? business.website),
    shortDescription: nextShortDescription,
    description: nextDescription,
    status: override.status ?? business.status,
  };
}
