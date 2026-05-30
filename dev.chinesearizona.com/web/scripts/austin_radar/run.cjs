#!/usr/bin/env node

const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

process.env.RADAR_CITY_KEY = process.env.RADAR_CITY_KEY || 'austin';
process.env.RADAR_BRAND_NAME = process.env.RADAR_BRAND_NAME || 'ChineseAustin';
process.env.RADAR_REGION_NAME = process.env.RADAR_REGION_NAME || 'Austin';
process.env.RADAR_REGION_NAME_ZH = process.env.RADAR_REGION_NAME_ZH || '奥斯汀';
process.env.RADAR_REGION_PLACES =
  process.env.RADAR_REGION_PLACES ||
  'Austin, Round Rock, Cedar Park, Pflugerville, Georgetown, Leander, Travis County, Williamson County, Central Texas';
process.env.RADAR_SOURCE_MANIFEST_PATH =
  process.env.RADAR_SOURCE_MANIFEST_PATH ||
  path.join(ROOT, 'src', 'data', 'austin-radar-source-manifest.json');
process.env.RADAR_STORE_PATH =
  process.env.AUSTIN_RADAR_STORE_PATH ||
  process.env.RADAR_STORE_PATH ||
  path.join(ROOT, 'data', 'sites', 'austin', 'radar-runtime', 'store.json');
process.env.RADAR_STORAGE_MODE = process.env.AUSTIN_RADAR_STORAGE_MODE || 'file';
process.env.RADAR_SUMMARY_ONLY = process.env.RADAR_SUMMARY_ONLY || '1';

require('../arizona_radar/run.cjs').runCli();
