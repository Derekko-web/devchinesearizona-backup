-- Corrections to existing listings, November 2026 (issue #456). Verified against each business's own site or the federal NPI registry.
-- Applied to dev first. Slugs are unchanged so no URL changes.

begin;

-- Eastern Art Academy: city and address per easternartacademy.com (footer and /chinese-class); English fields held Simplified Chinese; Traditional Chinese copy; aliases converted to Traditional.
update public.businesses set
  city = $cx$Chandler$cx$,
  address = $cx$3029 N Alma School Rd, Suite 225, Chandler, AZ 85224$cx$,
  service_area_text = null,
  short_description_en = $cx$Chandler Chinese language and arts school founded in 2010: Simplified Chinese from kindergarten to grade 12 and AP, plus Chinese dance, music and art.$cx$,
  description_en = $cx$Eastern Art Academy (新東方中文藝術學院) is a private Chinese language and arts school founded in October 2010, with classes at 3029 N Alma School Rd, Suite 225, in Chandler; its class page also lists a Scottsdale location at 14891 N Northsight Blvd. It describes itself as the largest private Chinese school in Arizona. It teaches Simplified Chinese from kindergarten through grade 12 and AP Chinese, along with Chinese dance, music and instruments, art and other traditional arts, in weekend and weekday evening classes and online. Its sister non-profit, the Phoenix US-China Arts and Education Exchange Center, organizes the Phoenix Spring (鳳凰之春) Chinese New Year gala. The newest news on its website is from February 2021, so call (480) 735-8878 to confirm current classes.$cx$,
  short_description_zh_tw = $cx$2010 年創立的錢德勒中文及藝術學校：簡體中文幼兒園至 12 年級及 AP 班，另有中國舞蹈、音樂與美術課程。$cx$,
  description_zh_tw = $cx$新東方中文藝術學院（Eastern Art Academy）是 2010 年 10 月創立的私立中文及藝術學校，上課地點位於錢德勒（Chandler）3029 N Alma School Rd, Suite 225；其課程頁面另列有斯科茨代爾（Scottsdale）14891 N Northsight Blvd 的上課地點。學校自述為亞利桑那州規模最大的私立中文學校，教授簡體中文，開設幼兒園至 12 年級及 AP 中文班，另有中國舞蹈、音樂與樂器、美術等傳統藝術課程，週末全天與平日傍晚上課，也提供網路課程。其姊妹非營利機構「美中藝術教育交流中心」（Phoenix US-China Arts and Education Exchange Center）承辦「鳳凰之春」華人春晚。學校網站最新消息停在 2021 年 2 月，報名前請先致電 (480) 735-8878 確認目前課程。$cx$,
  search_aliases = array[$cx$Eastern Art Academy$cx$, $cx$新東方中文藝術學院$cx$, $cx$Chandler$cx$, $cx$education$cx$, $cx$easternartacademy.com$cx$, $cx$English$cx$, $cx$Mandarin$cx$, $cx$鳳凰之春$cx$, $cx$華人春晚$cx$, $cx$藝術教育$cx$, $cx$美中藝術教育交流$cx$, $cx$Chinese$cx$, $cx$Chinese characters$cx$]::text[],
  last_updated = now()
where slug = 'eastern-art-academy-phoenix';

-- Axia Senior Insurance Advisors: phone, address and email per axiasiadvisors.com (by appointment, Plaza Executive Suites); template copy replaced. Slug kept so the URL does not change.
update public.businesses set
  city = $cx$Mesa$cx$,
  address = $cx$625 W Southern Ave, Suite E193, Mesa, AZ 85210$cx$,
  phone = $cx$(602) 344-9940$cx$,
  email = $cx$info@betterhealth.insure$cx$,
  short_description_en = $cx$Independent Medicare advisors in Mesa, by appointment, offering free help comparing and enrolling in plans.$cx$,
  description_en = $cx$Axia Senior Insurance Advisors is an independent Medicare insurance advisory in Mesa that meets clients by appointment at 625 W Southern Ave, Suite E193, inside the Plaza Executive Suites building. Its advisors help people compare and enroll in Medicare plans, review coverage, and sort out questions with carriers, doctors, billing and claims after a plan begins. The firm says its service costs clients nothing and that it represents 14 organizations offering 65 products in the area. It is not affiliated with the U.S. government or the federal Medicare program.$cx$,
  short_description_zh_tw = $cx$梅薩獨立 Medicare 保險顧問，採預約制，免費協助比較與投保方案。$cx$,
  description_zh_tw = $cx$Axia Senior Insurance Advisors 是位於梅薩（Mesa）的獨立聯邦醫療保險（Medicare）顧問公司，採預約制，地點在 625 W Southern Ave, Suite E193（Plaza Executive Suites 大樓內）。顧問協助客戶比較並投保 Medicare 方案、檢視保障內容，並在保單生效後協助處理與保險公司、醫師、帳單及理賠相關的問題。公司表示服務對客戶完全免費，目前代理當地 14 家機構的 65 種產品。該公司與美國政府及聯邦 Medicare 計畫無關。$cx$,
  search_aliases = array[$cx$Axia Senior Insurance Advisors$cx$, $cx$Axia Health Insurance Advisors$cx$, $cx$Mesa$cx$, $cx$legal-finance$cx$, $cx$insurance$cx$, $cx$Medicare$cx$, $cx$www.axiasiadvisors.com$cx$]::text[],
  last_updated = now()
where slug = 'axia-senior-insurance-advisors-chandler';

-- az-hope-chinese-school-chandler: search alias converted from Simplified to Traditional.
update public.businesses set search_aliases = array_replace(search_aliases, $cx$记建校三十周年义工聚会$cx$, $cx$記建校三十周年義工聚會$cx$), last_updated = now()
where slug = 'az-hope-chinese-school-chandler';

-- contemporary-chinese-school-of-arizona-tempe: search alias converted from Simplified to Traditional.
update public.businesses set search_aliases = array_replace(search_aliases, $cx$亚省现代中文学校24-25新学年开启$cx$, $cx$亞省現代中文學校24-25新學年開啟$cx$), last_updated = now()
where slug = 'contemporary-chinese-school-of-arizona-tempe';

-- gilbert-chinese-church-gilbert: search alias converted from Simplified to Traditional.
update public.businesses set search_aliases = array_replace(search_aliases, $cx$邀请你与我们一起：真诚敬拜、研习圣经、彼此服事、传扬福音。$cx$, $cx$邀請你與我們一起：真誠敬拜、研習聖經、彼此服事、傳揚福音。$cx$), last_updated = now()
where slug = 'gilbert-chinese-church-gilbert';

-- tucson-christian-mandarin-church-tucson: search alias converted from Simplified to Traditional.
update public.businesses set search_aliases = array_replace(search_aliases, $cx$原創詩歌 这一刻我跟从了耶稣基督 我是喜樂的基督徒 約伯記的啟示 神的國度$cx$, $cx$原創詩歌 這一刻我跟從了耶穌基督 我是喜樂的基督徒 約伯記的啟示 神的國度$cx$), last_updated = now()
where slug = 'tucson-christian-mandarin-church-tucson';

commit;
