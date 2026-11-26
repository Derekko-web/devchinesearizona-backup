-- Paid listing plans sold with Stripe Checkout (issue #408): the Enhanced
-- listing (yearly) and the Sponsored category spot (monthly or yearly).
-- Each row is one paid term. A plan is on while now() is between starts_at and
-- ends_at and status is 'active'. Buying again while a plan runs adds a row
-- that starts when the current term ends. Nothing renews automatically.
-- Paid plans never set the editor-chosen "Featured" badge and never change
-- reviews, ratings or verification.

create table if not exists public.directory_listing_plans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null,
  billing_interval text not null,
  amount_cents integer not null,
  founding boolean not null default false,
  status text not null default 'active',
  scope_category text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.directory_listing_plans
  drop constraint if exists directory_listing_plans_plan_id_check,
  add constraint directory_listing_plans_plan_id_check
    check (plan_id in ('enhanced-listing', 'sponsored-category'));

alter table public.directory_listing_plans
  drop constraint if exists directory_listing_plans_interval_check,
  add constraint directory_listing_plans_interval_check
    check (
      (plan_id = 'enhanced-listing' and billing_interval = 'year')
      or (plan_id = 'sponsored-category' and billing_interval in ('month', 'year'))
    );

alter table public.directory_listing_plans
  drop constraint if exists directory_listing_plans_status_check,
  add constraint directory_listing_plans_status_check check (status in ('active', 'cancelled'));

alter table public.directory_listing_plans
  drop constraint if exists directory_listing_plans_amount_check,
  add constraint directory_listing_plans_amount_check check (amount_cents >= 0);

alter table public.directory_listing_plans
  drop constraint if exists directory_listing_plans_term_check,
  add constraint directory_listing_plans_term_check check (ends_at > starts_at);

-- One row per Stripe checkout, so a retried webhook cannot save a payment twice.
create unique index if not exists directory_listing_plans_checkout_session_idx
  on public.directory_listing_plans (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists directory_listing_plans_business_plan_idx
  on public.directory_listing_plans (business_id, plan_id, ends_at desc);

create index if not exists directory_listing_plans_active_idx
  on public.directory_listing_plans (status, ends_at);

create index if not exists directory_listing_plans_owner_idx
  on public.directory_listing_plans (owner_profile_id);

-- Only the server (service role) reads or writes plans.
alter table public.directory_listing_plans enable row level security;

drop policy if exists "directory_listing_plans_no_client_access" on public.directory_listing_plans;
create policy "directory_listing_plans_no_client_access"
  on public.directory_listing_plans
  for all
  to anon, authenticated
  using (false)
  with check (false);
