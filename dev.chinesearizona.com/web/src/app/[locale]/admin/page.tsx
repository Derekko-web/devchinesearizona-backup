import { notFound } from 'next/navigation';

import { adminMetadata } from '@/lib/page-metadata';
import { isLocale } from '@/lib/i18n';
import { requireStaffPageContext } from '@/lib/page-auth';
import { AdminPageView } from '@/views/site-pages';

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return {};
  }

  return adminMetadata(locale);
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  await requireStaffPageContext();
  return <AdminPageView locale={locale} />;
}
