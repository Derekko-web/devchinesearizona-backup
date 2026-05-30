import { notFound } from 'next/navigation';

import { arizonaOnlyMetadata, requireArizonaOnlySite } from '@/lib/arizona-only-routes.server';
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
  return arizonaOnlyMetadata(
    'en',
    `/discover-arizona/${category}/${slug}`,
    async () =>
      categoryRecord
        ? (await discoverArizonaArticleMetadata('en', categoryRecord.slug, slug)) ?? {}
        : {},
    'Discover Arizona'
  );
}

export default async function Page({ params }: PageProps) {
  await requireArizonaOnlySite();
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
