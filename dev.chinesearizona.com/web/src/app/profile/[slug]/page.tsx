import { notFound } from 'next/navigation';

import { profileMetadata } from '@/lib/page-metadata';
import { ProfilePageView } from '@/views/site-pages';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return profileMetadata('en', slug) ?? {};
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const rendered = await ProfilePageView({ locale: 'en', slug });
  if (!rendered) {
    notFound();
  }

  return rendered;
}
