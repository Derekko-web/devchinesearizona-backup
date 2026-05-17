import generatedDirectoryAiReplacements from '@/data/generated-directory-ai-replacements.json';

const directoryAiReplacementMap = generatedDirectoryAiReplacements as Record<string, string>;
const DIRECTORY_AI_REPLACEMENT_VERSION = '20260421-1700';
const directoryAiReplacementCardObjectPositionMap: Record<string, string> = {
  'bido-cafe': '82% center',
  'hedy-li-phoenix': '80% center',
};

export function getDirectoryAiReplacementPath(slug: string): string | undefined {
  const path = directoryAiReplacementMap[slug];

  if (!path) {
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
  return getDirectoryAiReplacementPath(slug) ?? fallback ?? undefined;
}

export function getDirectoryAiReplacementCardObjectPosition(slug: string): string | undefined {
  return directoryAiReplacementCardObjectPositionMap[slug];
}
