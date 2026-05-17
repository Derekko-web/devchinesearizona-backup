import type { Business } from '@/lib/types';

export const MOST_POPULAR_DIRECTORY_BUSINESS_SLUGS = ['bido-cafe', 'hedy-li-phoenix'] as const;

const mostPopularDirectoryBusinessNames = ['Bido Cafe', 'Hedy Li'] as const;

const mostPopularDirectoryBusinessRankBySlug = new Map<string, number>(
  MOST_POPULAR_DIRECTORY_BUSINESS_SLUGS.map((slug, index) => [slug, index])
);
const mostPopularDirectoryBusinessRankByName = new Map<string, number>(
  mostPopularDirectoryBusinessNames.map((name, index) => [normalizeDirectoryBusinessKey(name), index])
);

function normalizeDirectoryBusinessKey(value?: string | null): string {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim() ?? '';
}

export function getMostPopularDirectoryBusinessRank(
  business: Pick<Business, 'slug' | 'name'>
): number {
  const slugRank = mostPopularDirectoryBusinessRankBySlug.get(business.slug);
  if (typeof slugRank === 'number') {
    return slugRank;
  }

  const nameRank = mostPopularDirectoryBusinessRankByName.get(
    normalizeDirectoryBusinessKey(business.name.en)
  );

  return typeof nameRank === 'number' ? nameRank : Number.POSITIVE_INFINITY;
}

export function isMostPopularDirectoryBusiness(
  business: Pick<Business, 'slug' | 'name'>
): boolean {
  return Number.isFinite(getMostPopularDirectoryBusinessRank(business));
}

export function compareMostPopularDirectoryBusinesses(
  left: Pick<Business, 'slug' | 'name'>,
  right: Pick<Business, 'slug' | 'name'>
): number {
  const leftRank = getMostPopularDirectoryBusinessRank(left);
  const rightRank = getMostPopularDirectoryBusinessRank(right);

  if (!Number.isFinite(leftRank) && !Number.isFinite(rightRank)) {
    return 0;
  }

  if (!Number.isFinite(leftRank)) {
    return 1;
  }

  if (!Number.isFinite(rightRank)) {
    return -1;
  }

  return leftRank - rightRank;
}
