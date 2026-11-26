# Listing enrichment, November 2026 (issue #411)

Real, verified bilingual descriptions and details for 45 business listings on chinesearizona.com, written to production Supabase (`pxgapnyrrwaiacgcmtks`, table `public.businesses`) on 2026-11-25. Every fact comes from the business's own website (listed per slug below). Nothing was guessed: when a source did not state a detail, the field was left as it was.

## Result

| | Before | After |
|---|---|---|
| Live or stale listings | 244 | 244 |
| Indexable business pages | 21 | **48** |
| Listings with a Chinese description | 0 | 45 |

Indexable means the rule in `shouldNoIndexDirectoryBusiness` (`src/lib/directory.ts`): status live or stale, a public location, a public contact method (non-placeholder phone or website, or an email), an English description of at least 180 characters after collapsing whitespace, and no generated template text (`hasGeneratedDirectoryCopy`). Both counts were taken with the same SQL, shown at the end of this file.

- 28 of the 45 listings were not indexable before and are now.
- 17 were already indexable but had scraped or junk copy (one showed an ordering vendor's ad, others had pasted reviews or navigation text). They got rewritten English copy plus Chinese.
- 1 page left the index on purpose: `81-hong-kong-cafe-tucson`, whose only copy was the Menufy vendor ad and whose website now redirects to a gambling site (see safety fixes).

Production was spot-checked after the writes: `chinesearizona.com/business/jun-dynasty-tucson` and `/business/grace-tung-gilbert` serve the new copy with no `noindex` tag. A hash of all four description fields for each of the 45 rows was compared with the source data below and all 45 match.

## Fields filled

For every listing: `description_en` (all 300+ characters), `description_zh_tw` (Traditional Chinese, same content), `short_description_en`, `short_description_zh_tw`, and `last_updated = now()`.

Extra fields, only where the business's own site states them:

| Slug | Field | Value | Where the site says it |
|---|---|---|---|
| `charlotte-chang-peoria` | `name_zh_tw` | 張曉青 | Home page: 張曉青（Charlotte Chang） |
| `charlotte-chang-peoria` | `languages` | English, Mandarin | "serves the Phoenix Metro Area in English and Mandarin". The previous value `Taiwanese` was not stated anywhere (the site has a "Taiwanese Community" blog, not a language claim), so it was dropped. |
| `grace-tung-gilbert` | `languages` | English, Mandarin, Cantonese | Meet Grace: "bilingual in English and Chinese (Mandarin/Cantonese)" |
| `arizona-asian-american-bar-association-phoenix` | `phone` | (602) 456-2567 | Contact Us page |
| `az-hope-chinese-school-chandler` | `name_zh_tw` | 亞省希望中文學校 | News headline: 亚省希望中文学校 (converted to Traditional) |
| `az-hope-chinese-school-chandler` | `address` | 2626 E Pecos Rd, Chandler, AZ 85225 | Site footer: CGCC Pecos Campus, 2626 E Pecos Road, Chandler 85225 |
| `tucson-chinese-school-tucson` | `languages` | English, Mandarin | Curriculum lists Pinyin and Simplified/Traditional Chinese classes (Mandarin) |
| `little-szechuan-tempe` | `chinese_menu_or_forms` | true | Menu sections carry Chinese labels, e.g. 開胃小菜 |
| `golden-gate-chinese-restaurant-mesa` | `name_zh_tw` | 金門酒家 | Site header: 金门酒家 (converted to Traditional) |
| `yes-cafe-chandler` | `chinese_menu_or_forms` | true | Menu categories in Chinese and English, e.g. 冷前菜 Cold Appetizers |
| `d-y-chinese-food-glendale` | `chinese_menu_or_forms` | true | Szechuan menu in Chinese and English, e.g. 川菜 Szechuan Specialties |
| `big-bowl-restaurant-mesa` | `name_zh_tw` | 大碗 | Page title: BIG BOWL CHINESE RESTAURANT 大碗 |
| `asian-cafe-express-mesa` | `name_zh_tw` | 大家樂 | Site title: Asian Cafe Express – 大家樂 – 港式茶餐廳 |
| `original-cuisine-mesa` | `name_zh_tw` | 小橙都 | Page title: Original Cuisine 小橙都 |
| `original-cuisine-mesa` | `wechat_id` | Bashu_88 | Footer: "Wechat：Bashu_88" |

No source stated WeChat Pay or Alipay acceptance for any listing, so `accepts_wechat_pay` and `accepts_alipay` were not changed. `languages` was only changed in the three rows above; other rows keep their earlier values, which were not re-verified.

## Safety fixes (5 listings)

While fetching sites, five listing websites turned out to redirect to gambling-spam domains, and for three of them spam text had been scraped into the description. Linking to these hurts users and search ranking, so the links were removed:

| Slug | What the listed website does now | Change |
|---|---|---|
| `big-wa-chinese-tempe` | bigwatempe.com shows a Chinese gambling/gas-detector SEO page; the old `name_zh_tw` "VOCs在线监测系统" and description came from it | `website` and `name_zh_tw` set to null; description replaced with a one-line factual address note |
| `yu-tian-xia-hot-pot-mesa` | azhotpot.com is an Indonesian slot-gambling page; description was that page's text | `website` null; description replaced with a one-line address note |
| `nan-zhou-hand-drawn-noodle-house-mesa` | nanzhounoodlemesa.com is a slot-gambling page; description was its tagline | `website` null; description replaced with a one-line address note |
| `kwan-s-sampan-restaurant-mesa` | kwansmesa.com 301-redirects to a slot-gambling page | `website` null; description kept |
| `81-hong-kong-cafe-tucson` | the81hongkongcafe.com 301-redirects to a slot-gambling page; description was Menufy marketing copy | `website` null; description replaced with a one-line address note |

The one-line notes are under 180 characters, so these pages stay out of the index until someone confirms the businesses are open and finds their current websites.

## Rollback

`listing-enrichment-2026-11-before.json` (next to this file) holds the previous value of every column this work changed, for all 50 rows. Restoring a row means writing those values back with an `update ... where slug = ...`.

## Listings and sources

### Real estate

| Slug | Index status | Sources |
|---|---|---|
| `asian-real-estate-association-of-america-greater-phoenix-phoenix` | already indexable, copy rewritten | https://areaagreaterphoenix.org/<br>https://areaagreaterphoenix.org/presidents-letter/ |
| `charlotte-chang-peoria` | newly indexable | https://cchanghomes.com/<br>https://cchanghomes.com/taiwanese-community |
| `grace-tung-gilbert` | already indexable, copy rewritten | https://graceazrealty.com/<br>https://graceazrealty.com/meet-grace/<br>https://graceazrealty.com/cm/ |
| `hedy-li-phoenix` | newly indexable | https://hedylirealtor.com/<br>https://hedylirealtor.com/blog |

### Legal and finance

| Slug | Index status | Sources |
|---|---|---|
| `arizona-asian-american-bar-association-phoenix` | already indexable, copy rewritten | https://www.azasianbar.org/<br>https://azasianbar.org/contact-us<br>https://azasianbar.org/resources |

### Education

| Slug | Index status | Sources |
|---|---|---|
| `az-hope-chinese-school-chandler` | newly indexable | https://www.azhopechineseschool.org/<br>https://www.azhopechineseschool.org/school/page/about |
| `chinese-linguistic-school-of-phoenix-mesa` | newly indexable | https://clsphoenix.org/ |
| `contemporary-chinese-school-of-arizona-tempe` | newly indexable | https://www.ccsarizona.org/<br>https://www.ccsarizona.org/school/page/about |
| `tucson-chinese-school-tucson` | already indexable, copy rewritten | https://www.tucsonchinese.org/tucson-chinese-school |

### Dining (restaurants with a website)

| Slug | Index status | Sources |
|---|---|---|
| `dragon-flame-chinese-grill-tempe` | newly indexable | https://www.dragonflame.us |
| `singing-pandas-asian-restaurant-bar-chandler` | newly indexable | https://www.singingpandaschandler.com/<br>https://www.singingpandaschandler.com/menu<br>https://www.singingpandaschandler.com/entertainment |
| `jun-dynasty-tucson` | newly indexable | http://www.jundynasty.com/<br>https://www.jundynasty.com/the-kitchen-1 |
| `ba-dar-tucson` | newly indexable | https://www.ba-dar.com/ |
| `little-szechuan-tempe` | newly indexable | https://www.littleszechuanaz.com<br>https://www.littleszechuanaz.com/menu |
| `autumn-court-chinese-restaurant-phoenix` | newly indexable | https://www.autumncourt.com/<br>https://www.autumncourt.com/about-us/ |
| `kim-s-chinese-kitchen-phoenix` | newly indexable | https://kimschinesekitchen.com<br>https://kimschinesekitchen.com/about-us |
| `mayflower-chinese-cuisine-chandler` | newly indexable | https://mayflowerchandler.com |
| `golden-valley-chinese-cuisine-mesa` | newly indexable | https://goldenvalleymesa.com |
| `golden-gate-chinese-restaurant-mesa` | newly indexable | https://goldengatechinese.biz/<br>https://goldengatechinese.biz/visit-us<br>https://goldengatechinese.biz/dinner-%C3%A0-la-carte-entrees |
| `great-wall-cuisine-phoenix` | newly indexable | https://greatwallaz.kwickmenu.com/<br>https://greatwallaz.kwickmenu.com/gallery.php |
| `mekong-palace-mesa` | newly indexable | https://www.mekongpalace.com/<br>https://mekongpalace.com/menus/ |
| `grand-dragon-glendale` | newly indexable | https://www.granddragonchina.com/ |
| `yes-cafe-chandler` | newly indexable | https://www.yescafechandleraz.com/ |
| `phoenix-palace-chandler` | newly indexable | https://www.phoenixpalacechandleraz.com/ |
| `d-y-chinese-food-glendale` | newly indexable | https://www.dychinese.com/ |
| `red-dragon-chinese-food-chandler` | newly indexable | https://www.reddragonchandler.com<br>https://www.reddragonchandler.com/our-story |
| `big-bowl-restaurant-mesa` | newly indexable | http://www.bigbowlmesa.com/ |
| `tsing-tao-chinese-cuisine-mesa` | newly indexable | https://www.tsingtaomesa.com/ |
| `hot-wok-chinese-restaurant-chandler` | newly indexable | https://www.hotwokchandler.com/ |
| `king-s-chef-mesa` | newly indexable | https://www.kingschefmesa.com/ |
| `best-hong-kong-dining-mesa` | newly indexable | http://besthongkongdining.com |
| `new-asia-chinese-restaurant-tucson` | newly indexable | https://newasiatucson.com/ |
| `asian-cafe-express-mesa` | already indexable, copy rewritten | https://www.asiancafeexpress.com/ |
| `happy-bao-s-mesa` | already indexable, copy rewritten | https://www.happybaos.com/ |
| `noodleholics-tucson` | already indexable, copy rewritten | https://www.noodleholics.com/ |
| `george-yang-s-chinese-cuisine-phoenix` | already indexable, copy rewritten | https://georgeyangschinesecuisine.com/ |
| `tasty-pot-mesa` | already indexable, copy rewritten | https://www.tastypotusa.com |
| `tao-garden-chandler` | already indexable, copy rewritten | http://taogardendining.com/ |
| `spice-spirit-chinese-cuisine-bar-mesa` | already indexable, copy rewritten | https://www.azspicespirit.com/ |
| `old-town-taste-tempe` | already indexable, copy rewritten | https://www.oldtowntaste.com |
| `heng-s-kitchen-mesa` | already indexable, copy rewritten | https://www.hengskitchenmesaaz.com/ |
| `original-cuisine-mesa` | already indexable, copy rewritten | https://www.ocmesa.com |
| `gold-chef-chandler` | already indexable, copy rewritten | https://www.goldchefchinese.com/ |
| `wok-on-mesa` | already indexable, copy rewritten | https://www.wokonaz.com/ |
| `chen-s-noodle-house-tempe` | already indexable, copy rewritten | https://www.chensnoodlehousetempeaz.com/ |

## Considered and skipped

Picked in the order real estate, legal and finance, medical, education, home services, local services, then dining with a website. Skipped when the business was closed or could not be verified from a first-party source:

| Listing(s) | Why skipped |
|---|---|
| `axia-senior-insurance-advisors-chandler` | The business's own site gives a different address (625 W Southern Ave #E193, Mesa, by appointment) and phone than the listing. Needs a call before anything is changed. |
| `wong-insurance-agency-mesa`, `p-and-y-insurance-mesa`, `fu-jing-funding-llc-mesa`, `beijing-acupuncture-and-health-center-mesa`, `yjp-spine-center-mesa`, `phoenix-int-l-travel-and-tours-mesa`, `global-courier-express-mesa`, `an-lac-mesa` | No website or other first-party source found; only third-party directories. |
| `hi-tech-dentistry-mesa` | Its domain (hitechdentistry.com) is parked; only third-party directories. |
| `eastern-art-academy-phoenix` | Site's newest content is from 2021; could not confirm it still runs classes. |
| `phoenix-chinese-center-glendale` | Website does not respond; only an aggregator listing. |
| `asian-american-journalists-association-at-asu-phoenix` | Student club; the listing links to a general ASU page with nothing specific. |
| CVS (3), Walgreens (3), BMO, H&R Block, MidFirst Bank, Global Credit Union, Arizona Central Credit Union, LoanMax, Banner Urgent Care, SimonMed, Miracle-Ear, Discover Vein & Vascular, Ace Hardware, Discount Tire, FedEx Office, The UPS Store, USA Tae Kwon Do | Chains and franchises. Their own store pages already cover them and they are low value for this directory, so they were deferred in favor of independent and Chinese-community businesses. |
| `china-chili-phoenix`, `desert-jade-phoenix`, `wong-s-chinese-dining-phoenix`, `hing-loon-chinese-express-glendale` | Site text is too thin (menus are images) to write 180+ characters of verified copy. |
| `king-wong-chinese-food-phoenix`, `china-jade-tempe`, `dragon-express-mesa`, `new-hong-kong-phoenix`, `ming-gee-chinese-food-restaurant-glendale`, `beijing-express-tempe`, `china-pasta-house-tucson`, `chen-wok-phoenix` | Sites sit behind a bot checkpoint and carry only generic ordering-platform copy. |
| `asian-garden-express-glendale`, `bao-chow-tempe`, `diamond-chinese-restaurant-phoenix`, `flamingo-palace-phoenix`, `szechuan-chinese-glendale`, `china-way-restaurant-chandler`, `liyuen-phoenix` | Website did not load. |
| `ehotpot-tucson`, `beijing-chinese-food-chandler`, `yin-s-chinese-restaurant-phoenix`, `chou-s-kitchen-chandler` | Website blocked the request or returned an empty script-only page. |

## Follow-ups

1. Check whether the five safety-fix restaurants are still open and find their current websites.
2. Scan the remaining listing websites for hijacked domains. About 70 of the 103 listing websites were fetched here; the rest (chains, shopping, beauty and faith listings, and restaurants not picked) were not.
3. Eight listings have `Traditional Chinese` in `languages`, which is a script, not a spoken language. Worth a cleanup pass.
4. AAABA's official address is 531 E Thomas Rd, Suite 200, Phoenix 85012 (its contact page); the listing still shows a P.O. box.
5. Next batch: the skipped restaurants above once their sites can be read, then chains if wanted.

## SQL

### Indexable count (run before and after)

```sql
with b as (
  select bz.*,
    coalesce(bz.verification_state, case when bz.verified then 'editor_verified' else 'unverified' end) as vs,
    coalesce(bz.description_en, bz.short_description_en, bz.name_en) as desc_en,
    coalesce(bz.short_description_en, bz.description_en, bz.name_en) as short_en,
    (bz.phone is not null and bz.phone <> '' and regexp_replace(bz.phone,'\D','','g') like '%555%') as ph_placeholder,
    (bz.website is not null and (bz.website ~* '://(www\.)?example\.com' or bz.website ~* 'placeholder'
      or bz.website ~* '\.example(/|$)' or bz.website ~* '\.invalid(/|$)')) as web_placeholder
  from businesses bz
), r as (
  select *,
    (coalesce(phone,'')<>'' and not ph_placeholder) or (coalesce(website,'')<>'' and not web_placeholder)
      or coalesce(trim(email),'')<>'' as has_contact,
    (coalesce(address,'')<>'' or coalesce(service_area_text,'')<>'' or (vs='claimed' and trim(coalesce(city,''))<>'')) as has_loc,
    (short_en || ' ' || desc_en) ~* '(generated from plaza directory sources|direct business contact details may still be incomplete)' as templ,
    char_length(trim(regexp_replace(desc_en,'\s+',' ','g'))) >= 180 as long_desc
  from b
), f as (
  select *, (status in ('live','stale') and not ph_placeholder and not web_placeholder and has_loc
    and (has_contact or vs='editor_verified')) as is_public
  from r
)
select count(*) filter (where status in ('live','stale')) as live_stale,
       count(*) filter (where is_public and not templ and has_contact and long_desc) as indexable,
       count(*) filter (where coalesce(description_zh_tw,'')<>'') as with_zh
from f;
-- Before (2026-11-25, prior to batch 0): live_stale 244, indexable 21, with_zh 0
-- After  (2026-11-25, after batch 5):    live_stale 244, indexable 48, with_zh 45
```

### Batch 0: safety fixes

```sql
-- Safety fixes: listing websites now redirect to gambling-spam domains, and spam text had been scraped into the descriptions.
update public.businesses set website = null, name_zh_tw = null,
  description_en = $enr$Big Wa Chinese is a restaurant listed at 3135 S 48th St, Unit 102, in Tempe.$enr$,
  short_description_en = $enr$Big Wa Chinese is a restaurant listed at 3135 S 48th St, Unit 102, in Tempe.$enr$,
  last_updated = now()
where slug = 'big-wa-chinese-tempe';

update public.businesses set website = null,
  description_en = $enr$Yu Tian Xia Hot Pot is a restaurant listed at 1948 W Broadway Rd in Mesa.$enr$,
  short_description_en = $enr$Yu Tian Xia Hot Pot is a restaurant listed at 1948 W Broadway Rd in Mesa.$enr$,
  last_updated = now()
where slug = 'yu-tian-xia-hot-pot-mesa';

update public.businesses set website = null,
  description_en = $enr$Nan Zhou Hand Drawn Noodle House is a restaurant listed at 111 S Dobson Rd, Suite 101, in Mesa.$enr$,
  short_description_en = $enr$Nan Zhou Hand Drawn Noodle House is a restaurant listed at 111 S Dobson Rd, Suite 101, in Mesa.$enr$,
  last_updated = now()
where slug = 'nan-zhou-hand-drawn-noodle-house-mesa';

update public.businesses set website = null,
  description_en = $enr$81 Hong Kong Cafe is a restaurant listed at 625 E Wetmore Rd, Suite 109, in Tucson.$enr$,
  short_description_en = $enr$81 Hong Kong Cafe is a restaurant listed at 625 E Wetmore Rd, Suite 109, in Tucson.$enr$,
  last_updated = now()
where slug = '81-hong-kong-cafe-tucson';

update public.businesses set website = null, last_updated = now()
where slug = 'kwan-s-sampan-restaurant-mesa';
```

### Batch 1: real estate, legal and finance, education

<details><summary>Show SQL</summary>

```sql
update public.businesses set
  description_en = $enr$AREAA Greater Phoenix is the local chapter of the Asian Real Estate Association of America, a membership group for real estate and housing professionals who work with Asian American communities. The chapter hosts educational seminars, market and economic speaker events, a Luxury and Commercial Summit, and social mixers around the Valley. Its stated mission is to promote sustainable homeownership and economic opportunity for AAPI communities. Rebecca Chen is the 2026 chapter president, and membership is handled through AREAA national.$enr$,
  description_zh_tw = $enr$AREAA 大鳳凰城分會是美國亞裔房地產協會（Asian Real Estate Association of America）的在地分會，成員為服務亞裔社群的房地產與住房相關專業人士。分會定期舉辦教育講座、市場與經濟專題演講、豪宅與商業地產高峰會（Luxury and Commercial Summit），以及各類聯誼活動。其宗旨是為亞太裔社群推動可持續的自有住房與經濟機會。2026 年分會會長為 Rebecca Chen，會員申請透過 AREAA 全國總會辦理。$enr$,
  short_description_en = $enr$Phoenix chapter of the Asian Real Estate Association of America: seminars, speaker events and networking for real estate professionals serving AAPI communities.$enr$,
  short_description_zh_tw = $enr$美國亞裔房地產協會大鳳凰城分會：為服務亞太裔社群的房地產專業人士舉辦講座、專題演講與聯誼活動。$enr$,
  last_updated = now()
where slug = 'asian-real-estate-association-of-america-greater-phoenix-phoenix' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Charlotte Chang (張曉青) is a bilingual English and Mandarin Realtor serving buyers, sellers and investors across the Greater Phoenix area, including Peoria, Glendale, Surprise, Scottsdale and Chandler. She focuses on Taiwanese and Asian clients, including families relocating from overseas and buyers purchasing from Taiwan, and writes a Chinese-language blog about Arizona life, getting a mortgage without U.S. credit history, and buying a home remotely. She received West USA's President's Award in 2024 and 2025.$enr$,
  description_zh_tw = $enr$張曉青（Charlotte Chang）是中英雙語房地產經紀人，服務大鳳凰城地區的買家、賣家與投資者，範圍涵蓋 Peoria、Glendale、Surprise、Scottsdale、Chandler 等地。她專注服務台灣與亞裔客戶，包括從海外搬遷來美的家庭，以及人在台灣遠距置產的買家，並經營中文部落格，分享亞利桑那生活、沒有美國信用記錄如何貸款、遠距買房注意事項等主題。她曾獲 West USA 2024 與 2025 年度總裁獎。$enr$,
  short_description_en = $enr$Bilingual English and Mandarin Realtor serving Taiwanese and Asian buyers, sellers and investors across Greater Phoenix.$enr$,
  short_description_zh_tw = $enr$中英雙語房地產經紀人，專門服務大鳳凰城地區的台灣與亞裔買家、賣家及投資者。$enr$,
  name_zh_tw = $enr$張曉青$enr$,
  languages = array[$enr$English$enr$, $enr$Mandarin$enr$]::text[],
  last_updated = now()
where slug = 'charlotte-chang-peoria' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Grace Tung is a Gilbert-based Realtor with JK Realty who works mainly in the East Valley of metro Phoenix and has nearly 20 years of real estate experience. She has listed and sold homes priced from about $150,000 to $2 million, and her experience covers new builds, short sales, foreclosures and bank-owned homes, trustee sales and commercial property. Grace speaks English, Mandarin and Cantonese, and her website has a Traditional Chinese section. Her office is at 1760 E Pecos Rd, Suite 501, in Gilbert.$enr$,
  description_zh_tw = $enr$Grace Tung 是駐吉爾伯特（Gilbert）的房地產經紀人，隸屬 JK Realty，主要服務大鳳凰城東谷（East Valley）地區，擁有近二十年房地產經驗。她經手掛牌與成交的房產價格約從 15 萬至 200 萬美元不等，熟悉新建案、短售（short sale）、法拍屋、銀行持有房產、受託人拍賣及商業地產。Grace 能以英語、國語及粵語服務客戶，網站也設有繁體中文頁面。辦公室位於 1760 E Pecos Rd, Suite 501, Gilbert。$enr$,
  short_description_en = $enr$East Valley Realtor with nearly 20 years of experience; speaks English, Mandarin and Cantonese.$enr$,
  short_description_zh_tw = $enr$東谷地區房地產經紀人，近二十年經驗，可說英語、國語及粵語。$enr$,
  languages = array[$enr$English$enr$, $enr$Mandarin$enr$, $enr$Cantonese$enr$]::text[],
  last_updated = now()
where slug = 'grace-tung-gilbert' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Hedy Li is a Chinese-speaking Realtor in the Phoenix metro area who specializes in investment real estate, especially for out-of-state investors buying property in Greater Phoenix. Her website says she has helped buyers and sellers for more than 16 years and offers guidance on market trends and investment opportunities in the Phoenix market. She can be reached by phone at 626-235-2358 or by email at hedyli10@gmail.com.$enr$,
  description_zh_tw = $enr$Hedy Li 是大鳳凰城地區會說中文的房地產經紀人，專長投資型房地產，特別協助外州投資人在鳳凰城地區購置物業。她的網站表示，她協助買賣雙方已超過 16 年，並提供鳳凰城市場趨勢與投資機會等方面的建議。歡迎來電 626-235-2358 或寫信至 hedyli10@gmail.com 聯絡。$enr$,
  short_description_en = $enr$Chinese-speaking Phoenix-area Realtor specializing in investment property for out-of-state investors.$enr$,
  short_description_zh_tw = $enr$會說中文的鳳凰城地區房地產經紀人，專門協助外州投資人購置投資物業。$enr$,
  last_updated = now()
where slug = 'hedy-li-phoenix' and status in ('live','stale');

update public.businesses set
  description_en = $enr$The Arizona Asian American Bar Association (AAABA) is a voluntary bar association for attorneys, judges, law professors, law students and community members interested in the Arizona legal profession. It works to promote justice, equity, inclusion and opportunity for Asian Pacific Americans in the legal field and the wider community. AAABA runs committees and volunteer programs, holds an annual banquet, offers a Find an Attorney page, and shares legal resources such as the State Bar of Arizona's public service center.$enr$,
  description_zh_tw = $enr$亞利桑那亞裔美國人律師協會（AAABA）是一個自願加入的律師協會，成員包括律師、法官、法學教授、法學院學生，以及關心亞利桑那法律界的社區人士。協會致力於在法律界與整體社會中，為亞太裔美國人爭取公義、平等、包容與發展機會。AAABA 設有多個委員會與志工計畫，每年舉辦年度晚宴，網站提供「尋找律師」頁面，並整理亞利桑那州律師公會公共服務中心等法律資源。$enr$,
  short_description_en = $enr$Voluntary bar association advancing Asian Pacific Americans in Arizona's legal profession, with events, committees and a find-an-attorney page.$enr$,
  short_description_zh_tw = $enr$推動亞太裔美國人在亞利桑那法律界發展的律師協會，提供活動、委員會及尋找律師服務。$enr$,
  phone = $enr$(602) 456-2567$enr$,
  last_updated = now()
where slug = 'arizona-asian-american-bar-association-phoenix' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Arizona Hope Chinese School (亞省希望中文學校) is a non-profit, volunteer-run school founded in 1995 that teaches Simplified Chinese and Chinese culture. Classes meet in the IRN and CHO buildings at Chandler-Gilbert Community College's Pecos Campus, 2626 E Pecos Rd, Chandler. Over the years the school has offered Chinese from preschool through grade 12, conversational and adult Chinese, SAT II and AP Chinese prep, math and test-prep courses, dance, art, calligraphy, weiqi (Go), chess, wushu and tai chi.$enr$,
  description_zh_tw = $enr$亞省希望中文學校（Arizona Hope Chinese School）創立於 1995 年，是由義工經營的非營利中文學校，教授簡體中文與中華文化。上課地點在錢德勒－吉爾伯特社區學院（CGCC）Pecos 校區的 IRN 與 CHO 大樓（2626 E Pecos Rd, Chandler）。學校歷年開設的課程包括學前班至 12 年級中文、會話中文與成人中文、SAT II 及 AP 中文備考、數學與各類考試準備課程，以及舞蹈、美術、書法、圍棋、西洋棋、武術和太極等。$enr$,
  short_description_en = $enr$Non-profit Chinese school in Chandler since 1995, teaching Simplified Chinese, culture, math and arts.$enr$,
  short_description_zh_tw = $enr$1995 年創立的錢德勒非營利中文學校，教授簡體中文、中華文化、數學與才藝課程。$enr$,
  name_zh_tw = $enr$亞省希望中文學校$enr$,
  address = $enr$2626 E Pecos Rd, Chandler, AZ 85225$enr$,
  last_updated = now()
where slug = 'az-hope-chinese-school-chandler' and status in ('live','stale');

update public.businesses set
  description_en = $enr$The Chinese Linguistic School of Phoenix (鳳凰城中文學校) is a non-profit school that teaches Chinese language and culture to both Chinese and non-Chinese speakers in the Greater Phoenix area. It emphasizes Traditional Chinese, using Bopomofo (Zhuyin) and/or Pinyin, with academic classes from preschool to 11th grade, conversation classes for non-Chinese speakers, and a cultural enrichment program for all ages. Classes meet on Sundays from 1:30 to 3:30 pm in Buildings AS and SC at Mesa Community College's Mesa campus.$enr$,
  description_zh_tw = $enr$鳳凰城中文學校（Chinese Linguistic School of Phoenix）是非營利組織，在大鳳凰城地區為華語及非華語背景的學生教授中文並推廣中華文化。學校以繁體中文為教學重點，搭配注音符號與／或拼音，開設幼兒班至 11 年級的中文課程、為非華語學生設計的會話班，以及適合各年齡層的文化課程。每週日下午 1:30 至 3:30 在 Mesa 社區大學 Mesa 校區的 AS 與 SC 大樓上課。$enr$,
  short_description_en = $enr$Non-profit Sunday Chinese school in Mesa teaching Traditional Chinese with Zhuyin and Pinyin, preschool to grade 11.$enr$,
  short_description_zh_tw = $enr$位於梅薩的非營利週日中文學校，以繁體中文搭配注音與拼音教學，開設幼兒班至 11 年級。$enr$,
  last_updated = now()
where slug = 'chinese-linguistic-school-of-phoenix-mesa' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Contemporary Chinese School of Arizona (亞省現代中文學校) is a 501(c)(3) non-profit Chinese school founded in 1996 and based on Arizona State University's Tempe campus, in Durham Hall at 851 S. Cady Mall. The volunteer-run school teaches Chinese language and culture, and since 2019 it has had cultural and educational partnerships with ASU units including the School of International Letters and Cultures. The school describes itself as the largest Chinese school in the area by number of courses and students.$enr$,
  description_zh_tw = $enr$亞省現代中文學校（Contemporary Chinese School of Arizona）創立於 1996 年，是 501(c)(3) 非營利教育組織，校址位於亞利桑那州立大學（ASU）坦佩主校區的 Durham Hall（851 S. Cady Mall）。學校由義工經營，教授中文語言與中華文化，自 2019 年起與 ASU 國際語言文化學院等單位建立文化教育夥伴關係。學校自述為本地區課程數量與學生人數最多的中文學校。$enr$,
  short_description_en = $enr$Non-profit Chinese school on ASU's Tempe campus since 1996, teaching Chinese language and culture.$enr$,
  short_description_zh_tw = $enr$1996 年創立、位於 ASU 坦佩校區的非營利中文學校，教授中文與中華文化。$enr$,
  last_updated = now()
where slug = 'contemporary-chinese-school-of-arizona-tempe' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Tucson Chinese School (TCS) was founded in 1950 and has been based at the Tucson Chinese Cultural Center since 2005. It offers classes from preschool to adult level in both Simplified and Traditional Chinese, along with Pinyin, adult beginner to advanced classes, Chinese conversation, and culture electives such as performing arts, painting and calligraphy. Students take part in speech, writing and spelling contests, and families can register at any point in the year by emailing info@tucsonchinese.org. The principal is Kai Chen.$enr$,
  description_zh_tw = $enr$Tucson Chinese School（TCS）創立於 1950 年，自 2005 年起設於圖森中華文化中心（Tucson Chinese Cultural Center）。學校開設從學前到成人的課程，包括簡體與繁體中文、拼音、成人初級至高級班、中文會話，以及表演藝術、繪畫和書法等文化選修課。學生可參加演講、作文與聽寫比賽；全年皆可報名，請寄信至 info@tucsonchinese.org。現任校長為 Kai Chen。$enr$,
  short_description_en = $enr$Tucson's Chinese school since 1950, at the Tucson Chinese Cultural Center, with preschool to adult classes.$enr$,
  short_description_zh_tw = $enr$創立於 1950 年、設於圖森中華文化中心的中文學校，開設學前至成人課程。$enr$,
  languages = array[$enr$English$enr$, $enr$Mandarin$enr$]::text[],
  last_updated = now()
where slug = 'tucson-chinese-school-tucson' and status in ('live','stale');
```

</details>

### Batch 2: dining

The connector timed out on large calls, so this batch ran as two or three smaller calls with the same statements.

<details><summary>Show SQL</summary>

```sql
update public.businesses set
  description_en = $enr$Dragon Flame Chinese Grill is a Chinese restaurant at 909 E Lemon St in Tempe. The restaurant says it follows traditional recipes and cooking methods without MSG or artificial flavors, and that more than 90% of its menu is authentic dishes rarely seen at mainstream Chinese restaurants, such as its take on the original version of orange chicken. It stays open late, until 2 am Monday through Saturday according to its website, and takes online orders for pickup.$enr$,
  description_zh_tw = $enr$Dragon Flame Chinese Grill 位於坦佩（Tempe）909 E Lemon St，是一家中餐館。餐廳表示堅持傳統食譜與烹調方式，不使用味精與人工調味料，菜單中超過九成是一般美式中餐館少見的道地菜色，例如原汁原味版本的陳皮雞。依官網資訊，週一至週六營業至凌晨 2 點，並提供線上點餐自取。$enr$,
  short_description_en = $enr$Tempe Chinese restaurant serving traditional, MSG-free dishes rarely found on mainstream menus; open late.$enr$,
  short_description_zh_tw = $enr$坦佩中餐館，主打不加味精、少見於一般中餐館的傳統菜色，營業至深夜。$enr$,
  last_updated = now()
where slug = 'dragon-flame-chinese-grill-tempe' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Singing Pandas is an Asian restaurant and full bar at 757 E Chandler Blvd in Chandler with free live entertainment most nights, from vocalists to tribute acts, and sports on every TV. The menu covers Chinese-American favorites such as kung pao chicken, pot stickers, minced chicken lettuce wraps, BBQ pork, fried rice and lo mein, plus vegetarian entrées and lunch specials. It describes itself as a minority- and woman-owned local business and says it has been voted best Asian food in Chandler since 2018.$enr$,
  description_zh_tw = $enr$Singing Pandas 是位於錢德勒（Chandler）757 E Chandler Blvd 的亞洲餐廳兼酒吧，幾乎每晚都有免費現場表演，從歌手駐唱到模仿秀都有，所有電視也播放體育頻道。菜單以美式中餐經典為主，例如宮保雞丁、鍋貼、雞肉生菜包、叉燒、炒飯與撈麵，另有素食主菜與午餐特價。餐廳自述為少數族裔及女性經營的在地商家，並表示自 2018 年起獲選為錢德勒最佳亞洲料理。$enr$,
  short_description_en = $enr$Chandler Asian restaurant and bar with Chinese-American favorites and free live entertainment most nights.$enr$,
  short_description_zh_tw = $enr$錢德勒亞洲餐廳兼酒吧，供應美式中餐經典，幾乎每晚都有免費現場表演。$enr$,
  last_updated = now()
where slug = 'singing-pandas-asian-restaurant-bar-chandler' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Jun Dynasty is a Szechuan (Sichuan) restaurant in Tucson with more than 100 dishes prepared by Chinese chefs. Signature dishes include house special spicy crab, water-boiled beef, chicken or fish, lamb in cumin sauce, fish fillet in black bean sauce, dan dan noodles and mapo tofu, with meat, poultry, fish and vegetarian options. The kitchen team includes chefs from Guangzhou, Tianjin and Sichuan, and the sous chef created the restaurant's sauce and spice recipes. Jun Dynasty offers dine-in, online ordering and catering.$enr$,
  description_zh_tw = $enr$Jun Dynasty 是圖森（Tucson）的川菜館，由中國廚師團隊準備超過 100 道菜色。招牌菜包括招牌香辣蟹、水煮牛肉／雞／魚、孜然羊肉、豆豉魚片、擔擔麵和麻婆豆腐，肉類、禽類、魚類與素食選擇都有。廚房團隊的廚師分別來自廣州、天津與四川，餐廳的醬料與香料配方由副主廚親自研發。提供內用、線上點餐及外燴服務。$enr$,
  short_description_en = $enr$Tucson Szechuan restaurant with 100+ dishes, from water-boiled fish and cumin lamb to dan dan noodles.$enr$,
  short_description_zh_tw = $enr$圖森川菜館，超過百道菜色，從水煮魚、孜然羊肉到擔擔麵。$enr$,
  last_updated = now()
where slug = 'jun-dynasty-tucson' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Ba-Dar Chinese Restaurant has served Tucson since 1992 from 7321 E Broadway Blvd. It is open seven days a week for lunch and dinner, with dine-in service in a remodeled dining room, phone-in to-go orders, online ordering and third-party delivery. Alongside its regular lunch and dinner menu, Ba-Dar offers a separate Authentic Chinese menu for to-go orders, and it takes holiday pre-orders.$enr$,
  description_zh_tw = $enr$Ba-Dar 中餐館自 1992 年起在圖森（Tucson）營業，地址為 7321 E Broadway Blvd。每週七天供應午餐與晚餐，提供重新裝修後的內用座位、電話外帶、線上點餐及第三方外送。除了一般午晚餐菜單，Ba-Dar 另有一份外帶用的「道地中式菜單」，節日期間也接受預訂。$enr$,
  short_description_en = $enr$Tucson Chinese restaurant since 1992, open seven days, with a separate authentic Chinese to-go menu.$enr$,
  short_description_zh_tw = $enr$1992 年起營業的圖森中餐館，每天營業，另有道地中式外帶菜單。$enr$,
  last_updated = now()
where slug = 'ba-dar-tucson' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Little Szechuan is a family-owned Chinese and pan-Asian restaurant and bar at 524 W University Dr in Tempe, steps from ASU's main campus. The family has served the Valley since 1976; the restaurant was previously Szechuan Inn, near Broadway and Mill. Dishes are cooked to order, and the kitchen accommodates gluten-free, vegetarian and dairy-free diets, including plant-based Impossible meat in some signature dishes. The bar serves baijiu, the menu sections are labeled in English and Chinese, and catering and office set menus are available.$enr$,
  description_zh_tw = $enr$Little Szechuan 是位於坦佩 524 W University Dr 的家族經營中式及泛亞洲餐廳兼酒吧，距離 ASU 主校區僅幾步之遙。這個家族自 1976 年起就在鳳凰城地區經營餐廳，前身為 Broadway 與 Mill 附近的 Szechuan Inn。菜餚現點現做，可配合無麩質、素食及不含乳製品等飲食需求，部分招牌菜也提供 Impossible 植物肉。酒吧供應白酒，菜單分類以中英文標示，並提供外燴與辦公室套餐。$enr$,
  short_description_en = $enr$Family-run Chinese and pan-Asian restaurant by ASU since 1976, with diet-friendly options and a baijiu bar.$enr$,
  short_description_zh_tw = $enr$1976 年起家族經營、鄰近 ASU 的中式泛亞洲餐廳，可配合特殊飲食，並供應白酒。$enr$,
  chinese_menu_or_forms = true,
  last_updated = now()
where slug = 'little-szechuan-tempe' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Autumn Court is a family-run Chinese-American restaurant at 3752 E Indian School Rd in Phoenix, owned by the same family since it opened in 1982. After a 2005 kitchen fire forced a rebuild and a move from its original Central Avenue location, the family kept cooking the same old-school recipes, such as chicken fried rice, pan-fried potstickers, BBQ sliced pork and Hong Kong-style wonton soup. Phoenix New Times named it Best Old School Chinese in 2005. Takeout and delivery run until midnight, and catering serves groups across Greater Phoenix.$enr$,
  description_zh_tw = $enr$Autumn Court 是位於鳳凰城 3752 E Indian School Rd 的家族經營美式中餐館，自 1982 年開業以來一直由同一家族經營。2005 年廚房失火後，餐廳從原本的 Central Avenue 店址重建並遷至現址，仍延續相同的老派食譜，例如雞肉炒飯、手工煎鍋貼、叉燒和港式雲吞湯。2005 年曾獲《Phoenix New Times》評為「最佳老派中餐」。外帶與外送營業至午夜，並為大鳳凰城地區的團體提供外燴。$enr$,
  short_description_en = $enr$Family-run old-school Chinese-American kitchen in Phoenix since 1982; takeout and delivery until midnight.$enr$,
  short_description_zh_tw = $enr$1982 年起家族經營的鳳凰城老派美式中餐館，外帶外送營業至午夜。$enr$,
  last_updated = now()
where slug = 'autumn-court-chinese-restaurant-phoenix' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Kim's Chinese Kitchen is a family-owned and operated Chinese kitchen at 3015 E Thomas Rd, Suite 7, in Phoenix, serving the community since 1995. It focuses on takeout and delivery of fresh Chinese dishes made with quality ingredients, from rice bowls with a choice of meat or vegetables to full lunch and dinner menus. Catering can be ordered through ezCater, and delivery is available on Uber Eats, DoorDash, Postmates and Grubhub.$enr$,
  description_zh_tw = $enr$Kim's Chinese Kitchen 是位於鳳凰城 3015 E Thomas Rd, Suite 7 的家族經營中餐廚房，自 1995 年起服務社區。以外帶與外送為主，使用優質食材現做中式菜餚，從可選肉類或蔬菜的蓋飯，到完整的午餐與晚餐菜單都有。可透過 ezCater 訂購外燴，外送則可使用 Uber Eats、DoorDash、Postmates 與 Grubhub。$enr$,
  short_description_en = $enr$Family-owned Phoenix Chinese takeout and delivery kitchen since 1995, with rice bowls and catering.$enr$,
  short_description_zh_tw = $enr$1995 年起家族經營的鳳凰城中式外帶外送廚房，提供蓋飯與外燴。$enr$,
  last_updated = now()
where slug = 'kim-s-chinese-kitchen-phoenix' and status in ('live','stale');

update public.businesses set
  description_en = $enr$MayFlower Chinese Cuisine is a family-run Chinese restaurant at 941 W Elliot Rd, Suite 6, in Chandler that has served the community since 1988. The family says it focuses on consistent quality, generous portions and affordable prices, and much of its business comes from word-of-mouth recommendations from friends, neighbors and satisfied customers. Online ordering is available for pickup.$enr$,
  description_zh_tw = $enr$MayFlower Chinese Cuisine 是位於錢德勒 941 W Elliot Rd, Suite 6 的家族經營中餐館，自 1988 年起服務社區。餐廳表示重視穩定的品質、份量充足與實惠的價格，許多客人都是經由親友、鄰居與滿意顧客口耳相傳而來。可在線上點餐後到店自取。$enr$,
  short_description_en = $enr$Family-run Chandler Chinese restaurant since 1988, known for generous portions and fair prices.$enr$,
  short_description_zh_tw = $enr$1988 年起家族經營的錢德勒中餐館，份量足、價格實惠。$enr$,
  last_updated = now()
where slug = 'mayflower-chinese-cuisine-chandler' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Golden Valley is a Chinese restaurant at 832 W Baseline Rd in Mesa run by chef Sum Lo, who cooked Chinese cuisine in Guangzhou, China, for many years and later served as head chef at several Chinese restaurants in the Valley. It is open for dine-in and takeout, with delivery through DoorDash, Uber Eats and Grubhub. Orders are taken by phone or in person, not by email. The restaurant closes on Christmas, Easter, July 4 and Thanksgiving.$enr$,
  description_zh_tw = $enr$Golden Valley 是位於梅薩（Mesa）832 W Baseline Rd 的中餐館，由主廚 Sum Lo 經營。他曾在中國廣州擔任多年中餐廚師，之後在鳳凰城地區多家中餐館擔任主廚。餐廳提供內用與外帶，外送可透過 DoorDash、Uber Eats 與 Grubhub。請以電話或親臨店內點餐，不接受電子郵件訂單。聖誕節、復活節、7 月 4 日及感恩節公休。$enr$,
  short_description_en = $enr$Mesa Chinese restaurant led by a Guangzhou-trained chef, with dine-in, takeout and delivery.$enr$,
  short_description_zh_tw = $enr$梅薩中餐館，主廚曾在廣州掌廚多年，提供內用、外帶與外送。$enr$,
  last_updated = now()
where slug = 'golden-valley-chinese-cuisine-mesa' and status in ('live','stale');
```

</details>

### Batch 3: dining

The connector timed out on large calls, so this batch ran as two or three smaller calls with the same statements.

<details><summary>Show SQL</summary>

```sql
update public.businesses set
  description_en = $enr$Golden Gate Chinese Restaurant (金門酒家) at 2640 W Baseline Rd in Mesa serves Mandarin and Szechuan cuisine in a sit-down dining room that takes reservations. The menu includes spicy dishes such as double-cooked pork, mapo tofu, yu shang pork and kung pao chicken, along with moo shu pork, almond and cashew chicken, chop suey, noodles and fried rice. Lunch specials are served Monday through Saturday, and dinner combinations are available.$enr$,
  description_zh_tw = $enr$金門酒家（Golden Gate Chinese Restaurant）位於梅薩 2640 W Baseline Rd，供應京菜與川菜，設有內用餐廳並接受訂位。菜單包括回鍋肉、麻婆豆腐、魚香肉絲、宮保雞丁等香辣菜色，以及木須肉、杏仁雞、腰果雞、雜碎、麵食與炒飯。週一至週六供應午餐特價，另有晚餐套餐。$enr$,
  short_description_en = $enr$Mesa sit-down restaurant serving Mandarin and Szechuan dishes, with lunch specials and reservations.$enr$,
  short_description_zh_tw = $enr$梅薩京川菜餐廳，可訂位，提供午餐特價。$enr$,
  name_zh_tw = $enr$金門酒家$enr$,
  last_updated = now()
where slug = 'golden-gate-chinese-restaurant-mesa' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Great Wall Cuisine is a Chinese restaurant at 3446 W Camelback Rd in Phoenix with a large menu that spans Cantonese and Szechwan dinners, dim sum in several sizes, Hong Kong-style noodles and noodle soups, barbecue, live seafood, hot pot and sizzling platters, along with chow mein, fried rice and lunch specials. The restaurant serves wine, sake and spirits, accepts reservations, and takes direct online orders for pickup and delivery.$enr$,
  description_zh_tw = $enr$Great Wall Cuisine 是位於鳳凰城 3446 W Camelback Rd 的中餐館，菜單豐富，涵蓋粵菜與川菜套餐、多種份量的點心、港式麵食與湯麵、燒臘、活海鮮、火鍋和鐵板菜，以及炒麵、炒飯與午餐特價。餐廳供應葡萄酒、清酒與烈酒，可訂位，並提供官網直接點餐自取或外送。$enr$,
  short_description_en = $enr$Phoenix Chinese restaurant with dim sum, Cantonese and Szechwan dishes, live seafood and hot pot.$enr$,
  short_description_zh_tw = $enr$鳳凰城中餐館，提供點心、粵川菜、活海鮮與火鍋。$enr$,
  last_updated = now()
where slug = 'great-wall-cuisine-phoenix' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Mekong Palace is a Cantonese restaurant inside Mekong Plaza at 66 S Dobson Rd in Mesa, serving the Phoenix area since 2010. It is known for handmade dim sum, signature barbecue, seafood and authentic Cantonese dishes prepared daily. The restaurant hosts private parties and holiday events, offers drop-off and full-service catering for weddings, corporate events and family gatherings, and sells gift cards. Dim sum, barbecue, noodles and seafood can also be ordered online for pickup or delivery.$enr$,
  description_zh_tw = $enr$Mekong Palace 位於梅薩 Mekong Plaza 內（66 S Dobson Rd），自 2010 年起服務鳳凰城地區，主打每日現做的手工點心、招牌燒臘、海鮮及道地粵菜。餐廳可承辦私人派對與節慶聚會，提供婚宴、公司活動與家庭聚會的送餐或全套外燴服務，並販售禮品卡。點心、燒臘、麵食與海鮮也可線上點餐自取或外送。$enr$,
  short_description_en = $enr$Cantonese dim sum, barbecue and seafood restaurant in Mesa's Mekong Plaza since 2010.$enr$,
  short_description_zh_tw = $enr$2010 年起營業、位於梅薩 Mekong Plaza 的粵式點心、燒臘與海鮮餐廳。$enr$,
  last_updated = now()
where slug = 'mekong-palace-mesa' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Grand Dragon is a Chinese-American restaurant in Glendale. Its menu covers lunch combinations and rice bowls served until 4 pm, family dinners for two to six people, dinner combination specials and chef's specialties, plus classics such as egg foo young, moo shu, chow fun, chow mein, chop suey, wor wonton soup and sizzling rice soup. Kids' meals and party trays are also available.$enr$,
  description_zh_tw = $enr$Grand Dragon 是格倫代爾（Glendale）的美式中餐館。菜單包括下午 4 點前供應的午餐套餐與蓋飯、二至六人份的家庭晚餐、晚餐套餐與主廚推薦，以及芙蓉蛋、木須、乾炒河粉、炒麵、雜碎、窩雲吞湯和鍋巴湯等經典菜色，另有兒童餐與派對餐盤。$enr$,
  short_description_en = $enr$Glendale Chinese-American restaurant with lunch combos, family dinners, kids' meals and party trays.$enr$,
  short_description_zh_tw = $enr$格倫代爾美式中餐館，提供午餐套餐、家庭晚餐、兒童餐與派對餐盤。$enr$,
  last_updated = now()
where slug = 'grand-dragon-glendale' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Yes Cafe is a Taiwanese cafe at 2050 N Alma School Rd, Suite 11, in Chandler. Its bilingual menu, with Chinese and English item names, covers Taiwanese cold appetizers, snacks, noodles and rice plates, along with a large drink list of flavored teas, milk teas, smoothies, slushes, juices and coffee drinks. Seasonal specials rotate through the year, and online ordering is available for pickup.$enr$,
  description_zh_tw = $enr$Yes Cafe 是位於錢德勒 2050 N Alma School Rd, Suite 11 的台式餐飲店。中英雙語菜單包括台式冷盤、小點、麵類與主菜，以及種類豐富的飲品，例如水果茶、奶茶、雪泡、冰沙、果汁和咖啡。另有季節限定品項，並提供線上點餐自取。$enr$,
  short_description_en = $enr$Chandler Taiwanese cafe with snacks, noodles, rice plates and a big milk tea and smoothie menu.$enr$,
  short_description_zh_tw = $enr$錢德勒台式餐飲店，供應小點、麵飯類及多款奶茶與冰沙。$enr$,
  chinese_menu_or_forms = true,
  last_updated = now()
where slug = 'yes-cafe-chandler' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Phoenix Palace is a Chinese restaurant at 2075 N Dobson Rd in Chandler that serves dim sum from 10 am to 3 pm, along with a full menu of chef's specialties, seafood, poultry, beef, pork, hot pot dishes, vegetables, noodles, fried rice, egg foo young and family dinners. It offers dine-in and takeout, with online ordering for pickup.$enr$,
  description_zh_tw = $enr$Phoenix Palace 是位於錢德勒 2075 N Dobson Rd 的中餐館，上午 10 點至下午 3 點供應點心，另有完整菜單，包括主廚推薦、海鮮、雞鴨、牛肉、豬肉、火鍋類菜色、蔬菜、麵食、炒飯、芙蓉蛋及家庭套餐。提供內用與外帶，可線上點餐自取。$enr$,
  short_description_en = $enr$Chandler Chinese restaurant serving dim sum until 3 pm plus seafood and chef's specialties.$enr$,
  short_description_zh_tw = $enr$錢德勒中餐館，供應點心至下午 3 點，另有海鮮與主廚推薦。$enr$,
  last_updated = now()
where slug = 'phoenix-palace-chandler' and status in ('live','stale');

update public.businesses set
  description_en = $enr$D&Y Chinese Food at 6666 W Peoria Ave, Suites 119-120, in Glendale has two menus. The main menu covers Chinese-American and Cantonese standards such as egg foo young, lo mein, chow fun, Cantonese noodles, chef's specials and dinner combinations. A separate Szechuan menu, labeled in Chinese and English, offers Sichuan specialties, dry pot, barrel rice and noodles, knife-cut noodles, cold dishes and snacks. Online ordering is available for pickup.$enr$,
  description_zh_tw = $enr$D&Y Chinese Food 位於格倫代爾 6666 W Peoria Ave, Suites 119-120，提供兩份菜單。主菜單為美式中餐與粵式經典，例如芙蓉蛋、撈麵、乾炒河粉、廣東炒麵、主廚推薦及晚餐套餐；另一份中英對照的川菜菜單，供應川菜、乾鍋、木桶拌飯與麵、刀削麵、涼菜及小吃。可線上點餐自取。$enr$,
  short_description_en = $enr$Glendale Chinese restaurant with a Chinese-American menu and a separate Szechuan menu in Chinese and English.$enr$,
  short_description_zh_tw = $enr$格倫代爾中餐館，除美式中餐外另有中英對照川菜菜單。$enr$,
  chinese_menu_or_forms = true,
  last_updated = now()
where slug = 'd-y-chinese-food-glendale' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Red Dragon Chinese Food is a Chinese-American takeout restaurant at 2160 N Alma School Rd in Chandler. Popular dishes include General Tso's chicken, sweet and sour chicken, moo goo gai pan, teriyaki chicken, chicken chow mein, jumbo shrimp with lobster sauce and shrimp with snow peas. Orders can be placed online for pickup or delivery, and the restaurant is open seven days a week.$enr$,
  description_zh_tw = $enr$Red Dragon Chinese Food 是位於錢德勒 2160 N Alma School Rd 的美式中餐外帶店。熱門菜色包括左宗棠雞、糖醋雞、蘑菇雞片、照燒雞、雞肉炒麵、龍蝦醬大蝦及雪豆蝦。可線上點餐自取或外送，每週營業七天。$enr$,
  short_description_en = $enr$Chandler Chinese-American takeout spot open daily, with online ordering for pickup or delivery.$enr$,
  short_description_zh_tw = $enr$錢德勒美式中餐外帶店，每天營業，可線上點餐自取或外送。$enr$,
  last_updated = now()
where slug = 'red-dragon-chinese-food-chandler' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Big Bowl Chinese Restaurant (大碗) at 1910 E Broadway Rd in Mesa serves Cantonese and Chinese-American dishes made fresh with traditional recipes. Customer favorites include crab puffs, orange peel chicken and sweet and sour chicken, and the menu also features Singapore chow mein fun, Beijing beef, Mongolian beef, General Tso's chicken, minced chicken lettuce wraps, edamame and crispy potstickers. It is a casual spot for family meals, takeout and online orders.$enr$,
  description_zh_tw = $enr$大碗（Big Bowl Chinese Restaurant）位於梅薩 1910 E Broadway Rd，以傳統食譜現做粵菜與美式中餐。人氣菜色有蟹角、陳皮雞和糖醋雞，菜單另有星洲炒米粉、北京牛肉、蒙古牛肉、左宗棠雞、雞肉生菜包、毛豆與香煎鍋貼。適合家庭聚餐、外帶或線上點餐。$enr$,
  short_description_en = $enr$Mesa Cantonese and Chinese-American restaurant known for crab puffs and orange peel chicken.$enr$,
  short_description_zh_tw = $enr$梅薩粵式及美式中餐館，招牌為蟹角與陳皮雞。$enr$,
  name_zh_tw = $enr$大碗$enr$,
  last_updated = now()
where slug = 'big-bowl-restaurant-mesa' and status in ('live','stale');
```

</details>

### Batch 4: dining, including the first rewrites of already-indexable pages

The connector timed out on large calls, so this batch ran as two or three smaller calls with the same statements.

<details><summary>Show SQL</summary>

```sql
update public.businesses set
  description_en = $enr$Tsing Tao Chinese Cuisine is a Chinese-American restaurant at 542 W Baseline Rd in Mesa. Its menu includes appetizers, soups, chow fun and chow mein fun, lo mein, egg foo young, poultry, pork, beef and seafood entrées, more than a dozen chef's specialties, dinner specials, and a diet menu of lighter dishes. It offers takeout and delivery, with online ordering through its website.$enr$,
  description_zh_tw = $enr$Tsing Tao Chinese Cuisine 是位於梅薩 542 W Baseline Rd 的美式中餐館。菜單有開胃菜、湯品、乾炒河粉與米粉、撈麵、芙蓉蛋，以及雞、豬、牛、海鮮主菜，另有十多道主廚推薦、晚餐特價和清淡的健康菜單。提供外帶與外送，可透過官網線上點餐。$enr$,
  short_description_en = $enr$Mesa Chinese-American restaurant with chef's specialties, a light diet menu, takeout and delivery.$enr$,
  short_description_zh_tw = $enr$梅薩美式中餐館，提供主廚推薦與清淡健康菜單，可外帶外送。$enr$,
  last_updated = now()
where slug = 'tsing-tao-chinese-cuisine-mesa' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Hot Wok Chinese & Japanese Cuisine at 1050 E Ray Rd, Suite 6, in Chandler serves Chinese dishes in American-Chinese, Sichuan, Hunan and Cantonese styles alongside a Japanese menu of sushi rolls, sashimi and poke bowls. Its signature Hot Wok Roll combines shrimp tempura, avocado and spicy tuna wrapped in soy paper with eel sauce. The restaurant offers dine-in, takeout, delivery and catering.$enr$,
  description_zh_tw = $enr$Hot Wok Chinese & Japanese Cuisine 位於錢德勒 1050 E Ray Rd, Suite 6，供應美式中餐、川菜、湘菜與粵菜，以及壽司卷、生魚片和夏威夷生魚飯等日式料理。招牌 Hot Wok Roll 以大豆紙包入炸蝦天婦羅、酪梨與辣鮪魚，再淋上鰻魚醬。提供內用、外帶、外送與外燴。$enr$,
  short_description_en = $enr$Chandler restaurant serving Chinese (Sichuan, Hunan, Cantonese) and Japanese sushi and poke.$enr$,
  short_description_zh_tw = $enr$錢德勒中日料理餐廳，供應川湘粵菜及壽司、生魚飯。$enr$,
  last_updated = now()
where slug = 'hot-wok-chinese-restaurant-chandler' and status in ('live','stale');

update public.businesses set
  description_en = $enr$King's Chef Chinese Food is a Chinese-American restaurant at 1863 N Stapley Dr, Suite 102, in Mesa, offering dine-in and takeout. The menu includes appetizers, soups, fried rice, lo mein, mei fun and chow fun, egg foo young, Szechuan, kung pao and yu shiang dishes, sweet and sour plates, lunch specials and a Royalty Special section. Popular orders include spring rolls, orange chicken, crab puffs, chicken fried rice and General Tso's chicken. It is closed on Mondays.$enr$,
  description_zh_tw = $enr$King's Chef Chinese Food 是位於梅薩 1863 N Stapley Dr, Suite 102 的美式中餐館，提供內用與外帶。菜單有開胃菜、湯品、炒飯、撈麵、米粉、河粉、芙蓉蛋，以及四川、宮保、魚香等口味菜色、糖醋類、午餐特價和「Royalty Special」特選。熱門餐點包括春捲、橙汁雞、蟹角、雞肉炒飯與左宗棠雞。週一公休。$enr$,
  short_description_en = $enr$Mesa Chinese-American restaurant for dine-in and takeout, known for orange chicken and crab puffs.$enr$,
  short_description_zh_tw = $enr$梅薩美式中餐館，可內用外帶，橙汁雞與蟹角最受歡迎。$enr$,
  last_updated = now()
where slug = 'king-s-chef-mesa' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Best Hong Kong Dining is a Hong Kong-style restaurant at 1116 S Dobson Rd in Mesa, close to Mesa Community College and downtown Mesa. It specializes in Hong Kong-style barbecue, with chicken and duck roasted in house, plus Cantonese and Mandarin dishes and live seafood. The menu also has chow mein, lo mein, chow fun, rice plates and congee at low prices, along with lunch specials and family dinners. Phoenix Magazine featured it in a 1999 Cheap Eats roundup, and online ordering is available.$enr$,
  description_zh_tw = $enr$Best Hong Kong Dining 是位於梅薩 1116 S Dobson Rd 的港式餐廳，鄰近 Mesa 社區大學與梅薩市中心。主打港式燒臘，店內現烤雞鴨，另有粵菜、京菜及活海鮮。菜單也有炒麵、撈麵、乾炒河粉、碟頭飯與粥品，價格實惠，並提供午餐特價與家庭套餐。1999 年曾獲《Phoenix Magazine》平價美食專題介紹，可線上點餐。$enr$,
  short_description_en = $enr$Mesa Hong Kong-style restaurant for roast duck and barbecue, Cantonese dishes, congee and live seafood.$enr$,
  short_description_zh_tw = $enr$梅薩港式餐廳，主打燒鴨燒臘、粵菜、粥品與活海鮮。$enr$,
  last_updated = now()
where slug = 'best-hong-kong-dining-mesa' and status in ('live','stale');

update public.businesses set
  description_en = $enr$New Asia Chinese Restaurant is a Chinese restaurant at 2116 W Grant Rd in Tucson that cooks with fresh ingredients and traditional techniques. House specialties include Hundred Hummingbirds, sizzling subgum wor bar, Szechuan shrimp and chicken, Mongolian three delights, moo shu three delights and salt and pepper shrimp. Lunch combination plates are served Monday through Saturday with soup, an egg roll or crab puffs, and rice, and the menu also lists Cantonese chow mein (pan-fried egg noodles).$enr$,
  description_zh_tw = $enr$New Asia Chinese Restaurant 位於圖森 2116 W Grant Rd，以新鮮食材與傳統烹調方式料理中式菜餚。招牌菜包括「Hundred Hummingbirds」、鐵板什錦鍋巴、四川蝦雞、蒙古三鮮、木須三鮮和椒鹽蝦。週一至週六供應午餐組合餐，附湯、春捲或蟹角及米飯；菜單另有廣東炒麵（煎蛋麵）。$enr$,
  short_description_en = $enr$Tucson Chinese restaurant with house specialties like salt and pepper shrimp and weekday lunch combos.$enr$,
  short_description_zh_tw = $enr$圖森中餐館，招牌有椒鹽蝦等菜色，並供應平日午餐組合。$enr$,
  last_updated = now()
where slug = 'new-asia-chinese-restaurant-tucson' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Asian Cafe Express (大家樂) is a Hong Kong-style cafe at 1911 W Main St in Mesa that has served Chinese comfort food since 2005. With more than 300 dishes, the menu ranges from Hong Kong cafe classics to Southeast Asian plates and dishes from different regions of China. Favorites include HK wonton noodle soup with hand-wrapped wontons, chili salt wings, beef chow fun, house lo mein and orange chicken. Phoenix Magazine named it Best Cantonese Noodles in 2023. Party trays, family dinner specials and a Bring Your Own Seafood (BYOS) service are available.$enr$,
  description_zh_tw = $enr$大家樂（Asian Cafe Express）是位於梅薩 1911 W Main St 的港式茶餐廳，自 2005 年起供應中式家常料理。菜單超過 300 道，從港式茶餐廳經典、東南亞菜到中國各地風味都有。人氣菜色包括手包雲吞麵、椒鹽雞翼、乾炒牛河、招牌撈麵和橙汁雞。2023 年獲《Phoenix Magazine》評選為最佳粵式麵食。另提供派對餐盤、家庭套餐及自備海鮮代客料理（BYOS）服務。$enr$,
  short_description_en = $enr$Mesa Hong Kong-style cafe since 2005 with 300+ dishes, known for wonton noodles and chili salt wings.$enr$,
  short_description_zh_tw = $enr$2005 年起營業的梅薩港式茶餐廳，菜單逾 300 道，招牌雲吞麵與椒鹽雞翼。$enr$,
  name_zh_tw = $enr$大家樂$enr$,
  last_updated = now()
where slug = 'asian-cafe-express-mesa' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Happy Bao's is a Northern Chinese restaurant at 66 S Dobson Rd, Suite 112, in Mesa's Mekong Plaza, founded by Chef Mei, who grew up in Northern China making hand-made dishes from fresh dough. The menu centers on baos, dumplings and noodles made to order, including seafood xiao long bao, vegetable sheng jian bao, pork with green chive or cabbage dumplings, spicy chili dumplings, beef noodle soup, pork wonton noodles and Singapore rice noodles. Happy Bao's also offers catering, group reservations and private parties.$enr$,
  description_zh_tw = $enr$Happy Bao's 是位於梅薩 Mekong Plaza（66 S Dobson Rd, Suite 112）的北方麵食館，由從小在中國北方長大、擅長以新鮮麵團製作手工麵點的 Chef Mei 創立。菜單以現點現做的包子、餃子和麵食為主，包括海鮮小籠包、素菜生煎包、豬肉韭菜餃與白菜餃、紅油水餃、牛肉麵、鮮肉雲吞麵和星洲炒米粉。另提供外燴、團體訂位與私人派對服務。$enr$,
  short_description_en = $enr$Mekong Plaza spot for handmade Northern Chinese baos, dumplings and noodles by Chef Mei.$enr$,
  short_description_zh_tw = $enr$Mekong Plaza 內的北方手工麵點店，主打包子、餃子與麵食。$enr$,
  last_updated = now()
where slug = 'happy-bao-s-mesa' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Noodleholics is a Chinese noodle shop in Tucson specializing in Guilin rice noodles and wheat noodles made in house daily. Its Grant Road shop is at 3502 E Grant Rd, with additional locations on Oracle Road and Tanque Verde, each with its own online ordering. The bowls are inspired by the flavors of Guilin, China, and some locations add specials such as mala peanuts. Noodleholics also sells gift cards and has its own ordering app.$enr$,
  description_zh_tw = $enr$Noodleholics 是圖森的中式麵館，主打桂林米粉與每日店內自製的小麥麵條。Grant Road 店位於 3502 E Grant Rd，另有 Oracle Road 與 Tanque Verde 分店，各自提供線上點餐。菜色以中國桂林風味為靈感，部分分店另有麻辣花生等限定小菜。也販售禮品卡並有專屬點餐 App。$enr$,
  short_description_en = $enr$Tucson noodle shop serving Guilin rice noodles and house-made wheat noodles at three locations.$enr$,
  short_description_zh_tw = $enr$圖森麵館，供應桂林米粉與自製麵條，共有三家分店。$enr$,
  last_updated = now()
where slug = 'noodleholics-tucson' and status in ('live','stale');

update public.businesses set
  description_en = $enr$George Yang's Chinese Cuisine is a neighborhood Chinese and pan-Asian restaurant in Tangelo Village at 6048 N 16th St in Phoenix. It serves classic Chinese comfort food made fresh to order, including orange chicken, Mongolian beef, its signature General Yang's chicken, shrimp with honey-glazed walnuts, lo mein, chow mein, pot stickers and hot and sour soup, plus pad Thai and vegetarian-friendly options. Dine-in, takeout, delivery and catering are available.$enr$,
  description_zh_tw = $enr$George Yang's Chinese Cuisine 是位於鳳凰城 Tangelo Village（6048 N 16th St）的社區型中式及泛亞洲餐廳，供應現點現做的中式家常菜，包括橙汁雞、蒙古牛肉、招牌 General Yang's 雞、蜜汁核桃蝦、撈麵、炒麵、鍋貼與酸辣湯，另有泰式炒河粉與素食選擇。提供內用、外帶、外送與外燴。$enr$,
  short_description_en = $enr$Phoenix neighborhood Chinese restaurant known for General Yang's chicken and honey walnut shrimp.$enr$,
  short_description_zh_tw = $enr$鳳凰城社區中餐館，招牌 General Yang's 雞與蜜汁核桃蝦。$enr$,
  last_updated = now()
where slug = 'george-yang-s-chinese-cuisine-phoenix' and status in ('live','stale');
```

</details>

### Batch 5: dining rewrites

The connector timed out on large calls, so this batch ran as two or three smaller calls with the same statements.

<details><summary>Show SQL</summary>

```sql
update public.businesses set
  description_en = $enr$Tasty Pot in Mesa's Mekong Plaza (66 S Dobson Rd, Unit 148) is part of a Taiwanese hot pot chain with about 50 locations in the United States and Canada. It serves boiling hot pot soups, and the menu also includes authentic Taiwanese appetizers, boba milk teas and desserts. The company's motto is 'Eat Well, Live Well,' and it aims for healthy dining in a modern, comfortable setting with excellent service. Local delivery and pickup orders are available.$enr$,
  description_zh_tw = $enr$Tasty Pot 位於梅薩 Mekong Plaza（66 S Dobson Rd, Unit 148），屬於在美國與加拿大約有 50 家分店的台式火鍋連鎖品牌。主打滾燙的火鍋湯鍋，另有道地台式小吃、珍珠奶茶與甜點。品牌標語為「Eat Well, Live Well」，強調在舒適現代的環境中提供健康飲食與優質服務。可訂購在地外送或自取。$enr$,
  short_description_en = $enr$Taiwanese hot pot chain location in Mekong Plaza with Taiwanese snacks, boba tea and desserts.$enr$,
  short_description_zh_tw = $enr$Mekong Plaza 內的台式火鍋連鎖店，另有台式小吃、珍奶與甜點。$enr$,
  last_updated = now()
where slug = 'tasty-pot-mesa' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Tao Garden is a Hong Kong-style Chinese restaurant at 2050 N Alma School Rd, Suite 36, in Chandler, serving fine Cantonese and Mandarin cuisine cooked fresh daily. It specializes in live seafood, from crab and oysters to tilapia, and has a large menu that also includes Chinese-American favorites and party trays. The restaurant says it was voted best Chinese food by the New Times in 2003 and best Chinese restaurant by Phoenix Magazine in 2005. It is closed on Tuesdays and accepts Visa and MasterCard, but not checks.$enr$,
  description_zh_tw = $enr$Tao Garden 是位於錢德勒 2050 N Alma School Rd, Suite 36 的港式中餐館，每日現做精緻粵菜與京菜。主打活海鮮，從螃蟹、生蠔到吳郭魚都有，菜單豐富，也有美式中餐與派對餐盤。餐廳表示曾於 2003 年獲《New Times》選為最佳中餐、2005 年獲《Phoenix Magazine》選為最佳中餐廳。週二公休，接受 Visa 與 MasterCard，不收支票。$enr$,
  short_description_en = $enr$Chandler Hong Kong-style restaurant for Cantonese and Mandarin dishes and live seafood.$enr$,
  short_description_zh_tw = $enr$錢德勒港式中餐館，供應粵菜、京菜與活海鮮。$enr$,
  last_updated = now()
where slug = 'tao-garden-chandler' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Spice Spirit Chinese Cuisine & Bar is a Szechuan restaurant in the H Mart Mesa plaza at Main Street and Dobson Road (1955 W Main St, Suite 101), in the heart of Mesa's Asian District. Dishes are made fresh to order, and the dining room has intimate lighting and a casual, open atmosphere suited to a lunch date or an evening out. The restaurant draws diners from Phoenix, Tempe, Chandler and Gilbert, and serves lunch and dinner daily with a break between 3 and 5 pm.$enr$,
  description_zh_tw = $enr$Spice Spirit Chinese Cuisine & Bar 是位於梅薩 H Mart 商場（Main Street 與 Dobson Road 路口，1955 W Main St, Suite 101）的川菜館，地處梅薩亞洲區中心。菜餚現點現做，用餐環境燈光柔和、氣氛輕鬆開放，適合午餐約會或晚間聚餐，吸引來自鳳凰城、坦佩、錢德勒與吉爾伯特的食客。每日供應午餐與晚餐，下午 3 點至 5 點休息。$enr$,
  short_description_en = $enr$Szechuan restaurant and bar in the H Mart Mesa plaza, in the heart of Mesa's Asian District.$enr$,
  short_description_zh_tw = $enr$位於梅薩 H Mart 商場、亞洲區中心的川菜餐廳兼酒吧。$enr$,
  last_updated = now()
where slug = 'spice-spirit-chinese-cuisine-bar-mesa' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Old Town Taste is a Chinese restaurant at 1845 E Broadway Rd in Tempe serving dishes made with fresh ingredients and traditional recipes, from savory dumplings to spicy Szechuan dishes such as sautéed fish with tofu in hot chili sauce and spicy green peppers with sliced pork. It is open for lunch and dinner every day, with a break in the afternoon, and takes online orders for pickup.$enr$,
  description_zh_tw = $enr$Old Town Taste 是位於坦佩 1845 E Broadway Rd 的中餐館，以新鮮食材與傳統食譜烹調，從鮮美餃子到香辣川菜都有，例如麻辣豆腐燒魚與辣椒炒肉片。每天供應午餐與晚餐，下午有休息時段，並提供線上點餐自取。$enr$,
  short_description_en = $enr$Tempe Chinese restaurant for dumplings and spicy Szechuan dishes, open daily for lunch and dinner.$enr$,
  short_description_zh_tw = $enr$坦佩中餐館，供應餃子與香辣川菜，每日午晚餐營業。$enr$,
  last_updated = now()
where slug = 'old-town-taste-tempe' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Heng's Kitchen is a Chinese restaurant at 66 S Dobson Rd, Suite 127, in Mesa, near the corner of Main Street and Dobson Road. It serves dim sum, rice noodles and other Chinese dishes, with its cuisine listed as Chinese, Szechuan, soups, seafood, noodles and grilled items. Orders can be placed online for carryout or delivery. Heng's Kitchen opens at 10 am and is closed on Wednesdays.$enr$,
  description_zh_tw = $enr$Heng's Kitchen 位於梅薩 66 S Dobson Rd, Suite 127，靠近 Main Street 與 Dobson Road 路口，供應點心、米粉麵食等中式料理，菜系涵蓋中菜、川菜、湯品、海鮮、麵食與燒烤。可線上點餐外帶或外送。每天上午 10 點開門，週三公休。$enr$,
  short_description_en = $enr$Mesa Chinese kitchen serving dim sum and rice noodles, with online carryout and delivery.$enr$,
  short_description_zh_tw = $enr$梅薩中式小館，供應點心與米粉，可線上點餐外帶或外送。$enr$,
  last_updated = now()
where slug = 'heng-s-kitchen-mesa' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Original Cuisine (小橙都) is a Szechuan restaurant at 1853 W Broadway Rd in Mesa focused on authentic Sichuan flavors, with dishes such as Chongqing spicy crispy chicken with chili. It is open late, until 12:30 am, and offers dine-in, takeout and delivery, with online ordering through its website. The restaurant lists a WeChat ID (Bashu_88) on its website.$enr$,
  description_zh_tw = $enr$小橙都（Original Cuisine）是位於梅薩 1853 W Broadway Rd 的川菜館，主打道地四川風味，例如重慶辣子雞。營業至凌晨 12:30，提供內用、外帶與外送，並可透過官網線上點餐。官網列出的微信號為 Bashu_88。$enr$,
  short_description_en = $enr$Late-night Mesa Szechuan restaurant (小橙都) serving authentic Sichuan dishes until 12:30 am.$enr$,
  short_description_zh_tw = $enr$營業至深夜的梅薩川菜館，主打道地四川風味。$enr$,
  name_zh_tw = $enr$小橙都$enr$,
  wechat_id = $enr$Bashu_88$enr$,
  last_updated = now()
where slug = 'original-cuisine-mesa' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Gold Chef is a Chinese restaurant at 1055 S Arizona Ave, Suite 10, in Chandler, near Pecos Road, Tumbleweed Park and Chandler Municipal Airport. The menu includes Cantonese dishes and specialties such as kung pao delight, snow pea scallops, spicy fish fillet, pan-fried noodles, roast pork in garlic sauce and pepper steak, along with seafood dishes and desserts. It is a casual, group-friendly spot with a kids' menu, and offers online ordering for carryout or delivery.$enr$,
  description_zh_tw = $enr$Gold Chef 是位於錢德勒 1055 S Arizona Ave, Suite 10 的中餐館，鄰近 Pecos Road、Tumbleweed 公園與錢德勒市立機場。菜單包含粵式料理，特色菜包括宮保什錦、雪豆炒帶子、香辣魚片、兩面黃煎麵、蒜醬燒肉和青椒牛肉，另有海鮮與甜點。用餐氣氛輕鬆，適合團體，也有兒童菜單，可線上點餐外帶或外送。$enr$,
  short_description_en = $enr$Casual Chinese restaurant in Chandler with Cantonese dishes, seafood and a kids' menu.$enr$,
  short_description_zh_tw = $enr$錢德勒輕鬆風格中餐館，提供粵式料理、海鮮與兒童菜單。$enr$,
  last_updated = now()
where slug = 'gold-chef-chandler' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Wok On is a Chinese restaurant inside the Arizona International Marketplace at 1920 W Broadway Rd, Suite 103, in Mesa, about a mile east of the Price Freeway (Loop 101). It serves Chinese food a la carte and in bento boxes, as well as made-to-order dishes in Cantonese and Szechuan styles, including noodles. Online ordering is available for carryout, and the restaurant is closed on Mondays.$enr$,
  description_zh_tw = $enr$Wok On 位於梅薩 Arizona International Marketplace 內（1920 W Broadway Rd, Suite 103），在 Price Freeway（101 號環線）以東約一英里。供應單點及便當盒式的中式餐點，也有現點現做的粵式、川式菜餚與麵食。可線上點餐外帶，週一公休。$enr$,
  short_description_en = $enr$Chinese bento boxes and made-to-order dishes inside Mesa's Arizona International Marketplace.$enr$,
  short_description_zh_tw = $enr$位於梅薩 Arizona International Marketplace 的中式便當與現做料理。$enr$,
  last_updated = now()
where slug = 'wok-on-mesa' and status in ('live','stale');

update public.businesses set
  description_en = $enr$Chen's Noodle House is a Chinese noodle restaurant at 1043 E Lemon St in Tempe, just east of Arizona State University. The menu features rice noodle soup with lamb, beef chow mein and chicken wing skewers, along with other noodle, soup, seafood and fried rice dishes. Orders can be placed online for carryout or delivery.$enr$,
  description_zh_tw = $enr$Chen's Noodle House 是位於坦佩 1043 E Lemon St 的中式麵館，就在亞利桑那州立大學東側。菜單有羊肉米線湯、牛肉炒麵和雞翅串燒，以及其他麵食、湯品、海鮮與炒飯。可線上點餐外帶或外送。$enr$,
  short_description_en = $enr$Tempe noodle house just east of ASU serving lamb rice noodle soup, chow mein and skewers.$enr$,
  short_description_zh_tw = $enr$ASU 東側的坦佩麵館，供應羊肉米線、炒麵與串燒。$enr$,
  last_updated = now()
where slug = 'chen-s-noodle-house-tempe' and status in ('live','stale');
```

</details>

