#!/usr/bin/env bash
set -euo pipefail

# Install a systemd drop-in that lets radar/Hermes workers read the existing
# private app environment from the VPS checkout without committing those values.
# The app environment is loaded before the generated per-city runtime env so
# runtime store path overrides win last. This script prints only status.

web_root="${RADAR_HERMES_WEB_ROOT:-/var/www/dev.chinesearizona.com/web}"
env_name='.env.local'
dropin_dir=/etc/systemd/system/radar-hermes-worker@.service.d
dropin_path="$dropin_dir/app-runtime-env.conf"
# Arizona news is published on chinesearizona.com, which reads radar articles
# from the production Supabase project. The Arizona worker also loads the
# production app environment so it writes there. The other cities use
# file-backed stores and keep the dev environment.
production_env_path="${RADAR_HERMES_ARIZONA_ENV_FILE:-/var/www/chinesearizona.com/shared/.env.local}"
arizona_dropin_dir=/etc/systemd/system/radar-hermes-worker@arizona.service.d
# Drop-ins apply in file-name order across the template and instance folders,
# so this name must sort after app-runtime-env.conf.
arizona_dropin_path="$arizona_dropin_dir/production-env.conf"

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
EnvironmentFile=
EnvironmentFile=-$web_root/$env_name
EnvironmentFile=-/etc/chinesearizona/radar-hermes/%i.env
EOF

run_root test -f "$production_env_path"
run_root install -d -m 0755 "$arizona_dropin_dir"
write_root_file "$arizona_dropin_path" 0644 <<EOF
[Service]
EnvironmentFile=
EnvironmentFile=-$web_root/$env_name
EnvironmentFile=-$production_env_path
EnvironmentFile=-/etc/chinesearizona/radar-hermes/%i.env
EOF

printf 'Installed radar/Hermes app environment drop-in for systemd workers.\n'
printf 'Arizona worker writes to the production database.\n'
