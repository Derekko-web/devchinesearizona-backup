import { notFound } from 'next/navigation';

import { getDiscoveryCategory } from '@/lib/discover-arizona';
import { discoverArizonaArticleMetadata } from '@/lib/page-metadata';
import { DiscoverArizonaDetailPageView } from '@/views/discover-arizona';
import type { DiscoveryCategory } from '@/lib/types';

type PageProps = {
  params: Promise<{
    category: string;
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { category, slug } = await params;
  const categoryRecord = getDiscoveryCategory(category as DiscoveryCategory);
  return categoryRecord
    ? (await discoverArizonaArticleMetadata('en', categoryRecord.slug, slug)) ?? {}
    : {};
}

export default async function Page({ params }: PageProps) {
  const { category, slug } = await params;
  const categoryRecord = getDiscoveryCategory(category as DiscoveryCategory);
  if (!categoryRecord) {
    notFound();
  }

  const rendered = await DiscoverArizonaDetailPageView({
    locale: 'en',
    category: categoryRecord.slug,
    slug,
  });
  if (!rendered) {
    notFound();
  }

  return rendered;
}
