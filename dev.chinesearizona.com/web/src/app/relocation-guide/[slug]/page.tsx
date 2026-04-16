import { notFound } from 'next/navigation';

import { guideMetadata } from '@/lib/page-metadata';
import { GuideDetailPageView } from '@/views/site-pages';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return guideMetadata('en', slug) ?? {};
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const rendered = await GuideDetailPageView({ locale: 'en', slug });
  if (!rendered) {
    notFound();
  }

  return rendered;
}
