import { describe, expect, it } from 'vitest';

import {
  buildSmokeChecks,
  extractDeployIds,
  extractDirectoryCounts,
  runSmokeCheck,
} from '../scripts/smoke-dev.mjs';

function textResponse(body, init = {}) {
  return new Response(body, {
    status: init.status || 200,
    headers: init.headers || {
      'content-type': 'text/html; charset=utf-8',
    },
  });
}

describe('deploy smoke script', () => {
  it('extracts rendered directory counts from server HTML', () => {
    expect(
      extractDirectoryCounts(
        '<main>Showing 1-24 of 322</main><script>Showing 1-24 of 335</script>'
      )
    ).toEqual([322, 335]);
  });

  it('extracts Next deploy identifiers from HTML and asset URLs', () => {
    expect(
      extractDeployIds(
        '<html data-dpl-id="a2ae78757e262ba881109d053525946c04ac03fa"><script src="/_next/app.js?dpl=4f3f644"></script>'
      )
    ).toEqual(['a2ae78757e262ba881109d053525946c04ac03fa', '4f3f644']);
  });

  it('builds public city-domain checks by default', () => {
    const checks = buildSmokeChecks({
      DEV_SITE_URL: 'https://dev.example.com/',
      SMOKE_AUSTIN_URL: 'https://austin.example.com/',
      SMOKE_LOS_ANGELES_URL: 'https://la.example.com/',
      SMOKE_SF_BAY_URL: 'https://sf.example.com/',
    });

    expect(checks.map((check) => check.id)).toEqual(
      expect.arrayContaining([
        'dev:health',
        'ChineseAustin:business-directory',
        'ChineseLosAngeles:business-directory',
        'ChineseSFBay:business-directory',
      ])
    );
  });

  it('can limit checks to the primary dev domain for local debugging', () => {
    const checks = buildSmokeChecks({
      DEV_SITE_URL: 'https://dev.example.com/',
      SMOKE_SKIP_PUBLIC_DOMAINS: 'true',
    });

    expect(checks.some((check) => check.id === 'ChineseAustin:business-directory')).toBe(false);
    expect(checks.some((check) => check.id === 'dev:health')).toBe(true);
  });

  it('fails health checks when the deployed SHA is stale', async () => {
    const result = await runSmokeCheck(
      {
        expectedStatuses: [200],
        followRedirects: true,
        id: 'dev:health',
        kind: 'health',
        origin: 'https://dev.example.com',
        path: '/api/health',
      },
      {
        expectedGitSha: 'new-sha',
        fetchImpl: async () =>
          textResponse(
            JSON.stringify({
              buildTime: '2026-06-03T23:32:58Z',
              checks: {
                app: { ok: true, required: true },
              },
              gitSha: 'old-sha',
              ok: true,
              uptimeSeconds: 30,
            }),
            {
              headers: {
                'content-type': 'application/json',
              },
            }
          ),
        timeoutMs: 1000,
        userAgent: 'test',
      }
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Health gitSha old-sha does not match expected new-sha');
  });

  it('fails city directory checks when the count drops below the required minimum', async () => {
    const result = await runSmokeCheck(
      {
        expectedStatuses: [200],
        followRedirects: true,
        id: 'ChineseAustin:business-directory',
        kind: 'html',
        minDirectoryCount: 200,
        origin: 'https://austin.example.com',
        path: '/business',
        requiredText: ['ChineseAustin', 'Showing 1-24', 'Austin', 'Round Rock'],
      },
      {
        expectedGitSha: 'new-sha',
        fetchImpl: async () =>
          textResponse(
            '<html data-dpl-id="new-sha"><body>ChineseAustin Austin Round Rock Showing 1-24 of 35</body></html>'
          ),
        timeoutMs: 1000,
        userAgent: 'test',
      }
    );

    expect(result.ok).toBe(false);
    expect(result.maxDirectoryCount).toBe(35);
    expect(result.errors).toContain('Directory count 35 is below required minimum 200');
  });

  it('passes directory redirect checks only when the location targets business', async () => {
    const result = await runSmokeCheck(
      {
        expectedLocationPath: '/business',
        expectedStatuses: [301, 302, 307, 308],
        followRedirects: false,
        id: 'ChineseAustin:directory-redirect',
        kind: 'redirect',
        origin: 'https://austin.example.com',
        path: '/directory',
      },
      {
        expectedGitSha: 'new-sha',
        fetchImpl: async () =>
          textResponse('', {
            status: 308,
            headers: {
              location: '/business',
            },
          }),
        timeoutMs: 1000,
        userAgent: 'test',
      }
    );

    expect(result.ok).toBe(true);
    expect(result.locationPath).toBe('/business');
  });
});
