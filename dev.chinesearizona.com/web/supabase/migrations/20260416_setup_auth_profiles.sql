create table if not exists public.auth_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'member' check (role in ('member', 'business_owner', 'editor', 'moderator', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.auth_profiles enable row level security;

drop policy if exists "Users can view their own auth profile" on public.auth_profiles;
create policy "Users can view their own auth profile"
  on public.auth_profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update their own auth profile" on public.auth_profiles;
create policy "Users can update their own auth profile"
  on public.auth_profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke update on public.auth_profiles from anon, authenticated;
grant update (full_name, avatar_url) on public.auth_profiles to authenticated;

create or replace function public.set_auth_profiles_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_auth_profiles_set_updated_at on public.auth_profiles;
create trigger trg_auth_profiles_set_updated_at
before update on public.auth_profiles
for each row
execute function public.set_auth_profiles_updated_at();

create or replace function public.sync_auth_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.auth_profiles (
    id,
    email,
    full_name,
    avatar_url,
    role
  )
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), '')
    ),
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'picture'), '')
    ),
    coalesce(nullif(trim(new.raw_app_meta_data ->> 'role'), ''), 'member')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_synced_auth_profile on auth.users;
create trigger on_auth_user_synced_auth_profile
after insert or update on auth.users
for each row
execute function public.sync_auth_profile_from_auth_user();

insert into public.auth_profiles (id, email, full_name, avatar_url, role)
select
  users.id,
  users.email,
  coalesce(
    nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(users.raw_user_meta_data ->> 'name'), '')
  ),
  coalesce(
    nullif(trim(users.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(trim(users.raw_user_meta_data ->> 'picture'), '')
  ),
  coalesce(nullif(trim(users.raw_app_meta_data ->> 'role'), ''), 'member')
from auth.users as users
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  avatar_url = excluded.avatar_url,
  role = excluded.role,
  updated_at = now();
