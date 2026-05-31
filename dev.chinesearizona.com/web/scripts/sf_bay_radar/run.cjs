#!/usr/bin/env node

const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_VPS_RUNTIME_ROOT = '/var/www/runtime-data/dev.chinesearizona.com/web';

function resolveDefaultRuntimePath(relativePath) {
  if (process.env.CHINESEARIZONA_RUNTIME_DATA_ROOT) {
    return path.join(process.env.CHINESEARIZONA_RUNTIME_DATA_ROOT, relativePath);
  }

  if (ROOT === '/var/www/dev.chinesearizona.com/web') {
    return path.join(DEFAULT_VPS_RUNTIME_ROOT, relativePath);
  }

  return path.join(ROOT, relativePath);
}

process.env.RADAR_CITY_KEY = process.env.RADAR_CITY_KEY || 'sf-bay';
process.env.RADAR_BRAND_NAME = process.env.RADAR_BRAND_NAME || 'ChineseSFBay';
process.env.RADAR_REGION_NAME = process.env.RADAR_REGION_NAME || 'San Francisco Bay Area';
process.env.RADAR_REGION_NAME_ZH = process.env.RADAR_REGION_NAME_ZH || '灣區';
process.env.RADAR_REGION_PLACES =
  process.env.RADAR_REGION_PLACES ||
  'San Francisco, Oakland, Berkeley, San Jose, Santa Clara, Sunnyvale, Cupertino, Fremont, Milpitas, Daly City, the Peninsula, South Bay, East Bay, North Bay, or another San Francisco Bay Area place';
process.env.RADAR_SOURCE_MANIFEST_PATH =
  process.env.RADAR_SOURCE_MANIFEST_PATH ||
  path.join(ROOT, 'src', 'data', 'sf-bay-radar-source-manifest.json');
process.env.RADAR_STORE_PATH =
  process.env.SF_BAY_RADAR_STORE_PATH ||
  process.env.RADAR_STORE_PATH ||
  resolveDefaultRuntimePath(path.join('data', 'sf-bay-radar-runtime', 'store.json'));
process.env.RADAR_STORAGE_MODE = process.env.SF_BAY_RADAR_STORAGE_MODE || 'file';
process.env.RADAR_SUMMARY_ONLY = process.env.RADAR_SUMMARY_ONLY || '1';

require('../arizona_radar/run.cjs').runCli();
