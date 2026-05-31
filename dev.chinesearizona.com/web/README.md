This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Arizona Radar Freshness

`/arizona-news` reads published Arizona Radar items from Supabase when service credentials are configured, with `data/radar-runtime/store.json` as the local mirror/fallback. The normal refresh path is `scripts/arizona_radar/cron_sync.sh`, which loads `dev.chinesearizona.com/web/.env.local` on the host and runs:

```bash
node scripts/arizona_radar/run.cjs run
```

The worker combines two source paths:

- configured RSS feeds from `src/data/radar-source-manifest.json` `feedUrl` entries, scanned across all unpaused sources
- Hermes-generated drafts from the rotating source batch

The RSS path is intentionally summary/link-only and avoids republishing source article text. To verify freshness after deploy, run the cron wrapper or wait for the host schedule, then check that `data/radar-runtime/store.json` has a recent run and that `/arizona-news` shows a new published radar item.

## Runtime generated data

Tracked generated JSON files are repository fixtures. The dev VPS must keep mutable runtime/generated copies outside the Git checkout, under `/var/www/runtime-data/dev.chinesearizona.com/web`, so deploys can continue to require a clean `/var/www` working tree.

Deploy Dev migrates only these known generated files out of the checkout before deployment:

- `data/sites/austin/radar-runtime/store.json`
- `data/sites/los-angeles/radar-runtime/store.json`
- `data/sf-bay-radar-runtime/store.json`
- `src/data/generated-local-articles.json`

The PM2 process receives the corresponding external paths through `RADAR_STORE_PATH_AUSTIN`, `RADAR_STORE_PATH_LOS_ANGELES`, `SF_BAY_RADAR_STORE_PATH`, and `GENERATED_LOCAL_ARTICLES_PATH`. Host cron jobs that generate these files should use the same environment variables instead of writing into `/var/www/dev.chinesearizona.com/web`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
