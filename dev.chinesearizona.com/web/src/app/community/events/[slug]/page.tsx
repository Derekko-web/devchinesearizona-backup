import { notFound } from 'next/navigation';

import { arizonaOnlyMetadata, requireArizonaOnlySite } from '@/lib/arizona-only-routes.server';
import { eventMetadata } from '@/lib/page-metadata';
import { EventDetailPageView } from '@/views/site-pages';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return arizonaOnlyMetadata(
    'en',
    `/community/events/${slug}`,
    () => eventMetadata('en', slug) ?? {},
    'Community event'
  );
}

export default async function Page({ params }: PageProps) {
  await requireArizonaOnlySite();
  const { slug } = await params;
  const rendered = await EventDetailPageView({ locale: 'en', slug });
  if (!rendered) {
    notFound();
  }

  return rendered;
}
