import type { User } from '@supabase/supabase-js';

import type { ProfileRole } from '@/lib/types';
import { getSupabaseServiceClient } from '@/lib/supabase';

type AuthProfileRow = {
  email: string;
  full_name?: string | null;
};

export type AppProfileRow = {
  id: string;
  slug: string;
  name: string;
  name_zh_tw: string;
  role: ProfileRole;
  city: string;
  languages?: string[] | null;
  bio_en: string;
  bio_zh_tw: string;
  auth_user_id?: string | null;
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function defaultDisplayName(user: User, authProfile?: AuthProfileRow | null): string {
  const fromAuthProfile = authProfile?.full_name?.trim();
  if (fromAuthProfile) {
    return fromAuthProfile;
  }

  const fromMetadata =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name.trim()
      : typeof user.user_metadata?.name === 'string'
        ? user.user_metadata.name.trim()
        : '';
  if (fromMetadata) {
    return fromMetadata;
  }

  const email = user.email?.trim();
  if (email) {
    return email.split('@')[0] ?? 'Member';
  }

  return 'Member';
}

function appMetadataRole(user: User): ProfileRole | null {
  const appRole =
    typeof user.app_metadata?.role === 'string' ? user.app_metadata.role : undefined;
  if (
    appRole === 'member' ||
    appRole === 'business_owner' ||
    appRole === 'editor' ||
    appRole === 'moderator' ||
    appRole === 'admin'
  ) {
    return appRole;
  }

  return null;
}

async function buildUniqueProfileSlug(baseName: string) {
  const serviceClient = getSupabaseServiceClient();
  if (!serviceClient) {
    return slugify(baseName) || 'member';
  }

  const baseSlug = slugify(baseName) || 'member';

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const { data, error } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (error || !data) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now().toString(36)}`;
}

async function getAuthProfile(userId: string): Promise<AuthProfileRow | null> {
  const serviceClient = getSupabaseServiceClient();
  if (!serviceClient) {
    return null;
  }

  const { data, error } = await serviceClient
    .from('auth_profiles')
    .select('email, full_name')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getProfileByAuthUserId(userId: string): Promise<AppProfileRow | null> {
  const serviceClient = getSupabaseServiceClient();
  if (!serviceClient) {
    return null;
  }

  const { data, error } = await serviceClient
    .from('profiles')
    .select('id, slug, name, name_zh_tw, role, city, languages, bio_en, bio_zh_tw, auth_user_id')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function ensureProfileForAuthUser(user: User): Promise<AppProfileRow | null> {
  const serviceClient = getSupabaseServiceClient();
  if (!serviceClient) {
    return null;
  }

  const existing = await getProfileByAuthUserId(user.id);
  const authProfile = await getAuthProfile(user.id);
  const displayName = defaultDisplayName(user, authProfile);
  const authoritativeRole = appMetadataRole(user);

  if (existing) {
    if (authoritativeRole && existing.role !== authoritativeRole) {
      const { data, error } = await serviceClient
        .from('profiles')
        .update({
          role: authoritativeRole,
          auth_user_id: user.id,
        })
        .eq('id', existing.id)
        .select('id, slug, name, name_zh_tw, role, city, languages, bio_en, bio_zh_tw, auth_user_id')
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    }

    return existing;
  }

  const slug = await buildUniqueProfileSlug(displayName);
  const { data, error } = await serviceClient
    .from('profiles')
    .insert({
      auth_user_id: user.id,
      slug,
      name: displayName,
      name_zh_tw: displayName,
      role: authoritativeRole ?? 'member',
      city: 'Phoenix',
      languages: ['English'],
      bio_en: 'New member account.',
      bio_zh_tw: '新會員帳號。',
    })
    .select('id, slug, name, name_zh_tw, role, city, languages, bio_en, bio_zh_tw, auth_user_id')
    .maybeSingle();

  if (!error && data) {
    return data;
  }

  return getProfileByAuthUserId(user.id);
}
