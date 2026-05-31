import austinDirectoryBusinesses from '@/data/sites/austin/businesses.json';
import { applyBusinessDirectoryOverride } from '@/lib/business-directory-overrides';
import { formatPhoneNumber } from '@/lib/phone';
import { defaultSiteProfile, hasLiveDirectoryData, type SiteKey, type SiteProfile } from '@/lib/site-config';
import type { Business } from '@/lib/types';

type ImportedStaticBusiness = Omit<
  Business,
  | 'address'
  | 'serviceAreaText'
  | 'phone'
  | 'email'
  | 'website'
  | 'menuUrl'
  | 'priceRange'
  | 'coordinates'
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

function normalizeStaticBusiness(business: ImportedStaticBusiness): Business {
  const verificationState =
    business.verificationState ?? (business.verified ? 'editor_verified' : 'unverified');

  return applyBusinessDirectoryOverride({
    ...business,
    address: business.address ?? undefined,
    serviceAreaText: business.serviceAreaText ?? undefined,
    phone: formatPhoneNumber(business.phone),
    email: business.email ?? undefined,
    website: business.website ?? undefined,
    menuUrl: business.menuUrl ?? undefined,
    priceRange: business.priceRange ?? undefined,
    coordinates: business.coordinates ?? undefined,
    legacySponsored: business.legacySponsored ?? business.sponsored,
    status: business.status ?? 'live',
    verificationState,
  });
}

const staticBusinessesBySiteKey: Partial<Record<SiteKey, Business[]>> = {
  austin: (austinDirectoryBusinesses as ImportedStaticBusiness[]).map(normalizeStaticBusiness),
};

export function isDefaultDirectorySite(site: SiteProfile): boolean {
  return site.key === defaultSiteProfile.key;
}

export function shouldUseStaticDirectoryData(site: SiteProfile): boolean {
  return !isDefaultDirectorySite(site) && site.directory.listingSource.kind === 'static-json';
}

export function getStaticDirectoryBusinessesForSite(site: SiteProfile): Business[] | undefined {
  if (!hasLiveDirectoryData(site)) {
    return undefined;
  }

  if (!shouldUseStaticDirectoryData(site)) {
    return undefined;
  }

  return staticBusinessesBySiteKey[site.key as SiteKey] ?? [];
}

export function getSiteDirectoryCategorySlugs(site: SiteProfile): string[] | undefined {
  if (isDefaultDirectorySite(site)) {
    return undefined;
  }

  if (!hasLiveDirectoryData(site) && !site.directory.allowDefaultFallback) {
    return [];
  }

  return site.directory.categorySlugs;
}
