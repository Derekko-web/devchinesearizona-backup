import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/seo';
import { getCurrentSiteProfile } from '@/lib/site-config.server';
import { defaultSiteProfile, type SiteProfile } from '@/lib/site-config';

const facetParams = ['q', 'kind', 'city', 'tag', 'view', 'category', 'language', 'payment', 'minRating', 'sort'];
const facetDisallowRules = facetParams.flatMap((param) => [`/*?${param}=`, `/*&${param}=`]);

export function buildRobots(site: SiteProfile = defaultSiteProfile): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/admin',
        '/en/dashboard',
        '/zh/dashboard',
        '/en/admin',
        '/zh/admin',
        // Sign-in pages carry a `next` link back to the page the visitor came
        // from, so crawling them only produces endless URL variations.
        '/auth',
        '/en/auth',
        '/zh/auth',
        // Filter and search combinations on the directory and Hidden Arizona.
        // They canonicalise to the unfiltered page and are noindex; crawling
        // every combination only loads the server.
        ...facetDisallowRules,
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml', site),
  };
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  return buildRobots(await getCurrentSiteProfile());
}
