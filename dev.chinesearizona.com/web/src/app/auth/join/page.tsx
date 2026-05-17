import { redirect } from 'next/navigation';

import { appendSearch } from '@/lib/routing';
import { authMetadata } from '@/lib/page-metadata';
import { AuthPageView } from '@/views/auth-page';

type PageProps = {
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
export const metadata = authMetadata('en');

export default async function Page({ searchParams }: PageProps) {
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

    redirect(appendSearch('/auth/join', sanitizedParams.toString()));
  }

  return <AuthPageView locale="en" page="join" searchParams={resolvedSearchParams} />;
}
