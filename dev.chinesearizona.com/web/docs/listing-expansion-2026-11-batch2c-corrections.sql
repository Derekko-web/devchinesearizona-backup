-- Corrections, batch 2c: AZ Hope Chinese School teaches Simplified Chinese ("Our goal is to offer instruction in Chinese culture and simplified Chinese",
-- https://www.azhopechineseschool.org/school/page/about). Its languages carried "Traditional Chinese" (shown as 繁體中文) and the alias 繁體; both removed.
-- Also: alan-wang-md-phoenix (batch 2a) was published without a phone. Under the CEO's 2026-11-28 decision the employer's directory counts for phone;
-- Banner's provider page lists "Preferred Phone Number 833-929-2418" (https://doctors.bannerhealth.com/provider/alan-wang/776227, checked 2026-11-28).
begin;
update public.businesses set
  languages = array_remove(languages, 'Traditional Chinese'),
  search_aliases = array_remove(array_remove(search_aliases, 'Traditional Chinese'), '繁體'),
  last_updated = now()
where slug = 'az-hope-chinese-school-chandler' and 'Traditional Chinese' = any(languages);

update public.businesses set phone = '(833) 929-2418', last_updated = now()
where slug = 'alan-wang-md-phoenix' and (phone is null or phone = '');
commit;
