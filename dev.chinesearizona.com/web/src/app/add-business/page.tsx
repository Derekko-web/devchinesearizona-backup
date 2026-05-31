import { addBusinessMetadata } from '@/lib/page-metadata';
import { getCurrentSiteProfile } from '@/lib/site-config.server';
import { AddBusinessPageView } from '@/views/site-pages';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const site = await getCurrentSiteProfile();
  return addBusinessMetadata('en', site);
}

type PageProps = {
  searchParams: Promise<{
    businessName?: string;
    businessSlug?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const site = await getCurrentSiteProfile();
  return <AddBusinessPageView locale="en" searchParams={await searchParams} site={site} />;
}
