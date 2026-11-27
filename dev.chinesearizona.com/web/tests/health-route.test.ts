import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/health/route';

const ANON_KEY = 'test-anon-key';

type FakeMode = 'healthy' | 'rejects-key' | 'hangs';

let server: http.Server | null = null;

// Behaves like Supabase's REST gateway for the parts the health probe touches:
// requests need a valid apikey, known public tables answer with rows, and
// unknown tables are 404s.
async function startFakeSupabase(mode: FakeMode): Promise<string> {
  server = http.createServer((request, response) => {
    if (mode === 'hangs') {
      return;
    }

    if (mode === 'rejects-key' || request.headers.apikey !== ANON_KEY) {
      response.writeHead(401, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ message: 'Invalid API key' }));
      return;
    }

    const url = new URL(request.url ?? '/', 'http://localhost');
    if (url.pathname === '/rest/v1/business_categories') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify([{ id: '0b0f6d43-2f69-4c0e-9d4e-8f0f8f2b9a11' }]));
      return;
    }

    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ code: 'PGRST205', message: 'Could not find the table' }));
  });

  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

// A port that was just bound and released, so nothing is listening on it.
async function closedPortUrl(): Promise<string> {
  const probe = http.createServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const { port } = probe.address() as AddressInfo;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return `http://127.0.0.1:${port}`;
}

function configureSupabase(url: string) {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://dev.chinesearizona.com');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', ANON_KEY);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', ANON_KEY);
}

afterEach(async () => {
  vi.unstubAllEnvs();
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = null;
  }
});

describe('GET /api/health Supabase reachability', () => {
  it('reports healthy when Supabase answers a public query', async () => {
    configureSupabase(await startFakeSupabase('healthy'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.checks.supabaseReachable).toMatchObject({ ok: true, required: true });
  });

  it('returns 503 when the Supabase host cannot be reached', async () => {
    configureSupabase(await closedPortUrl());

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.checks.supabaseReachable).toMatchObject({ ok: false, required: true });
  });

  it('returns 503 when Supabase answers but rejects the key', async () => {
    configureSupabase(await startFakeSupabase('rejects-key'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.checks.supabaseReachable.ok).toBe(false);
    expect(body.checks.supabaseReachable.message).toContain('401');
  });

  it('gives up on a Supabase that never answers instead of hanging', async () => {
    configureSupabase(await startFakeSupabase('hangs'));

    const startedAt = Date.now();
    const response = await GET();
    const body = await response.json();

    expect(Date.now() - startedAt).toBeLessThan(4000);
    expect(response.status).toBe(503);
    expect(body.checks.supabaseReachable.ok).toBe(false);
  }, 10_000);

  it('reports Supabase as unreachable without crashing when it is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://dev.chinesearizona.com');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.checks.supabaseReachable).toMatchObject({ ok: false, required: true });
  });
});

describe('GET /api/health email checks (#464)', () => {
  it('shows email as off without failing the health check', async () => {
    configureSupabase(await startFakeSupabase('healthy'));
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('EMAIL_FROM', '');
    vi.stubEnv('ADMIN_NOTIFICATION_EMAIL', '');

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.checks.email).toMatchObject({ ok: false, required: false });
    expect(body.checks.email.message).toContain('nobody is emailed');
    expect(body.checks.adminNotificationEmail).toMatchObject({ ok: false, required: false });
  });

  it('shows email as on once Resend and the admin address are set', async () => {
    configureSupabase(await startFakeSupabase('healthy'));
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('EMAIL_FROM', 'ChineseArizona <leads@chinesearizona.com>');
    vi.stubEnv('ADMIN_NOTIFICATION_EMAIL', 'admin@chinesearizona.com');

    const body = await (await GET()).json();

    expect(body.checks.email).toMatchObject({ ok: true, required: false });
    expect(body.checks.adminNotificationEmail).toMatchObject({ ok: true, required: false });
    // Configuration state only: never the key or the addresses themselves.
    expect(JSON.stringify(body)).not.toContain('re_test_key');
    expect(JSON.stringify(body)).not.toContain('admin@chinesearizona.com');
  });
});
