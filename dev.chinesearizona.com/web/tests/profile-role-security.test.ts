import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('profile role security migrations', () => {
  it('grant authenticated users only column-scoped profile updates', () => {
    const migration = readFileSync(
      'supabase/migrations/20260531_restrict_profile_role_updates.sql',
      'utf8'
    );

    expect(migration).toContain('revoke update on public.auth_profiles from anon, authenticated;');
    expect(migration).toContain(
      'grant update (full_name, avatar_url) on public.auth_profiles to authenticated;'
    );
    expect(migration).toContain('revoke update on public.profiles from anon, authenticated;');
    expect(migration).toContain(
      'grant update (slug, name, name_zh_tw, city, languages, bio_en, bio_zh_tw) on public.profiles to authenticated;'
    );
    expect(migration).toContain("users.raw_app_meta_data ->> 'role'");
    expect(migration).toContain("public.auth_profiles.role in ('editor', 'moderator', 'admin')");
    expect(migration).toContain("public.profiles.role in ('editor', 'moderator', 'admin')");
    expect(migration).not.toMatch(/grant update \([^)]*role/i);
  });
});
