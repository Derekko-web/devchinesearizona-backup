-- Free leads for listings (issue #410): visitor inquiries plus counts of
-- Call / Website / Directions clicks. Leads are never billed per inquiry or per
-- closed deal. For real estate and mortgage that is required (RESPA section 8),
-- so sponsors there pay flat advertising fees only.

create table if not exists public.business_inquiries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  inquiry_type text not null default 'question',
  name text not null,
  email text not null,
  phone text,
  message text not null,
  locale text not null default 'en',
  page_path text,
  notified_to text,
  notified_at timestamptz,
  notify_error text,
  created_at timestamptz not null default now()
);

alter table public.business_inquiries
  drop constraint if exists business_inquiries_inquiry_type_check,
  add constraint business_inquiries_inquiry_type_check check (inquiry_type in ('question', 'quote'));

alter table public.business_inquiries
  drop constraint if exists business_inquiries_locale_check,
  add constraint business_inquiries_locale_check check (locale in ('en', 'zh'));

alter table public.business_inquiries
  drop constraint if exists business_inquiries_notified_to_check,
  add constraint business_inquiries_notified_to_check check (notified_to is null or notified_to in ('owner', 'admin'));

alter table public.business_inquiries
  drop constraint if exists business_inquiries_length_check,
  add constraint business_inquiries_length_check check (
    char_length(name) between 1 and 120
    and char_length(email) between 3 and 254
    and (phone is null or char_length(phone) <= 40)
    and char_length(message) between 1 and 2000
    and (page_path is null or char_length(page_path) <= 300)
  );

create index if not exists business_inquiries_business_created_idx
  on public.business_inquiries (business_id, created_at desc);

create index if not exists business_inquiries_created_idx
  on public.business_inquiries (created_at desc);

create table if not exists public.business_contact_clicks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  action text not null,
  dedupe_key text not null,
  created_at timestamptz not null default now()
);

alter table public.business_contact_clicks
  drop constraint if exists business_contact_clicks_action_check,
  add constraint business_contact_clicks_action_check check (action in ('call', 'website', 'directions'));

-- One click per listing, per action, per visitor, per day. The visitor part of
-- the key is a keyed hash of the address, so raw IPs are never stored.
create unique index if not exists business_contact_clicks_dedupe_key_idx
  on public.business_contact_clicks (dedupe_key);

create index if not exists business_contact_clicks_business_created_idx
  on public.business_contact_clicks (business_id, created_at desc);

create index if not exists business_contact_clicks_created_idx
  on public.business_contact_clicks (created_at desc);

-- Only the server (service role) reads or writes these tables.
alter table public.business_inquiries enable row level security;
alter table public.business_contact_clicks enable row level security;

drop policy if exists "business_inquiries_no_client_access" on public.business_inquiries;
create policy "business_inquiries_no_client_access"
  on public.business_inquiries
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "business_contact_clicks_no_client_access" on public.business_contact_clicks;
create policy "business_contact_clicks_no_client_access"
  on public.business_contact_clicks
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Per-listing lead counts since a point in time, for the owner dashboard
-- (p_business_ids set) and the admin view (p_business_ids null).
create or replace function public.business_lead_counts(
  p_since timestamptz,
  p_business_ids uuid[] default null
)
returns table (
  business_id uuid,
  business_slug text,
  business_name_en text,
  business_name_zh_tw text,
  claimed boolean,
  call_clicks bigint,
  website_clicks bigint,
  directions_clicks bigint,
  inquiries bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with clicks as (
    select
      c.business_id,
      count(*) filter (where c.action = 'call') as call_clicks,
      count(*) filter (where c.action = 'website') as website_clicks,
      count(*) filter (where c.action = 'directions') as directions_clicks
    from public.business_contact_clicks c
    where c.created_at >= p_since
      and (p_business_ids is null or c.business_id = any (p_business_ids))
    group by c.business_id
  ),
  inquiry_counts as (
    select i.business_id, count(*) as inquiries
    from public.business_inquiries i
    where i.created_at >= p_since
      and (p_business_ids is null or i.business_id = any (p_business_ids))
    group by i.business_id
  ),
  combined as (
    select
      coalesce(c.business_id, i.business_id) as business_id,
      coalesce(c.call_clicks, 0) as call_clicks,
      coalesce(c.website_clicks, 0) as website_clicks,
      coalesce(c.directions_clicks, 0) as directions_clicks,
      coalesce(i.inquiries, 0) as inquiries
    from clicks c
    full outer join inquiry_counts i on i.business_id = c.business_id
  )
  select
    b.id,
    b.slug,
    b.name_en,
    b.name_zh_tw,
    b.owner_profile_id is not null,
    combined.call_clicks,
    combined.website_clicks,
    combined.directions_clicks,
    combined.inquiries
  from combined
  join public.businesses b on b.id = combined.business_id
  order by
    combined.call_clicks + combined.website_clicks + combined.directions_clicks + combined.inquiries desc,
    b.name_en asc;
$$;

revoke execute on function public.business_lead_counts(timestamptz, uuid[]) from public, anon, authenticated;
grant execute on function public.business_lead_counts(timestamptz, uuid[]) to service_role;
