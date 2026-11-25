import generatedDirectoryAiReplacements from '@/data/generated-directory-ai-replacements.json';

const directoryAiReplacementMap = generatedDirectoryAiReplacements as Record<string, string>;
const DIRECTORY_AI_REPLACEMENT_VERSION = '20260421-1700';
const directoryAiReplacementCardObjectPositionMap: Record<string, string> = {
  'bido-cafe': '82% center',
};

// AI-made images that must not stand in for a business: portraits that could be
// read as a real person, and pictures of a different business or brand. These
// listings show neutral category art until the owner adds a real photo.
const removedDirectoryAiReplacementSlugs = new Set([
  'hedy-li-phoenix',
  'walgreens-chandler',
  'walgreens-chandler-2',
  'walgreens-tucson',
  'carl-s-jr-peoria',
  'bbq-chicken-chandler',
  'china-jade-tempe',
  'miniso-mesa',
  'cha-tea-mesa',
  'kwan-wok-chinese-fast-food-phoenix',
]);

// Both folders hold AI-made pictures, not photos of the business.
const illustrationImagePathPattern = /^(?:https?:\/\/[^/]+)?\/(?:directory-ai-replacements|city-site-images)\//;

export function isIllustrationImageUrl(url?: string | null): boolean {
  return Boolean(url && illustrationImagePathPattern.test(url.trim()));
}

export function getDirectoryAiReplacementPath(slug: string): string | undefined {
  const path = directoryAiReplacementMap[slug];

  if (!path || removedDirectoryAiReplacementSlugs.has(slug)) {
    return undefined;
  }

  return path.includes('?')
    ? `${path}&v=${DIRECTORY_AI_REPLACEMENT_VERSION}`
    : `${path}?v=${DIRECTORY_AI_REPLACEMENT_VERSION}`;
}

export function getDirectoryAiReplacementImage(
  slug: string,
  fallback?: string | null
): string | undefined {
  if (removedDirectoryAiReplacementSlugs.has(slug)) {
    return undefined;
  }

  return getDirectoryAiReplacementPath(slug) ?? fallback ?? undefined;
}

// A claimed owner's own photo always wins over the illustration.
export function resolveDirectoryHeroImage(input: {
  slug: string;
  heroImage?: string | null;
  claimed: boolean;
}): string | undefined {
  const ownerPhoto = input.heroImage?.trim();
  if (input.claimed && ownerPhoto && !isIllustrationImageUrl(ownerPhoto)) {
    return ownerPhoto;
  }

  return getDirectoryAiReplacementImage(input.slug, input.heroImage);
}

export function getDirectoryAiReplacementCardObjectPosition(slug: string): string | undefined {
  return directoryAiReplacementCardObjectPositionMap[slug];
}
