# Listing expansion, November 2026 (issue #456)

New listings for Chinese-speaking professionals in metro Phoenix: insurance agents, CPAs, realtors, financial advisers, a dentist and an immigration lawyer. The goal was 60. **14 met the bar and are added in this batch.** The rest of the candidates found could not be verified from a first-party source (see "Considered and skipped").

Status:

| Change | Dev (`rddmdbcrputlsfurqkac`) | Production (`pxgapnyrrwaiacgcmtks`) |
|---|---|---|
| Batch 1: 14 listings (`listing-expansion-2026-11.sql`) | Applied 2026-11-27 | **Applied 2026-11-27** (CEO approval): 256 → 270 rows, indexable 48 → 62, 14/14 rows match dev by md5 |
| Corrections (`listing-expansion-2026-11-corrections.sql`) | Applied 2026-11-27 | **Applied 2026-11-27** (CEO approval): indexable 62 → 64; pre-check confirmed production held the rollback's before-values |
| Batch 2a: 8 physicians + 2 language fixes (`listing-expansion-2026-11-batch2a*.sql`, issue #487) | Applied 2026-11-28 | **Applied 2026-11-28** (CEO approval, both files): 270 → 278 rows, indexable 64 → 72, 8/8 rows match dev by md5 |
| Batch 2b: 8 therapists (`listing-expansion-2026-11-batch2b*.sql`, issue #487) | Applied 2026-11-28 | **Applied 2026-11-28** (CEO approval): 278 → 286 rows, indexable 72 → 80, 8/8 rows match dev and the file by md5 |
| Pronoun fix for 6 batch 1 rows (`listing-expansion-2026-11-batch1-pronoun-fix*.sql`) | Applied 2026-11-28 | **Applied 2026-11-28** (CEO approval): pre-check confirmed all 6 held the guarded text; 6/6 now match the file by md5 |
| Batch 2c: 8 physicians (`listing-expansion-2026-11-batch2c.sql`, issue #487) | Applied 2026-11-28 | **Applied 2026-11-28** (CEO approval): 286 → 294 rows, indexable 80 → 88, 8/8 rows match dev and the file by md5 |
| Batch 3a: 7 north Valley physicians (`listing-expansion-2026-11-batch3a*.sql`, issue #487) | Applied 2026-11-28 | Not applied; waiting for CEO approval |
| AZ Hope language fix and Alan Wang phone (`listing-expansion-2026-11-batch2c-corrections.sql`) | Applied 2026-11-28 | **Applied 2026-11-28** (CEO approval): pre-check matched the rollback values; both rows now match dev |
| Hide 47 chain listings (`listing-expansion-2026-11-chains-suppress.sql`) | Applied 2026-11-28 | **Applied 2026-11-28** (CEO approval): 47 rows `live` → `suppressed`; none claimed or paid; indexable unchanged at 88 |
| Hide Panda Express (`listing-expansion-2026-11-panda-express-suppress*.sql`) | Applied 2026-11-28 | **Applied 2026-11-28** (CEO decision and approval): 1 row `live` → `suppressed` |

Production after all of the above (2026-11-28): 294 rows, 232 `live`, 234 public (`live` or `stale`), 48 `suppressed` (none claimed, sponsored or featured), 88 indexable. Suppressed pages return 404 with `noindex` and are not in the sitemap.

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

By city: Chandler 4, Scottsdale 4, Phoenix 3, Mesa 1, Gilbert 1, Tempe 1. None yet in Glendale or Peoria (Ling Zhu, Phoenix, lists Peoria and Glendale in her service area).

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

Second source for address and phone: the CEO asked for the professional's own site or the state licence board. The Arizona Medical Board and the Arizona State Board of Dental Examiners both return HTTP 403 to automated lookups, so the **federal NPI registry (NPPES)** was used as the official second source instead. The CEO confirmed on 2026-11-28 that the NPI registry counts as the second source for address.

Banner's directory lists 27 Chinese-speaking providers (23 Mandarin, 3 Cantonese, 2 "Chinese"; some overlap). Of those:

| Outcome | Count | Providers |
|---|---|---|
| Added: practice in the eight cities, NPI registry location matches Banner's | 8 | Albert Hsia (Chandler), Alan Wang, Jen-Jung Pan, Jimmy Chim, Rong Bai (Phoenix), David Wang (Chandler), Jennifer Yu-Hsien Huang (Peoria), Mimi Chao (Mesa) |
| Skipped here: NPI registry still shows an older address (Cleveland, Stanford, San Antonio, Gilbert or another Phoenix site). **Added in batch 2c.** | 7 | I-Hui Chiang, Rong Guo, Rosanne Marie Kho, Wilber Su, Ying Li, Michael Lee, Qing Zhao |
| Skipped here: NPI address differs from Banner's (same phone). **Added in batch 2c.** | 1 | Angela Feng (Mesa) |
| Skipped: primary practice outside the eight cities (Tucson, Maricopa, Sun City West, Colorado) | 10 | |
| Skipped: diagnostic radiologist (no direct appointments) | 1 | John Chang |

Notes:

- `alan-wang-md-phoenix` was published with no phone: Banner shows a central scheduling line and the NPI registry a clinic line, so neither confirmed the other. Under the CEO's later decision (employer directory counts for phone), `listing-expansion-2026-11-batch2c-corrections.sql` adds Banner's "Preferred Phone Number", (833) 929-2418.
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

## Batch 2b: Chinese-speaking therapists (issue #487)

Language evidence under the CEO's rule (b): the profile each therapist manages on Psychology Today, which states "I also speak …". Each listing's copy ends with "Languages as listed on this therapist's Psychology Today profile, checked November 2026" (and the same in Chinese). The office address on the profile was cross-checked against the federal NPI registry (state boards block automated lookups, as above).

**No phone is published for these 8.** Psychology Today shows call-tracking numbers that never match the number in the NPI registry, so neither source confirms the other. Each listing links to the Psychology Today profile, which has the contact options. Category: `medical` (there is no mental-health category).

Psychology Today's Mandarin and Cantonese filters for the eight cities returned 21 Arizona profiles (one in Tucson). Of the 20 in metro Phoenix:

| Outcome | Count |
|---|---|
| Added: office address on the profile matches the NPI registry | 8 |
| Skipped: no office address on the profile (online only or not shown) | 7 |
| Skipped: NPI address differs from the profile, or no NPI record | 2 |
| Skipped: pre-licensed; associates (not the therapist) speak Mandarin; lists more than a dozen languages (interpreter-style practice) | 3 |

| Slug | City | Licence (Arizona) | Languages | Sources |
|---|---|---|---|---|
| `angela-liu-lpc-gilbert` | Gilbert | LPC-20942 | English, Mandarin | https://www.psychologytoday.com/us/therapists/angela-liu-gilbert-az/1816093<br>NPI 1124760897 |
| `june-lin-lee-lmft-tempe` | Tempe | LMFT-16277 | English, Mandarin, Taiwanese | https://www.psychologytoday.com/us/therapists/june-lin-lee-tempe-az/795868<br>NPI 1093298499 |
| `kuo-yi-chung-phd-mesa` | Mesa | Psychologist 4180 | English, Mandarin | https://www.psychologytoday.com/us/therapists/kuo-yi-chung-mesa-az/102064<br>NPI 1023242229 |
| `michelle-fowler-lpc-mesa` | Mesa | LPC-20211 | English, Mandarin | https://www.psychologytoday.com/us/therapists/michelle-fowler-mesa-az/436792<br>NPI 1518516715 |
| `petty-go-lamft-glendale` | Glendale | LAMFT-10655 | English, Mandarin, Taiwanese | https://www.psychologytoday.com/us/therapists/petty-p-go-glendale-az/780294<br>NPI 1407444136 |
| `shiru-zhou-lpc-scottsdale` | Scottsdale | LPC-23802 | English, Mandarin | https://www.psychologytoday.com/us/therapists/shiru-zhou-scottsdale-az/1034137<br>NPI 1144936386 |
| `wen-chien-lin-lpc-tempe` | Tempe | 15861 | English, Mandarin, Taiwanese | https://www.psychologytoday.com/us/therapists/wen-chien-lin-tempe-az/1590516<br>NPI 1194154583 |
| `wiser-counseling-anna-liu-scottsdale` | Scottsdale | 16803 | English, Mandarin | https://www.psychologytoday.com/us/therapists/wiser-counseling-anna-liu-scottsdale-az/749949<br>NPI 1992081186 |

Notes: two NPI records are old (June Lin-Lee 2018, Kuo-Yi Chung 2011) but still match the profile's office. Petty P. Go holds an associate licence (LAMFT), which the copy says. Website scan: Psychology Today pages load for a browser and return 403 to the Googlebot user agent and to repeated automated requests. Duplicate check against production (slug, name, address, any Psychology Today link): none. These therapists already pay Psychology Today for their profiles, so they are reasonable advertising prospects.

To apply to production after approval: pre-check none of the 8 slugs exist; run `listing-expansion-2026-11-batch2b.sql`; post-check 8 rows and indexable +8. Rollback: `listing-expansion-2026-11-batch2b-rollback.sql`.

## Pronoun fix (batch 1 and batch 2a)

The first drafts used gendered pronouns ("she", "his", 他/她) for people whose sources never state their pronouns, which is a fact we should not invent. Copy now uses the person's name instead, or "the profile" / "the agency". Pronouns are kept only where the business's own page uses them (Jill Yen, the three Merrill advisers, and Apex Dental Care's page about Dr. Wang).

- Batch 2a and 2b SQL in this PR are already pronoun-free (the 8 batch 2a rows in dev were updated to match).
- Six batch 1 rows are already in **production** with the old copy: `joseph-lau-state-farm-chandler`, `katie-lau-state-farm-mesa`, `tak-sun-comparion-insurance-chandler`, `ling-zhu-phoenix`, `christy-crouse-scottsdale`, `jean-woodland-scottsdale`. `listing-expansion-2026-11-batch1-pronoun-fix.sql` rewrites their four description fields, each update guarded on the current English description; the rollback restores the current text. Applied to dev; production waits for CEO approval.

## Batch 2c: Banner physicians with an out-of-date NPI record (issue #487)

These are the 8 Banner Health providers that batch 2a skipped because the NPI registry still showed an older practice address. The CEO decided on 2026-11-28 that for employed clinicians the employer's own directory counts for both address and phone, and is preferred when it disagrees with the NPI registry. **For all 8, the address and phone come from the Banner provider page**, not the NPI registry. Language evidence and the closing line in the copy are the same as batch 2a. Copy uses names, not pronouns.

| Slug | City | Specialty (as Banner lists it) | Languages | Phone on the Banner page |
|---|---|---|---|---|
| `i-hui-chiang-md-phoenix` | Phoenix | Cardiology, interventional cardiology | English, Mandarin (Banner also lists Hokkien and French) | (602) 521-3090, Heart Institute |
| `wilber-su-md-phoenix` | Phoenix | Cardiac electrophysiology | English, Mandarin | (602) 521-3090, Heart Institute |
| `rosanne-kho-md-phoenix` | Phoenix | Minimally invasive gynecologic surgery | English, Mandarin | (602) 521-5700, Women's Institute |
| `ying-li-md-phoenix` | Phoenix | Radiation oncology (Banner MD Anderson) | English, Mandarin | (480) 256-6444, Banner MD Anderson scheduling |
| `michael-lee-md-phoenix` | Phoenix | Hematology and medical oncology (Banner MD Anderson) | English, Mandarin, Cantonese | (480) 256-6444, Banner MD Anderson scheduling |
| `qing-zhao-md-chandler` | Chandler | Breast medical oncology, hematology (Banner MD Anderson at Banner Ocotillo) | English, Mandarin | (480) 256-6444, Banner MD Anderson scheduling |
| `rong-guo-md-glendale` | Glendale | Endocrinology, diabetes and metabolism | English, Mandarin | (623) 248-2108, Banner Health Center plus |
| `angela-feng-do-mesa` | Mesa | Family medicine | English, Cantonese | (480) 827-5500, Banner Health Clinic |

Sources: each row's `website` is its Banner provider page (for example https://doctors.bannerhealth.com/provider/i-hui-chiang/1458854); the full list is in `listing-expansion-2026-11-batch2c.sql`.

Checked on dev after insert: all 8 English and `/zh/` pages return 200 with no `noindex` (a known non-indexable listing on the same site shows `noindex, nofollow`); English descriptions are 536 to 769 characters; no Simplified characters; duplicate check against production (slug, name, phone, Banner URL): no duplicate people. Phones are clinic lines, so some repeat: three share Banner MD Anderson's scheduling line (the copy says it is the scheduling line), and I-Hui Chiang and Wilber Su share the Heart Institute line with batch 2a's Rong Bai. Website scan: same as batch 2a (browser loads, Googlebot user agent gets 403 from a non-Google address).

To apply to production after approval: pre-check none of the 8 slugs exist; run `listing-expansion-2026-11-batch2c.sql`; post-check 8 rows and indexable +8 (72 → 80 if batch 2b is not applied first). Rollback: `listing-expansion-2026-11-batch2c-rollback.sql`.

## Batch 3a: north Valley physicians (issue #487)

The CEO asked for independent practices in the north Valley (Peoria, Glendale, north Phoenix, Surprise), where Taiwanese families are settling for TSMC. Names came from a lead list that collects insurer-directory language data (pp8188.com); that list is **not** used as evidence. Each listing below rests on the language stated on the practice's or employer's own provider page (CEO rule a), and the copy ends with which page and the check date. Address and phone come from that page; the federal NPI registry is the second source, and where they differ the provider page is used (CEO decision). No gendered pronouns; every street address is a medical office.

| Slug | City | Practice | Languages | Address/phone source | Sources |
|---|---|---|---|---|---|
| `jenny-ho-do-glendale` | Glendale | Bookmark Medical (family medicine, all ages) | English, Mandarin | Provider page (NPI shows a 2016 Olive Ave address; provider page used). Page said not accepting new patients; the copy says so | https://www.bookmarkmedical.com/providers/jenny-ho<br>NPI 1427315506 |
| `qi-zhang-md-glendale` | Glendale | Desert West OB/GYN | English, Mandarin | Main office address matches NPI; phone (602) 978-1500 from the practice site (NPI has 602-678-1500) | https://desertwestobgyn.com/providers/qi-zhang-md-facog<br>NPI 1285773887 |
| `jinmeng-zhang-md-peoria` | Peoria | U.S. Dermatology Partners (dermatology) | English, Mandarin | Provider page and NPI agree on address and phone | https://www.usdermatologypartners.com/provider/jinmeng-zhang-md/<br>NPI 1740694926 |
| `vicky-chen-yang-md-peoria` | Peoria | HonorHealth (primary care) | English, Mandarin | HonorHealth page and NPI agree | https://www.honorhealth.com/physicians/vicky-chen-yang<br>NPI 1033159207 |
| `lin-zhao-md-phoenix` | Phoenix (far north) | HonorHealth (family and preventive medicine) | English, Mandarin | HonorHealth page (NPI shows a Scottsdale office; HonorHealth used); zip left out because HonorHealth does not show one | https://www.honorhealth.com/physicians/lin-zhao<br>NPI 1629563622 |
| `alfredo-lim-md-phoenix` | Phoenix (north-central) | HonorHealth (internal medicine) | English, Cantonese | HonorHealth address; phone matches NPI; zip left out as above | https://www.honorhealth.com/physicians/alfredo-lim<br>NPI 1225002371 |
| `da-wei-liao-md-phoenix` | Phoenix (north) | Independent pulmonary and critical care office; HonorHealth medical staff | English, Mandarin | HonorHealth page shows no office address, so the address is from NPI (updated October 2025); phone matches both. Copy says so | https://www.honorhealth.com/physicians/da-wei-liao<br>NPI 1053379263 |

Checked on dev: all 7 English and `/zh/` pages return 200 with no `noindex`; copy matches the SQL by md5; duplicate check against production (slug, name, phone, provider site): none. Website scan: all four provider sites load for a browser and the Googlebot user agent; no spam, parking or redirects.

Not added from the same lead list, and why:

| Lead | Why not |
|---|---|
| Glendale, Peoria and Surprise dentists (Chu-Chi Wang, Henry Yu, Tzuyu Meng, Olivia Chow, Kevin Leong) and Frederick Lin (north Phoenix) | Language only from insurer directories; no practice site found that states it (Olivia Chow's NPI record is in San Diego) |
| Howard Tay, Lixian Zou, Hui John Zhao | HonorHealth states the language but shows no office address, and the NPI address is 2016-2022 or its phone differs |
| Bryant Kao (Anthem), Daniel Chang, Hong Cui, Eric Chen, Peter Young | Anthem is outside the site's city list; the others have language only from an insurer directory, or the NPI record points elsewhere |
| Keng-Yu Chuang (Glendale) | Practice site blocks automated reading (403) |

To apply to production after approval: pre-check none of the 7 slugs exist; run `listing-expansion-2026-11-batch3a.sql`; post-check 7 rows and indexable +7. Rollback: `listing-expansion-2026-11-batch3a-rollback.sql`.

## Corrections, batch 2c

`listing-expansion-2026-11-batch2c-corrections.sql` (applied to dev 2026-11-28; production waits for approval):

| Listing | Finding | Change |
|---|---|---|
| `az-hope-chinese-school-chandler` | The CEO saw the page say 簡體中文 while the tags showed 繁體中文. The school's own About page says "Our goal is to offer instruction in Chinese culture and simplified Chinese" (https://www.azhopechineseschool.org/school/page/about). The tag came from `Traditional Chinese` in `languages`. | Remove `Traditional Chinese` from `languages` and `Traditional Chinese` and 繁體 from `search_aliases`. Languages become English, Mandarin. The zh page now shows no 繁體中文 tag. |
| `alan-wang-md-phoenix` | Published in batch 2a with no phone (see above). | Add Banner's preferred phone, (833) 929-2418. |

The rollback file writes back the production values from 2026-11-28 (AZ Hope's three languages and eleven aliases; Alan Wang's empty phone).

## Chain listings to hide (applied 2026-11-28)

The CEO asked for a list of national and regional chain listings with no Chinese-language service, and SQL that takes them off the public site without deleting them. The CEO approved the list on 2026-11-28 and it was applied to dev, then production, the same day (see the status table).

How it hides them: `listing-expansion-2026-11-chains-suppress.sql` sets `status = 'suppressed'`, a value the `businesses_status_check` constraint already allows. The app only shows rows with status `live` or `stale` (the directory queries filter `.in('status', ['live','stale'])` and `isPublicDirectoryBusiness()` rejects any other status), so suppressed rows drop out of lists, search, the sitemap and their own page, but stay in the table. The update is guarded on `status = 'live'`. `listing-expansion-2026-11-chains-suppress-rollback.sql` sets the same 47 slugs back to `live`.

Checked on production (read-only, 2026-11-28): all 47 exist and are `live`; none is claimed by an owner, sponsored or featured; **none is indexable today**, so the indexable count stays at 72. Public rows would go from 266 to 219.

| Category | Count | Listings (slug) |
|---|---|---|
| dining | 19 | `carl-s-jr-peoria`, `denny-s-chandler`, `filiberto-s-mesa`, `firehouse-subs-mesa`, `jack-in-the-box-chandler`, `jack-in-the-box-mesa`, `krispy-kreme-mesa`, `little-caesars-mesa`, `little-caesars-peoria`, `los-favoritos-taco-shop-chandler`, `mcdonald-s-chandler`, `mcdonald-s-mesa`, `oregano-s-pizza-bistro-mesa`, `pizza-hut-express-mesa`, `salad-and-go-chandler`, `subway-chandler`, `subway-peoria`, `taco-bell-mesa`, `wendy-s-mesa` |
| shopping | 6 | `1-800-flowers-mesa`, `circle-k-chandler`, `circle-k-mesa`, `circle-k-tucson`, `fry-s-fuel-peoria`, `target-mesa` |
| medical | 10 | `banner-urgent-care-peoria`, `cvs-pharmacy-chandler`, `cvs-pharmacy-mesa`, `cvs-pharmacy-peoria`, `discover-vein-and-vascular-chandler`, `miracle-ear-chandler`, `simon-med-mesa`, `walgreens-chandler`, `walgreens-chandler-2`, `walgreens-tucson` |
| legal-finance | 6 | `arizona-central-credit-union-chandler`, `bmo-chandler`, `global-credit-union-peoria`, `h-and-r-block-peoria`, `loanmax-mesa`, `midfirst-bank-peoria` |
| home-services | 2 | `ace-hardware-peoria`, `discount-tire-mesa` |
| local-services | 2 | `fedex-office-chandler`, `the-ups-store-chandler` |
| beauty-wellness | 1 | `sola-salons-chandler` |
| education | 1 | `usa-tae-kwon-do-chandler` |

Kept on purpose:

- Asian supermarkets and Asian or Chinese-owned chains: 99 Ranch, H Mart, Lee Lee, Mekong Supermarket, 85°C, Paris Baguette, Meet Fresh, Haidilao, Kura Sushi, MINISO, Daiso, Teso Life, Kinokuniya and similar.
- `panda-express-peoria` was first left out for a CEO call (its parent, Panda Restaurant Group, is led by co-founders Andrew and Peggy Cherng). **CEO decision 2026-11-28: suppress it too** — it is a national chain with no Chinese-language service on record, and it was the first listing a Taiwanese family saw on the Peoria dining page. `listing-expansion-2026-11-panda-express-suppress.sql` (guarded on `status = 'live'`, with rollback) covers every Panda Express row; on 2026-11-28 that was only the Peoria one. Singing Pandas Asian Restaurant & Bar (Chandler) is an independent restaurant and stays.
- Single-location plaza shops that are not chains (Claw Zone, Diamond National, Name Brand Exchange, Racing Collectibles).
- The two associations and the student club listed earlier (not chains; CEO: keep as they are).
- The three unverified listings (Beijing Acupuncture, Hi-Tech Dentistry, YJP Spine Center) stay until Derek checks them in person.
- The first line of `listing-expansion-2026-11-chains-suppress.sql` still says "PREPARED, NOT APPLIED"; it was left as approved and applied unchanged.

## Follow-ups

1. ~~Decide whether insurer provider directories count.~~ Decided 2026-11-27/28: employer and insurer directories count with a second source; NPI registry counts for address; employer directory counts for address and phone.
2. Add a "Chinese (dialect not stated)" option, or ask the two owners above to pick a dialect, so the language filter can find them. (Done on the data side: the CEO decided `{English, Chinese}`.)
3. Owner-run home services, auto, tutoring, movers and travel agencies: parked by the CEO. A list of real but unverifiable ones went to Derek privately.
4. eXp Realty and several brokerages block automated page fetches. A human check of those agents' pages would add more Mandarin-speaking realtors.
5. Other health systems' directories (Dignity, HonorHealth, Mayo) block automated fetches or need JavaScript, so physicians from those systems still need a human lookup.
