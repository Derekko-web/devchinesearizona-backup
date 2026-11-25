import { notFound } from 'next/navigation';

import { metroCategoryMetadata } from '@/lib/page-metadata';
import { getCurrentSiteProfile } from '@/lib/site-config.server';
import { MetroCategoryPageView } from '@/views/site-pages';

type PageProps = {
  params: Promise<{
    category: string;
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { category } = await params;
  const site = await getCurrentSiteProfile();
  return (await metroCategoryMetadata('en', category, site)) ?? {};
}

export default async function Page({ params }: PageProps) {
  const { category } = await params;
  const site = await getCurrentSiteProfile();
  const rendered = await MetroCategoryPageView({ locale: 'en', category, site });
  if (!rendered) {
    notFound();
  }

  return rendered;
}
