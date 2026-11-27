-- Footer newsletter sign-ups (issue #441). Nothing is sent yet; this only
-- keeps the list. One row per email per site, so a visitor who signs up twice
-- is stored once, and a past unsubscriber who signs up again is re-subscribed.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  site_key text not null default 'arizona',
  locale text not null default 'en',
  source_path text,
  -- The exact consent wording the visitor saw next to the form.
  consent_text text not null,
  consent_at timestamptz not null default now(),
  -- 64 hex characters from two random UUIDs, so links cannot be guessed.
  unsubscribe_token text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.newsletter_subscribers
  drop constraint if exists newsletter_subscribers_locale_check,
  add constraint newsletter_subscribers_locale_check check (locale in ('en', 'zh'));

alter table public.newsletter_subscribers
  drop constraint if exists newsletter_subscribers_length_check,
  add constraint newsletter_subscribers_length_check check (
    char_length(email) between 3 and 254
    and email = lower(email)
    and char_length(site_key) between 1 and 40
    and (source_path is null or char_length(source_path) <= 300)
    and char_length(consent_text) between 1 and 500
    and char_length(unsubscribe_token) >= 32
  );

create unique index if not exists newsletter_subscribers_site_email_idx
  on public.newsletter_subscribers (site_key, email);

create unique index if not exists newsletter_subscribers_unsubscribe_token_idx
  on public.newsletter_subscribers (unsubscribe_token);

create index if not exists newsletter_subscribers_created_idx
  on public.newsletter_subscribers (created_at desc);

-- Only the server (service role) reads or writes the list.
alter table public.newsletter_subscribers enable row level security;

drop policy if exists "newsletter_subscribers_no_client_access" on public.newsletter_subscribers;
create policy "newsletter_subscribers_no_client_access"
  on public.newsletter_subscribers
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Adds an email in one statement, so two quick sign-ups cannot create two rows.
-- Returns 'subscribed' for a new email, 'resubscribed' for a past unsubscriber,
-- and 'already_subscribed' when the email is already on the list (that row is
-- left as it was).
create or replace function public.newsletter_subscribe(
  p_email text,
  p_site_key text,
  p_locale text,
  p_source_path text,
  p_consent_text text
)
returns text
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_inserted boolean;
begin
  insert into public.newsletter_subscribers as s (email, site_key, locale, source_path, consent_text)
  values (lower(trim(p_email)), p_site_key, p_locale, p_source_path, p_consent_text)
  on conflict (site_key, email) do update
    set unsubscribed_at = null,
        locale = excluded.locale,
        source_path = excluded.source_path,
        consent_text = excluded.consent_text,
        consent_at = now(),
        updated_at = now()
    where s.unsubscribed_at is not null
  returning (xmax = 0) into v_inserted;

  if v_inserted is null then
    return 'already_subscribed';
  end if;

  return case when v_inserted then 'subscribed' else 'resubscribed' end;
end;
$$;

-- Marks the subscriber behind a token as unsubscribed. Returns false when no
-- subscriber has that token. Unsubscribing twice keeps the first time.
create or replace function public.newsletter_unsubscribe(p_token text)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $$
  with updated as (
    update public.newsletter_subscribers
    set unsubscribed_at = coalesce(unsubscribed_at, now()),
        updated_at = now()
    where unsubscribe_token = p_token
    returning 1
  )
  select exists (select 1 from updated);
$$;

revoke execute on function public.newsletter_subscribe(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.newsletter_subscribe(text, text, text, text, text) to service_role;

revoke execute on function public.newsletter_unsubscribe(text) from public, anon, authenticated;
grant execute on function public.newsletter_unsubscribe(text) to service_role;
