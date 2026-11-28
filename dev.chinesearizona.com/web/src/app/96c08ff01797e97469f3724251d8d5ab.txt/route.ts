import { NextResponse } from 'next/server';

import indexNow from '@/data/indexnow.json';
import { getCurrentSiteProfile } from '@/lib/site-config.server';
import { defaultSiteProfile } from '@/lib/site-config';

// IndexNow key file (issue #530): engines fetch https://chinesearizona.com/<key>.txt
// to confirm our URL submissions come from the site owner. Keys are public by
// design. Only the Arizona site serves it; the city sites answer 404.
export async function GET() {
  const site = await getCurrentSiteProfile();
  if (site.key !== defaultSiteProfile.key) {
    return new NextResponse('Not found\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  return new NextResponse(indexNow.key, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
