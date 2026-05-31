#!/usr/bin/env bash
set -euo pipefail

# Install a systemd drop-in that lets radar/Hermes workers read the existing
# private app environment from the VPS checkout without committing those values.
# This script prints only file paths and unit names.

web_root="${RADAR_HERMES_WEB_ROOT:-/var/www/dev.chinesearizona.com/web}"
env_name='.env.local'
dropin_dir=/etc/systemd/system/radar-hermes-worker@.service.d
dropin_path="$dropin_dir/app-runtime-env.conf"

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

run_root test -d "$web_root"
run_root install -d -m 0755 "$dropin_dir"
write_root_file "$dropin_path" 0644 <<EOF
[Service]
EnvironmentFile=-$web_root/$env_name
EOF

printf 'Installed radar/Hermes app environment drop-in for systemd workers.\n'
