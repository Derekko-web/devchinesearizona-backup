import { notFound } from 'next/navigation';

import { communityPostMetadata } from '@/lib/page-metadata';
import { CommunityPostDetailPageView } from '@/views/site-pages';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return communityPostMetadata('en', 'classified', slug) ?? {};
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const rendered = CommunityPostDetailPageView({ locale: 'en', type: 'classified', slug });
  if (!rendered) {
    notFound();
  }

  return rendered;
}
