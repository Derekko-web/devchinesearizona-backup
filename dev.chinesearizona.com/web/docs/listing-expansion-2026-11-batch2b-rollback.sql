-- Rollback for listing expansion batch 2b: removes only the rows this batch inserted.
-- Guarded so a row that has since been claimed by its owner is left alone.
delete from public.businesses
where slug in (
  'angela-liu-lpc-gilbert',
  'june-lin-lee-lmft-tempe',
  'kuo-yi-chung-phd-mesa',
  'michelle-fowler-lpc-mesa',
  'petty-go-lamft-glendale',
  'shiru-zhou-lpc-scottsdale',
  'wen-chien-lin-lpc-tempe',
  'wiser-counseling-anna-liu-scottsdale'
)
  and owner_profile_id is null;
