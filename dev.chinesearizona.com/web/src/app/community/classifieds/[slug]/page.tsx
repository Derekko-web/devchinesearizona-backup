import { notFound } from 'next/navigation';

import { arizonaOnlyMetadata, requireArizonaOnlySite } from '@/lib/arizona-only-routes.server';
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
  return arizonaOnlyMetadata(
    'en',
    `/community/classifieds/${slug}`,
    () => communityPostMetadata('en', 'classified', slug) ?? {},
    'Community classified'
  );
}

export default async function Page({ params }: PageProps) {
  await requireArizonaOnlySite();
  const { slug } = await params;
  const rendered = CommunityPostDetailPageView({ locale: 'en', type: 'classified', slug });
  if (!rendered) {
    notFound();
  }

  return rendered;
}
