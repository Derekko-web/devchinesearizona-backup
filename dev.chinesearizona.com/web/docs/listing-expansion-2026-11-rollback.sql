-- Rollback for listing expansion batch 1: removes only the rows this batch inserted.
-- Guarded so a row that has since been claimed by its owner is left alone.
delete from public.businesses
where slug in (
  'joseph-lau-state-farm-chandler',
  'katie-lau-state-farm-mesa',
  'tak-sun-comparion-insurance-chandler',
  'lin-rawlinson-cpa-chandler',
  'cpa-worldwide-tax-service-chandler',
  'jill-yen-roi-properties-phoenix',
  'ling-zhu-phoenix',
  'christy-crouse-scottsdale',
  'jean-woodland-scottsdale',
  'jane-zheng-merrill-phoenix',
  'alexander-lu-merrill-scottsdale',
  'daisy-zhu-merrill-scottsdale',
  'apex-dental-care-gilbert',
  'joyce-h-huang-pllc-tempe'
)
  and owner_profile_id is null;
