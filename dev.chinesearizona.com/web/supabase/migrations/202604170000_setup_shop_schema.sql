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
