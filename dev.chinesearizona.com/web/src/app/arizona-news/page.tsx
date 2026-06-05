import { permanentRedirect } from 'next/navigation';

import { getNewsPath, newsSearchParamsToString } from '@/lib/arizona-news';
import { getCurrentSiteProfile } from '@/lib/site-config.server';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{
    lane?: string;
    page?: string;
  }>;
};

export function generateMetadata() {
  return {};
}

export default async function Page({ searchParams }: PageProps) {
  const site = await getCurrentSiteProfile();
  permanentRedirect(getNewsPath(site, newsSearchParamsToString(await searchParams)));
}
