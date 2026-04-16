import { communityNewsMetadata } from '@/lib/page-metadata';
import { NewsArchivePageView } from '@/views/site-pages';

export const metadata = communityNewsMetadata('en');
export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{
    page?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  return await NewsArchivePageView({ locale: 'en', searchParams: await searchParams });
}
