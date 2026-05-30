import { communityRadarMetadata } from '@/lib/page-metadata';
import { getCurrentSiteProfile } from '@/lib/site-config.server';
import { CommunityRadarPageView } from '@/views/site-pages';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{
    lane?: string;
    page?: string;
  }>;
};

export async function generateMetadata() {
  const site = await getCurrentSiteProfile();
  return communityRadarMetadata('en', site);
}

export default async function Page({ searchParams }: PageProps) {
  const site = await getCurrentSiteProfile();
  return await CommunityRadarPageView({ locale: 'en', searchParams: await searchParams, site });
}
