import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/seo';
import { getCurrentSiteProfile } from '@/lib/site-config.server';
import { defaultSiteProfile, type SiteProfile } from '@/lib/site-config';

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
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml', site),
  };
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  return buildRobots(await getCurrentSiteProfile());
}
