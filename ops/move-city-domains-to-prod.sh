#!/usr/bin/env bash
# Serve chineseaustin.com, chineselosangeles.com and chinesesfbay.com from the
# production app instead of the dev app (#373).
#
#   sudo bash ops/move-city-domains-to-prod.sh            switch to production
#   sudo bash ops/move-city-domains-to-prod.sh rollback   point back at dev
#
# What it changes:
# - Each city nginx site proxies to the host router (127.0.0.1:3000) instead of
#   the dev app (127.0.0.1:3002). The router sends every host except
#   dev.chinesearizona.com to the production app on 127.0.0.1:3001.
# - The production app's city news stores become links to the files the
#   radar-hermes city workers write under the dev runtime-data tree, so both
#   apps read the same city news. Deploy Prod only seeds a store when it is
#   missing, so the links survive deploys.
# Every edited file is backed up next to itself as <file>.bak.<timestamp>.
set -euo pipefail

mode="${1:-apply}"
NGINX_SITES_DIR="${NGINX_SITES_DIR:-/etc/nginx/sites-available}"
PROD_RUNTIME="${PROD_RUNTIME_DATA_ROOT:-/var/www/runtime-data/chinesearizona.com/web}"
DEV_RUNTIME="${DEV_RUNTIME_DATA_ROOT:-/var/www/runtime-data/dev.chinesearizona.com/web}"
ROUTER_URL="${ROUTER_URL:-http://127.0.0.1:3000}"
PROD_APP_URL="${PROD_APP_URL:-http://127.0.0.1:3001}"
SKIP_RELOAD="${SKIP_NGINX_RELOAD:-0}"

domains=(chineseaustin.com chineselosangeles.com chinesesfbay.com)
city_stores=(
  data/sites/austin/radar-runtime/store.json
  data/sites/los-angeles/radar-runtime/store.json
  data/sf-bay-radar-runtime/store.json
)
dev_upstream='proxy_pass http://127.0.0.1:3002;'
prod_upstream='proxy_pass http://127.0.0.1:3000;'
timestamp="$(date +%Y%m%d%H%M%S)"
backups=()

log() {
  printf '%s\n' "$*"
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

restore_backups() {
  local backup
  for backup in "${backups[@]}"; do
    cp -p "$backup" "${backup%.bak.$timestamp}"
    log "Restored ${backup%.bak.$timestamp}"
  done
}

backup() {
  cp -p "$1" "$1.bak.$timestamp"
  backups+=("$1.bak.$timestamp")
}

reload_nginx() {
  if [[ "$SKIP_RELOAD" == "1" ]]; then
    return 0
  fi
  if ! nginx -t; then
    restore_backups
    die "nginx -t failed; restored the previous city sites."
  fi
  systemctl reload nginx
}

switch_upstream() {
  local from="$1"
  local to="$2"
  local domain site edited
  for domain in "${domains[@]}"; do
    site="$NGINX_SITES_DIR/$domain.conf"
    [[ -f "$site" ]] || die "Missing nginx site $site"
    if grep -qF "$to" "$site"; then
      log "$domain already uses ${to#proxy_pass }"
      continue
    fi
    grep -qF "$from" "$site" || die "$site does not contain '$from'; edit it by hand."
    backup "$site"
    # Portable in-place edit (GNU and BSD sed differ on -i). cat > keeps the
    # file's owner and mode.
    edited="$(mktemp)"
    sed "s|$from|$to|" "$site" >"$edited"
    cat "$edited" >"$site"
    rm -f "$edited"
    log "$domain now uses ${to#proxy_pass }"
  done
}

link_city_stores() {
  local store prod_store dev_store
  for store in "${city_stores[@]}"; do
    prod_store="$PROD_RUNTIME/$store"
    dev_store="$DEV_RUNTIME/$store"
    [[ -f "$dev_store" ]] || die "Missing city worker store $dev_store"
    if [[ -L "$prod_store" && "$(readlink "$prod_store")" == "$dev_store" ]]; then
      log "$prod_store already links to the city worker store"
      continue
    fi
    mkdir -p "$(dirname "$prod_store")"
    if [[ -e "$prod_store" || -L "$prod_store" ]]; then
      mv "$prod_store" "$prod_store.bak.$timestamp"
      log "Moved the old production store to $prod_store.bak.$timestamp"
    fi
    ln -s "$dev_store" "$prod_store"
    log "Linked $prod_store -> $dev_store"
  done
}

http_status() {
  curl -s -o /dev/null -w '%{http_code}' --max-time 20 -H "Host: $1" "$2"
}

health_sha() {
  curl -s --max-time 20 -H "Host: $1" "$2/api/health" | sed -n 's/.*"gitSha":"\([0-9a-f]*\)".*/\1/p'
}

check_prod_serves_cities() {
  local domain status
  for domain in "${domains[@]}"; do
    status="$(http_status "$domain" "$ROUTER_URL/")"
    case "$status" in
      2??|3??) ;;
      *) die "The production app returned $status for Host: $domain through the router." ;;
    esac
  done
}

verify_public_domains() {
  local expected domain actual failed=0
  expected="$(health_sha chinesearizona.com "$PROD_APP_URL")"
  [[ -n "$expected" ]] || die "Could not read the production app's gitSha."
  for domain in "${domains[@]}"; do
    actual="$(curl -s --max-time 20 "https://$domain/api/health" | sed -n 's/.*"gitSha":"\([0-9a-f]*\)".*/\1/p')"
    if [[ "$actual" == "$expected" ]]; then
      log "https://$domain serves the production app ($expected)"
    else
      log "https://$domain serves '${actual:-nothing}', expected production $expected" >&2
      failed=1
    fi
  done
  return "$failed"
}

if [[ "$SKIP_RELOAD" != "1" && "${EUID}" -ne 0 ]]; then
  die "Run with sudo so it can edit nginx sites and reload nginx."
fi

case "$mode" in
  apply)
    check_prod_serves_cities
    link_city_stores
    switch_upstream "$dev_upstream" "$prod_upstream"
    reload_nginx
    if [[ "$SKIP_RELOAD" != "1" ]]; then
      verify_public_domains || die "A city domain is not serving production yet. Roll back with: sudo bash $0 rollback"
    fi
    log "City domains now serve the production app."
    ;;
  rollback)
    switch_upstream "$prod_upstream" "$dev_upstream"
    reload_nginx
    log "City domains point back at the dev app. The city store links are left in place; they are harmless."
    ;;
  *)
    die "Unknown mode '$mode'. Use apply or rollback."
    ;;
esac
