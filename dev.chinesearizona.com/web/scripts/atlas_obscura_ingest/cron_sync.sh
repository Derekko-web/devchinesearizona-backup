#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="/var/www/dev.chinesearizona.com/web"
LOG_DIR="$PROJECT_ROOT/data/atlas-obscura-staging"
LOG_FILE="$LOG_DIR/cron-sync.log"
ANCHOR_UTC="2026-04-20 04:00:00 UTC"

mkdir -p "$LOG_DIR"

anchor_epoch="$(date -u -d "$ANCHOR_UTC" +%s)"
now_epoch="$(date -u +%s)"

if (( now_epoch < anchor_epoch )); then
  exit 0
fi

days_since_anchor="$(( (now_epoch - anchor_epoch) / 86400 ))"
if (( days_since_anchor % 7 != 0 )); then
  exit 0
fi

cd "$PROJECT_ROOT"

{
  echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Starting weekly Atlas Obscura Arizona sync."
  /usr/bin/npm run atlas:sync
  echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Finished weekly Atlas Obscura Arizona sync."
} >>"$LOG_FILE" 2>&1
