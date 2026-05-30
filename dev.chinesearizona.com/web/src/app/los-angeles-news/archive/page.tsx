import { notFound } from 'next/navigation';

import { communityNewsMetadata } from '@/lib/page-metadata';
import { getCurrentSiteProfile } from '@/lib/site-config.server';
import { NewsArchivePageView } from '@/views/site-pages';

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

export async function generateMetadata({ searchParams }: PageProps) {
  const site = await getCurrentSiteProfile();
  if (site.key !== 'los-angeles') {
    return {};
  }

  return communityNewsMetadata('en', await searchParams, site);
}

export default async function Page({ searchParams }: PageProps) {
  const site = await getCurrentSiteProfile();
  if (site.key !== 'los-angeles') {
    notFound();
  }

  return await NewsArchivePageView({ locale: 'en', searchParams: await searchParams, site });
}
