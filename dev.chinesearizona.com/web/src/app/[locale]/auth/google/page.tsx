import { notFound } from 'next/navigation';

import { GoogleAuthStartClient } from '@/components/auth/GoogleAuthStartClient';
import { isLocale } from '@/lib/i18n';
import { authMetadata } from '@/lib/page-metadata';

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    next?: string;
  }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return authMetadata(locale);
}

export default async function Page({ params, searchParams }: PageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const { next } = await searchParams;
  return <GoogleAuthStartClient locale={locale} initialNext={next} />;
}
