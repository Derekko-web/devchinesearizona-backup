import type { User } from '@supabase/supabase-js';

import type { ProfileSettingsInitialData } from '@/components/auth/ProfileSettingsPageClient';
import type { AppProfileRow } from '@/lib/profile-auth';

function fallbackUsername(user: User, profile: AppProfileRow | null): string {
  const metadataUsername =
    typeof user.user_metadata?.username === 'string' ? user.user_metadata.username.trim() : '';
  if (metadataUsername) {
    return metadataUsername;
  }

  if (profile?.slug) {
    return profile.slug;
  }

  const email = user.email?.trim();
  if (email) {
    const [localPart] = email.split('@');
    if (localPart) {
      return localPart;
    }
  }

  return 'member';
}

function fallbackFullName(user: User, profile: AppProfileRow | null, username: string): string {
  const metadataName =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name.trim()
      : typeof user.user_metadata?.name === 'string'
        ? user.user_metadata.name.trim()
        : '';
  if (metadataName) {
    return metadataName;
  }

  if (profile?.name?.trim()) {
    return profile.name.trim();
  }

  return username;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return {
      firstName: '',
      lastName: '',
    };
  }

  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

export function buildProfileSettingsInitialData(
  user: User,
  profile: AppProfileRow | null
): ProfileSettingsInitialData {
  const username = fallbackUsername(user, profile);
  const fullName = fallbackFullName(user, profile, username);
  const metadataFirstName =
    typeof user.user_metadata?.first_name === 'string'
      ? user.user_metadata.first_name.trim()
      : '';
  const metadataLastName =
    typeof user.user_metadata?.last_name === 'string'
      ? user.user_metadata.last_name.trim()
      : '';
  const split = splitName(fullName);

  return {
    aboutMe: profile?.bio_en ?? '',
    avatarUrl:
      (typeof user.user_metadata?.avatar_url === 'string' && user.user_metadata.avatar_url.trim()) ||
      (typeof user.user_metadata?.picture === 'string' && user.user_metadata.picture.trim()) ||
      '',
    email: user.email ?? '',
    firstName: metadataFirstName || split.firstName,
    lastName: metadataLastName || split.lastName,
    persistedBioZh: profile?.bio_zh_tw ?? '',
    persistedDisplayName: fullName,
    persistedNameZh: profile?.name_zh_tw ?? fullName,
    userId: user.id,
    username,
    website:
      typeof user.user_metadata?.website === 'string' ? user.user_metadata.website.trim() : '',
  };
}
