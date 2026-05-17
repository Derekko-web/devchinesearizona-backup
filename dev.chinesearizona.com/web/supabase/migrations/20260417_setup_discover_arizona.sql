create table if not exists public.discover_video_candidates (
  id uuid primary key default gen_random_uuid(),
  source_url text not null unique,
  post_id text not null unique,
  creator_handle text,
  creator_profile_url text,
  discovered_categories text[] not null default '{}',
  source_surface text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  queue_status text not null default 'queued',
  collector_run_id text,
  collector_notes text,
  missing_run_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.discover_video_candidates
  drop constraint if exists discover_video_candidates_queue_status_check,
  add constraint discover_video_candidates_queue_status_check
    check (queue_status in ('queued', 'review_ready', 'approved', 'published', 'blocked', 'stale'));

alter table public.discover_video_candidates
  drop constraint if exists discover_video_candidates_categories_check,
  add constraint discover_video_candidates_categories_check
    check (
      discovered_categories <@ array[
        'beautiful_arizona',
        'things_to_do',
        'restaurants',
        'hotels',
        'parks',
        'shopping'
      ]::text[]
    );

create index if not exists discover_video_candidates_surface_idx
  on public.discover_video_candidates (source_surface, queue_status, last_seen_at desc);

create index if not exists discover_video_candidates_categories_idx
  on public.discover_video_candidates using gin (discovered_categories);

create table if not exists public.discover_articles (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references public.discover_video_candidates(id) on delete cascade,
  slug text not null unique,
  primary_category text not null,
  title_en text not null,
  title_zh text not null,
  excerpt_en text not null,
  excerpt_zh text not null,
  body_en text not null,
  body_zh text not null,
  hero_image_url text,
  city text,
  region text,
  tags text[] not null default '{}',
  related_business_slugs text[] not null default '{}',
  related_hidden_arizona_slugs text[] not null default '{}',
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  is_featured boolean not null default false,
  embed_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.discover_articles
  drop constraint if exists discover_articles_primary_category_check,
  add constraint discover_articles_primary_category_check
    check (primary_category in ('beautiful_arizona', 'things_to_do', 'restaurants', 'hotels', 'parks', 'shopping'));

create index if not exists discover_articles_category_idx
  on public.discover_articles (primary_category, published_at desc);

create index if not exists discover_articles_featured_idx
  on public.discover_articles (is_featured, published_at desc);

create or replace function public.set_discover_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_discover_video_candidates_set_updated_at on public.discover_video_candidates;
create trigger trg_discover_video_candidates_set_updated_at
before update on public.discover_video_candidates
for each row
execute function public.set_discover_updated_at();

drop trigger if exists trg_discover_articles_set_updated_at on public.discover_articles;
create trigger trg_discover_articles_set_updated_at
before update on public.discover_articles
for each row
execute function public.set_discover_updated_at();

alter table public.discover_video_candidates enable row level security;
alter table public.discover_articles enable row level security;
