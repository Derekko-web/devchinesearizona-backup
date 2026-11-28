-- Follow-up to listing-expansion-2026-11-chains-suppress.sql (CEO decision 2026-11-28): suppress every Panda Express listing too.
-- National chain with no Chinese-language service on record. On 2026-11-28 the only Panda Express row on dev and production was
-- panda-express-peoria (Singing Pandas Asian Restaurant & Bar in Chandler is a different, independent restaurant and is not touched).
-- Same mechanism as the chain file: status 'suppressed' hides the row from the site but keeps it in the table. Guarded on status = 'live'.
begin;
update public.businesses set status = 'suppressed', last_updated = now()
where status = 'live' and slug in (
  'panda-express-peoria'
);
commit;
