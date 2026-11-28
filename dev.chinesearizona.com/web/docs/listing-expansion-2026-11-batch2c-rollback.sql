-- Rollback for listing expansion batch 2c: removes only the rows this batch inserted.
-- Guarded so a row that has since been claimed by its owner is left alone.
delete from public.businesses
where slug in (
  'i-hui-chiang-md-phoenix',
  'rong-guo-md-glendale',
  'rosanne-kho-md-phoenix',
  'wilber-su-md-phoenix',
  'ying-li-md-phoenix',
  'michael-lee-md-phoenix',
  'qing-zhao-md-chandler',
  'angela-feng-do-mesa'
)
  and owner_profile_id is null;
