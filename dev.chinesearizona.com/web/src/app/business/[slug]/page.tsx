import { notFound } from 'next/navigation';

import { businessMetadata } from '@/lib/page-metadata';
import { BusinessDetailPageView } from '@/views/site-pages';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return (await businessMetadata('en', slug)) ?? {};
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const rendered = await BusinessDetailPageView({ locale: 'en', slug });
  if (!rendered) {
    notFound();
  }

  return rendered;
}
