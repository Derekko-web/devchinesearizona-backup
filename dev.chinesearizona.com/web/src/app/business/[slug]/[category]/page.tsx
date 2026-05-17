import { notFound } from 'next/navigation';

import { cityCategoryMetadata } from '@/lib/page-metadata';
import { CityCategoryPageView } from '@/views/site-pages';

type PageProps = {
  params: Promise<{
    slug: string;
    category: string;
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug, category } = await params;
  return cityCategoryMetadata('en', slug, category) ?? {};
}

export default async function Page({ params }: PageProps) {
  const { slug, category } = await params;
  const rendered = await CityCategoryPageView({ locale: 'en', city: slug, category });
  if (!rendered) {
    notFound();
  }

  return rendered;
}
