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
  hero_image text,
  gallery text[] not null default '{}',
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  created_at timestamptz not null default now()
);

alter table business_claims alter column business_id drop not null;
alter table business_claims add column if not exists business_slug text;
alter table business_claims add column if not exists business_name text;
alter table business_claims add column if not exists category_slug text;
alter table business_claims add column if not exists city text;
alter table business_claims add column if not exists details text;
alter table business_claims add column if not exists hero_image text;
alter table business_claims add column if not exists gallery text[] not null default '{}';
alter table business_claims drop column if exists candidate_id;

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_slug text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists directory_ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  owner_profile_id uuid not null references profiles(id) on delete cascade,
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

alter table directory_ad_campaigns
  drop constraint if exists directory_ad_campaigns_status_check,
  add constraint directory_ad_campaigns_status_check
    check (status in ('pending_payment', 'active', 'paused', 'cancelled', 'exhausted', 'expired'));

alter table directory_ad_campaigns
  drop constraint if exists directory_ad_campaigns_window_check,
  add constraint directory_ad_campaigns_window_check
    check (ends_at >= starts_at);

create table if not exists directory_ad_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references directory_ad_campaigns(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  event_type text not null,
  page_path text not null,
  dedupe_key text not null,
  cost_cents integer not null default 0 check (cost_cents >= 0),
  created_at timestamptz not null default now()
);

alter table directory_ad_events
  drop constraint if exists directory_ad_events_event_type_check,
  add constraint directory_ad_events_event_type_check
    check (event_type in ('impression', 'click'));

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

create index if not exists reports_entity_type_idx on reports (entity_type, created_at desc);
create index if not exists directory_ad_campaigns_business_status_idx
  on directory_ad_campaigns (business_id, status, ends_at desc);
create index if not exists directory_ad_campaigns_owner_updated_idx
  on directory_ad_campaigns (owner_profile_id, updated_at desc);
create index if not exists directory_ad_campaigns_checkout_session_idx
  on directory_ad_campaigns (stripe_checkout_session_id);
create index if not exists directory_ad_campaigns_payment_intent_idx
  on directory_ad_campaigns (stripe_payment_intent_id);
create unique index if not exists directory_ad_events_dedupe_key_idx
  on directory_ad_events (dedupe_key);
create index if not exists directory_ad_events_campaign_created_idx
  on directory_ad_events (campaign_id, created_at desc);
create index if not exists directory_ad_events_business_type_idx
  on directory_ad_events (business_id, event_type, created_at desc);
create index if not exists audit_log_entity_type_idx on audit_log (entity_type, created_at desc);

create table if not exists shop_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_zh_tw text,
  description_en text not null,
  description_zh_tw text,
  icon text not null,
  created_at timestamptz not null default now()
);

create table if not exists shop_sellers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  profile_id uuid not null references profiles(id) on delete cascade,
  display_name_en text not null,
  display_name_zh_tw text,
  headline_en text not null,
  headline_zh_tw text,
  description_en text not null,
  description_zh_tw text,
  city text not null,
  member_since timestamptz not null default now(),
  response_rate integer not null default 0 check (response_rate between 0 and 100),
  handling_time_days integer not null default 1 check (handling_time_days >= 0),
  positive_feedback_rate numeric(5,2) not null default 0 check (positive_feedback_rate between 0 and 100),
  feedback_count integer not null default 0 check (feedback_count >= 0),
  return_window_days integer not null default 14 check (return_window_days >= 0),
  accepts_returns boolean not null default true,
  top_rated boolean not null default false,
  approved boolean not null default false,
  stripe_account_status text not null default 'not_started' check (stripe_account_status in ('not_started', 'pending', 'active')),
  stripe_account_id text,
  followers integer not null default 0 check (followers >= 0),
  sale_count integer not null default 0 check (sale_count >= 0),
  languages text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_sellers_profile_idx on shop_sellers (profile_id);
create index if not exists shop_sellers_approval_idx on shop_sellers (approved, stripe_account_status);

create table if not exists shop_listings (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  seller_id uuid not null references shop_sellers(id) on delete cascade,
  category_id uuid not null references shop_categories(id),
  title_en text not null,
  title_zh_tw text,
  excerpt_en text not null,
  excerpt_zh_tw text,
  description_en jsonb not null default '[]'::jsonb,
  description_zh_tw jsonb not null default '[]'::jsonb,
  condition text not null check (condition in ('new', 'open_box', 'excellent', 'good', 'fair', 'for_parts')),
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'active', 'paused', 'sold_out', 'ended', 'removed')),
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'USD',
  quantity_available integer not null default 0 check (quantity_available >= 0),
  sold_count integer not null default 0 check (sold_count >= 0),
  allow_offers boolean not null default false,
  allow_local_pickup boolean not null default false,
  featured boolean not null default false,
  pickup_city text,
  shipping_methods text[] not null default '{}' check (shipping_methods <@ array['standard', 'expedited', 'local_pickup']),
  return_policy_en text not null,
  return_policy_zh_tw text,
  item_specifics_json jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  view_count integer not null default 0 check (view_count >= 0),
  watcher_count integer not null default 0 check (watcher_count >= 0),
  search_document tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_listings_search_document_idx on shop_listings using gin (search_document);
create index if not exists shop_listings_title_en_trgm_idx on shop_listings using gin (title_en gin_trgm_ops);
create index if not exists shop_listings_title_zh_tw_trgm_idx on shop_listings using gin (title_zh_tw gin_trgm_ops);
create index if not exists shop_listings_status_idx on shop_listings (status, updated_at desc);
create index if not exists shop_listings_seller_idx on shop_listings (seller_id, status, updated_at desc);
create index if not exists shop_listings_category_idx on shop_listings (category_id, status, price_cents);

create table if not exists shop_listing_variants (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references shop_listings(id) on delete cascade,
  label_en text not null,
  label_zh_tw text,
  sku text not null,
  price_cents integer not null check (price_cents >= 0),
  quantity_available integer not null default 0 check (quantity_available >= 0),
  attributes_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists shop_listing_variants_listing_idx on shop_listing_variants (listing_id);
create unique index if not exists shop_listing_variants_listing_sku_idx on shop_listing_variants (listing_id, sku);

create table if not exists shop_listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references shop_listings(id) on delete cascade,
  variant_id uuid references shop_listing_variants(id) on delete set null,
  url text not null,
  alt_en text not null,
  alt_zh_tw text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists shop_listing_images_listing_idx on shop_listing_images (listing_id, sort_order, created_at);

create table if not exists shop_saved_searches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  label text not null,
  query text not null default '',
  category_slug text,
  condition text check (condition in ('new', 'open_box', 'excellent', 'good', 'fair', 'for_parts')),
  offer_only boolean not null default false,
  pickup_only boolean not null default false,
  price_min integer,
  price_max integer,
  sort text default 'best_match' check (sort in ('best_match', 'newest', 'price_low', 'price_high')),
  created_at timestamptz not null default now()
);

create index if not exists shop_saved_searches_profile_idx on shop_saved_searches (profile_id, created_at desc);

create table if not exists shop_watchlist_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid not null references shop_listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, listing_id)
);

create index if not exists shop_watchlist_items_profile_idx on shop_watchlist_items (profile_id, created_at desc);

create table if not exists shop_saved_sellers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  seller_id uuid not null references shop_sellers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, seller_id)
);

create index if not exists shop_saved_sellers_profile_idx on shop_saved_sellers (profile_id, created_at desc);

create table if not exists shop_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references shop_listings(id) on delete cascade,
  variant_id uuid references shop_listing_variants(id) on delete set null,
  buyer_profile_id uuid not null references profiles(id) on delete cascade,
  seller_id uuid not null references shop_sellers(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'countered', 'expired', 'withdrawn')),
  message text,
  counter_amount_cents integer check (counter_amount_cents >= 0),
  reserved_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists shop_offers_buyer_idx on shop_offers (buyer_profile_id, updated_at desc);
create index if not exists shop_offers_seller_idx on shop_offers (seller_id, status, updated_at desc);
create index if not exists shop_offers_listing_idx on shop_offers (listing_id, status, updated_at desc);

create table if not exists shop_carts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table if not exists shop_cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references shop_carts(id) on delete cascade,
  listing_id uuid not null references shop_listings(id) on delete cascade,
  variant_id uuid references shop_listing_variants(id) on delete set null,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create unique index if not exists shop_cart_items_unique_idx on shop_cart_items (cart_id, listing_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists shop_cart_items_cart_idx on shop_cart_items (cart_id, created_at desc);

create table if not exists shop_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_profile_id uuid not null references profiles(id) on delete cascade,
  seller_id uuid not null references shop_sellers(id) on delete cascade,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded', 'partially_refunded')),
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  payment_method text not null,
  shipping_address text,
  offer_id uuid references shop_offers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_orders_buyer_idx on shop_orders (buyer_profile_id, created_at desc);
create index if not exists shop_orders_seller_idx on shop_orders (seller_id, status, created_at desc);

create table if not exists shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references shop_orders(id) on delete cascade,
  listing_id uuid references shop_listings(id) on delete set null,
  seller_id uuid not null references shop_sellers(id) on delete cascade,
  title_en text not null,
  title_zh_tw text,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null default 1 check (quantity > 0),
  variant_label_en text,
  variant_label_zh_tw text,
  snapshot_condition text not null check (snapshot_condition in ('new', 'open_box', 'excellent', 'good', 'fair', 'for_parts'))
);

create index if not exists shop_order_items_order_idx on shop_order_items (order_id);

create table if not exists shop_shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references shop_orders(id) on delete cascade,
  method text not null check (method in ('standard', 'expedited', 'local_pickup')),
  carrier text,
  tracking_number text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  pickup_code text,
  picked_up_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists shop_returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references shop_orders(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'approved', 'received', 'refunded', 'denied')),
  reason text not null,
  requested_at timestamptz not null default now(),
  seller_respond_by timestamptz not null,
  resolution_notes text
);

create index if not exists shop_returns_response_idx on shop_returns (status, seller_respond_by);

create table if not exists shop_cases (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references shop_orders(id) on delete cascade,
  opened_by_profile_id uuid not null references profiles(id) on delete cascade,
  seller_id uuid not null references shop_sellers(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'seller_action_required', 'buyer_action_required', 'escalated', 'resolved', 'closed')),
  reason text not null,
  opened_at timestamptz not null default now(),
  seller_respond_by timestamptz not null,
  escalated_at timestamptz,
  resolution_notes text
);

create index if not exists shop_cases_seller_idx on shop_cases (seller_id, status, seller_respond_by);
create index if not exists shop_cases_order_idx on shop_cases (order_id, opened_at desc);

create table if not exists shop_feedback (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references shop_orders(id) on delete cascade,
  seller_id uuid not null references shop_sellers(id) on delete cascade,
  buyer_profile_id uuid not null references profiles(id) on delete cascade,
  sentiment text not null check (sentiment in ('positive', 'neutral', 'negative')),
  title_en text not null,
  title_zh_tw text,
  comment_en text not null,
  comment_zh_tw text,
  created_at timestamptz not null default now()
);

create index if not exists shop_feedback_seller_idx on shop_feedback (seller_id, created_at desc);

create table if not exists shop_payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references shop_sellers(id) on delete cascade,
  order_id uuid not null references shop_orders(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'pending' check (status in ('pending', 'in_transit', 'paid')),
  available_at timestamptz not null,
  paid_at timestamptz
);

create index if not exists shop_payouts_seller_idx on shop_payouts (seller_id, status, available_at);

create table if not exists shop_conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references shop_listings(id) on delete set null,
  order_id uuid references shop_orders(id) on delete set null,
  buyer_profile_id uuid not null references profiles(id) on delete cascade,
  seller_id uuid not null references shop_sellers(id) on delete cascade,
  topic text not null check (topic in ('pre_sale', 'order_support', 'pickup')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_preview text not null default ''
);

create index if not exists shop_conversations_seller_idx on shop_conversations (seller_id, updated_at desc);
create index if not exists shop_conversations_buyer_idx on shop_conversations (buyer_profile_id, updated_at desc);

create table if not exists shop_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references shop_conversations(id) on delete cascade,
  sender_profile_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists shop_messages_conversation_idx on shop_messages (conversation_id, created_at);
create index if not exists shop_messages_flagged_idx on shop_messages (flagged, created_at desc);

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

alter table public.profiles
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

alter table public.shop_orders
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_transfer_group text,
  add column if not exists checkout_expires_at timestamptz,
  add column if not exists inventory_reserved_at timestamptz,
  add column if not exists payment_captured_at timestamptz;

create index if not exists shop_orders_checkout_session_idx
  on public.shop_orders (stripe_checkout_session_id);

create index if not exists shop_orders_transfer_group_idx
  on public.shop_orders (stripe_transfer_group);

alter table public.shop_offers
  add column if not exists used_at timestamptz,
  add column if not exists used_order_id uuid references public.shop_orders(id) on delete set null;

create index if not exists shop_offers_used_order_idx
  on public.shop_offers (used_order_id);

alter table public.shop_payouts
  add column if not exists stripe_transfer_id text,
  add column if not exists stripe_transfer_group text;

create index if not exists shop_payouts_transfer_group_idx
  on public.shop_payouts (stripe_transfer_group);

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select profiles.id
  from public.profiles
  where profiles.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select profiles.role
  from public.profiles
  where profiles.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.is_shop_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_profile_role() in ('moderator', 'admin'), false)
$$;

create or replace function public.owns_shop_seller(target_seller_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_shop_admin()
    or exists(
      select 1
      from public.shop_sellers
      where shop_sellers.id = target_seller_id
        and shop_sellers.profile_id = public.current_profile_id()
    )
$$;

create or replace function public.owns_shop_listing(target_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_shop_admin()
    or exists(
      select 1
      from public.shop_listings
      inner join public.shop_sellers on public.shop_sellers.id = public.shop_listings.seller_id
      where public.shop_listings.id = target_listing_id
        and public.shop_sellers.profile_id = public.current_profile_id()
    )
$$;

create or replace function public.can_access_shop_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_shop_admin()
    or exists(
      select 1
      from public.shop_orders
      where public.shop_orders.id = target_order_id
        and public.shop_orders.buyer_profile_id = public.current_profile_id()
    )
    or exists(
      select 1
      from public.shop_orders
      inner join public.shop_sellers on public.shop_sellers.id = public.shop_orders.seller_id
      where public.shop_orders.id = target_order_id
        and public.shop_sellers.profile_id = public.current_profile_id()
    )
$$;

create or replace function public.manages_shop_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_shop_admin()
    or exists(
      select 1
      from public.shop_orders
      inner join public.shop_sellers on public.shop_sellers.id = public.shop_orders.seller_id
      where public.shop_orders.id = target_order_id
        and public.shop_sellers.profile_id = public.current_profile_id()
    )
$$;

create or replace function public.can_access_shop_conversation(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_shop_admin()
    or exists(
      select 1
      from public.shop_conversations
      where public.shop_conversations.id = target_conversation_id
        and public.shop_conversations.buyer_profile_id = public.current_profile_id()
    )
    or exists(
      select 1
      from public.shop_conversations
      inner join public.shop_sellers on public.shop_sellers.id = public.shop_conversations.seller_id
      where public.shop_conversations.id = target_conversation_id
        and public.shop_sellers.profile_id = public.current_profile_id()
    )
$$;

alter table public.profiles enable row level security;
alter table public.shop_categories enable row level security;
alter table public.shop_sellers enable row level security;
alter table public.shop_listings enable row level security;
alter table public.shop_listing_variants enable row level security;
alter table public.shop_listing_images enable row level security;
alter table public.shop_saved_searches enable row level security;
alter table public.shop_watchlist_items enable row level security;
alter table public.shop_saved_sellers enable row level security;
alter table public.shop_offers enable row level security;
alter table public.shop_carts enable row level security;
alter table public.shop_cart_items enable row level security;
alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;
alter table public.shop_shipments enable row level security;
alter table public.shop_returns enable row level security;
alter table public.shop_cases enable row level security;
alter table public.shop_feedback enable row level security;
alter table public.shop_payouts enable row level security;
alter table public.shop_conversations enable row level security;
alter table public.shop_messages enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles
  for select
  to authenticated
  using (auth_user_id = (select auth.uid()));

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

revoke update on public.profiles from anon, authenticated;
grant update (slug, name, name_zh_tw, city, languages, bio_en, bio_zh_tw) on public.profiles to authenticated;

drop policy if exists "Public can view shop categories" on public.shop_categories;
create policy "Public can view shop categories"
  on public.shop_categories
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can view approved shop sellers" on public.shop_sellers;
create policy "Public can view approved shop sellers"
  on public.shop_sellers
  for select
  to anon, authenticated
  using (approved = true or public.owns_shop_seller(id));

drop policy if exists "Owners can insert shop sellers" on public.shop_sellers;
create policy "Owners can insert shop sellers"
  on public.shop_sellers
  for insert
  to authenticated
  with check (public.is_shop_admin() or profile_id = public.current_profile_id());

drop policy if exists "Owners can update shop sellers" on public.shop_sellers;
create policy "Owners can update shop sellers"
  on public.shop_sellers
  for update
  to authenticated
  using (public.owns_shop_seller(id))
  with check (public.owns_shop_seller(id));

drop policy if exists "Public can view shop listings" on public.shop_listings;
create policy "Public can view shop listings"
  on public.shop_listings
  for select
  to anon, authenticated
  using (
    (
      status in ('active', 'sold_out')
      and exists(
        select 1
        from public.shop_sellers
        where public.shop_sellers.id = seller_id
          and public.shop_sellers.approved = true
      )
    )
    or public.owns_shop_listing(id)
  );

drop policy if exists "Owners can insert shop listings" on public.shop_listings;
create policy "Owners can insert shop listings"
  on public.shop_listings
  for insert
  to authenticated
  with check (public.owns_shop_seller(seller_id));

drop policy if exists "Owners can update shop listings" on public.shop_listings;
create policy "Owners can update shop listings"
  on public.shop_listings
  for update
  to authenticated
  using (public.owns_shop_listing(id))
  with check (public.owns_shop_listing(id));

drop policy if exists "Owners can delete shop listings" on public.shop_listings;
create policy "Owners can delete shop listings"
  on public.shop_listings
  for delete
  to authenticated
  using (public.owns_shop_listing(id));

drop policy if exists "Public can view shop variants" on public.shop_listing_variants;
create policy "Public can view shop variants"
  on public.shop_listing_variants
  for select
  to anon, authenticated
  using (
    exists(
      select 1
      from public.shop_listings
      where public.shop_listings.id = listing_id
        and (
          public.shop_listings.status in ('active', 'sold_out')
          or public.owns_shop_listing(public.shop_listings.id)
        )
    )
  );

drop policy if exists "Owners can manage shop variants" on public.shop_listing_variants;
create policy "Owners can manage shop variants"
  on public.shop_listing_variants
  for all
  to authenticated
  using (public.owns_shop_listing(listing_id))
  with check (public.owns_shop_listing(listing_id));

drop policy if exists "Public can view shop images" on public.shop_listing_images;
create policy "Public can view shop images"
  on public.shop_listing_images
  for select
  to anon, authenticated
  using (
    exists(
      select 1
      from public.shop_listings
      where public.shop_listings.id = listing_id
        and (
          public.shop_listings.status in ('active', 'sold_out')
          or public.owns_shop_listing(public.shop_listings.id)
        )
    )
  );

drop policy if exists "Owners can manage shop images" on public.shop_listing_images;
create policy "Owners can manage shop images"
  on public.shop_listing_images
  for all
  to authenticated
  using (public.owns_shop_listing(listing_id))
  with check (public.owns_shop_listing(listing_id));

drop policy if exists "Users manage own saved searches" on public.shop_saved_searches;
create policy "Users manage own saved searches"
  on public.shop_saved_searches
  for all
  to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

drop policy if exists "Users manage own watchlist" on public.shop_watchlist_items;
create policy "Users manage own watchlist"
  on public.shop_watchlist_items
  for all
  to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

drop policy if exists "Users manage own saved sellers" on public.shop_saved_sellers;
create policy "Users manage own saved sellers"
  on public.shop_saved_sellers
  for all
  to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

drop policy if exists "Participants can view offers" on public.shop_offers;
create policy "Participants can view offers"
  on public.shop_offers
  for select
  to authenticated
  using (
    buyer_profile_id = public.current_profile_id()
    or public.owns_shop_seller(seller_id)
  );

drop policy if exists "Buyers can insert offers" on public.shop_offers;
create policy "Buyers can insert offers"
  on public.shop_offers
  for insert
  to authenticated
  with check (buyer_profile_id = public.current_profile_id());

drop policy if exists "Participants can update offers" on public.shop_offers;
create policy "Participants can update offers"
  on public.shop_offers
  for update
  to authenticated
  using (
    buyer_profile_id = public.current_profile_id()
    or public.owns_shop_seller(seller_id)
  )
  with check (
    buyer_profile_id = public.current_profile_id()
    or public.owns_shop_seller(seller_id)
  );

drop policy if exists "Users manage own carts" on public.shop_carts;
create policy "Users manage own carts"
  on public.shop_carts
  for all
  to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

drop policy if exists "Users manage own cart items" on public.shop_cart_items;
create policy "Users manage own cart items"
  on public.shop_cart_items
  for all
  to authenticated
  using (
    exists(
      select 1
      from public.shop_carts
      where public.shop_carts.id = cart_id
        and public.shop_carts.profile_id = public.current_profile_id()
    )
  )
  with check (
    exists(
      select 1
      from public.shop_carts
      where public.shop_carts.id = cart_id
        and public.shop_carts.profile_id = public.current_profile_id()
    )
  );

drop policy if exists "Participants can view orders" on public.shop_orders;
create policy "Participants can view orders"
  on public.shop_orders
  for select
  to authenticated
  using (public.can_access_shop_order(id));

drop policy if exists "Buyers can insert orders" on public.shop_orders;
create policy "Buyers can insert orders"
  on public.shop_orders
  for insert
  to authenticated
  with check (
    buyer_profile_id = public.current_profile_id()
    or public.is_shop_admin()
  );

drop policy if exists "Participants can update orders" on public.shop_orders;
create policy "Participants can update orders"
  on public.shop_orders
  for update
  to authenticated
  using (public.can_access_shop_order(id))
  with check (public.can_access_shop_order(id));

drop policy if exists "Participants can view order items" on public.shop_order_items;
create policy "Participants can view order items"
  on public.shop_order_items
  for select
  to authenticated
  using (public.can_access_shop_order(order_id));

drop policy if exists "Participants can manage order items" on public.shop_order_items;
create policy "Participants can manage order items"
  on public.shop_order_items
  for all
  to authenticated
  using (public.can_access_shop_order(order_id))
  with check (public.can_access_shop_order(order_id));

drop policy if exists "Participants can view shipments" on public.shop_shipments;
create policy "Participants can view shipments"
  on public.shop_shipments
  for select
  to authenticated
  using (public.can_access_shop_order(order_id));

drop policy if exists "Managers can update shipments" on public.shop_shipments;
create policy "Managers can update shipments"
  on public.shop_shipments
  for all
  to authenticated
  using (public.manages_shop_order(order_id))
  with check (public.manages_shop_order(order_id));

drop policy if exists "Participants can view returns" on public.shop_returns;
create policy "Participants can view returns"
  on public.shop_returns
  for select
  to authenticated
  using (public.can_access_shop_order(order_id));

drop policy if exists "Participants can manage returns" on public.shop_returns;
create policy "Participants can manage returns"
  on public.shop_returns
  for all
  to authenticated
  using (public.can_access_shop_order(order_id))
  with check (public.can_access_shop_order(order_id));

drop policy if exists "Participants can view cases" on public.shop_cases;
create policy "Participants can view cases"
  on public.shop_cases
  for select
  to authenticated
  using (
    opened_by_profile_id = public.current_profile_id()
    or public.owns_shop_seller(seller_id)
  );

drop policy if exists "Participants can manage cases" on public.shop_cases;
create policy "Participants can manage cases"
  on public.shop_cases
  for all
  to authenticated
  using (
    opened_by_profile_id = public.current_profile_id()
    or public.owns_shop_seller(seller_id)
  )
  with check (
    opened_by_profile_id = public.current_profile_id()
    or public.owns_shop_seller(seller_id)
  );

drop policy if exists "Public can view feedback" on public.shop_feedback;
create policy "Public can view feedback"
  on public.shop_feedback
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Buyers can insert feedback" on public.shop_feedback;
create policy "Buyers can insert feedback"
  on public.shop_feedback
  for insert
  to authenticated
  with check (buyer_profile_id = public.current_profile_id());

drop policy if exists "Sellers can view payouts" on public.shop_payouts;
create policy "Sellers can view payouts"
  on public.shop_payouts
  for select
  to authenticated
  using (public.owns_shop_seller(seller_id));

drop policy if exists "Participants can view conversations" on public.shop_conversations;
create policy "Participants can view conversations"
  on public.shop_conversations
  for select
  to authenticated
  using (public.can_access_shop_conversation(id));

drop policy if exists "Participants can manage conversations" on public.shop_conversations;
create policy "Participants can manage conversations"
  on public.shop_conversations
  for all
  to authenticated
  using (
    buyer_profile_id = public.current_profile_id()
    or public.owns_shop_seller(seller_id)
  )
  with check (
    buyer_profile_id = public.current_profile_id()
    or public.owns_shop_seller(seller_id)
  );

drop policy if exists "Participants can view messages" on public.shop_messages;
create policy "Participants can view messages"
  on public.shop_messages
  for select
  to authenticated
  using (public.can_access_shop_conversation(conversation_id));

drop policy if exists "Participants can send messages" on public.shop_messages;
create policy "Participants can send messages"
  on public.shop_messages
  for insert
  to authenticated
  with check (
    public.can_access_shop_conversation(conversation_id)
    and sender_profile_id = public.current_profile_id()
  );

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
