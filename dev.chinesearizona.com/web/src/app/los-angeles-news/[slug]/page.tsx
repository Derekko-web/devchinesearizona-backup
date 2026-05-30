import { notFound } from 'next/navigation';

import { articleMetadata } from '@/lib/page-metadata';
import { getCurrentSiteProfile } from '@/lib/site-config.server';
import { ArticleDetailPageView } from '@/views/site-pages';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const site = await getCurrentSiteProfile();
  if (site.key !== 'los-angeles') {
    return {};
  }

  return (await articleMetadata('en', slug, site)) ?? {};
}

export const dynamic = 'force-dynamic';

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const site = await getCurrentSiteProfile();
  if (site.key !== 'los-angeles') {
    notFound();
  }

  const rendered = await ArticleDetailPageView({ locale: 'en', slug, site });
  if (!rendered) {
    notFound();
  }

  return rendered;
}
