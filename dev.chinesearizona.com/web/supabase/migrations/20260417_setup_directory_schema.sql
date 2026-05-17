create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  name_zh_tw text not null,
  role text not null check (role in ('member', 'business_owner', 'editor', 'moderator', 'admin')),
  city text not null,
  languages text[] not null default '{}',
  bio_en text not null,
  bio_zh_tw text not null,
  trust_level text not null check (trust_level in ('new', 'trusted')) default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.business_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_zh_tw text not null,
  description_en text not null,
  description_zh_tw text not null,
  icon text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  category_id uuid not null references public.business_categories(id),
  owner_profile_id uuid references public.profiles(id),
  name_en text not null,
  name_zh_tw text,
  short_description_en text not null,
  short_description_zh_tw text,
  description_en text not null,
  description_zh_tw text,
  city text not null,
  region text not null,
  address text,
  service_area_text text,
  phone text,
  email text,
  website text,
  menu_url text,
  hero_image text,
  gallery text[] not null default '{}',
  services_json jsonb not null default '[]'::jsonb,
  languages text[] not null default '{}',
  search_aliases text[] not null default '{}',
  verified boolean not null default false,
  bilingual boolean not null default true,
  newcomer_friendly boolean not null default true,
  sponsored boolean not null default false,
  featured boolean not null default false,
  status text not null default 'pending_review',
  verification_state text not null default 'unverified',
  rating numeric(2,1) not null default 0,
  review_count integer not null default 0,
  price_range text,
  hours_json jsonb not null default '[]'::jsonb,
  lat numeric(10,7),
  lng numeric(10,7),
  last_updated timestamptz not null default now(),
  search_document tsvector not null default ''::tsvector
);

alter table public.businesses add column if not exists service_area_text text;
alter table public.businesses add column if not exists status text not null default 'pending_review';
alter table public.businesses add column if not exists verification_state text not null default 'unverified';
alter table public.businesses add column if not exists menu_url text;
alter table public.businesses add column if not exists services_json jsonb not null default '[]'::jsonb;
alter table public.businesses add column if not exists price_range text;
alter table public.businesses add column if not exists hours_json jsonb not null default '[]'::jsonb;
alter table public.businesses add column if not exists search_document tsvector not null default ''::tsvector;
alter table public.businesses alter column name_zh_tw drop not null;
alter table public.businesses alter column short_description_zh_tw drop not null;
alter table public.businesses alter column description_zh_tw drop not null;
alter table public.businesses alter column address drop not null;
alter table public.businesses alter column phone drop not null;

alter table public.businesses
  drop constraint if exists businesses_status_check,
  add constraint businesses_status_check check (status in ('live', 'pending_review', 'suppressed', 'stale', 'planned'));

alter table public.businesses
  drop constraint if exists businesses_verification_state_check,
  add constraint businesses_verification_state_check check (verification_state in ('unverified', 'claimed', 'editor_verified'));

create or replace function public.set_business_search_document()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_document := to_tsvector(
    'simple',
    coalesce(new.name_en, '') || ' ' ||
    coalesce(new.name_zh_tw, '') || ' ' ||
    coalesce(new.description_en, '') || ' ' ||
    coalesce(new.description_zh_tw, '') || ' ' ||
    coalesce(new.city, '') || ' ' ||
    coalesce(new.region, '') || ' ' ||
    coalesce(new.address, '') || ' ' ||
    coalesce(new.service_area_text, '') || ' ' ||
    coalesce(array_to_string(new.search_aliases, ' '), '')
  );
  return new;
end;
$$;

drop trigger if exists trg_businesses_search_document on public.businesses;
create trigger trg_businesses_search_document
before insert or update on public.businesses
for each row
execute function public.set_business_search_document();

update public.businesses
set search_document = to_tsvector(
  'simple',
  coalesce(name_en, '') || ' ' ||
  coalesce(name_zh_tw, '') || ' ' ||
  coalesce(description_en, '') || ' ' ||
  coalesce(description_zh_tw, '') || ' ' ||
  coalesce(city, '') || ' ' ||
  coalesce(region, '') || ' ' ||
  coalesce(address, '') || ' ' ||
  coalesce(service_area_text, '') || ' ' ||
  coalesce(array_to_string(search_aliases, ' '), '')
);

create index if not exists businesses_search_document_idx on public.businesses using gin (search_document);
create index if not exists businesses_name_en_trgm_idx on public.businesses using gin (name_en gin_trgm_ops);
create index if not exists businesses_name_zh_tw_trgm_idx on public.businesses using gin (name_zh_tw gin_trgm_ops);
create index if not exists businesses_city_category_idx on public.businesses (city, category_id);
create index if not exists businesses_status_idx on public.businesses (status, verification_state);

create table if not exists public.business_claims (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  profile_id uuid references public.profiles(id),
  business_slug text,
  business_name text,
  claimant_name text not null,
  email text not null,
  category_slug text,
  city text,
  details text,
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists business_claims_status_idx on public.business_claims (status, created_at desc);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_slug text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists reports_entity_type_idx on public.reports (entity_type, created_at desc);

grant select on public.business_categories, public.businesses to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
