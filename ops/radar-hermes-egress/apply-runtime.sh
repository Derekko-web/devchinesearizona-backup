#!/usr/bin/env bash
set -euo pipefail

# Apply the owner-approved radar/Hermes runtime egress boundary from the normal
# GitHub Actions deploy path. The script intentionally prints only status and
# unit names; do not add environment dumps, logs, response bodies, or store
# contents here.

web_root="${RADAR_HERMES_WEB_ROOT:-/var/www/dev.chinesearizona.com/web}"
runtime_root="${CHINESEARIZONA_RUNTIME_DATA_ROOT:-/var/www/runtime-data/dev.chinesearizona.com/web}"
worker_user="${RADAR_HERMES_WORKER_USER:-radar-hermes}"
worker_group="${RADAR_HERMES_WORKER_GROUP:-radar-hermes}"
state_dir="${RADAR_HERMES_STATE_DIR:-/var/lib/chinesearizona/radar-hermes-egress}"
backup_root="${RADAR_HERMES_BACKUP_ROOT:-/var/backups/chinesearizona/radar-hermes-egress}"
run_now="${RADAR_HERMES_RUN_NOW:-first}"
enable_nftables="${RADAR_HERMES_ENABLE_NFTABLES:-0}"
cities=(arizona austin los-angeles sf-bay)

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
service_source="$script_dir/systemd/radar-hermes-worker@.service"
timer_source="$script_dir/systemd/radar-hermes-worker@.timer"
nftables_source="$script_dir/nftables/radar-hermes-worker.nft"

if [[ "$(id -u)" -eq 0 ]]; then
  sudo_cmd=()
else
  sudo_cmd=(sudo -n)
fi

run_root() {
  "${sudo_cmd[@]}" "$@"
}

write_root_file() {
  local path="$1"
  local mode="$2"
  local tmp
  tmp="$(mktemp)"
  cat >"$tmp"
  run_root install -m "$mode" "$tmp" "$path"
  rm -f "$tmp"
}

backup_crontab_to_file() {
  local path="$1"
  shift
  local tmp
  tmp="$(mktemp)"
  run_root "$@" >"$tmp" 2>/dev/null || true
  run_root install -m 0600 "$tmp" "$path"
  rm -f "$tmp"
}

timer_calendar_for_city() {
  case "$1" in
    arizona) printf '%s\n' '*-*-* 00,06,12,18:17:00' ;;
    austin) printf '%s\n' '*-*-* 01,07,13,19:23:00' ;;
    los-angeles) printf '%s\n' '*-*-* 02,08,14,20:29:00' ;;
    sf-bay) printf '%s\n' '*-*-* 03,09,15,21:35:00' ;;
    *) return 1 ;;
  esac
}

install_timer_override() {
  local city="$1"
  local calendar
  calendar="$(timer_calendar_for_city "$city")"
  local override_dir="/etc/systemd/system/radar-hermes-worker@${city}.timer.d"
  run_root install -d -m 0755 "$override_dir"
  write_root_file "$override_dir/override.conf" 0644 <<EOF
[Timer]
OnCalendar=
OnCalendar=$calendar
RandomizedDelaySec=7m
Persistent=true
EOF
}

backup_existing_runtime_state() {
  local backup_dir="$backup_root/$(date -u +%Y%m%dT%H%M%SZ)"
  run_root install -d -m 0700 "$backup_dir"
  run_root cp -a /etc/systemd/system/radar-hermes-worker@.service "$backup_dir/" 2>/dev/null || true
  run_root cp -a /etc/systemd/system/radar-hermes-worker@.timer "$backup_dir/" 2>/dev/null || true
  run_root cp -a /etc/nftables.d/radar-hermes-worker.nft "$backup_dir/" 2>/dev/null || true
  backup_crontab_to_file "$backup_dir/root.cron" crontab -l

  if [[ -n "${SUDO_USER:-}" && "${SUDO_USER:-}" != "root" ]]; then
    backup_crontab_to_file "$backup_dir/$SUDO_USER.cron" crontab -u "$SUDO_USER" -l
  elif [[ -n "${USER:-}" && "${USER:-}" != "root" ]]; then
    backup_crontab_to_file "$backup_dir/$USER.cron" crontab -u "$USER" -l
  fi

  if [[ -d "$runtime_root" ]]; then
    run_root tar -C "$runtime_root" -czf "$backup_dir/radar-runtime-stores.tgz" \
      data/radar-runtime/store.json \
      data/sites/austin/radar-runtime/store.json \
      data/sites/los-angeles/radar-runtime/store.json \
      data/sf-bay-radar-runtime/store.json 2>/dev/null || true
  fi

  printf 'Backed up existing radar/Hermes runtime control state.\n'
}

ensure_worker_identity() {
  if ! getent group "$worker_group" >/dev/null; then
    run_root groupadd --system "$worker_group"
  fi
  if ! id -u "$worker_user" >/dev/null 2>&1; then
    run_root useradd --system --no-create-home --gid "$worker_group" --shell /usr/sbin/nologin "$worker_user"
  fi
}

ensure_runtime_paths() {
  run_root test -d "$web_root"
  run_root install -d -o "$worker_user" -g "$worker_group" -m 0750 "$runtime_root"
  for store_dir in \
    data/radar-runtime \
    data/sites/austin/radar-runtime \
    data/sites/los-angeles/radar-runtime \
    data/sf-bay-radar-runtime
  do
    run_root install -d -o "$worker_user" -g "$worker_group" -m 0750 "$runtime_root/$store_dir"
    run_root chown -R "$worker_user:$worker_group" "$runtime_root/$store_dir" 2>/dev/null || true
  done
  run_root install -d -m 0750 /etc/chinesearizona/radar-hermes
}

install_units() {
  run_root install -m 0644 "$service_source" /etc/systemd/system/radar-hermes-worker@.service
  run_root install -m 0644 "$timer_source" /etc/systemd/system/radar-hermes-worker@.timer
  for city in "${cities[@]}"; do
    install_timer_override "$city"
  done
  run_root systemd-analyze verify \
    /etc/systemd/system/radar-hermes-worker@.service \
    /etc/systemd/system/radar-hermes-worker@.timer
  run_root systemctl daemon-reload
}

verify_loaded_policy() {
  local city="$1"
  local unit="radar-hermes-worker@$city.service"
  local unit_text
  unit_text="$(run_root systemctl cat "$unit")"
  for required in \
    'User=radar-hermes' \
    'IPAddressDeny=169.254.0.0/16' \
    'IPAddressDeny=10.0.0.0/8' \
    'IPAddressDeny=127.0.0.0/8' \
    'IPAddressDeny=fc00::/7' \
    'ReadWritePaths=/var/www/runtime-data/dev.chinesearizona.com/web'
  do
    if ! grep -qF "$required" <<<"$unit_text"; then
      printf 'Missing required runtime egress setting for %s: %s\n' "$unit" "$required" >&2
      return 1
    fi
  done
}

run_worker_once_if_needed() {
  local marker="$state_dir/systemd-layer.enabled"
  local should_run=0
  case "$run_now" in
    always) should_run=1 ;;
    first)
      if ! run_root test -f "$marker"; then
        should_run=1
      fi
      ;;
    never) should_run=0 ;;
    *)
      printf 'Invalid RADAR_HERMES_RUN_NOW=%s; expected first, always, or never.\n' "$run_now" >&2
      return 1
      ;;
  esac

  if [[ "$should_run" -ne 1 ]]; then
    printf 'Skipping manual worker run; systemd layer was already marked enabled.\n'
    return 0
  fi

  for city in "${cities[@]}"; do
    printf 'Starting protected radar/Hermes worker once for %s.\n' "$city"
    run_root systemctl start "radar-hermes-worker@$city.service"
  done
}

enable_timers() {
  for city in "${cities[@]}"; do
    verify_loaded_policy "$city"
    run_root systemctl enable --now "radar-hermes-worker@$city.timer"
    run_root systemctl list-timers --all "radar-hermes-worker@$city.timer" >/dev/null
  done
}

apply_optional_nftables() {
  if [[ "$enable_nftables" != "1" ]]; then
    printf 'Skipping optional nftables allowlist; RADAR_HERMES_ENABLE_NFTABLES is not 1.\n'
    return 0
  fi

  run_root install -d -m 0755 /etc/nftables.d
  run_root install -m 0644 "$nftables_source" /etc/nftables.d/radar-hermes-worker.nft
  run_root nft -c -f /etc/nftables.d/radar-hermes-worker.nft
  run_root nft -f /etc/nftables.d/radar-hermes-worker.nft
}

write_state_marker() {
  run_root install -d -m 0755 "$state_dir"
  write_root_file "$state_dir/systemd-layer.enabled" 0644 <<EOF
enabled_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
operator=github-actions-deploy
worker_user=$worker_user
web_root=$web_root
runtime_root=$runtime_root
cities=${cities[*]}
nftables_enabled=$enable_nftables
EOF
}

main() {
  backup_existing_runtime_state
  ensure_worker_identity
  ensure_runtime_paths
  install_units
  run_worker_once_if_needed
  enable_timers
  apply_optional_nftables
  write_state_marker
  printf 'Radar/Hermes runtime egress systemd layer is installed and timers are enabled.\n'
}

main "$@"
