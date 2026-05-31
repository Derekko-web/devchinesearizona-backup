import { headers } from 'next/headers';

import { resolveSiteProfileFromRequestHosts } from '@/lib/site-config';

export async function getCurrentSiteProfile() {
  const requestHeaders = await headers();
  return resolveSiteProfileFromRequestHosts({
    forwardedHost: requestHeaders.get('x-forwarded-host'),
    host: requestHeaders.get('host'),
  });
}
