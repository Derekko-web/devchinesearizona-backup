import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
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
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
