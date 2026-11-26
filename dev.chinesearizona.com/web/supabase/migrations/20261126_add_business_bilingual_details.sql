-- Bilingual listing details (issue #411). Spoken languages stay in the
-- existing `languages` array, which now also accepts 'Cantonese'. These
-- columns add a WeChat ID, WeChat Pay / Alipay acceptance, and whether the
-- business has a Chinese menu (restaurants) or Chinese forms (everyone else).
-- Owners edit them from the dashboard and admins for any listing, both
-- through the server (service role).

alter table public.businesses
  add column if not exists wechat_id text,
  add column if not exists accepts_wechat_pay boolean not null default false,
  add column if not exists accepts_alipay boolean not null default false,
  add column if not exists chinese_menu_or_forms boolean not null default false;

alter table public.businesses
  drop constraint if exists businesses_wechat_id_check,
  add constraint businesses_wechat_id_check check (
    wechat_id is null or wechat_id ~ '^[A-Za-z0-9_+-]{2,40}$'
  );

-- Directory filters for "accepts WeChat Pay" and "accepts Alipay".
create index if not exists businesses_accepts_wechat_pay_idx
  on public.businesses (accepts_wechat_pay) where accepts_wechat_pay;

create index if not exists businesses_accepts_alipay_idx
  on public.businesses (accepts_alipay) where accepts_alipay;
