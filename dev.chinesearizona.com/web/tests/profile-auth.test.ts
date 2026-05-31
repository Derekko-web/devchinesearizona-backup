import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProfileRole } from '@/lib/types';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

type ProfileRow = {
  id: string;
  slug: string;
  name: string;
  name_zh_tw: string;
  role: ProfileRole;
  city: string;
  languages: string[];
  bio_en: string;
  bio_zh_tw: string;
  auth_user_id: string;
};

function createProfile(role: ProfileRole): ProfileRow {
  return {
    id: 'profile-1',
    slug: 'member-one',
    name: 'Member One',
    name_zh_tw: 'Member One',
    role,
    city: 'Phoenix',
    languages: ['English'],
    bio_en: 'Member bio.',
    bio_zh_tw: '會員簡介。',
    auth_user_id: 'user-1',
  };
}

function mockSupabaseService(existingProfile: ProfileRow, authProfileRole: ProfileRole) {
  const updates: Array<{ table: string; values: Record<string, unknown> }> = [];

  const serviceClient = {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: existingProfile, error: null })),
            })),
          })),
          update: vi.fn((values: Record<string, unknown>) => {
            updates.push({ table, values });
            const updatedProfile = { ...existingProfile, ...values };
            return {
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({ data: updatedProfile, error: null })),
                })),
              })),
            };
          }),
        };
      }

      if (table === 'auth_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: {
                  email: 'member@example.com',
                  full_name: 'Member One',
                  role: authProfileRole,
                },
                error: null,
              })),
            })),
          })),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  vi.doMock('@/lib/supabase', () => ({
    getSupabaseServiceClient: vi.fn(() => serviceClient),
  }));

  return { updates };
}

describe('ensureProfileForAuthUser role handling', () => {
  it('does not promote an existing profile from auth_profiles.role', async () => {
    const { updates } = mockSupabaseService(createProfile('member'), 'admin');
    const { ensureProfileForAuthUser } = await import('@/lib/profile-auth');

    const profile = await ensureProfileForAuthUser({
      id: 'user-1',
      email: 'member@example.com',
      app_metadata: {},
      user_metadata: {},
    } as never);

    expect(profile?.role).toBe('member');
    expect(updates).toEqual([]);
  });

  it('still honors app_metadata.role as the authoritative server-managed role', async () => {
    const { updates } = mockSupabaseService(createProfile('member'), 'member');
    const { ensureProfileForAuthUser } = await import('@/lib/profile-auth');

    const profile = await ensureProfileForAuthUser({
      id: 'user-1',
      email: 'moderator@example.com',
      app_metadata: { role: 'moderator' },
      user_metadata: {},
    } as never);

    expect(profile?.role).toBe('moderator');
    expect(updates).toEqual([
      {
        table: 'profiles',
        values: { role: 'moderator', auth_user_id: 'user-1' },
      },
    ]);
  });
});
