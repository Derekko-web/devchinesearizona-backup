import { defaultSiteProfile, type SiteProfile } from '@/lib/site-config';

const arizonaOnlyRouteRoots = new Set(['relocation-guide', 'hidden-arizona', 'discover-arizona']);
const arizonaOnlyCommunitySegments = new Set(['radar', 'news']);
const arizonaOnlyCommunityDetailSegments = new Set(['events', 'board', 'classifieds']);

export function canServeArizonaOnlyContent(site: SiteProfile): boolean {
  return site.key === defaultSiteProfile.key && site.launchState === 'live';
}

export function isArizonaOnlyRouteSegments(segments: string[]): boolean {
  const [root, section, slug] = segments;

  if (!root) {
    return false;
  }

  if (arizonaOnlyRouteRoots.has(root)) {
    return true;
  }

  if (root !== 'community' || !section) {
    return false;
  }

  if (arizonaOnlyCommunitySegments.has(section)) {
    return true;
  }

  return Boolean(slug && arizonaOnlyCommunityDetailSegments.has(section));
}

export function getArizonaOnlyRoutePath(segments: string[]): string {
  return segments.length > 0 ? `/${segments.join('/')}` : '/';
}
