import { communityNewsMetadata } from '@/lib/page-metadata';
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
  return communityNewsMetadata('en', await searchParams);
}

export default async function Page({ searchParams }: PageProps) {
  return await NewsArchivePageView({ locale: 'en', searchParams: await searchParams });
}
