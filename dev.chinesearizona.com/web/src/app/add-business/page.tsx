import { addBusinessMetadata } from '@/lib/page-metadata';
import { AddBusinessPageView } from '@/views/site-pages';

export const metadata = addBusinessMetadata('en');
export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{
    businessName?: string;
    businessSlug?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  return <AddBusinessPageView locale="en" searchParams={await searchParams} />;
}
