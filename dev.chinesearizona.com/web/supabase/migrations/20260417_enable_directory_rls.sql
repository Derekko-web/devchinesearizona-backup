alter table public.profiles enable row level security;
alter table public.business_categories enable row level security;
alter table public.businesses enable row level security;
alter table public.business_claims enable row level security;
alter table public.reports enable row level security;

drop policy if exists "Public can view business categories" on public.business_categories;
create policy "Public can view business categories"
  on public.business_categories
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can view businesses" on public.businesses;
create policy "Public can view businesses"
  on public.businesses
  for select
  to anon, authenticated
  using (true);
