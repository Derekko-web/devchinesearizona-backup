import { notFound } from 'next/navigation';

import { isLocale } from '@/lib/i18n';
import { resetPasswordMetadata } from '@/lib/page-metadata';
import { ResetPasswordPageView } from '@/views/reset-password-page';

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    email_error?: string;
    message?: string;
    next?: string;
    tone?: 'error' | 'info' | 'success';
  }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return resetPasswordMetadata(locale);
}

export default async function Page({ params, searchParams }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;

  return <ResetPasswordPageView locale={locale} searchParams={resolvedSearchParams} />;
}
