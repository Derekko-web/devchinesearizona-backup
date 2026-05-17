import { ResetPasswordPageClient } from '@/components/auth/ResetPasswordPageClient';
import type { Locale } from '@/lib/types';

type ResetPasswordSearchParams = {
  email_error?: string;
  message?: string;
  next?: string;
  tone?: 'error' | 'info' | 'success';
};

export function ResetPasswordPageView({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams?: ResetPasswordSearchParams;
}) {
  return (
    <ResetPasswordPageClient
      locale={locale}
      initialEmailError={searchParams?.email_error}
      initialMessage={searchParams?.message}
      initialNext={searchParams?.next}
      initialTone={searchParams?.tone}
    />
  );
}
