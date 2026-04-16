import { notFound } from 'next/navigation';

import { articleMetadata } from '@/lib/page-metadata';
import { ArticleDetailPageView } from '@/views/site-pages';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return (await articleMetadata('en', slug)) ?? {};
}

export const dynamic = 'force-dynamic';

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const rendered = await ArticleDetailPageView({ locale: 'en', slug });
  if (!rendered) {
    notFound();
  }

  return rendered;
}
