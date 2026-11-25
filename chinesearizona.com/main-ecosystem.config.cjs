// pm2 config for chinesearizona.com (production).
//
// Deploy Prod (.github/workflows/deploy-prod.yml, ops/deploy-prod/deploy-prod.sh)
// copies this file from the deployed SHA to shared/main-ecosystem.config.cjs
// and starts pm2 from that copy. This tracked file also sits inside dev's
// /var/www checkout and changes on every dev deploy, so never start pm2 from it
// directly.
const prodRoot = '/var/www/chinesearizona.com';
const runtimeDataRoot =
  process.env.CHINESEARIZONA_RUNTIME_DATA_ROOT || '/var/www/runtime-data/chinesearizona.com/web';

const deploymentId =
  process.env.NEXT_DEPLOYMENT_ID ||
  process.env.NEXT_PUBLIC_GIT_SHA ||
  process.env.GIT_SHA ||
  process.env.NEXT_PUBLIC_BUILD_TIME ||
  process.env.BUILD_TIME;

module.exports = {
  apps: [
    {
      name: 'main-chinesearizona',
      // `current` is a symlink to the live release folder.
      cwd: `${prodRoot}/current`,
      script: 'node_modules/next/dist/bin/next',
      args: 'start --hostname 127.0.0.1 --port 3001',
      interpreter: 'node',
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      min_uptime: '30s',
      max_restarts: 10,
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      // RADAR_STORAGE_MODE stays unset so Arizona news keeps coming from the
      // production Supabase project.
      env: {
        NODE_ENV: 'production',
        HOSTNAME: '127.0.0.1',
        PORT: '3001',
        BUILD_TIME: process.env.BUILD_TIME || 'unknown',
        GIT_SHA: process.env.GIT_SHA || 'unknown',
        NEXT_PUBLIC_BUILD_TIME: process.env.NEXT_PUBLIC_BUILD_TIME || process.env.BUILD_TIME || 'unknown',
        NEXT_PUBLIC_GIT_SHA: process.env.NEXT_PUBLIC_GIT_SHA || process.env.GIT_SHA || 'unknown',
        ...(deploymentId && deploymentId !== 'unknown' ? { NEXT_DEPLOYMENT_ID: deploymentId } : {}),
        CHINESEARIZONA_RUNTIME_DATA_ROOT: runtimeDataRoot,
        RADAR_STORE_PATH_AUSTIN: `${runtimeDataRoot}/data/sites/austin/radar-runtime/store.json`,
        RADAR_STORE_PATH_LOS_ANGELES: `${runtimeDataRoot}/data/sites/los-angeles/radar-runtime/store.json`,
        SF_BAY_RADAR_STORE_PATH: `${runtimeDataRoot}/data/sf-bay-radar-runtime/store.json`,
        ARTICLE_EN_TRANSLATION_CACHE_PATH: `${runtimeDataRoot}/data/article-ingest-staging/english-translation-cache.json`,
        ARTICLE_ZH_TRANSLATION_CACHE_PATH: `${runtimeDataRoot}/data/article-ingest-staging/chinese-translation-cache.json`,
        GENERATED_LOCAL_ARTICLES_PATH: `${runtimeDataRoot}/src/data/generated-local-articles.json`,
      },
    },
  ],
};
