# Chinese Arizona Web Application

Maintained by **Derek Ko**.

The web application for a bilingual community directory and multi-city content
platform. It includes business listings and claims, account flows, moderation,
advertising features, and automated directory and article ingestion.
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

## Build dependencies

Fonts are bundled from Fontsource, including the Traditional Chinese subsets;
the production build does not fetch Google Fonts.

The Next ESLint plugin uses a scoped `tinyglobby` alias for directory discovery
to avoid the unpatched `braces` dependency. Its root-directory behavior is covered
by `tests/next-eslint-root-dirs.test.ts`. React Hooks linting remains pinned to
7.0.1 to preserve the existing rule set during the security update. Revisit these
overrides when upgrading the lint configuration.

## Business leads (inquiries and click counts)

Listings in real estate, legal and finance (including insurance), medical
(including dental), education, and home services show a short "Ask a question /
Request a quote / 詢價" form. Every main-site listing counts Call, Website, and
Directions clicks, once per visitor per button per day. Owners see their monthly
counts in `/dashboard`; staff see counts per listing and recent inquiries in
`/admin`. Tables: `business_inquiries` and `business_contact_clicks`
(`supabase/migrations/20261125_setup_business_leads.sql`).

Inquiries are saved even when email is off. To email each one to the listing
owner (or to the admin while the listing is unclaimed), set these in the
server's `.env.local`:

- `RESEND_API_KEY`: a Resend API key with a verified sending domain.
- `EMAIL_FROM`: the sender, for example `ChineseArizona <leads@chinesearizona.com>`.
- `ADMIN_NOTIFICATION_EMAIL`: where leads for unclaimed listings go.

Leads are free. Never bill per inquiry or per closed deal: for real estate and
mortgage that is required by RESPA section 8, so sponsors there pay flat
advertising fees only.

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
  PRs and upload Actions artifacts. The `Dev Content Jobs` workflow runs by
  hand only; its daily run was retired because live listings come from the
  database, not from the scrape output.
- `dev-runtime`: restrict deployment branches to `main` or protected branches
  only. Keep runtime-operator secrets such as
  `DEV_VPS_RUNTIME_EGRESS_USER` and `DEV_VPS_RUNTIME_EGRESS_SSH_KEY` here.
- `production`: the one environment with a required reviewer (Derek), so
  every production deploy waits for a click. Turn off "Prevent self-review" so
  the person who starts a run can approve it. Restrict deployment branches to
  `main`. Keep `PROD_VPS_HOST`, `PROD_VPS_PORT`, `PROD_VPS_USER`,
  `PROD_VPS_SSH_KEY` and `PROD_VPS_SSH_KNOWN_HOSTS` here, not in `dev`.

## Production deploys (chinesearizona.com)

Production deploys run only through the manual `Deploy Prod` workflow
(`.github/workflows/deploy-prod.yml`). It runs
`ops/deploy-prod/deploy-prod.sh` on the VPS. Nobody edits `/var/www` by hand.

**Deploy.** In GitHub, open Actions > Deploy Prod > Run workflow and leave
`action=deploy`. Leave `sha` empty to ship the commit dev is running now, then
approve the run in the `production` environment. The run:

1. refuses any SHA that is not on `main`, has no successful Dev CI run, or has
   not shipped to dev through Deploy Dev;
2. runs `npm run verify` on that SHA;
3. builds it in `/var/www/chinesearizona.com/releases/<sha>/` while the live
   site keeps serving. It waits for the VPS build lock that Deploy Dev also
   takes, so two builds never run at once;
4. points `current` at the new release, restarts `main-chinesearizona`, waits
   for `/api/health` to report the new SHA, and runs `smoke:dev` against
   `https://chinesearizona.com`;
5. if a check fails, points `current` back at the release that was live and
   restarts again.

**Roll back.** Run Deploy Prod with `action=rollback`. With `sha` empty it
switches to the previous release. Nothing is rebuilt, so the switch takes
seconds. Run it again to go forward again. To pick an older release, pass a
SHA that is still in `releases/`. The last 3 releases are kept, plus whatever
`current` and `previous` point at.

**Layout on the VPS** (`/var/www/chinesearizona.com`):

- `releases/<sha>/`: a built copy of `dev.chinesearizona.com/web`, extracted
  with `git archive` from the `/var/www` repository. Dev's working tree is never
  checked out or changed.
- `releases/legacy-20260517`: a link to `app/`, the hand-copied app that ran
  before this pipeline. The first deploy creates it and leaves `app/` in place
  as the first rollback target.
- `shared/.env.local`: the production env (Supabase production project, Stripe
  keys), linked into every release. The first deploy copies it from
  `app/.env.local`.
- `shared/main-ecosystem.config.cjs`: the pm2 config from the live release
  (tracked as `chinesearizona.com/main-ecosystem.config.cjs`). It leaves
  `RADAR_STORAGE_MODE` unset, so Arizona news keeps coming from Supabase.
- `current`, `previous`: links to the live release and the rollback target.
- Runtime data lives in `/var/www/runtime-data/chinesearizona.com/web`. It is
  seeded from repo fixtures only when a file is missing and is never copied from
  dev.

**Logs.** Each run's output is in the Deploy Prod run in GitHub Actions. App
logs are in `~/.pm2/logs/main-chinesearizona-*.log` on the VPS.
