import { headers } from 'next/headers';

import { resolveSiteProfileFromHost } from '@/lib/site-config';

export async function getCurrentSiteProfile() {
  const requestHeaders = await headers();
  return resolveSiteProfileFromHost(
    requestHeaders.get('x-forwarded-host') ??
      requestHeaders.get('host')
  );
}
