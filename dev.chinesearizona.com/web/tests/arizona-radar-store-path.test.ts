import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { arizonaRadarStorePath } from '../../../ops/closed-loop/runtime-paths.mjs';
import { getRadarStorePath } from '@/lib/radar';
import { defaultSiteProfile } from '@/lib/site-config';

const envKeys = ['CHINESEARIZONA_RUNTIME_DATA_ROOT', 'RADAR_STORE_PATH', 'RADAR_STORE_PATH_ARIZONA'] as const;
const originalEnv: Partial<Record<(typeof envKeys)[number], string>> = {};

beforeEach(() => {
  for (const key of envKeys) {
    originalEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
});

describe('Arizona radar store path', () => {
  it('uses the radar worker store under the runtime data root, not the local articles file', () => {
    const runtimeRoot = path.join(process.cwd(), 'tmp-runtime-root');
    process.env.CHINESEARIZONA_RUNTIME_DATA_ROOT = runtimeRoot;

    const storePath = getRadarStorePath(defaultSiteProfile);

    expect(storePath).toBe(path.join(runtimeRoot, 'data', 'radar-runtime', 'store.json'));
    // Same file the closed-loop monitor checks for freshness.
    expect(storePath).toBe(
      arizonaRadarStorePath({ CHINESEARIZONA_RUNTIME_DATA_ROOT: runtimeRoot } as unknown as NodeJS.ProcessEnv)
    );
    expect(storePath).not.toContain('generated-local-articles');
  });

  it('falls back to the checkout store when no runtime data root is set', () => {
    expect(getRadarStorePath(defaultSiteProfile)).toBe(
      path.join(process.cwd(), 'data', 'radar-runtime', 'store.json')
    );
  });

  it('still honours explicit store path overrides', () => {
    process.env.CHINESEARIZONA_RUNTIME_DATA_ROOT = '/srv/runtime';
    process.env.RADAR_STORE_PATH = '/srv/custom/store.json';
    expect(getRadarStorePath(defaultSiteProfile)).toBe('/srv/custom/store.json');

    process.env.RADAR_STORE_PATH_ARIZONA = '/srv/arizona/store.json';
    expect(getRadarStorePath(defaultSiteProfile)).toBe('/srv/arizona/store.json');
  });
});
