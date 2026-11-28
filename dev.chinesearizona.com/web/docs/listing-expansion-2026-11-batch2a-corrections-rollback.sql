-- Rollback for corrections batch 2a: restores languages {English} (production value before this change).
begin;
update public.businesses set languages = array['English']::text[], last_updated = now()
where slug in ('cpa-worldwide-tax-service-chandler', 'apex-dental-care-gilbert') and languages = array['English', 'Chinese']::text[];
commit;
