# Listing expansion, November 2026 (issue #456)

New listings for Chinese-speaking professionals in metro Phoenix: insurance agents, CPAs, realtors, financial advisers, a dentist and an immigration lawyer. The goal was 60. **14 met the bar and are added in this batch.** The rest of the candidates found could not be verified from a first-party source (see "Considered and skipped").

Status on 2026-11-27:

| Where | State |
|---|---|
| Dev Supabase (`rddmdbcrputlsfurqkac`) | 14 rows inserted, pages checked on dev.chinesearizona.com |
| Production (`pxgapnyrrwaiacgcmtks`) | **Not applied.** SQL ready in `listing-expansion-2026-11.sql`; the CEO applies it after spot-checks |

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

## Rollback

`listing-expansion-2026-11-rollback.sql` deletes the 14 slugs, skipping any row an owner has claimed since (`owner_profile_id is null`). These are new rows, so there are no previous values to restore.

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

Systematic scans that found few or no new names: all State Farm agent pages in the eight cities (220 agents, 2 Chinese speakers, both added), Farmers (169 agents, none), American Family (90 agents, none), Merrill office rosters (83 advisers, 3 added).

Names and leads that were not verified are kept in the company's private listings folder, not in this repo.

## Follow-ups

1. Decide whether insurer provider directories (Delta Dental, BCBS Arizona, Humana and similar) count as an official source for language. If yes, about 40 more dentists and physicians in the eight cities could be added quickly; many are independent practices.
2. Add a "Chinese (dialect not stated)" option, or ask the two owners above to pick a dialect, so the language filter can find them.
3. Next batch: owner-run home services, auto, tutoring, movers and travel agencies. These rarely state languages on a website; they need a different source (owner sign-ups, community referrals).
4. eXp Realty and several brokerages block automated page fetches. A human check of those agents' pages would add more Mandarin-speaking realtors.
