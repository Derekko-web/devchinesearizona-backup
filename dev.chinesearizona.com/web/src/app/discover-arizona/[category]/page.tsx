import { notFound } from 'next/navigation';

import { getDiscoveryCategory } from '@/lib/discover-arizona';
import { discoverArizonaCategoryMetadata } from '@/lib/page-metadata';
import { DiscoverArizonaCategoryPageView } from '@/views/discover-arizona';
import type { DiscoveryCategory } from '@/lib/types';

type PageProps = {
  params: Promise<{
    category: string;
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { category } = await params;
  const categoryRecord = getDiscoveryCategory(category as DiscoveryCategory);
  return categoryRecord ? discoverArizonaCategoryMetadata('en', categoryRecord.slug) ?? {} : {};
}

export default async function Page({ params }: PageProps) {
  const { category } = await params;
  const categoryRecord = getDiscoveryCategory(category as DiscoveryCategory);
  if (!categoryRecord) {
    notFound();
  }

  const rendered = await DiscoverArizonaCategoryPageView({
    locale: 'en',
    category: categoryRecord.slug,
  });
  if (!rendered) {
    notFound();
  }

  return rendered;
}
