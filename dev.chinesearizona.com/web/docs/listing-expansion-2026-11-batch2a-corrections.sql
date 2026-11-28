-- Corrections, batch 2a (CEO decision 2026-11-27): a source that says "Chinese" without a dialect is recorded as languages {English, Chinese}.
begin;

-- cpa-worldwide-tax-service-chandler: partner works "in both Chinese and English" (cpaworldwidetax.com/Partner.php).
update public.businesses set languages = array['English', 'Chinese']::text[], last_updated = now()
where slug = 'cpa-worldwide-tax-service-chandler' and languages = array['English']::text[];

-- apex-dental-care-gilbert: "Languages are available in English, Chinese, and Spanish" (apexdentalcare.com).
update public.businesses set languages = array['English', 'Chinese']::text[], last_updated = now()
where slug = 'apex-dental-care-gilbert' and languages = array['English']::text[];

commit;
