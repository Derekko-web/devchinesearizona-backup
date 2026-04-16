#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="/var/www/dev.chinesearizona.com/web"
LOG_DIR="$PROJECT_ROOT/data/article-ingest-staging"
LOG_FILE="$LOG_DIR/cron-sync.log"
ANCHOR_UTC="2026-04-20 03:17:00 UTC"

mkdir -p "$LOG_DIR"

anchor_epoch="$(date -u -d "$ANCHOR_UTC" +%s)"
now_epoch="$(date -u +%s)"

if (( now_epoch < anchor_epoch )); then
  exit 0
fi

days_since_anchor="$(( (now_epoch - anchor_epoch) / 86400 ))"
if (( days_since_anchor % 14 != 0 )); then
  exit 0
fi

cd "$PROJECT_ROOT"

{
  echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Starting biweekly Sunbird article sync."
  /usr/bin/npm run scrape:articles:sunbird
  echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Finished biweekly Sunbird article sync."
} >>"$LOG_FILE" 2>&1
