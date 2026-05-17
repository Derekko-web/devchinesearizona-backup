#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
base_dir="/var/www"
generated_nginx_dir="${script_dir}/generated/nginx/sites-available"
domains_file=""
force=0

usage() {
  cat <<'EOF'
Usage:
  provision-wordpress-sites.sh [--from-file PATH] [--force] domain1.com domain2.com

Options:
  --from-file PATH  Read newline-delimited domains from a file.
  --force           Overwrite generated maintenance assets and nginx configs.
  -h, --help        Show this help text.
EOF
}

log() {
  printf '[provision] %s\n' "$*"
}

warn() {
  printf '[provision] warning: %s\n' "$*" >&2
}

die() {
  printf '[provision] error: %s\n' "$*" >&2
  exit 1
}

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

is_valid_domain() {
  local domain="$1"
  [[ "$domain" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]]
}

prepare_dir() {
  local path="$1"
  mkdir -p "$path"
  if getent group webadmin >/dev/null 2>&1; then
    chgrp webadmin "$path"
  fi
  chmod 2775 "$path"
}

write_file() {
  local destination="$1"
  local mode="$2"
  local content="$3"

  if [[ -e "$destination" && "$force" -ne 1 ]]; then
    warn "skipping existing file ${destination}"
    return
  fi

  printf '%s' "$content" >"$destination"
  chmod "$mode" "$destination"
}

make_maintenance_html() {
  local domain="$1"
  cat <<EOF
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${domain} is moving</title>
  <meta name="robots" content="noindex, nofollow">
  <style>
    :root {
      color-scheme: light;
      --bg: #f5efe6;
      --card: #fffdfa;
      --ink: #222222;
      --muted: #6d5f4a;
      --accent: #a63f2b;
      --border: #e7d8c6;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background:
        radial-gradient(circle at top, rgba(166, 63, 43, 0.14), transparent 38%),
        linear-gradient(180deg, #fbf7f1 0%, var(--bg) 100%);
      color: var(--ink);
      font: 16px/1.6 Georgia, "Times New Roman", serif;
    }
    main {
      width: min(680px, 100%);
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 40px 32px;
      box-shadow: 0 18px 44px rgba(46, 26, 12, 0.08);
    }
    .eyebrow {
      display: inline-block;
      margin-bottom: 14px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(166, 63, 43, 0.1);
      color: var(--accent);
      font: 700 12px/1 system-ui, sans-serif;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0 0 14px;
      font-size: clamp(2rem, 5vw, 3rem);
      line-height: 1.1;
    }
    p {
      margin: 0 0 14px;
      color: var(--muted);
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.95em;
      color: var(--ink);
    }
  </style>
</head>
<body>
  <main>
    <span class="eyebrow">Site Migration In Progress</span>
    <h1>${domain}</h1>
    <p>This domain has been provisioned on the new VPS and is waiting for its site content and database import.</p>
    <p>Once the migration is complete, remove <code>maintenance.html</code> from this site's <code>public</code> directory and normal WordPress routing will take over.</p>
  </main>
</body>
</html>
EOF
}

make_robots_txt() {
  cat <<'EOF'
User-agent: *
Disallow: /
EOF
}

make_nginx_conf() {
  local domain="$1"
  cat <<EOF
server {
    listen 127.0.0.1:8080;
    listen [::1]:8080;
    server_name ${domain} www.${domain};

    root /var/www/${domain}/public;
    index index.php index.html;

    access_log /var/www/${domain}/logs/access.log;
    error_log /var/www/${domain}/logs/error.log;

    client_max_body_size 64M;

    # During migration, unmatched requests fall back to maintenance.html.
    # Removing that file restores the normal WordPress front controller.
    location / {
        try_files \$uri /maintenance.html \$uri/ /index.php?\$args;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\. {
        deny all;
    }
}
EOF
}

domains=()
while (($# > 0)); do
  case "$1" in
    --from-file)
      (($# >= 2)) || die "--from-file requires a path"
      domains_file="$2"
      shift 2
      ;;
    --force)
      force=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      domains+=("$1")
      shift
      ;;
  esac
done

if [[ -n "$domains_file" ]]; then
  [[ -f "$domains_file" ]] || die "domains file not found: ${domains_file}"
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="$(trim "$line")"
    [[ -z "$line" ]] && continue
    [[ "$line" =~ ^# ]] && continue
    domains+=("$line")
  done <"$domains_file"
fi

((${#domains[@]} > 0)) || die "no domains supplied"

prepare_dir "${script_dir}"
prepare_dir "${script_dir}/generated"
prepare_dir "${script_dir}/generated/nginx"
prepare_dir "${generated_nginx_dir}"

provisioned=0
for domain in "${domains[@]}"; do
  if ! is_valid_domain "$domain"; then
    warn "skipping invalid domain ${domain}"
    continue
  fi

  site_dir="${base_dir}/${domain}"
  public_dir="${site_dir}/public"
  logs_dir="${site_dir}/logs"
  conf_path="${generated_nginx_dir}/${domain}.conf"

  prepare_dir "$site_dir"
  prepare_dir "$public_dir"
  prepare_dir "$logs_dir"

  write_file "${public_dir}/maintenance.html" 0644 "$(make_maintenance_html "$domain")"
  write_file "${public_dir}/index.html" 0644 "$(make_maintenance_html "$domain")"
  write_file "${public_dir}/robots.txt" 0644 "$(make_robots_txt)"
  write_file "${conf_path}" 0644 "$(make_nginx_conf "$domain")"

  log "prepared ${domain}"
  ((provisioned += 1))
done

cat <<EOF

Prepared ${provisioned} domain(s).

Generated nginx configs:
  ${generated_nginx_dir}

Next step once you have sudo:
  sudo bash ${script_dir}/install-generated-nginx-sites.sh
EOF
