#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="/var/www/dev.chinesearizona.com/web"
LOG_DIR="$PROJECT_ROOT/data/article-ingest-staging"
LOG_FILE="$LOG_DIR/cron-sync.log"

mkdir -p "$LOG_DIR"

cd "$PROJECT_ROOT"

{
  echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Starting weekly Sunbird article sync."
  /usr/bin/npm run scrape:articles:sunbird
  echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Finished weekly Sunbird article sync."
} >>"$LOG_FILE" 2>&1
