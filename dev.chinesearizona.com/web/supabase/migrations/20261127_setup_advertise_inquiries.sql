-- Advertising inquiries from the "Talk to us" form on /advertise (issue #474).
-- The form used to open an email to the site's hello@ address, which cannot
-- receive mail, so every inquiry was lost. Now each one is saved here, shown on
-- /admin, and emailed to ADMIN_NOTIFICATION_EMAIL when email is set up.

create table if not exists public.advertise_inquiries (
  id uuid primary key default gen_random_uuid(),
  site_key text not null default 'arizona',
  -- An id from the /advertise plan list, or null for "not sure yet".
  plan_id text,
  name text not null,
  business_name text not null,
  -- Whatever the business gave us to reach them: email, phone or WeChat ID.
  contact text not null,
  message text,
  locale text not null default 'en',
  page_path text,
  notified_at timestamptz,
  notify_error text,
  created_at timestamptz not null default now()
);

alter table public.advertise_inquiries
  drop constraint if exists advertise_inquiries_locale_check,
  add constraint advertise_inquiries_locale_check check (locale in ('en', 'zh'));

alter table public.advertise_inquiries
  drop constraint if exists advertise_inquiries_length_check,
  add constraint advertise_inquiries_length_check check (
    char_length(site_key) between 1 and 40
    and (plan_id is null or char_length(plan_id) between 1 and 60)
    and char_length(name) between 1 and 120
    and char_length(business_name) between 1 and 160
    and char_length(contact) between 1 and 200
    and (message is null or char_length(message) <= 2000)
    and (page_path is null or char_length(page_path) <= 300)
    and (notify_error is null or char_length(notify_error) <= 200)
  );

create index if not exists advertise_inquiries_created_idx
  on public.advertise_inquiries (created_at desc);

-- Only the server (service role) reads or writes inquiries.
alter table public.advertise_inquiries enable row level security;

drop policy if exists "advertise_inquiries_no_client_access" on public.advertise_inquiries;
create policy "advertise_inquiries_no_client_access"
  on public.advertise_inquiries
  for all
  to anon, authenticated
  using (false)
  with check (false);
