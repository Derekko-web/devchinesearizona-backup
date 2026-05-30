# Adding a City Domain Safely

This app is being platformized so city domains can share code, layouts, workflows, CI, and monitoring. City-specific content must not be shared by default.

## Non-Negotiables

- Do not copy ChineseArizona business listings, articles, generated data, SEO copy, or community resources into another city config.
- Do not point a new city at Arizona Radar, Arizona article JSON, Arizona directory JSON, or Arizona Supabase rows as a launch shortcut.
- Do not deploy manually or edit `/var/www` live trees directly from a feature branch.
- Keep a new city in `launchState: 'placeholder'` until all city-specific sources are connected and reviewed.

## City Config Checklist

Add or update a profile in `src/lib/site-config.ts` with:

- `domains`: apex and `www` hostnames for the city.
- `cityName`, `stateRegion`, `stateCode`, `countryCode`.
- `brandName`, `brandNameZh`, `brandParts`, and supported locales.
- `home`: city-specific homepage copy and visual assets. Placeholder configs should use neutral placeholder assets, not copied Arizona cards.
- `directory`: city-specific category slugs, launch cities, localized city labels, and a `listingSource`.
- `news`: city-specific route/source settings, generated article data path, and source manifest path.
- `seo`: launch-specific title, description, and canonical base URL.
- `publisher`: city-specific contact email and legal-page update label.
- `runtime`: intended VPS root, data, and log paths.

For a placeholder profile, set source states to `required` and set both `allowDefaultFallback` flags to `false`.

## Required Data Before Launch

A city can become `launchState: 'live'` only after it has its own:

- Business listing source file, database scope, or scraper export.
- Directory source documentation explaining where listings came from.
- News/source manifest with city-specific feeds, scraper settings, and moderation rules.
- Generated article data produced from those city-specific sources.
- Homepage, about, contact, privacy, terms, and editorial copy reviewed for that city.
- Runtime data and log paths under that city domain.

## Tests To Add

Every city PR should extend tests so CI catches accidental fallback:

- Host resolution maps the city domain to the intended city key.
- Placeholder or incomplete city configs return `hasLiveDirectoryData(site) === false` and `hasLiveNewsData(site) === false`.
- Directory metadata for incomplete cities is `noindex` and says local data is required.
- Homepage rendering for incomplete cities does not include Arizona business slugs, Arizona image paths, or `/arizona-news/` links.
- News/Radar views for incomplete cities render the missing-source state and do not include Arizona article slugs or source names.

## Activation Steps

1. Add the city config as `placeholder`.
2. Add city-specific source files or database scoping.
3. Add tests proving no Arizona fallback.
4. Run `npm run verify` from `dev.chinesearizona.com/web`.
5. Open a PR to `main`.
6. After review and merge, use the normal CI/deploy path. Do not manually copy files into `/var/www`.

## Current Example

`ChineseAustin` is intentionally included as a placeholder example. It demonstrates the config shape and source requirements, but it is not launch-ready and must not serve Arizona listings or Arizona News.
