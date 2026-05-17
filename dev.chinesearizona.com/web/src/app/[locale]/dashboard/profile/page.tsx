import { notFound } from 'next/navigation';

import { ProfileSettingsPageClient } from '@/components/auth/ProfileSettingsPageClient';
import { isLocale } from '@/lib/i18n';
import { profileSettingsMetadata } from '@/lib/page-metadata';
import { requireAuthenticatedPageUser } from '@/lib/page-auth';
import { ensureProfileForAuthUser } from '@/lib/profile-auth';
import { buildProfileSettingsInitialData } from '@/lib/profile-settings';
import { withLocale } from '@/lib/routing';

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

  return profileSettingsMetadata(locale);
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const user = await requireAuthenticatedPageUser(locale, withLocale(locale, '/dashboard/profile'));
  const profile = await ensureProfileForAuthUser(user);

  return (
    <ProfileSettingsPageClient
      locale={locale}
      initialData={buildProfileSettingsInitialData(user, profile)}
    />
  );
}
