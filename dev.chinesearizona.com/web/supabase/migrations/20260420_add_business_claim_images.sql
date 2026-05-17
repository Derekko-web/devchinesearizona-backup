alter table public.business_claims add column if not exists hero_image text;
alter table public.business_claims add column if not exists gallery text[] not null default '{}';
