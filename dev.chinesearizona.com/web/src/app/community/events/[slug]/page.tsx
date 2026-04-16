import { notFound } from 'next/navigation';

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
  return eventMetadata('en', slug) ?? {};
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const rendered = await EventDetailPageView({ locale: 'en', slug });
  if (!rendered) {
    notFound();
  }

  return rendered;
}
