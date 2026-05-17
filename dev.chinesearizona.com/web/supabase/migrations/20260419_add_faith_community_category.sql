insert into public.business_categories (
  slug,
  name_en,
  name_zh_tw,
  description_en,
  description_zh_tw,
  icon
)
values (
  'faith-community',
  'Faith & Community',
  '信仰社群',
  'Churches, temples, fellowships, and community faith anchors.',
  '教會、寺院、團契與在地信仰社群據點。',
  'users'
)
on conflict (slug) do update
set
  name_en = excluded.name_en,
  name_zh_tw = excluded.name_zh_tw,
  description_en = excluded.description_en,
  description_zh_tw = excluded.description_zh_tw,
  icon = excluded.icon;
