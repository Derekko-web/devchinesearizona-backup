import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RUNTIME_DATA_ROOT,
  arizonaRadarStorePath,
} from '../../../ops/closed-loop/runtime-paths.mjs';

describe('closed-loop runtime paths', () => {
  it('reads the Arizona radar store from the runtime data root, not the Git checkout', () => {
    expect(DEFAULT_RUNTIME_DATA_ROOT).toBe('/var/www/runtime-data/dev.chinesearizona.com/web');
    expect(arizonaRadarStorePath({})).toBe(
      '/var/www/runtime-data/dev.chinesearizona.com/web/data/radar-runtime/store.json'
    );
  });

  it('follows CHINESEARIZONA_RUNTIME_DATA_ROOT like the radar worker does', () => {
    expect(
      arizonaRadarStorePath({ CHINESEARIZONA_RUNTIME_DATA_ROOT: '/srv/runtime-data/web' })
    ).toBe('/srv/runtime-data/web/data/radar-runtime/store.json');
  });

  it('lets CLOSED_LOOP_RADAR_STORE_PATH override the store location', () => {
    expect(
      arizonaRadarStorePath({
        CHINESEARIZONA_RUNTIME_DATA_ROOT: '/srv/runtime-data/web',
        CLOSED_LOOP_RADAR_STORE_PATH: '/tmp/radar/store.json',
      })
    ).toBe('/tmp/radar/store.json');
  });
});
