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
  using (
    public.can_access_shop_order(id)
  )
  with check (
    public.can_access_shop_order(id)
  );

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
