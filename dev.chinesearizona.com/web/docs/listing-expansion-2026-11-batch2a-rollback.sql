-- Rollback for listing expansion batch 2a: removes only the rows this batch inserted.
-- Guarded so a row that has since been claimed by its owner is left alone.
delete from public.businesses
where slug in (
  'albert-hsia-do-chandler',
  'alan-wang-md-phoenix',
  'david-wang-md-chandler',
  'jen-jung-pan-md-phoenix',
  'jennifer-huang-md-peoria',
  'jimmy-chim-md-phoenix',
  'mimi-chao-md-mesa',
  'rong-bai-md-phoenix'
)
  and owner_profile_id is null;
