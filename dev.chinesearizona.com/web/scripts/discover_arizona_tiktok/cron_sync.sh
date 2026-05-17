#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

cd "$ROOT_DIR"

if [ -f ./.env.local ]; then
  set -a
  . ./.env.local
  set +a
fi

node scripts/discover_arizona_tiktok/collector.cjs run
