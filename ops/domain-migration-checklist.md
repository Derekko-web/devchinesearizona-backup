# Domain Migration Checklist

Prepared on 2026-04-17 for these domains:

- `chineseaustin.com`
- `chineselosangeles.com`
- `chinesesfbay.com`
- `lachinesenews.com`
- `phoenixchinesenews.com`
- `phoenixchineserealestate.com`
- `phoenixhouses4rent.com`
- `section8arizona.com`

## What has already been prepared

- A provisioning script at `/var/www/ops/provision-wordpress-sites.sh`
- A root-only nginx installer at `/var/www/ops/install-generated-nginx-sites.sh`
- A Traefik routing generator at `/var/www/ops/generate-traefik-sites.sh`
- A root-only Traefik installer at `/var/www/ops/install-generated-traefik-sites.sh`
- A domain list at `/var/www/ops/domains-to-migrate.txt`
- Per-domain web roots at `/var/www/<domain>/public`
- Per-domain log folders at `/var/www/<domain>/logs`
- A temporary `maintenance.html` and `robots.txt` for each domain
- Generated nginx configs at `/var/www/ops/generated/nginx/sites-available`
- A generated Traefik routing file at `/var/www/ops/generated/traefik/sites.yml`

## Remaining migration steps per domain

1. Copy the current site files and database backup from the old host.
2. Import the database on this VPS and create/update `wp-config.php` with the new database credentials.
3. If the source site is WordPress, run a URL search-replace from the old host/domain to the new live domain after import.
4. Remove `/var/www/<domain>/public/maintenance.html` once the site is ready to serve normal traffic.
5. Run `sudo bash /var/www/ops/install-generated-traefik-sites.sh` so the front HTTPS proxy knows each hostname.
6. Run `sudo bash /var/www/ops/install-generated-nginx-sites.sh` to install the generated nginx configs.
7. Test nginx with `sudo nginx -t` and verify the site responds through the front proxy/load balancer.
8. Update DNS so the domain points to this VPS or to the outer proxy that forwards here.

## Notes about this server

- `chinesearizona.com` is currently a single-site WordPress install behind nginx on `127.0.0.1:8080`.
- `dev.chinesearizona.com` is a separate app proxied to port `3000`.
- An outer Traefik proxy handles ports `80` and `443`, so both Traefik and nginx need host routing entries for new domains.
- Because this shell does not have passwordless `sudo`, the Traefik and nginx install steps are prepared but not yet applied.
