#!/usr/bin/env bash
set -euo pipefail

dev_conf="/etc/nginx/sites-available/dev.chinesearizona.com.conf"
timestamp="$(date +%Y%m%d%H%M%S)"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script with sudo so it can update ${dev_conf} and reload nginx." >&2
  exit 1
fi

if ! curl -I -sS -H 'Host: dev.chinesearizona.com' http://127.0.0.1:3000/ | grep -q '^HTTP/1.1 200 OK'; then
  echo "The app on port 3000 is not returning 200 for Host: dev.chinesearizona.com." >&2
  echo "Build/restart the Next app before restoring the nginx proxy." >&2
  exit 1
fi

if [[ -f "${dev_conf}" ]]; then
  cp "${dev_conf}" "${dev_conf}.bak.${timestamp}"
fi

cat >"${dev_conf}" <<'EOF'
server {
    listen 127.0.0.1:8080;
    listen [::1]:8080;
    server_name dev.chinesearizona.com;

    access_log /var/www/dev.chinesearizona.com/logs/access.log;
    error_log /var/www/dev.chinesearizona.com/logs/error.log;

    client_max_body_size 32M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Port 443;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    location ~ /\. {
        deny all;
    }
}
EOF

nginx -t
systemctl reload nginx

printf 'Restored %s\n' "${dev_conf}"
printf 'Backup: %s.bak.%s\n' "${dev_conf}" "${timestamp}"
