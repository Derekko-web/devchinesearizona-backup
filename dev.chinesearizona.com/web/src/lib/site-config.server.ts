import { headers } from 'next/headers';

import { resolveSiteProfileFromHostCandidates } from '@/lib/site-config';

export async function getCurrentSiteProfile() {
  const requestHeaders = await headers();
  return resolveSiteProfileFromHostCandidates([
    requestHeaders.get('x-forwarded-host'),
    requestHeaders.get('host'),
  ]);
}
