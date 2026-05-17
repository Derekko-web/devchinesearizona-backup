#!/usr/bin/env bash
set -euo pipefail

export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
mkdir -p "$ROOT_DIR/data/radar-runtime"

set -a
if [[ -f "$ROOT_DIR/.env.local" ]]; then
  . "$ROOT_DIR/.env.local"
fi
set +a

args=(
  "--max-items=${RADAR_MAX_ITEMS:-10}"
  "--draft-multiplier=${RADAR_DRAFT_MULTIPLIER:-1}"
  "--hermes-timeout-ms=${RADAR_HERMES_TIMEOUT_MS:-240000}"
  "--lookback-hours=${RADAR_LOOKBACK_HOURS:-168}"
  "--source-batch-size=${RADAR_SOURCE_BATCH_SIZE:-0}"
)

if [[ $# -gt 0 ]]; then
  args+=("$@")
fi

LOCK_FILE="$ROOT_DIR/data/radar-runtime/arizona-radar.lock"

if ! flock -n "$LOCK_FILE" node scripts/arizona_radar/run.cjs run "${args[@]}"; then
  printf '%s\n' '{"status":"skipped","reason":"lock_busy"}'
fi
