create table if not exists public.directory_ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending_payment',
  budget_cents integer not null check (budget_cents > 0),
  remaining_budget_cents integer not null default 0 check (remaining_budget_cents >= 0),
  cost_per_click_cents integer not null check (cost_per_click_cents > 0),
  scope_city text not null,
  scope_category text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.directory_ad_campaigns
  drop constraint if exists directory_ad_campaigns_status_check,
  add constraint directory_ad_campaigns_status_check
    check (status in ('pending_payment', 'active', 'paused', 'cancelled', 'exhausted', 'expired'));

alter table public.directory_ad_campaigns
  drop constraint if exists directory_ad_campaigns_window_check,
  add constraint directory_ad_campaigns_window_check
    check (ends_at >= starts_at);

create index if not exists directory_ad_campaigns_business_status_idx
  on public.directory_ad_campaigns (business_id, status, ends_at desc);

create index if not exists directory_ad_campaigns_owner_updated_idx
  on public.directory_ad_campaigns (owner_profile_id, updated_at desc);

create index if not exists directory_ad_campaigns_checkout_session_idx
  on public.directory_ad_campaigns (stripe_checkout_session_id);

create index if not exists directory_ad_campaigns_payment_intent_idx
  on public.directory_ad_campaigns (stripe_payment_intent_id);

create table if not exists public.directory_ad_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.directory_ad_campaigns(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_type text not null,
  page_path text not null,
  dedupe_key text not null,
  cost_cents integer not null default 0 check (cost_cents >= 0),
  created_at timestamptz not null default now()
);

alter table public.directory_ad_events
  drop constraint if exists directory_ad_events_event_type_check,
  add constraint directory_ad_events_event_type_check
    check (event_type in ('impression', 'click'));

create unique index if not exists directory_ad_events_dedupe_key_idx
  on public.directory_ad_events (dedupe_key);

create index if not exists directory_ad_events_campaign_created_idx
  on public.directory_ad_events (campaign_id, created_at desc);

create index if not exists directory_ad_events_business_type_idx
  on public.directory_ad_events (business_id, event_type, created_at desc);

alter table public.directory_ad_campaigns enable row level security;
alter table public.directory_ad_events enable row level security;

drop policy if exists "directory_ad_campaigns_no_client_access" on public.directory_ad_campaigns;
create policy "directory_ad_campaigns_no_client_access"
  on public.directory_ad_campaigns
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "directory_ad_events_no_client_access" on public.directory_ad_events;
create policy "directory_ad_events_no_client_access"
  on public.directory_ad_events
  for all
  to anon, authenticated
  using (false)
  with check (false);
