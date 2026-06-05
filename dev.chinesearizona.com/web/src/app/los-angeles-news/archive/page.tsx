import { permanentRedirect } from 'next/navigation';

import { getNewsArchivePath, newsSearchParamsToString } from '@/lib/arizona-news';
import { getCurrentSiteProfile } from '@/lib/site-config.server';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{
    bucket?: string;
    series?: string;
    sourcePolicy?: string;
    year?: string;
    month?: string;
    page?: string;
  }>;
};

export function generateMetadata() {
  return {};
}

export default async function Page({ searchParams }: PageProps) {
  const site = await getCurrentSiteProfile();
  permanentRedirect(getNewsArchivePath(site, newsSearchParamsToString(await searchParams)));
}
