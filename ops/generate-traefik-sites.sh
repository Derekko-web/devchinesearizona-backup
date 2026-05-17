#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
domains_file="${script_dir}/domains-to-migrate.txt"
output_dir="${script_dir}/generated/traefik"
output_file="${output_dir}/sites.yml"

mkdir -p "${output_dir}"

mapfile -t domains < <(grep -Ev '^\s*(#|$)' "${domains_file}")

{
  cat <<'EOF'
http:
  routers:
    chinesearizona-main:
      rule: Host(`chinesearizona.com`) || Host(`www.chinesearizona.com`)
      entryPoints:
        - websecure
      service: host-nginx
      tls:
        certResolver: letsencrypt
    chinesearizona-dev:
      rule: Host(`dev.chinesearizona.com`)
      entryPoints:
        - websecure
      service: host-nginx
      tls:
        certResolver: letsencrypt
EOF

  for domain in "${domains[@]}"; do
    cat <<EOF
    ${domain//./-}:
      rule: Host(\`${domain}\`) || Host(\`www.${domain}\`)
      entryPoints:
        - websecure
      service: host-nginx
      tls:
        certResolver: letsencrypt
EOF
  done

  cat <<'EOF'

  services:
    host-nginx:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:8080"
EOF
} >"${output_file}"

printf 'Generated %s\n' "${output_file}"
