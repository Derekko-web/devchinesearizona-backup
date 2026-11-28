-- Rollback for corrections batch 3b: removes the school row it inserted.
-- Guarded so a row that has since been claimed by its owner is left alone.
delete from public.businesses
where slug in (
  'greater-phoenix-chinese-christian-school-chandler'
)
  and owner_profile_id is null;
