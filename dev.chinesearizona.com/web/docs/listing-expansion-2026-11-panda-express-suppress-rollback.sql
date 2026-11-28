-- Rollback for panda-express-suppress: puts panda-express-peoria back to 'live' (it was 'live' on 2026-11-28).
begin;
update public.businesses set status = 'live', last_updated = now()
where status = 'suppressed' and slug in (
  'panda-express-peoria'
);
commit;
