# Radar/Hermes owner rollout plan

Issue: #64

Decision: do not apply the PR #65 egress controls directly from an agent
session. The safe path is an owner-approved, city-by-city migration from the
current host scheduler into systemd timers, with the systemd `IPAddressDeny`
layer enabled first. The optional nftables port allowlist remains a second
phase and must wait until the owner confirms DNS behavior.

Do not paste credentials, environment-file contents, live internal endpoints,
private IP details, private routes, production log bodies, or runtime store
contents into issues, PRs, docs, chat, or command output captures.

## Affected runtime surface

The rollout affects only the radar/Hermes worker process tree and the host
scheduler entries that launch it. It must not change the PM2
`dev-chinesearizona` web process, nginx/proxy routing, deploy workflow, database
maintenance jobs, or non-radar cron jobs.

| City | Current repo command | New service instance | New timer instance | Service command |
| --- | --- | --- | --- | --- |
| Arizona | `npm run scrape:arizona-radar` or `scripts/arizona_radar/cron_sync.sh` | `radar-hermes-worker@arizona.service` | `radar-hermes-worker@arizona.timer` | `/usr/bin/node scripts/arizona_radar/run.cjs run --site=arizona` |
| Austin | `npm run scrape:austin-radar` | `radar-hermes-worker@austin.service` | `radar-hermes-worker@austin.timer` | `/usr/bin/node scripts/arizona_radar/run.cjs run --site=austin` |
| Los Angeles | `npm run scrape:los-angeles-radar` | `radar-hermes-worker@los-angeles.service` | `radar-hermes-worker@los-angeles.timer` | `/usr/bin/node scripts/arizona_radar/run.cjs run --site=los-angeles` |
| SF Bay | `npm run scrape:sf-bay-radar` | `radar-hermes-worker@sf-bay.service` | `radar-hermes-worker@sf-bay.timer` | `/usr/bin/node scripts/arizona_radar/run.cjs run --site=sf-bay` |

The service template is
`ops/radar-hermes-egress/systemd/radar-hermes-worker@.service`; the timer
template is `ops/radar-hermes-egress/systemd/radar-hermes-worker@.timer`.
Owner-approved host copies belong at:

- `/etc/systemd/system/radar-hermes-worker@.service`
- `/etc/systemd/system/radar-hermes-worker@.timer`
- `/etc/chinesearizona/radar-hermes/<city>.env`
- `/etc/nftables.d/radar-hermes-worker.nft`, only if the nftables phase is
  approved

The service template uses the existing deploy/runtime paths:

- web working directory: `/var/www/dev.chinesearizona.com/web`
- mutable runtime data root:
  `/var/www/runtime-data/dev.chinesearizona.com/web`

The worker identity is `radar-hermes` in the templates. The owner may choose a
different unprivileged user or group, but it must be dedicated to these workers
and must not be shared with PM2, deploy, shell, database, backup, or proxy
tasks. If the identity changes, update only the owner-approved host copies and
the nftables UID definition together.

## Required owner decisions

Before rollout, the owner or delegated VPS operator must approve:

- the operator responsible for each production command
- the dedicated worker username/group and file ownership model
- whether the worker reads the existing app `.env.local`, per-city
  `/etc/chinesearizona/radar-hermes/<city>.env` files, or a split where only
  non-secret runtime paths are in per-city files
- the exact store paths for `RADAR_STORE_PATH`,
  `RADAR_STORE_PATH_AUSTIN`, `RADAR_STORE_PATH_LOS_ANGELES`, and
  `SF_BAY_RADAR_STORE_PATH`
- the `HERMES_BIN` path if the default `hermes` command is not available under
  `/usr/local/bin:/usr/bin:/bin`
- whether Hermes needs any readable or writable config/cache path outside the
  web checkout and runtime data root; if it does, revise the owner-approved
  host copy before rollout instead of broadening access during an incident
- the timer cadence and migration order for `arizona`, `austin`,
  `los-angeles`, and `sf-bay`
- whether resolver configuration uses a public resolver path or a loopback
  host stub
- whether and when to enable the optional nftables DNS/HTTP(S) allowlist

If DNS uses a loopback resolver stub, do not enable the nftables port allowlist
until the owner chooses a public resolver path. The systemd `IPAddressDeny`
layer can still be rolled out first.

## Preservation checks

The city generation behavior is preserved when all four services run the same
worker entrypoint with only the `--site` instance changing. The runtime store
paths must continue to point at the current runtime data root, not at tracked
fixture files inside the Git checkout.

Expected store targets are:

- Arizona: `data/radar-runtime/store.json`
- Austin: `data/sites/austin/radar-runtime/store.json`
- Los Angeles: `data/sites/los-angeles/radar-runtime/store.json`
- SF Bay: `data/sf-bay-radar-runtime/store.json`

For Austin, Los Angeles, and SF Bay, keep file storage and summary/link-only
behavior. For Arizona, preserve the existing Supabase-backed behavior when the
approved environment provides Supabase credentials; otherwise preserve the file
mirror fallback.

## Command plan

Run these commands only from an owner-approved VPS maintenance session. Do not
run them from a Codex agent session.

Set owner-approved shell variables first:

```bash
web_root=/var/www/dev.chinesearizona.com/web
runtime_root=/var/www/runtime-data/dev.chinesearizona.com/web
unit_source="$web_root/../../ops/radar-hermes-egress"
backup_dir=/root/radar-hermes-egress-backup-$(date -u +%Y%m%dT%H%M%SZ)
cities="arizona austin los-angeles sf-bay"
worker_user=radar-hermes
worker_group=radar-hermes
cron_user=approved-cron-user
```

Replace `approved-cron-user` with the owner-approved account that currently
owns the radar cron entries.

### Backup

```bash
sudo install -d -m 0700 "$backup_dir"
sudo cp -a /etc/systemd/system/radar-hermes-worker@.service "$backup_dir/" 2>/dev/null || true
sudo cp -a /etc/systemd/system/radar-hermes-worker@.timer "$backup_dir/" 2>/dev/null || true
sudo cp -a /etc/nftables.d/radar-hermes-worker.nft "$backup_dir/" 2>/dev/null || true
sudo sh -c 'crontab -l > "$1/root.cron" 2>/dev/null || true' sh "$backup_dir"
sudo sh -c 'crontab -u "$1" -l > "$2/$1.cron" 2>/dev/null || true' sh "$cron_user" "$backup_dir"
sudo tar -C "$runtime_root" -czf "$backup_dir/radar-runtime-stores.tgz" \
  data/radar-runtime/store.json \
  data/sites/austin/radar-runtime/store.json \
  data/sites/los-angeles/radar-runtime/store.json \
  data/sf-bay-radar-runtime/store.json 2>/dev/null || true
```

Keep the backed-up cron entries available for rollback. Before enabling a
systemd timer for a city, ensure its old cron schedule cannot fire in the same
window and publish duplicate items.

### Dry-run

```bash
sudo getent group "$worker_group" >/dev/null || sudo groupadd --system "$worker_group"
sudo id -u "$worker_user" >/dev/null 2>&1 || sudo useradd --system --no-create-home --gid "$worker_group" --shell /usr/sbin/nologin "$worker_user"
sudo getent passwd "$worker_user"
sudo test -d "$web_root"
sudo test -d "$runtime_root"
sudo install -d -o "$worker_user" -g "$worker_group" -m 0750 "$runtime_root"
for store_dir in \
  data/radar-runtime \
  data/sites/austin/radar-runtime \
  data/sites/los-angeles/radar-runtime \
  data/sf-bay-radar-runtime
do
  sudo install -d -o "$worker_user" -g "$worker_group" -m 0750 "$runtime_root/$store_dir"
done
sudo install -d -m 0750 /etc/chinesearizona/radar-hermes
sudo install -m 0644 "$unit_source/systemd/radar-hermes-worker@.service" /etc/systemd/system/radar-hermes-worker@.service
sudo install -m 0644 "$unit_source/systemd/radar-hermes-worker@.timer" /etc/systemd/system/radar-hermes-worker@.timer
sudo systemd-analyze verify /etc/systemd/system/radar-hermes-worker@.service /etc/systemd/system/radar-hermes-worker@.timer
sudo systemctl daemon-reload
for city in $cities; do
  sudo systemctl start --dry-run "radar-hermes-worker@$city.service"
done
sudo nft -c -f "$unit_source/nftables/radar-hermes-worker.nft"
```

If any dry-run fails, stop and fix the owner-approved host copy or owner
decision before enabling anything.

### Enable systemd layer

Enable one city at a time in the approved order:

```bash
city=arizona
sudo systemctl start "radar-hermes-worker@$city.service"
sudo systemctl status --no-pager "radar-hermes-worker@$city.service"
sudo systemctl enable --now "radar-hermes-worker@$city.timer"
sudo systemctl list-timers --all "radar-hermes-worker@$city.timer"
```

After one manual run and one scheduled timer run succeed for that city, disable
the old cron entry for that city while keeping the backup. Repeat for the next
city.

### Verify

Use non-sensitive checks only:

- `systemctl status --no-pager radar-hermes-worker@<city>.service`
- `systemctl list-timers --all radar-hermes-worker@<city>.timer`
- confirm each runtime store file has a fresh timestamp and a new successful
  run record without printing store contents
- confirm the public page for each city still shows fresh news through the
  normal web UI or a status-only smoke check
- confirm blocked metadata, loopback, private, reserved, and internal ranges
  with status-only probes; do not print response bodies, headers, environment
  variables, routes, or resolver contents

The rollout is not complete until Arizona, Austin, Los Angeles, and SF Bay each
have one successful systemd-scheduled run and their prior cron entry is disabled
or documented as intentionally retained.

### Optional nftables phase

Only after the systemd layer is stable and DNS behavior is approved:

```bash
sudo install -m 0644 "$unit_source/nftables/radar-hermes-worker.nft" /etc/nftables.d/radar-hermes-worker.nft
sudo nft -c -f /etc/nftables.d/radar-hermes-worker.nft
sudo nft -f /etc/nftables.d/radar-hermes-worker.nft
```

Then rerun the same city verification checks. If public feeds fail after
nftables is loaded, roll back the nftables phase first and leave the systemd
`IPAddressDeny` layer in place while the owner reviews DNS and port behavior.

### Rollback

```bash
for city in $cities; do
  sudo systemctl disable --now "radar-hermes-worker@$city.timer" 2>/dev/null || true
  sudo systemctl stop "radar-hermes-worker@$city.service" 2>/dev/null || true
done
sudo nft delete table inet radar_hermes_egress 2>/dev/null || true
sudo cp -a "$backup_dir/radar-hermes-worker@.service" /etc/systemd/system/ 2>/dev/null || true
sudo cp -a "$backup_dir/radar-hermes-worker@.timer" /etc/systemd/system/ 2>/dev/null || true
sudo systemctl daemon-reload
sudo crontab "$backup_dir/root.cron" 2>/dev/null || true
sudo crontab -u "$cron_user" "$backup_dir/$cron_user.cron" 2>/dev/null || true
```

After rollback, run the previous city command for the affected city and confirm
status only. Do not paste logs or store contents into public tracking.
