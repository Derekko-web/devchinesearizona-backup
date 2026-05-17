import { ProfileSettingsPageClient } from '@/components/auth/ProfileSettingsPageClient';
import { profileSettingsMetadata } from '@/lib/page-metadata';
import { requireAuthenticatedPageUser } from '@/lib/page-auth';
import { ensureProfileForAuthUser } from '@/lib/profile-auth';
import { buildProfileSettingsInitialData } from '@/lib/profile-settings';

export const metadata = profileSettingsMetadata('en');
export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await requireAuthenticatedPageUser('en', '/dashboard/profile');
  const profile = await ensureProfileForAuthUser(user);

  return (
    <ProfileSettingsPageClient
      locale="en"
      initialData={buildProfileSettingsInitialData(user, profile)}
    />
  );
}
