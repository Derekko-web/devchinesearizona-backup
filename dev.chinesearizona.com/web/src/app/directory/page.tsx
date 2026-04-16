import { directoryMetadata } from '@/lib/page-metadata';
import { DirectoryPageView } from '@/views/site-pages';

export const metadata = directoryMetadata('en');

type PageProps = {
  searchParams: Promise<{
    q?: string;
    city?: string;
    category?: string;
    minRating?: string;
    sort?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  return <DirectoryPageView locale="en" searchParams={await searchParams} />;
}
