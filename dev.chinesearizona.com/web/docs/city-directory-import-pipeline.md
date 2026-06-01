# City Directory Import Pipeline

This pipeline stages real city-specific directory candidates for review before
anything can become live. It is intended for city sites such as ChineseAustin,
ChineseLosAngeles, and ChineseSFBay, and it can be rerun as new local sources
are added.

## Source Policy

- Fetch only editor-configured public URLs in `data/city-directory-source-manifest.json`.
- Do not scrape protected pages, login-only pages, search-result pages, or sites whose terms prohibit collection.
- Do not invent phone numbers, websites, addresses, emails, or organization details.
- Do not use Arizona or another city as fallback data for a selected city.
- Do not commit runtime staging data unless it is intentional review evidence.

## Supported Source Categories

The manifest supports these community resource types and maps them to existing
directory category slugs:

- `restaurants` -> `dining`
- `grocery_markets` -> `shopping`
- `real_estate` -> `real-estate`
- `legal_accounting_insurance` -> `legal-finance`
- `healthcare` -> `medical`
- `beauty_wellness` -> `beauty-wellness`
- `education_language_schools` -> `education`
- `chinese_churches_religious_groups` -> `faith-community`
- `cultural_community_organizations` -> `local-services`
- `ping_pong_table_tennis` -> `local-services`
- `events_venues` -> `local-services`
- `service_providers` -> `local-services`

## Add Sources For A City

Edit `data/city-directory-source-manifest.json` and add sources under exactly
one site key. Each source must use a city in that site's `allowedCities` list.

Required source fields:

- `id`: stable unique id for the source.
- `url`: public source URL.
- `sourceCategory`: one of the supported source categories.
- `city`: city inside the selected site's allowed city list.

Recommended source fields:

- `nameHint`: name from the official/public source.
- `serviceAreaText`: use only when the source is service-area based.
- `notes`: short source note for reviewers.

If a fetched page exposes structured address data, that address locality is
treated as authoritative. A source row configured for Austin will still be
blocked if the page itself says the business is in Dallas, Phoenix, or any
other city outside the selected site's `allowedCities` list.

## Run Discovery

From `dev.chinesearizona.com/web`:

```bash
npm run city-directory:discover -- --site=austin
npm run city-directory:discover -- --site=los-angeles
npm run city-directory:discover -- --site=sf-bay
```

Discovery writes:

- `data/sites/<site>/directory-import-staging/discovered_candidates.jsonl`
- `data/sites/<site>/directory-import-staging/review_queue.jsonl`

The queue includes source URLs, source ids, source category, mapped directory
category, name, city, address or service area when available, phone, website,
confidence notes, duplicate keys, and review status.

## Review

Open `review_queue.jsonl` and inspect each record.

Review statuses:

- `needs_review`: candidate has enough source evidence for manual review.
- `needs_review_low_confidence`: missing contact/location evidence or otherwise weak.
- `existing_duplicate`: matches the selected city's current live JSON.
- `blocked_city_mismatch`: source/page points outside the selected city/state.
- `approved`: reviewer approved this candidate for export.
- `rejected`: reviewer rejected this candidate.

Only set `reviewStatus` to `approved` after confirming the source is public,
city-specific, and accurate. Leave low-confidence candidates out of live data
until enough evidence is available.

## Export Approved Candidates

Approved export does not update live directory JSON. It writes a staging JSON
file for review:

```bash
npm run city-directory:export-approved -- --site=austin
```

Default output:

```text
data/sites/<site>/directory-import-staging/approved-businesses.json
```

The exporter includes only candidates where:

- `reviewStatus` is `approved`.
- `confidenceScore` is at least `70` by default.
- The candidate does not match an existing live listing.

Use `--min-confidence=80` for stricter export.

## Promote Approved Candidates

Promotion appends approved candidates to the configured static listing file and
requires an explicit flag:

```bash
npm run city-directory:run -- --site=austin
npm run city-directory:export-approved -- --site=austin
npm run city-directory:promote-approved -- --site=austin --write-live
```

Review the diff before committing. Do not promote directly on the VPS and do
not deploy manually.

## Rerun Behavior

Reruns are safe:

- Sources are deduped by website, phone, and name/city.
- Existing live listings are marked `existing_duplicate`.
- Prior `approved` or `rejected` decisions are preserved.
- Existing staging rows are refreshed instead of duplicated.
- Missing city configs fail closed instead of falling back to Arizona.

## Tests

Run the pipeline tests:

```bash
npm run city-directory:test
```

Run the full project verification before opening a PR:

```bash
npm run verify
```
