import { resolve } from 'node:path';

// Mutable runtime data lives outside the Git checkout on the dev VPS so
// deploys can require a clean /var/www tree. Keep this default in sync with
// ops/radar-hermes-egress/apply-runtime-deploy.sh and deploy-dev.yml.
export const DEFAULT_RUNTIME_DATA_ROOT = '/var/www/runtime-data/dev.chinesearizona.com/web';

// The Arizona radar worker writes its store under the runtime data root, so
// freshness must be read there. The copy inside the app checkout is a legacy
// path that nothing updates any more.
export function arizonaRadarStorePath(env = process.env) {
  if (env.CLOSED_LOOP_RADAR_STORE_PATH) {
    return env.CLOSED_LOOP_RADAR_STORE_PATH;
  }

  return resolve(
    env.CHINESEARIZONA_RUNTIME_DATA_ROOT || DEFAULT_RUNTIME_DATA_ROOT,
    'data/radar-runtime/store.json'
  );
}
