import { NextResponse } from 'next/server';

import { getAdSenseAdsTxtLine } from '@/lib/adsense';

export function GET() {
  const adsTxtLine = getAdSenseAdsTxtLine();

  return new NextResponse(adsTxtLine ? `${adsTxtLine}\n` : '# Configure NEXT_PUBLIC_ADSENSE_CLIENT to publish your ads.txt entry.\n', {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
