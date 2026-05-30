import { notFound } from 'next/navigation';

import { cityCategoryMetadata } from '@/lib/page-metadata';
import { getCurrentSiteProfile } from '@/lib/site-config.server';
import { CityCategoryPageView } from '@/views/site-pages';

type PageProps = {
  params: Promise<{
    slug: string;
    category: string;
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug, category } = await params;
  const site = await getCurrentSiteProfile();
  return cityCategoryMetadata('en', slug, category, site) ?? {};
}

export default async function Page({ params }: PageProps) {
  const { slug, category } = await params;
  const site = await getCurrentSiteProfile();
  const rendered = await CityCategoryPageView({ locale: 'en', city: slug, category, site });
  if (!rendered) {
    notFound();
  }

  return rendered;
}
