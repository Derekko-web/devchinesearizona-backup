import { notFound, redirect } from 'next/navigation';

import { isLocale } from '@/lib/i18n';
import { authMetadata } from '@/lib/page-metadata';
import { appendSearch, withLocale } from '@/lib/routing';
import { AuthPageView } from '@/views/auth-page';

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    next?: string;
    complete?: string;
    error?: string;
    error_description?: string;
    message?: string;
    tone?: 'error' | 'info' | 'success';
    email?: string;
    password?: string;
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

  const resolvedSearchParams = await searchParams;

  if (resolvedSearchParams.email || resolvedSearchParams.password) {
    const sanitizedParams = new URLSearchParams();
    const allowedEntries = [
      ['next', resolvedSearchParams.next],
      ['complete', resolvedSearchParams.complete],
      ['error', resolvedSearchParams.error],
      ['error_description', resolvedSearchParams.error_description],
      ['message', resolvedSearchParams.message],
      ['tone', resolvedSearchParams.tone],
    ] as const;

    for (const [key, value] of allowedEntries) {
      if (value) {
        sanitizedParams.set(key, value);
      }
    }

    redirect(appendSearch(withLocale(locale, '/auth/join'), sanitizedParams.toString()));
  }

  return <AuthPageView locale={locale} page="join" searchParams={resolvedSearchParams} />;
}
