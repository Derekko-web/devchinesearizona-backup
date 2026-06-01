# Radar/Hermes egress controls

Issue: #59
Owner-managed rollout follow-up: #64

This directory contains reviewable host policy templates for putting the
radar/Hermes worker process tree behind an infrastructure egress boundary.
They are templates only. Do not apply them directly to a live host without an
owner-approved rollout.

Use `rollout-plan.md` for the owner-approved Hostinger VPS command plan, city
matrix, verification gates, and rollback checklist.

## Runtime boundary

The current application boundary is not enough for open-web Hermes runs:

- PM2 runs the Next.js web process only.
- The radar refresh path starts from the host scheduler and shell wrappers under
  `dev.chinesearizona.com/web/scripts/*_radar/`.
- `scripts/arizona_radar/run.cjs` launches Hermes with `spawnSync`, so Hermes
  inherits the network capability of the worker process.

The egress boundary therefore needs to wrap the scheduler-launched worker
process tree, not only the Next.js PM2 process and not only the application URL
normalization code.

## Recommended path

1. Create a dedicated unprivileged runtime identity for radar/Hermes workers.
   The identity should not be reused by the web server, deploy tooling, shell
   users, or database maintenance tasks.
2. Move each city radar job from cron into a systemd timer that starts
   `radar-hermes-worker@.service`.
3. Enable the systemd `IPAddressDeny` policy in the service template first. This
   blocks metadata, loopback, RFC1918, carrier-grade NAT, link-local, multicast,
   documentation, benchmark, unique-local, non-global IPv6, and other reserved
   ranges for the Node worker and the Hermes child process.
4. After the owner confirms DNS behavior, optionally add the nftables per-user
   policy to limit the dedicated worker identity to public DNS and HTTP(S)
   destination ports. If the host resolver is loopback-only, choose a public
   resolver path before enabling the nftables port allowlist.
5. Keep the existing cron job enabled until one dry-run and one scheduled run
   succeed for each city. Then disable the old cron entry to avoid duplicate
   publishing.

## GitHub Actions runtime operator

The `Radar Hermes Runtime Egress` workflow uses the existing `DEV_VPS_HOST` and
`DEV_VPS_PORT` connection target, but it must authenticate with an
owner-approved runtime operator through these dedicated repository secrets:

- `DEV_VPS_RUNTIME_EGRESS_USER`
- `DEV_VPS_RUNTIME_EGRESS_SSH_KEY`

Set those to a privileged operator account, or to a dedicated account that has
owner-approved passwordless sudo only for the runtime egress installer,
systemd, crontab, nftables, backup, ownership, and user-management commands
used by `install-app-env-override.sh` and `apply-runtime-deploy.sh`. Do not set
them to an account that requires interactive sudo, and do not store sudo
passwords in GitHub Actions.

This path preserves existing city news generation because each systemd instance
still runs the same worker entrypoint with only the city site key changing:

```bash
node scripts/arizona_radar/run.cjs run --site=<city>
```

The service/timer layer changes only the runtime boundary around that command.
For the Hostinger VPS runtime, the template expects the web checkout at
`/var/www/dev.chinesearizona.com/web` and mutable radar data under
`/var/www/runtime-data/dev.chinesearizona.com/web`, matching the existing deploy
workflow. If the owner changes those runtime paths, update the owner-approved
host copy before enabling any timer.

## Files

- `systemd/radar-hermes-worker@.service`: systemd oneshot worker template with
  egress deny ranges.
- `systemd/radar-hermes-worker@.timer`: timer template for owner-selected
  cadence.
- `nftables/radar-hermes-worker.nft`: optional stricter per-user policy that
  denies internal/reserved destinations and allows only DNS plus HTTP(S) for the
  dedicated worker identity.

## Owner decisions

The operations owner is the repository owner or delegated VPS operator. Before
applying these templates, that owner must decide and record:

- the dedicated worker username or UID
- the runtime data directory that the worker may write
- the city timer cadence
- whether DNS is resolved through a public resolver path or a local host stub
- whether the optional nftables port allowlist is acceptable for Hermes

Do not record credentials, live private endpoints, host-specific secret paths,
or production log output in issues, PRs, fixtures, or docs.

## Dry-run verification

Use dry-run checks before applying host policy:

```bash
systemd-analyze verify /etc/systemd/system/radar-hermes-worker@.service
nft -c -f /etc/nftables.d/radar-hermes-worker.nft
systemctl start --dry-run radar-hermes-worker@arizona.service
```

For runtime validation, use only non-sensitive checks. Confirm public HTTPS
works with a public documentation host, then confirm loopback, metadata,
private, and reserved ranges are blocked without printing environment variables,
credentials, request headers, or response bodies.

## Rollback

1. Stop and disable the `radar-hermes-worker@*.timer` instances.
2. Remove or disable the nftables `radar_hermes_egress` table if it was applied.
3. Re-enable the previous cron entries.
4. Run one city radar job with the previous wrapper and confirm the store updates
   normally.
5. Keep rollback notes limited to status, timestamps, and policy names. Do not
   paste credentials, internal routes, live private endpoints, or production log
   bodies.
