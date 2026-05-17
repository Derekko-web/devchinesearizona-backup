import { notFound } from 'next/navigation';

import { hiddenArizonaEntryMetadata } from '@/lib/page-metadata';
import { HiddenArizonaDetailPageView } from '@/views/hidden-arizona';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  return (await hiddenArizonaEntryMetadata('en', 'place', (await params).slug)) ?? {};
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const rendered = await HiddenArizonaDetailPageView({ locale: 'en', kind: 'place', slug });
  if (!rendered) {
    notFound();
  }

  return rendered;
}
