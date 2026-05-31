-- Prevent authenticated users from changing privilege-bearing role columns.
-- RLS policies restrict rows, not columns, so remove table-level UPDATE grants
-- and grant updates only to self-service profile fields.
revoke update on public.auth_profiles from anon, authenticated;
grant update (full_name, avatar_url) on public.auth_profiles to authenticated;

revoke update on public.profiles from anon, authenticated;
grant update (slug, name, name_zh_tw, city, languages, bio_en, bio_zh_tw) on public.profiles to authenticated;

-- Clear stale staff/editor roles that may have been written before the UPDATE
-- grant was restricted. Non-staff roles such as business_owner can be assigned
-- by server-side claim approval flows, but elevated roles must come from auth
-- app metadata.
with trusted_auth_roles as (
  select
    users.id,
    case
      when users.raw_app_meta_data ->> 'role' in ('member', 'business_owner', 'editor', 'moderator', 'admin')
        then users.raw_app_meta_data ->> 'role'
      else 'member'
    end as role
  from auth.users as users
)
update public.auth_profiles
set role = trusted_auth_roles.role
from trusted_auth_roles
where public.auth_profiles.id = trusted_auth_roles.id
  and public.auth_profiles.role in ('editor', 'moderator', 'admin')
  and public.auth_profiles.role is distinct from trusted_auth_roles.role;

with trusted_auth_roles as (
  select
    users.id,
    case
      when users.raw_app_meta_data ->> 'role' in ('member', 'business_owner', 'editor', 'moderator', 'admin')
        then users.raw_app_meta_data ->> 'role'
      else 'member'
    end as role
  from auth.users as users
)
update public.profiles
set role = trusted_auth_roles.role
from trusted_auth_roles
where public.profiles.auth_user_id = trusted_auth_roles.id
  and public.profiles.role in ('editor', 'moderator', 'admin')
  and public.profiles.role is distinct from trusted_auth_roles.role;
