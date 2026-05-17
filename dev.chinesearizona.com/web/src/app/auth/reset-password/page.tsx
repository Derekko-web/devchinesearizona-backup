import { resetPasswordMetadata } from '@/lib/page-metadata';
import { ResetPasswordPageView } from '@/views/reset-password-page';

type PageProps = {
  searchParams: Promise<{
    email_error?: string;
    message?: string;
    next?: string;
    tone?: 'error' | 'info' | 'success';
  }>;
};

export const dynamic = 'force-dynamic';
export const metadata = resetPasswordMetadata('en');

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  return <ResetPasswordPageView locale="en" searchParams={resolvedSearchParams} />;
}
