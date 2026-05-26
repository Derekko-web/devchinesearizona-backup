import { communityRadarMetadata } from '@/lib/page-metadata';
import { CommunityRadarPageView } from '@/views/site-pages';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{
    lane?: string;
    page?: string;
  }>;
};

export const metadata = communityRadarMetadata('en');

export default async function Page({ searchParams }: PageProps) {
  return await CommunityRadarPageView({ locale: 'en', searchParams: await searchParams });
}
