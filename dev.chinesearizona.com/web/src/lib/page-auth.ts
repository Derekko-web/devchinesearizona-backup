import 'server-only';

import type { User } from '@supabase/supabase-js';
import { notFound, redirect } from 'next/navigation';

import { buildAuthPath } from '@/lib/auth';
import { getProfileByAuthUserId, type AppProfileRow } from '@/lib/profile-auth';
import { getServerUserFromCookies } from '@/lib/server-auth';
import type { Locale, ProfileRole } from '@/lib/types';

const staffRoles = new Set<ProfileRole>(['moderator', 'admin']);
const elevatedProfileRoles = new Set<ProfileRole>(['editor', 'moderator', 'admin']);

function roleFromAppMetadata(value: unknown): ProfileRole | null {
  return value === 'member' ||
    value === 'business_owner' ||
    value === 'editor' ||
    value === 'moderator' ||
    value === 'admin'
    ? value
    : null;
}

function roleFromUser(user: User, profile?: AppProfileRow | null): ProfileRole | null {
  const appRole = roleFromAppMetadata(user.app_metadata?.role);
  if (appRole) {
    return appRole;
  }

  if (!profile?.role || elevatedProfileRoles.has(profile.role)) {
    return null;
  }

  return profile.role;
}

export type StaffPageContext = {
  user: User;
  profile: AppProfileRow | null;
  role: ProfileRole;
};

export async function requireAuthenticatedPageUser(
  locale: Locale,
  nextPath: string
): Promise<User> {
  const user = await getServerUserFromCookies();
  if (!user) {
    redirect(buildAuthPath(locale, nextPath));
  }

  return user;
}

export async function requireStaffPageContext(): Promise<StaffPageContext> {
  const user = await getServerUserFromCookies();
  if (!user) {
    notFound();
  }

  const profile = await getProfileByAuthUserId(user.id);
  const role = roleFromUser(user, profile);
  if (!role || !staffRoles.has(role)) {
    notFound();
  }

  return {
    user,
    profile,
    role,
  };
}
