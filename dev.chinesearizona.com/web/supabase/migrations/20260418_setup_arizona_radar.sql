create table if not exists public.radar_job_controls (
  id boolean primary key default true check (id = true),
  paused boolean not null default false,
  publish_cap integer not null default 10 check (publish_cap between 1 and 50),
  updated_at timestamptz not null default now()
);

insert into public.radar_job_controls (id, paused, publish_cap)
values (true, false, 10)
on conflict (id) do nothing;

create table if not exists public.radar_source_controls (
  source_slug text primary key,
  paused boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.radar_runs (
  id uuid primary key default gen_random_uuid(),
  worker text not null default 'hermes',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  candidate_count integer not null default 0,
  published_count integer not null default 0,
  blocked_count integer not null default 0,
  duplicate_count integer not null default 0,
  error_message text,
  latest_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.radar_runs
  drop constraint if exists radar_runs_status_check,
  add constraint radar_runs_status_check
    check (status in ('running', 'completed', 'failed', 'paused'));

create index if not exists radar_runs_started_at_idx
  on public.radar_runs (started_at desc);

create table if not exists public.radar_candidates (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  source_slug text not null,
  source_name text not null,
  source_url text not null,
  canonical_url text not null,
  source_type text not null,
  source_policy text not null,
  lane text not null,
  title_en text not null,
  title_zh text not null,
  excerpt_en text not null,
  excerpt_zh text not null,
  topic_fingerprint text not null,
  moderation_state text not null default 'queued',
  source_published_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.radar_candidates
  drop constraint if exists radar_candidates_source_type_check,
  add constraint radar_candidates_source_type_check
    check (
      source_type in (
        'housing_portal',
        'corporate_newsroom',
        'official_data',
        'airport_newsroom',
        'local_media',
        'social_signal'
      )
    ),
  drop constraint if exists radar_candidates_source_policy_check,
  add constraint radar_candidates_source_policy_check
    check (source_policy in ('summary_link', 'signal_only', 'republish_with_permission')),
  drop constraint if exists radar_candidates_lane_check,
  add constraint radar_candidates_lane_check
    check (lane in ('housing', 'openings', 'community', 'official', 'social')),
  drop constraint if exists radar_candidates_moderation_state_check,
  add constraint radar_candidates_moderation_state_check
    check (moderation_state in ('queued', 'published', 'blocked', 'duplicate', 'unpublished', 'review_needed'));

create index if not exists radar_candidates_recent_idx
  on public.radar_candidates (lane, moderation_state, last_seen_at desc);

create unique index if not exists radar_candidates_canonical_url_unique_idx
  on public.radar_candidates (canonical_url)
  where source_type <> 'social_signal';

create unique index if not exists radar_candidates_topic_fingerprint_unique_idx
  on public.radar_candidates (topic_fingerprint)
  where source_type = 'social_signal';

create table if not exists public.radar_articles (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references public.radar_candidates(id) on delete cascade,
  slug text not null unique,
  lane text not null,
  title_en text not null,
  title_zh text not null,
  excerpt_en text not null,
  excerpt_zh text not null,
  body_en text not null,
  body_zh text not null,
  hero_image text not null,
  hero_image_policy text not null,
  category text not null,
  freshness_tier text not null,
  source_policy text not null,
  source_type text not null,
  source_name text not null,
  source_url text not null,
  source_links jsonb not null default '[]'::jsonb,
  related_category_slugs text[] not null default '{}',
  cta_business_slugs text[] not null default '{}',
  persona_targets text[] not null default '{}',
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),
  is_published boolean not null default true,
  ai_generated_summary boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.radar_articles
  drop constraint if exists radar_articles_lane_check,
  add constraint radar_articles_lane_check
    check (lane in ('housing', 'openings', 'community', 'official', 'social')),
  drop constraint if exists radar_articles_hero_image_policy_check,
  add constraint radar_articles_hero_image_policy_check
    check (hero_image_policy in ('source_allowed', 'fallback_only')),
  drop constraint if exists radar_articles_category_check,
  add constraint radar_articles_category_check
    check (category in ('news', 'feature')),
  drop constraint if exists radar_articles_freshness_tier_check,
  add constraint radar_articles_freshness_tier_check
    check (freshness_tier in ('breaking', 'weekly', 'monthly', 'evergreen', 'archive')),
  drop constraint if exists radar_articles_source_policy_check,
  add constraint radar_articles_source_policy_check
    check (source_policy in ('summary_link', 'signal_only', 'republish_with_permission')),
  drop constraint if exists radar_articles_source_type_check,
  add constraint radar_articles_source_type_check
    check (
      source_type in (
        'housing_portal',
        'corporate_newsroom',
        'official_data',
        'airport_newsroom',
        'local_media',
        'social_signal'
      )
    );

create index if not exists radar_articles_published_idx
  on public.radar_articles (is_published, published_at desc);

create or replace function public.set_radar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_radar_job_controls_set_updated_at on public.radar_job_controls;
create trigger trg_radar_job_controls_set_updated_at
before update on public.radar_job_controls
for each row
execute function public.set_radar_updated_at();

drop trigger if exists trg_radar_source_controls_set_updated_at on public.radar_source_controls;
create trigger trg_radar_source_controls_set_updated_at
before update on public.radar_source_controls
for each row
execute function public.set_radar_updated_at();

drop trigger if exists trg_radar_runs_set_updated_at on public.radar_runs;
create trigger trg_radar_runs_set_updated_at
before update on public.radar_runs
for each row
execute function public.set_radar_updated_at();

drop trigger if exists trg_radar_candidates_set_updated_at on public.radar_candidates;
create trigger trg_radar_candidates_set_updated_at
before update on public.radar_candidates
for each row
execute function public.set_radar_updated_at();

drop trigger if exists trg_radar_articles_set_updated_at on public.radar_articles;
create trigger trg_radar_articles_set_updated_at
before update on public.radar_articles
for each row
execute function public.set_radar_updated_at();

alter table public.radar_job_controls enable row level security;
alter table public.radar_source_controls enable row level security;
alter table public.radar_runs enable row level security;
alter table public.radar_candidates enable row level security;
alter table public.radar_articles enable row level security;

drop policy if exists "radar_articles_public_read" on public.radar_articles;
create policy "radar_articles_public_read"
  on public.radar_articles
  for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists "radar_runs_public_read" on public.radar_runs;
create policy "radar_runs_public_read"
  on public.radar_runs
  for select
  to anon, authenticated
  using (true);

drop policy if exists "radar_candidates_no_client_access" on public.radar_candidates;
create policy "radar_candidates_no_client_access"
  on public.radar_candidates
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "radar_job_controls_no_client_access" on public.radar_job_controls;
create policy "radar_job_controls_no_client_access"
  on public.radar_job_controls
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "radar_source_controls_no_client_access" on public.radar_source_controls;
create policy "radar_source_controls_no_client_access"
  on public.radar_source_controls
  for all
  to anon, authenticated
  using (false)
  with check (false);
