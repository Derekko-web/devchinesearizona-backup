import { notFound } from 'next/navigation';

import { cityCategoryMetadata } from '@/lib/page-metadata';
import { CityCategoryPageView } from '@/views/site-pages';

type PageProps = {
  params: Promise<{
    city: string;
    category: string;
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { city, category } = await params;
  return cityCategoryMetadata('en', city, category) ?? {};
}

export default async function Page({ params }: PageProps) {
  const { city, category } = await params;
  const rendered = await CityCategoryPageView({ locale: 'en', city, category });
  if (!rendered) {
    notFound();
  }

  return rendered;
}
