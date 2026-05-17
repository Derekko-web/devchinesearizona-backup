#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source_dir="${script_dir}/generated/nginx/sites-available"
dest_available="/etc/nginx/sites-available"
dest_enabled="/etc/nginx/sites-enabled"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this installer with sudo so it can copy configs into /etc/nginx." >&2
  exit 1
fi

shopt -s nullglob
configs=("${source_dir}"/*.conf)
shopt -u nullglob

if ((${#configs[@]} == 0)); then
  echo "No generated nginx configs were found in ${source_dir}." >&2
  exit 1
fi

for config in "${configs[@]}"; do
  target_name="$(basename -- "$config")"
  install -m 0644 "$config" "${dest_available}/${target_name}"
  ln -sfn "${dest_available}/${target_name}" "${dest_enabled}/${target_name}"
  echo "Installed ${target_name}"
done

nginx -t
systemctl reload nginx

echo "Nginx configuration installed and reloaded successfully."
