import { directoryMetadata } from '@/lib/page-metadata';
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
  return directoryMetadata('en', '/business', await searchParams);
}

export default async function Page({ searchParams }: PageProps) {
  return <DirectoryPageView locale="en" searchParams={await searchParams} />;
}
