-- Rollback for listing expansion batch 4: removes only the rows this batch inserted.
-- Guarded so a row that has since been claimed by its owner is left alone.
delete from public.businesses
where slug in (
  'desert-river-realty-phoenix',
  'grace-chen-cpa-tempe',
  'api-dental-group-phoenix',
  'law-offices-of-david-dai-tempe',
  'jeffrey-chow-dds-gilbert',
  'jc-financial-services-phoenix',
  'dobson-warner-dentistry-chandler'
)
  and owner_profile_id is null;
