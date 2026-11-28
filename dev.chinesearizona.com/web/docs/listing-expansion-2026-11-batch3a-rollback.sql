-- Rollback for listing expansion batch 3a: removes only the rows this batch inserted.
-- Guarded so a row that has since been claimed by its owner is left alone.
delete from public.businesses
where slug in (
  'jenny-ho-do-glendale',
  'qi-zhang-md-glendale',
  'jinmeng-zhang-md-peoria',
  'vicky-chen-yang-md-peoria',
  'lin-zhao-md-phoenix',
  'alfredo-lim-md-phoenix',
  'da-wei-liao-md-phoenix'
)
  and owner_profile_id is null;
