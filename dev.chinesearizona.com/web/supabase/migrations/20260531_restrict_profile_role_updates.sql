-- Prevent authenticated users from changing privilege-bearing role columns.
-- RLS policies restrict rows, not columns, so remove table-level UPDATE grants
-- and grant updates only to self-service profile fields.
revoke update on public.auth_profiles from anon, authenticated;
grant update (full_name, avatar_url) on public.auth_profiles to authenticated;

revoke update on public.profiles from anon, authenticated;
grant update (slug, name, name_zh_tw, city, languages, bio_en, bio_zh_tw) on public.profiles to authenticated;
