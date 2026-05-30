import { notFound } from 'next/navigation';

import { arizonaOnlyMetadata, requireArizonaOnlySite } from '@/lib/arizona-only-routes.server';
import { guideMetadata } from '@/lib/page-metadata';
import { GuideDetailPageView } from '@/views/site-pages';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return arizonaOnlyMetadata(
    'en',
    `/relocation-guide/${slug}`,
    () => guideMetadata('en', slug) ?? {},
    'Relocation Guide'
  );
}

export default async function Page({ params }: PageProps) {
  await requireArizonaOnlySite();
  const { slug } = await params;
  const rendered = await GuideDetailPageView({ locale: 'en', slug });
  if (!rendered) {
    notFound();
  }

  return rendered;
}
