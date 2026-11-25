#!/usr/bin/env bash
# Deploy or roll back chinesearizona.com (production) using release folders.
#
#   deploy-prod.sh deploy <sha>      build <sha> in its own folder, switch to it,
#                                    check it, and switch back if checks fail
#   deploy-prod.sh rollback [<sha>]  switch back to the previous release (or <sha>)
#
# Layout under PROD_ROOT (default /var/www/chinesearizona.com):
#   releases/<sha>/          one built copy of dev.chinesearizona.com/web per SHA
#   releases/legacy-20260517 symlink to ../app, the hand-copied app that ran
#                            before this pipeline (first rollback target)
#   shared/.env.local        production env, linked into every release
#   shared/main-ecosystem.config.cjs  pm2 config copied from the live release
#   current -> releases/<x>  what pm2 serves
#   previous -> releases/<y> what `rollback` switches back to
#
# The live site keeps serving the old release while the new one builds. A
# rollback only moves the `current` link and restarts pm2, so it takes seconds.
# Run by .github/workflows/deploy-prod.yml. Do not edit /var/www by hand.
set -euo pipefail

PROD_ROOT="${PROD_ROOT:-/var/www/chinesearizona.com}"
REPO_DIR="${PROD_REPO_DIR:-/var/www}"
RUNTIME_DATA_ROOT="${PROD_RUNTIME_DATA_ROOT:-/var/www/runtime-data/chinesearizona.com/web}"
PM2_APP="${PROD_PM2_APP:-main-chinesearizona}"
APP_PORT="${PROD_APP_PORT:-3001}"
SITE_URL="${PROD_SITE_URL:-https://chinesearizona.com}"
LOCK_FILE="${VPS_BUILD_LOCK_FILE:-$HOME/.chinesearizona-vps-build.lock}"
LOCK_WAIT_SECONDS="${VPS_BUILD_LOCK_WAIT_SECONDS:-1800}"
READY_ATTEMPTS="${PROD_READY_ATTEMPTS:-45}"
READY_INTERVAL_SECONDS="${PROD_READY_INTERVAL_SECONDS:-2}"
KEEP_RELEASES="${PROD_KEEP_RELEASES:-3}"

LEGACY_RELEASE="legacy-20260517"
RELEASES_DIR="$PROD_ROOT/releases"
SHARED_DIR="$PROD_ROOT/shared"
CURRENT_LINK="$PROD_ROOT/current"
PREVIOUS_LINK="$PROD_ROOT/previous"
HISTORY_FILE="$RELEASES_DIR/.history"
PM2_CONFIG="$SHARED_DIR/main-ecosystem.config.cjs"
HEALTH_URL="http://127.0.0.1:$APP_PORT/api/health"
HOME_URL="http://127.0.0.1:$APP_PORT/"

# Mutable data the app writes while it runs. Seeded from the release's repo
# fixtures only when missing, never copied from dev.
RUNTIME_FILES="
data/sites/austin/radar-runtime/store.json
data/sites/los-angeles/radar-runtime/store.json
data/sf-bay-radar-runtime/store.json
data/article-ingest-staging/english-translation-cache.json
data/article-ingest-staging/chinese-translation-cache.json
src/data/generated-local-articles.json
"

log() {
  printf '[deploy-prod] %s\n' "$*"
}

fail() {
  printf '[deploy-prod] ERROR: %s\n' "$*" >&2
  exit 1
}

require_sha() {
  if ! [[ "${1:-}" =~ ^[0-9a-f]{40}$ ]]; then
    fail "Expected a full 40-character commit SHA, got '${1:-}'."
  fi
}

link_name() {
  # Prints the release name a link points at, or nothing.
  if [ -L "$1" ]; then
    basename "$(readlink "$1")"
  fi
}

is_legacy() {
  [ "$1" = "$LEGACY_RELEASE" ]
}

acquire_build_lock() {
  # Dev and production builds share 2 CPUs and no swap, so they never overlap.
  # Deploy Dev takes the same lock.
  exec 9>"$LOCK_FILE"
  log "Waiting for the VPS build lock."
  if ! flock -w "$LOCK_WAIT_SECONDS" 9; then
    fail "Another VPS build held the lock for ${LOCK_WAIT_SECONDS}s."
  fi
}

bootstrap() {
  mkdir -p "$RELEASES_DIR" "$SHARED_DIR"

  if [ ! -e "$SHARED_DIR/.env.local" ] && [ -f "$PROD_ROOT/app/.env.local" ]; then
    cp -p "$PROD_ROOT/app/.env.local" "$SHARED_DIR/.env.local"
    log "Copied app/.env.local to shared/.env.local."
  fi

  if [ ! -L "$CURRENT_LINK" ]; then
    if [ -e "$CURRENT_LINK" ]; then
      fail "$CURRENT_LINK exists but is not a symlink."
    fi
    if [ ! -d "$PROD_ROOT/app" ]; then
      fail "No current release and no app folder to start from."
    fi
    # Link, don't move: the running server still reads files from app/.
    if [ ! -L "$RELEASES_DIR/$LEGACY_RELEASE" ]; then
      ln -s ../app "$RELEASES_DIR/$LEGACY_RELEASE"
    fi
    ln -sfn "releases/$LEGACY_RELEASE" "$CURRENT_LINK"
    log "First run: current -> releases/$LEGACY_RELEASE (the existing app folder, left in place)."
  fi

  if [ ! -f "$SHARED_DIR/.env.local" ]; then
    fail "Missing $SHARED_DIR/.env.local."
  fi
}

export_runtime_env() {
  export CHINESEARIZONA_RUNTIME_DATA_ROOT="$RUNTIME_DATA_ROOT"
  export RADAR_STORE_PATH_AUSTIN="$RUNTIME_DATA_ROOT/data/sites/austin/radar-runtime/store.json"
  export RADAR_STORE_PATH_LOS_ANGELES="$RUNTIME_DATA_ROOT/data/sites/los-angeles/radar-runtime/store.json"
  export SF_BAY_RADAR_STORE_PATH="$RUNTIME_DATA_ROOT/data/sf-bay-radar-runtime/store.json"
  export ARTICLE_EN_TRANSLATION_CACHE_PATH="$RUNTIME_DATA_ROOT/data/article-ingest-staging/english-translation-cache.json"
  export ARTICLE_ZH_TRANSLATION_CACHE_PATH="$RUNTIME_DATA_ROOT/data/article-ingest-staging/chinese-translation-cache.json"
  export GENERATED_LOCAL_ARTICLES_PATH="$RUNTIME_DATA_ROOT/src/data/generated-local-articles.json"
  # Arizona news must keep coming from the production Supabase project.
  unset RADAR_STORAGE_MODE
}

export_release_env() {
  local name="$1"
  local sha=""
  local build_time="unknown"

  if ! is_legacy "$name"; then
    sha="$name"
  fi
  if [ -f "$RELEASES_DIR/$name/.build-time" ]; then
    build_time="$(cat "$RELEASES_DIR/$name/.build-time")"
  fi

  export GIT_SHA="$sha"
  export NEXT_PUBLIC_GIT_SHA="$sha"
  export BUILD_TIME="$build_time"
  export NEXT_PUBLIC_BUILD_TIME="$build_time"
}

seed_runtime_data() {
  local release="$1"
  local file
  for file in $RUNTIME_FILES; do
    if [ ! -f "$RUNTIME_DATA_ROOT/$file" ] && [ -f "$release/$file" ]; then
      mkdir -p "$(dirname "$RUNTIME_DATA_ROOT/$file")"
      cp "$release/$file" "$RUNTIME_DATA_ROOT/$file"
      log "Seeded runtime data $RUNTIME_DATA_ROOT/$file"
    fi
  done
}

build_release() {
  local sha="$1"
  local release="$RELEASES_DIR/$sha"

  if [ -f "$release/.deploy-complete" ]; then
    log "Release $sha is already built; reusing it."
    return 0
  fi

  rm -rf "$release"
  mkdir -p "$release"

  if ! git -C "$REPO_DIR" cat-file -e "$sha^{commit}" 2>/dev/null; then
    git -C "$REPO_DIR" fetch --no-tags origin "$sha"
  fi
  # Read objects only; never check out or touch the dev working tree.
  git -C "$REPO_DIR" archive --format=tar "$sha:dev.chinesearizona.com/web" | tar -x -C "$release"
  git -C "$REPO_DIR" show "$sha:chinesearizona.com/main-ecosystem.config.cjs" > "$release/main-ecosystem.config.cjs"
  ln -s "$SHARED_DIR/.env.local" "$release/.env.local"
  date -u '+%Y-%m-%dT%H:%M:%SZ' > "$release/.build-time"

  seed_runtime_data "$release"

  log "Building $sha in $release while the live site keeps serving."
  if ! (
    cd "$release"
    export_runtime_env
    export_release_env "$sha"
    # set -e is off inside `if !`, so chain the steps explicitly.
    npm ci && npm run build
  ); then
    rm -rf "$release"
    fail "Build failed for $sha. The live site was not touched."
  fi

  touch "$release/.deploy-complete"
}

point_current_at() {
  local name="$1"
  ln -sfn "releases/$name" "$CURRENT_LINK"
  if [ -f "$RELEASES_DIR/$name/main-ecosystem.config.cjs" ]; then
    cp "$RELEASES_DIR/$name/main-ecosystem.config.cjs" "$PM2_CONFIG"
  fi
  if [ ! -f "$PM2_CONFIG" ]; then
    fail "Missing $PM2_CONFIG."
  fi
  log "current -> releases/$name"
}

restart_app() {
  local name="$1"
  export_runtime_env
  export_release_env "$name"
  # delete + start so pm2 resolves `current` again. A reload can keep the old
  # working directory. In fork mode both cost the same short restart.
  # `9>&-` keeps the build lock out of a pm2 daemon that pm2 may spawn here;
  # a daemon holding it would block every later build.
  if pm2 describe "$PM2_APP" >/dev/null 2>&1 9>&-; then
    pm2 delete "$PM2_APP" 9>&-
  fi
  pm2 start "$PM2_CONFIG" --only "$PM2_APP" 9>&-
  pm2 save 9>&-
}

health_git_sha() {
  curl -s --max-time 5 "$HEALTH_URL" 2>/dev/null | node -e '
let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    process.stdout.write(String(JSON.parse(input).gitSha || ""));
  } catch {
    process.stdout.write("");
  }
});
' || true
}

home_status() {
  curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$HOME_URL" 2>/dev/null || true
}

wait_until_serving() {
  local name="$1"
  local attempt
  for attempt in $(seq 1 "$READY_ATTEMPTS"); do
    if is_legacy "$name"; then
      # The legacy app has no /api/health route.
      if [ "$(home_status)" = "200" ]; then
        log "Legacy app is serving after $attempt check(s)."
        return 0
      fi
    elif [ "$(health_git_sha)" = "$name" ]; then
      log "App is serving $name after $attempt check(s)."
      return 0
    fi
    sleep "$READY_INTERVAL_SECONDS"
  done
  log "App did not start serving $name in time."
  return 1
}

smoke_release() {
  local name="$1"
  if is_legacy "$name"; then
    log "Skipping smoke for the legacy app; its pages predate the smoke checks."
    return 0
  fi
  (
    cd "$RELEASES_DIR/$name"
    SMOKE_BASE_URL="$SITE_URL" \
      SMOKE_SKIP_PUBLIC_DOMAINS=1 \
      SMOKE_EXPECTED_GIT_SHA="$name" \
      npm run smoke:dev
  )
}

go_live() {
  local name="$1"
  point_current_at "$name"
  restart_app "$name"
  wait_until_serving "$name" && smoke_release "$name"
}

record_history() {
  printf '%s\n' "$1" >> "$HISTORY_FILE"
}

prune_releases() {
  local keep
  local entry
  local name
  keep="$(link_name "$CURRENT_LINK") $(link_name "$PREVIOUS_LINK")"
  if [ -f "$HISTORY_FILE" ]; then
    keep="$keep $(awk '{ line[NR] = $0 } END { for (i = NR; i > 0; i--) if (!seen[line[i]]++) print line[i] }' "$HISTORY_FILE" | head -n "$KEEP_RELEASES" | tr '\n' ' ')"
  fi

  for entry in "$RELEASES_DIR"/*; do
    [ -e "$entry" ] || [ -L "$entry" ] || continue
    name="$(basename "$entry")"
    case " $keep " in
      *" $name "*) continue ;;
    esac
    # No trailing slash: for the legacy symlink this removes only the link.
    rm -rf "$entry"
    log "Removed old release $name"
  done
}

cmd_deploy() {
  local sha="${1:-}"
  local before

  require_sha "$sha"
  acquire_build_lock
  bootstrap
  build_release "$sha"

  before="$(link_name "$CURRENT_LINK")"

  # `previous` only moves once the new release passes its checks.
  if go_live "$sha"; then
    if [ -n "$before" ] && [ "$before" != "$sha" ]; then
      ln -sfn "releases/$before" "$PREVIOUS_LINK"
    fi
    record_history "$sha"
    prune_releases
    log "Deployed $sha to $SITE_URL."
    return 0
  fi

  if [ -z "$before" ] || [ "$before" = "$sha" ]; then
    fail "Deploy of $sha failed its checks and there is no other release to switch back to."
  fi

  log "Deploy of $sha failed its checks; switching back to $before."
  if go_live "$before"; then
    log "Switched back to $before. The site is serving the release it had before this deploy."
  else
    log "The switch back to $before also failed its checks. Check $SITE_URL now."
  fi
  fail "Deploy of $sha failed."
}

cmd_rollback() {
  local target="${1:-}"
  local current

  current="$(link_name "$CURRENT_LINK")"
  if [ -z "$current" ]; then
    fail "No current release; nothing to roll back."
  fi

  if [ -n "$target" ]; then
    require_sha "$target"
  else
    target="$(link_name "$PREVIOUS_LINK")"
    if [ -z "$target" ]; then
      fail "No previous release recorded. Pass a SHA from $RELEASES_DIR."
    fi
  fi

  if [ "$target" = "$current" ]; then
    fail "$target is already live."
  fi
  if [ ! -e "$RELEASES_DIR/$target" ]; then
    fail "Release $target is not on the server."
  fi
  if ! is_legacy "$target" && [ ! -f "$RELEASES_DIR/$target/.deploy-complete" ]; then
    fail "Release $target never finished building."
  fi

  log "Rolling back from $current to $target."
  if ! go_live "$target"; then
    fail "Rollback to $target failed its checks. Check $SITE_URL now."
  fi
  ln -sfn "releases/$current" "$PREVIOUS_LINK"
  log "Rolled back to $target. Roll back again to return to $current."
}

case "${1:-}" in
  deploy) cmd_deploy "${2:-}" ;;
  rollback) cmd_rollback "${2:-}" ;;
  *) fail "Usage: deploy-prod.sh deploy <sha> | rollback [<sha>]" ;;
esac
