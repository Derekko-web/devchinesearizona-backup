# Chinese Arizona Web Application

Maintained by **Derek Ko**.

The web application for a bilingual community directory and multi-city content
platform. It includes business listings and claims, account flows, moderation,
shop and advertising features, and automated directory and article ingestion.
The interface uses Next.js and React; background ingestion tools use Node.js
and Python.

## Local development

```sh
npm ci
npm run dev
```

Configure the environment values required by the features you want to run.
See the deployment and data-pipeline documentation below for runtime details.

## Verification

```sh
npm run verify
```

This runs linting, tests with coverage, and the production build. Browser checks
run separately with `npm run e2e`.

## Arizona Radar Freshness

`/news` reads published Arizona Radar items from Supabase when service credentials are configured, with `data/radar-runtime/store.json` as the local mirror/fallback. The normal refresh path is `scripts/arizona_radar/cron_sync.sh`, which loads `dev.chinesearizona.com/web/.env.local` on the host and runs:

```bash
node scripts/arizona_radar/run.cjs run
```

The worker combines two source paths:

- configured RSS feeds from `src/data/radar-source-manifest.json` `feedUrl` entries, scanned across all unpaused sources
- Hermes-generated drafts from the rotating source batch

The RSS path is intentionally summary/link-only and avoids republishing source article text. To verify freshness after deploy, run the cron wrapper or wait for the host schedule, then check that `data/radar-runtime/store.json` has a recent run and that `/news` shows a new published radar item.

The production city radar jobs are scheduled through the protected `radar-hermes-worker@CITY.timer` systemd units installed by `ops/radar-hermes-egress/apply-runtime-deploy.sh`. The current weekly schedule is Arizona Monday 00:17 UTC, Austin Tuesday 01:23 UTC, Los Angeles Wednesday 02:29 UTC, and SF Bay Thursday 03:35 UTC.

## Runtime generated data

Tracked generated JSON files are repository fixtures. The dev VPS must keep mutable runtime/generated copies outside the Git checkout, under `/var/www/runtime-data/dev.chinesearizona.com/web`, so deploys can continue to require a clean `/var/www` working tree.

Deploy Dev migrates only these known generated files out of the checkout before deployment:

- `data/sites/austin/radar-runtime/store.json`
- `data/sites/los-angeles/radar-runtime/store.json`
- `data/sf-bay-radar-runtime/store.json`
- `data/article-ingest-staging/english-translation-cache.json`
- `data/article-ingest-staging/chinese-translation-cache.json`
- `src/data/generated-local-articles.json`

The PM2 process receives the corresponding external paths through `RADAR_STORE_PATH_AUSTIN`, `RADAR_STORE_PATH_LOS_ANGELES`, `SF_BAY_RADAR_STORE_PATH`, `ARTICLE_EN_TRANSLATION_CACHE_PATH`, `ARTICLE_ZH_TRANSLATION_CACHE_PATH`, and `GENERATED_LOCAL_ARTICLES_PATH`. Host cron jobs that generate these files should use the same environment variables instead of writing into `/var/www/dev.chinesearizona.com/web`.

## GitHub CI/CD settings

The `Dev CI` workflow exposes one stable required status check: `ci-required`.
Branch protection for `main` should require `ci-required` and should not require
older per-job checks such as `verify`, `playwright-e2e`, `Dev E2E`, or
path-scoped dependency jobs that may not run on every pull request.

Use GitHub Environments without required reviewers so the solo-project deploy
loop stays unattended:

- `dev`: restrict deployment branches to `main` or protected branches only. Keep
  the VPS deploy secrets here.
- `dev-content`: restrict deployment branches to `main` or protected branches
  only. Do not store VPS SSH deploy secrets here; content jobs should only open
  PRs and upload Actions artifacts.
- `dev-runtime`: restrict deployment branches to `main` or protected branches
  only. Keep runtime-operator secrets such as
  `DEV_VPS_RUNTIME_EGRESS_USER` and `DEV_VPS_RUNTIME_EGRESS_SSH_KEY` here.
