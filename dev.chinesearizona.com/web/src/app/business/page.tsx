import { directoryMetadata } from '@/lib/page-metadata';
import { getCurrentSiteProfile } from '@/lib/site-config.server';
import { DirectoryPageView } from '@/views/site-pages';

type PageProps = {
  searchParams: Promise<{
    q?: string;
    city?: string;
    category?: string;
    minRating?: string;
    sort?: string;
    page?: string;
  }>;
};

export async function generateMetadata({ searchParams }: PageProps) {
  const site = await getCurrentSiteProfile();
  return directoryMetadata('en', '/business', await searchParams, site);
}

export default async function Page({ searchParams }: PageProps) {
  const site = await getCurrentSiteProfile();
  return <DirectoryPageView locale="en" searchParams={await searchParams} site={site} />;
}
