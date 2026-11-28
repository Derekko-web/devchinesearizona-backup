# Listing expansion, November 2026 (issue #456)

New listings for Chinese-speaking professionals in metro Phoenix: insurance agents, CPAs, realtors, financial advisers, a dentist and an immigration lawyer. The goal was 60. **14 met the bar and are added in this batch.** The rest of the candidates found could not be verified from a first-party source (see "Considered and skipped").

Status:

| Change | Dev (`rddmdbcrputlsfurqkac`) | Production (`pxgapnyrrwaiacgcmtks`) |
|---|---|---|
| Batch 1: 14 listings (`listing-expansion-2026-11.sql`) | Applied 2026-11-27 | **Applied 2026-11-27** (CEO approval): 256 → 270 rows, indexable 48 → 62, 14/14 rows match dev by md5 |
| Corrections (`listing-expansion-2026-11-corrections.sql`) | Applied 2026-11-27 | **Applied 2026-11-27** (CEO approval): indexable 62 → 64; pre-check confirmed production held the rollback's before-values |
| Batch 2a: 8 physicians + 2 language fixes (`listing-expansion-2026-11-batch2a*.sql`, issue #487) | Applied 2026-11-28 | Not applied; waiting for CEO approval |

## Result

| | Before | After (dev) |
|---|---|---|
| Rows in `businesses` | 256 | 270 |
| Indexable business pages (dev data) | 21 | 35 |

All 14 new rows are indexable under `shouldNoIndexDirectoryBusiness` (`src/lib/directory.ts`): status `live`, a business address, a public phone and website, an English description of 300+ characters, and no template text. Counted with the indexable SQL from `listing-enrichment-2026-11.md`. On production the same 14 rows would take the indexable count from 48 to 62.

By category (existing `business_categories`; no new categories were created):

| Category | New | What they are |
|---|---|---|
| `legal-finance` | 9 | 3 insurance agents, 2 CPA firms, 3 financial advisers, 1 immigration law firm |
| `real-estate` | 4 | Residential and commercial realtors |
| `medical` | 1 | Dental practice (dental has no category of its own; it sits under Medical like the existing dentists) |

By city: Chandler 4, Scottsdale 5, Phoenix 3, Mesa 1, Gilbert 1, Tempe 1. None yet in Glendale or Peoria (Ling Zhu, Phoenix, lists Peoria and Glendale in her service area).

Checked on dev after insert:

- All 14 `/business/<slug>` pages return 200 on dev.chinesearizona.com, with no `noindex` meta (a known non-indexable listing on the same site shows `noindex, nofollow`).
- The `/zh/business/<slug>` pages show the Traditional Chinese copy and Chinese names.
- An md5 of the four description fields, Chinese name, address, phone and languages was compared for all 14 rows against the source data used to build the SQL: 14/14 match.
- No duplicates: each candidate was checked against all 256 production rows by slug, phone (last 10 digits), website host and name.

## The bar

Same as `listing-enrichment-2026-11.md`, plus:

- A business counts only if **its own site or its firm's official profile page** says it serves customers in Chinese. Third-party directories (Zocdoc, Healthgrades, insurer provider directories, Psychology Today, Avvo and similar) were used to find names but never as the language evidence.
- Every fact in the copy comes from those pages. Numbers that change with time are stated as the page states them ("her RE/MAX profile lists 21 years of experience").
- `languages` holds only `English`, `Mandarin`, `Cantonese`, `Taiwanese`, and only what the source states. Where a source says "Chinese" without a dialect (CPA Worldwide Tax Service, Apex Dental Care), `languages` is `{English}` and the copy says "Chinese". The Chinese filter on the site will not find those two until the owner picks a dialect.
- `name_zh_tw` only where the business's own page gives a Chinese name (3 rows; one converted from Simplified, see table).
- No WeChat ID, WeChat Pay, Alipay or Chinese forms were stated by any of the 14, so those fields stay at their defaults.
- Business addresses only. Two realtors work out of their brokerage office; the brokerage address is used.
- Row shape matches existing rows: `region = 'Greater Phoenix'`, `verified = true`, `verification_state = 'editor_verified'`, `status = 'live'`, `bilingual = true`, `sponsored = false`, `featured = false`, `hero_image` left empty (no photos were copied).

## Website scan (the 14 new websites)

Same two-pass check as the "Website scan" in `listing-enrichment-2026-11.md`: each listed website was fetched once as a normal browser and once with Google's crawler user agent, and checked for gambling-spam words, parked-domain pages, redirects to another domain and errors. Titles were read by hand.

- No spam, no parked pages, no cross-domain redirects on any of the 14. Two spam-word hits were false positives inside normal words ("judicial" on the R.O.I. Properties page, "specialists" on the Merrill pages).
- Browser and Googlebot saw the same page on 12 sites. comparioninsurance.com and remax.com return 403 to the Googlebot user agent from a non-Google address; that is their bot protection, not cloaking (the browser fetch shows the agent's normal profile).
- None of the 14 websites is one of the domains removed in the enrichment work (bigwatempe.com, azhotpot.com, nanzhounoodlemesa.com, kwansmesa.com, the81hongkongcafe.com, chateaboba.com, ordercyclo.com, diamondcntogo.com, yinschineseaz.com, chouskitchen.com, beijingchandleraz.com, asiangardenexpressglendale.com, baochow.com).

## Corrections to existing listings (issue #470)

Sales found wrong facts on listings we are about to pitch. Each was checked against the business's own website or an official source. Fixes are in `listing-expansion-2026-11-corrections.sql` (applied to dev on 2026-11-27, pages checked on dev.chinesearizona.com); `listing-expansion-2026-11-corrections-rollback.sql` writes back the production values captured the same day. Slugs are unchanged, so no URL changes.

| Listing | Finding | Change |
|---|---|---|
| `eastern-art-academy-phoenix` | Its site gives 3029 N Alma School Rd, Suite 225, Chandler, AZ 85224 (footer and /chinese-class; the class page also lists 14891 N Northsight Blvd, Suite 129, Scottsdale). The listing said Phoenix with no address, and both English description fields held Simplified Chinese text copied from the site. The site's newest news is February 2021. | `city` Chandler, `address` set, `service_area_text` cleared; new English and Traditional Chinese copy from the site that says the site was last updated in 2021 and to call first; Simplified aliases converted to Traditional. Becomes indexable (the old text was under 180 characters). |
| `hedy-li-phoenix` | Her site's title is "Chinese-Speaking Realtor in Phoenix Metro Area" and it calls her a "Chinese Realtor", but it never names Mandarin, Cantonese or Taiwanese. | **No data change.** `languages` cannot hold "Chinese" without a dialect (the site's options are English, Mandarin, Cantonese, Taiwanese), and the description already says Chinese-speaking. The cut-off "Speaking Realtor" chip Sales saw is built by the page code from the description, not stored data; that is a code fix. |
| `axia-senior-insurance-advisors-chandler` | axiasiadvisors.com: (602) 344-9940, by appointment only at 625 W Southern Ave #E193, Mesa, AZ 85210, inside the Plaza Executive Suites building; email Info@BetterHealth.Insure. The listing had another phone, a Chandler Ranch plaza address and template text. | `phone`, `address`, `city` (Mesa), `email` updated; template copy replaced with English and Traditional Chinese copy from the site; aliases updated. Becomes indexable. |
| `yjp-spine-center-mesa` | The federal NPI registry (NPPES) lists YJP Spine Center LLC, doing business as The Back Center Chiropractic, at 4920 W Thunderbird Rd, Suite 112, Glendale, AZ 85306, (623) 487-3444, record last updated 2020-11-19. No record or site shows a Mesa (Dobson Square) location. | **No change yet.** Flagged for Derek's in-person check at Dobson Square. If it is not there, the listing should move to the Glendale address above (or be removed). |
| `phoenix-chinese-center-glendale` | Its website does not respond; no first-party or official source gives an address or city. | **No change.** City left as Glendale; still unverified. |
| `beijing-acupuncture-and-health-center-mesa` | No website, no NPI registry record, no other trace online. | **No change, not deleted.** Flagged for Derek to check in person at Dobson Square (1116 S Dobson Rd). |

### Simplified Chinese scan (all listings)

All 256 production rows were scanned for Simplified-only characters in `name_zh_tw`, `short_description_zh_tw` and `description_zh_tw`, and also in the English fields and `search_aliases`. **No `*_zh_tw` field contains Simplified Chinese** (the 45 Chinese descriptions written on 2026-11-25 are Traditional). Simplified text was found in:

| Listing | Field | Simplified | Traditional (now in the corrections SQL) |
|---|---|---|---|
| `eastern-art-academy-phoenix` | `short_description_en`, `description_en`, 5 aliases | Copied site text, e.g. 新东方中文艺术学院, 凤凰之春 | Rewritten (see above); aliases 新東方中文藝術學院, 鳳凰之春, 華人春晚, 藝術教育, 美中藝術教育交流 |
| `az-hope-chinese-school-chandler` | alias | 记建校三十周年义工聚会 | 記建校三十周年義工聚會 |
| `contemporary-chinese-school-of-arizona-tempe` | alias | 亚省现代中文学校24-25新学年开启 | 亞省現代中文學校24-25新學年開啟 |
| `gilbert-chinese-church-gilbert` | alias | 邀请你与我们一起：真诚敬拜、研习圣经、彼此服事、传扬福音。 | 邀請你與我們一起：真誠敬拜、研習聖經、彼此服事、傳揚福音。 |
| `tucson-christian-mandarin-church-tucson` | alias | 原創詩歌 这一刻我跟从了耶稣基督 … | 原創詩歌 這一刻我跟從了耶穌基督 … |

The four aliases above are scraped headlines and slogans rather than useful search terms; converting them keeps search behaviour the same. Dropping them is a reasonable later cleanup. The check used a list of Simplified-only characters, so a rare character outside the list could be missed.

With the 14 new listings and these corrections, production would go from 48 to 64 indexable business pages.

## How to apply to production

1. Pre-check (expect 0 rows):
   ```sql
   select slug from public.businesses where slug in (
     'joseph-lau-state-farm-chandler','katie-lau-state-farm-mesa','tak-sun-comparion-insurance-chandler',
     'lin-rawlinson-cpa-chandler','cpa-worldwide-tax-service-chandler','jill-yen-roi-properties-phoenix',
     'ling-zhu-phoenix','christy-crouse-scottsdale','jean-woodland-scottsdale','jane-zheng-merrill-phoenix',
     'alexander-lu-merrill-scottsdale','daisy-zhu-merrill-scottsdale','apex-dental-care-gilbert','joyce-h-huang-pllc-tempe');
   ```
2. Run `listing-expansion-2026-11.sql` (14 `insert ... on conflict (slug) do nothing` statements in one transaction). The category is looked up by slug, so the same file was used on dev. If the connector times out, run the statements in two halves; each is independent.
3. Post-check: the query above returns 14 rows, and the indexable count query in `listing-enrichment-2026-11.md` goes up by 14.
4. Spot-check a few pages, for example `/business/tak-sun-comparion-insurance-chandler` and `/zh/business/apex-dental-care-gilbert`.
5. Run `listing-expansion-2026-11-corrections.sql` (6 updates in one transaction). Check `/business/eastern-art-academy-phoenix` shows Chandler and `/business/axia-senior-insurance-advisors-chandler` shows (602) 344-9940.

## Rollback

`listing-expansion-2026-11-rollback.sql` deletes the 14 slugs, skipping any row an owner has claimed since (`owner_profile_id is null`). These are new rows, so there are no previous values to restore.

`listing-expansion-2026-11-corrections-rollback.sql` writes back every changed column of the six corrected rows to its production value from 2026-11-27 (including a zero-width space that was in one Eastern Art Academy alias). Dev held older text for some of these rows before the corrections, so the rollback is for production only.

## Listings and sources

| Slug | Category | City | Languages | Sources |
|---|---|---|---|---|
| `joseph-lau-state-farm-chandler` | legal-finance (insurance) | Chandler | English, Mandarin, Cantonese, Taiwanese | https://insurancewithjoseph.com/<br>https://www.statefarm.com/agent/us/az/chandler/joseph-lau-0hbjx96l5ge |
| `katie-lau-state-farm-mesa` | legal-finance (insurance) | Mesa | English, Cantonese, Mandarin (copy also says Vietnamese) | https://katiemysfagent.com/<br>https://www.statefarm.com/agent/us/az/mesa/katie-lau-172dcbjgxak |
| `tak-sun-comparion-insurance-chandler` | legal-finance (insurance) | Chandler | English, Mandarin, Taiwanese | https://www.comparioninsurance.com/insurance-agent/arizona/chandler-0614/tak |
| `lin-rawlinson-cpa-chandler` | legal-finance (tax) | Chandler | English, Mandarin, Cantonese (staff) | https://www.lincpatax.com/<br>https://www.lincpatax.com/about-us.php |
| `cpa-worldwide-tax-service-chandler` | legal-finance (tax) | Chandler | English (copy says Chinese, no dialect given) | https://www.cpaworldwidetax.com/<br>https://www.cpaworldwidetax.com/Partner.php |
| `jill-yen-roi-properties-phoenix` | real-estate | Phoenix | English, Mandarin | https://roiproperties.com/team-members/jill-yen/ |
| `ling-zhu-phoenix` | real-estate | Phoenix | English, Mandarin | https://www.remax.com/real-estate-agents/ling-zhu-phoenix-az/102100331 |
| `christy-crouse-scottsdale` | real-estate | Scottsdale | English, Mandarin | https://www.remax.com/real-estate-agents/christy-crouse-chandler-az/100040742<br>https://phoenixchineserealestateagent.com/ |
| `jean-woodland-scottsdale` | real-estate | Scottsdale | English, Mandarin, Cantonese | https://www.realtyexecutives.com/agents/jean-woodland |
| `jane-zheng-merrill-phoenix` | legal-finance (financial advice) | Phoenix | English, Mandarin | https://advisor.ml.com/sites/az/phoenix-az/jane.zheng |
| `alexander-lu-merrill-scottsdale` | legal-finance (financial advice) | Scottsdale | English, Mandarin | https://advisor.ml.com/sites/az/scottsdale-az/alexander.lu |
| `daisy-zhu-merrill-scottsdale` | legal-finance (financial advice) | Scottsdale | English, Mandarin | https://advisor.ml.com/sites/az/scottsdale-az/shiping.zhu |
| `apex-dental-care-gilbert` | medical (dental) | Gilbert | English (copy says Chinese, no dialect given) | https://apexdentalcare.com/<br>https://apexdentalcare.com/map-directions/<br>https://apexdentalcare.com/our-services/ |
| `joyce-h-huang-pllc-tempe` | legal-finance (immigration law) | Tempe | English, Mandarin | https://joycehuangfirm.com/<br>https://joycehuangfirm.com/attorney<br>https://joycehuangfirm.com/contact |

### Chinese names

| Slug | `name_zh_tw` | Where the page says it |
|---|---|---|
| `tak-sun-comparion-insurance-chandler` | 孫維特 | Agent page, Chinese intro: 我叫孫維特 |
| `jill-yen-roi-properties-phoenix` | 閻正倫 | Page title: Jill Yen (閻正倫) |
| `christy-crouse-scottsdale` | 劉純 | Her site's menu: 美国凤凰城资深房产经纪人 刘纯 (converted to Traditional) |

### Notes for spot-checking

- `christy-crouse-scottsdale`: her own site looks unmaintained (2013 copyright), so office, phone and years come from her current RE/MAX profile. Her site shows (480) 332-5925 in text but links (480) 332-5926; the RE/MAX profile gives 5925, which is used.
- `joyce-h-huang-pllc-tempe`: the firm's website domain was registered in May 2026, so the site is new. An Avvo listing places a Huang immigration law office at the same address (1761 E McNair Dr, Suite 101, Tempe). The copy leaves out the site's marketing numbers (cases, years). Worth a State Bar of Arizona lookup before production.
- `jill-yen-roi-properties-phoenix`: the phone is the one she gives on her profile ("Connect with Jill Yen today"), a 425 area code. The brokerage's main line is (602) 319-1326.
- The three Merrill advisers are employees of a large firm, not owner-run businesses. They are listed because they are Chinese-speaking professionals with an official profile; they are less likely to buy advertising.

## Considered and skipped

Roughly 95 named candidates were looked at. Besides the 14 added, these did not make the bar:

| Reason | Count | Examples of the kind |
|---|---|---|
| Language claim only on third-party directories (insurer provider directories, Zocdoc, Healthgrades, Psychology Today, HealthProfs, Avvo, Yobi, Taiwan Housing); the business's own site does not mention Chinese or could not be found | ~55 | Dentists and physicians from insurer directories, Mandarin-speaking therapists and acupuncturists, immigration lawyers with directory profiles only |
| Own site found but says nothing about serving customers in Chinese | 8 | TCM clinics whose sites describe Chinese medicine but not the language of service; dental offices; a Scottsdale immigration firm |
| Own site down, empty (script-only) or behind a bot check | 7 | Acupuncture clinics and a dental office whose sites do not load; eXp Realty agent sites (Cloudflare check) |
| Could not confirm the person is licensed, Chinese-speaking or based in metro Phoenix from a first-party page | 6 | A realtor with only a personal site and an out-of-state phone; agents known only from aggregator profiles |
| Large-firm or out-of-area pages with no Phoenix office | 4 | A national law firm's machine-translated Phoenix page; insurance and mortgage people based in California or Colorado |
| Stale or retired | 2 | A Chinese school blog with no current date; a dentist listed as retired |

Systematic scans that found few or no new names: all State Farm agent pages in the eight cities plus 18 other metro cities (264 agents after re-fetching pages that were first rate-limited; 2 Chinese speakers, both added), Farmers (169 agents, none), American Family (90 agents, none), Merrill office rosters (83 advisers, 3 added).

Names and leads that were not verified are kept in the company's private listings folder, not in this repo.

## Chains and organizations in the paying categories (for a CEO decision)

Production has 43 listings in medical, legal-finance, education, real-estate, home-services and local-services (before this batch). 22 are national or regional chains, and 3 are associations or a student club:

| Kind | Listings |
|---|---|
| Pharmacy chains | CVS Pharmacy (Chandler, Mesa, Peoria); Walgreens (Chandler ×2, Tucson) |
| Health systems and multi-site medical | Banner Urgent Care (Peoria); SimonMed (Mesa); Miracle-Ear (Chandler, franchise); Discover Vein & Vascular (Chandler) |
| Banks, credit unions, lenders, tax chains | BMO (Chandler); MidFirst Bank (Peoria); Arizona Central Credit Union (Chandler); Global Credit Union (Peoria; its listed phone is an Alaska 907 number); H&R Block (Peoria); LoanMax (Mesa, title loans) |
| Retail and service chains | Ace Hardware (Peoria); Discount Tire (Mesa); FedEx Office (Chandler); The UPS Store (Chandler); USA Tae Kwon Do (Chandler) |
| Associations and clubs (not businesses) | Arizona Asian American Bar Association; Asian Real Estate Association of America Greater Phoenix; Asian American Journalists Association at ASU (student club) |

The other 18 are independent businesses or schools, though three of them are unverified (Beijing Acupuncture, Hi-Tech Dentistry and YJP Spine Center; see above).

## Batch 2a: Chinese-speaking physicians (issue #487)

Under the CEO's widened evidence rule (2026-11-27): language may come from the directory of the organisation a professional works in, here Banner Health's Find a Doctor (`doctors.bannerhealth.com`, filtered by language). Each listing's copy ends with "Languages as listed in Banner Health's Find a Doctor directory, checked November 2026" (and the same in Chinese).

Second source for address and phone: the CEO asked for the professional's own site or the state licence board. The Arizona Medical Board and the Arizona State Board of Dental Examiners both return HTTP 403 to automated lookups, so the **federal NPI registry (NPPES)** was used as the official second source instead. **CEO decision needed:** if the NPI registry does not count, these 8 rows need a manual board lookup before production.

Banner's directory lists 27 Chinese-speaking providers (23 Mandarin, 3 Cantonese, 2 "Chinese"; some overlap). Of those:

| Outcome | Count | Providers |
|---|---|---|
| Added: practice in the eight cities, NPI registry location matches Banner's | 8 | Albert Hsia (Chandler), Alan Wang, Jen-Jung Pan, Jimmy Chim, Rong Bai (Phoenix), David Wang (Chandler), Jennifer Yu-Hsien Huang (Peoria), Mimi Chao (Mesa) |
| Skipped: NPI registry still shows an older address (Cleveland, Stanford, San Antonio, Gilbert or another Phoenix site) | 7 | I-Hui Chiang, Rong Guo, Rosanne Marie Kho, Wilber Su, Ying Li, Michael Lee, Qing Zhao |
| Skipped: NPI address differs from Banner's (same phone) | 1 | Angela Feng (Mesa) |
| Skipped: primary practice outside the eight cities (Tucson, Maricopa, Sun City West, Colorado) | 10 | |
| Skipped: diagnostic radiologist (no direct appointments) | 1 | John Chang |

Notes:

- `alan-wang-md-phoenix` has no phone: Banner shows a central scheduling line and the NPI registry a clinic line, so neither confirms the other. The listing links to his Banner profile for booking.
- `jimmy-chim-md-phoenix` is Cantonese; the other seven are Mandarin. Hokkien and Min Nan listed for two skipped providers were not mapped to `Taiwanese`.
- These are employees of a large health system. They add Mandarin- and Cantonese-speaking specialists the community asks about, but they are unlikely to buy advertising.
- Website scan: the Banner profile URLs load normally for a browser and return 403 to the Googlebot user agent from a non-Google address (bot protection, as with Comparion and RE/MAX in batch 1); no spam, parking or redirects.
- Duplicate check against all 270 production rows (slug, phone, name, Banner URL): none.

| Slug | City | Languages | Sources |
|---|---|---|---|
| `albert-hsia-do-chandler` | Chandler | English, Mandarin | https://doctors.bannerhealth.com/provider/albert-hsia/2297991<br>NPI 1518313196 |
| `alan-wang-md-phoenix` | Phoenix | English, Mandarin | https://doctors.bannerhealth.com/provider/alan-wang/776227<br>NPI 1417395799 |
| `david-wang-md-chandler` | Chandler | English, Mandarin | https://doctors.bannerhealth.com/provider/david-wang/2298021<br>NPI 1942341912 |
| `jen-jung-pan-md-phoenix` | Phoenix | English, Mandarin | https://doctors.bannerhealth.com/provider/jen-jung-pan/517728<br>NPI 1811073166 |
| `jennifer-huang-md-peoria` | Peoria | English, Mandarin | https://doctors.bannerhealth.com/provider/jennifer-yu-hsien-huang/453430<br>NPI 1922235530 |
| `jimmy-chim-md-phoenix` | Phoenix | English, Cantonese | https://doctors.bannerhealth.com/provider/jimmy-chim/2718699<br>NPI 1255534871 |
| `mimi-chao-md-mesa` | Mesa | English, Mandarin | https://doctors.bannerhealth.com/provider/mimi-chao/3213249<br>NPI 1609091602 |
| `rong-bai-md-phoenix` | Phoenix | English, Mandarin | https://doctors.bannerhealth.com/provider/rong-bai/3155057<br>NPI 1487224093 |

NPI records: `https://npiregistry.cms.hhs.gov/api/?version=2.1&number=<NPI>`.

Also in this batch, per the CEO's decision that "Chinese" without a dialect is recorded as `{English, Chinese}`: `listing-expansion-2026-11-batch2a-corrections.sql` sets `languages` to `{English, Chinese}` for `cpa-worldwide-tax-service-chandler` and `apex-dental-care-gilbert` (guarded on the current value `{English}`); the rollback file restores `{English}`.

To apply to production after approval: pre-check that none of the 8 slugs exist; run `listing-expansion-2026-11-batch2a.sql`, then `listing-expansion-2026-11-batch2a-corrections.sql`; post-check 8 rows present and indexable +8 (both corrected rows are already indexable). Rollback: `listing-expansion-2026-11-batch2a-rollback.sql` and `listing-expansion-2026-11-batch2a-corrections-rollback.sql`.

## Follow-ups

1. Decide whether insurer provider directories (Delta Dental, BCBS Arizona, Humana and similar) count as an official source for language. If yes, about 40 more dentists and physicians in the eight cities could be added quickly; many are independent practices.
2. Add a "Chinese (dialect not stated)" option, or ask the two owners above to pick a dialect, so the language filter can find them.
3. Next batch: owner-run home services, auto, tutoring, movers and travel agencies. These rarely state languages on a website; they need a different source (owner sign-ups, community referrals).
4. eXp Realty and several brokerages block automated page fetches. A human check of those agents' pages would add more Mandarin-speaking realtors.
