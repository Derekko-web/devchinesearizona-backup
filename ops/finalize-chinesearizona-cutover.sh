#!/usr/bin/env bash
set -euo pipefail

timestamp="$(date +%Y%m%d%H%M%S)"

apex_conf="/etc/nginx/sites-available/chinesearizona.com.conf"
dev_conf="/etc/nginx/sites-available/dev.chinesearizona.com.conf"

backup_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    cp "$file" "${file}.bak.${timestamp}"
  fi
}

backup_file "$apex_conf"
backup_file "$dev_conf"

cat >"$apex_conf" <<'EOF'
server {
    listen 127.0.0.1:8080;
    listen [::1]:8080;
    server_name chinesearizona.com www.chinesearizona.com;

    access_log /var/www/chinesearizona.com/logs/access.log;
    error_log /var/www/chinesearizona.com/logs/error.log;

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

cat >"$dev_conf" <<'EOF'
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

printf 'nginx cutover complete\n'
printf 'Backups:\n'
printf '  %s.bak.%s\n' "$apex_conf" "$timestamp"
printf '  %s.bak.%s\n' "$dev_conf" "$timestamp"
