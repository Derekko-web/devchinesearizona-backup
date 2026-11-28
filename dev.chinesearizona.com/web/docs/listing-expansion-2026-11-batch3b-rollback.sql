-- Rollback for listing expansion batch 3b: removes only the rows this batch inserted.
-- Guarded so a row that has since been claimed by its owner is left alone.
delete from public.businesses
where slug in (
  'taiwan-mama-deer-valley-phoenix',
  'tofu-king-late-night-phoenix',
  'cactiflower-phoenix',
  '85c-bakery-cafe-arrowhead-glendale'
)
  and owner_profile_id is null;
