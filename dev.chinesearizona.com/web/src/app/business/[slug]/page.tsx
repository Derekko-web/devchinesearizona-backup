import { notFound } from 'next/navigation';

import { businessMetadata } from '@/lib/page-metadata';
import { getCurrentSiteProfile } from '@/lib/site-config.server';
import { BusinessDetailPageView } from '@/views/site-pages';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const site = await getCurrentSiteProfile();
  return (await businessMetadata('en', slug, site)) ?? {};
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const site = await getCurrentSiteProfile();
  const rendered = await BusinessDetailPageView({ locale: 'en', slug, site });
  if (!rendered) {
    notFound();
  }

  return rendered;
}
