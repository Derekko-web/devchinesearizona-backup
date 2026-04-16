create extension if not exists pg_trgm;

create table if not exists profiles (
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

create table if not exists business_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_zh_tw text not null,
  description_en text not null,
  description_zh_tw text not null,
  icon text not null,
  created_at timestamptz not null default now()
);

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  category_id uuid not null references business_categories(id),
  owner_profile_id uuid references profiles(id),
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
  search_document tsvector generated always as (
    to_tsvector(
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
    )
  ) stored
);

create index if not exists businesses_search_document_idx on businesses using gin (search_document);
create index if not exists businesses_name_en_trgm_idx on businesses using gin (name_en gin_trgm_ops);
create index if not exists businesses_name_zh_tw_trgm_idx on businesses using gin (name_zh_tw gin_trgm_ops);
create index if not exists businesses_city_category_idx on businesses (city, category_id);
create index if not exists businesses_status_idx on businesses (status, verification_state);

alter table businesses add column if not exists service_area_text text;
alter table businesses add column if not exists status text not null default 'pending_review';
alter table businesses add column if not exists verification_state text not null default 'unverified';
alter table businesses add column if not exists menu_url text;
alter table businesses add column if not exists services_json jsonb not null default '[]'::jsonb;
alter table businesses add column if not exists price_range text;
alter table businesses add column if not exists hours_json jsonb not null default '[]'::jsonb;
alter table businesses alter column name_zh_tw drop not null;
alter table businesses alter column short_description_zh_tw drop not null;
alter table businesses alter column description_zh_tw drop not null;
alter table businesses alter column address drop not null;
alter table businesses alter column phone drop not null;

alter table businesses
  drop constraint if exists businesses_status_check,
  add constraint businesses_status_check check (status in ('live', 'pending_review', 'suppressed', 'stale'));

alter table businesses
  drop constraint if exists businesses_verification_state_check,
  add constraint businesses_verification_state_check check (verification_state in ('unverified', 'claimed', 'editor_verified'));

alter table businesses
  drop constraint if exists businesses_translation_state_check,
  drop constraint if exists businesses_image_state_check,
  drop constraint if exists businesses_origin_check;

alter table businesses
  drop column if exists origin,
  drop column if exists confidence_score,
  drop column if exists source_url,
  drop column if exists source_domain,
  drop column if exists source_label,
  drop column if exists last_seen_at,
  drop column if exists translation_state,
  drop column if exists image_state;

drop index if exists businesses_source_domain_idx;

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  profile_id uuid not null references profiles(id),
  rating integer not null check (rating between 1 and 5),
  title_en text not null,
  title_zh_tw text not null,
  content_en text not null,
  content_zh_tw text not null,
  created_at timestamptz not null default now()
);

create table if not exists guides (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  section text not null,
  title_en text not null,
  title_zh_tw text not null,
  excerpt_en text not null,
  excerpt_zh_tw text not null,
  hero_image text,
  body_en jsonb not null default '[]'::jsonb,
  body_zh_tw jsonb not null default '[]'::jsonb,
  official_resources jsonb not null default '[]'::jsonb,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  category text not null,
  title_en text not null,
  title_zh_tw text not null,
  excerpt_en text not null,
  excerpt_zh_tw text not null,
  hero_image text,
  body_en jsonb not null default '[]'::jsonb,
  body_zh_tw jsonb not null default '[]'::jsonb,
  published_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_en text not null,
  title_zh_tw text not null,
  excerpt_en text not null,
  excerpt_zh_tw text not null,
  description_en jsonb not null default '[]'::jsonb,
  description_zh_tw jsonb not null default '[]'::jsonb,
  organizer text not null,
  verified_organizer boolean not null default false,
  venue_name text not null,
  address text not null,
  city text not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  ticket_url text,
  language_note_en text not null,
  language_note_zh_tw text not null
);

create table if not exists community_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  type text not null check (type in ('board', 'classified')),
  author_profile_id uuid not null references profiles(id),
  title_en text not null,
  title_zh_tw text not null,
  excerpt_en text not null,
  excerpt_zh_tw text not null,
  body_en jsonb not null default '[]'::jsonb,
  body_zh_tw jsonb not null default '[]'::jsonb,
  city text not null,
  trust_level text not null check (trust_level in ('new', 'trusted')) default 'new',
  report_count integer not null default 0,
  auto_hidden boolean not null default false,
  price text,
  link_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_claims (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  profile_id uuid references profiles(id),
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

alter table business_claims alter column business_id drop not null;
alter table business_claims add column if not exists business_slug text;
alter table business_claims add column if not exists business_name text;
alter table business_claims add column if not exists category_slug text;
alter table business_claims add column if not exists city text;
alter table business_claims add column if not exists details text;
alter table business_claims drop column if exists candidate_id;

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_slug text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

drop table if exists listing_source_events;
drop table if exists crawl_candidates;
drop table if exists crawl_sources;
drop table if exists crawl_runs;

create table if not exists saved_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  entity_type text not null,
  entity_slug text not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_slug text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
