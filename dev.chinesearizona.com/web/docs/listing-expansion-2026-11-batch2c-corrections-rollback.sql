-- Rollback for corrections batch 2c: restores AZ Hope Chinese School's languages and aliases, and alan-wang-md-phoenix's empty phone,
-- as they were on production on 2026-11-28.
begin;
update public.businesses set
  languages = array['English', 'Mandarin', 'Traditional Chinese']::text[],
  search_aliases = array['AZ Hope Chinese School', '記建校三十周年義工聚會', 'Chandler', 'education', 'azhopechineseschool.org', 'English', 'Mandarin', 'Traditional Chinese', 'Chinese', '繁體', 'Chinese characters']::text[],
  last_updated = now()
where slug = 'az-hope-chinese-school-chandler';

update public.businesses set phone = null, last_updated = now()
where slug = 'alan-wang-md-phoenix' and phone = '(833) 929-2418';
commit;
