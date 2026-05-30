import { notFound } from 'next/navigation';

import { arizonaOnlyMetadata, requireArizonaOnlySite } from '@/lib/arizona-only-routes.server';
import { hiddenArizonaEntryMetadata } from '@/lib/page-metadata';
import { HiddenArizonaDetailPageView } from '@/views/hidden-arizona';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return arizonaOnlyMetadata(
    'en',
    `/hidden-arizona/lists/${slug}`,
    async () => (await hiddenArizonaEntryMetadata('en', 'list', slug)) ?? {},
    'Hidden Arizona'
  );
}

export default async function Page({ params }: PageProps) {
  await requireArizonaOnlySite();
  const { slug } = await params;
  const rendered = await HiddenArizonaDetailPageView({ locale: 'en', kind: 'list', slug });
  if (!rendered) {
    notFound();
  }

  return rendered;
}
