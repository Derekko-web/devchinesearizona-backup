# Radar and Hermes security hardening assessment

Issue: #58

This note keeps the broader hardening assessment separate from the PR #57 URL
validation remediation.

## Current controls

- `scripts/arizona_radar/core.cjs` normalizes generated source, canonical,
  additional source, and hero URLs. It rejects non-http(s) schemes,
  credentials, local hostnames, and private/reserved literal IP hosts.
- `scripts/arizona_radar/run.cjs` routes RSS feed and source article fetches
  through `resolveFetchablePublicUrl`, which normalizes the URL and rejects DNS
  answers that resolve to private/reserved hosts before calling `fetch`.
- Feed rewrite mode tells Hermes to use the already-fetched source material and
  not browse. Open-web mode still launches Hermes as a separate process with
  broad network capability.

## Egress control assessment

Radar/Hermes workers still need infrastructure-level egress controls. The
application checks reduce obvious SSRF exposure, but Hermes open-web mode can
perform its own network activity outside the feed fetch wrapper. A regression in
URL validation or a tool behavior change should not be enough to reach metadata,
loopback, RFC1918, private, reserved, or internal network targets.

Issue #59 implementation plan:

- Runtime boundary: PM2 runs the Next.js app, while host cron/scheduler wrappers
  start the radar worker. The worker launches Hermes as a child process with
  `spawnSync`, so the infrastructure boundary must wrap the scheduler-launched
  worker process tree.
- Safest practical repo change: add owner-reviewed templates under
  `ops/radar-hermes-egress/` for a systemd service/timer boundary and an
  optional nftables per-worker policy.
- First layer: run each city radar job through
  `radar-hermes-worker@.service`, which applies `IPAddressDeny` to metadata,
  loopback, RFC1918, private, reserved, documentation, benchmark, link-local,
  multicast, and unique-local ranges for both Node and Hermes.
- Optional stricter layer: after the owner confirms DNS behavior, apply the
  nftables template for a dedicated worker identity so only public DNS and
  HTTP(S) destination ports remain available.
- Preservation: the city generation command remains
  `node scripts/arizona_radar/run.cjs run --site=<city>`. Keep existing cron
  active until a dry-run and one scheduled run succeed for each city, then
  disable the old cron entry to avoid duplicates.
- Owner/VPS decision: the repository can provide templates and checks, but the
  VPS owner or delegated operator must choose the worker identity, runtime data
  write path, timer cadence, DNS path, and whether to enable the nftables
  allowlist. Follow-up #64 tracks that owner-managed rollout.

Do not put credentials, live internal endpoints, host-specific secret paths,
runtime logs, or private VPS details in the implementation issue, PR body,
fixtures, or docs.

## DNS pinning and dispatcher assessment

Feed fetching should also get connection-time address validation beyond the
current DNS preflight. The preflight checks every address returned before the
request, but the subsequent `fetch` call resolves again and follows redirects.
That leaves a time-of-check/time-of-use gap and a redirect target gap.

Recommended follow-up: #60 should wrap or replace feed/article fetches with a
custom dispatcher or lookup path that validates the selected connection address,
manually validates redirect targets, keeps a low redirect limit, and preserves
the existing timeout and user-agent behavior.

## Production dependency advisory assessment

`npm audit --omit=dev` initially reported production advisories through:

- `next@16.2.3`, including high-severity Next.js advisories fixed by 16.2.6.
- `next` bundled `postcss`, affected by GHSA-qx2v-qp2m-jg93.
- `convex` bundled `ws`, affected by GHSA-58qx-3vcg-4xpx.

This PR applies the small dependency mitigation:

- Upgrade `next` and `eslint-config-next` from 16.2.3 to 16.2.6.
- Override Next's transitive `postcss` to 8.5.10.
- Override Convex's transitive `ws` to 8.20.1.
- Refresh the flattened production `ws` lockfile entry to a non-vulnerable
  8.21.0 release.

The Convex advisory should not be handled by downgrading Convex to 1.31.7 just
because `npm audit --force` offers it; that would be a semver-major downgrade
relative to the current app line. Follow-up #61 tracks replacing the override
with a forward Convex upgrade when upstream publishes a patched dependency path.

After the mitigation, `npm audit --omit=dev` reports zero production
vulnerabilities. The remaining full-audit findings are dev-only and outside the
production advisory scope of #58.

## Data handling

Do not include credentials, live internal endpoints, runtime store contents, or
production logs in comments, fixtures, issue bodies, or PRs for this work.
