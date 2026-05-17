#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source_file="${script_dir}/generated/traefik/sites.yml"
target_file="/docker/traefik/dynamic/sites.yml"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this installer with sudo so it can write ${target_file}." >&2
  exit 1
fi

[[ -f "${source_file}" ]] || {
  echo "Generated Traefik file not found: ${source_file}" >&2
  exit 1
}

install -m 0644 "${source_file}" "${target_file}"
echo "Installed ${target_file}"
echo "Traefik watches /dynamic, so routing should reload automatically."
