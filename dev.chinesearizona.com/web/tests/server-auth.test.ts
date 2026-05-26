import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

async function loadServerAuthModule() {
  const getUser = vi.fn();
  const refreshSession = vi.fn();

  vi.doMock('next/headers', () => ({
    cookies: vi.fn(),
  }));
  vi.doMock('@/lib/supabase', () => ({
    getSupabaseClient: vi.fn(() => ({
      auth: {
        getUser,
        refreshSession,
      },
    })),
  }));

  const serverAuth = await import('@/lib/server-auth');

  return {
    ...serverAuth,
    getUser,
    refreshSession,
  };
}

describe('server auth token resolution', () => {
  it('uses the access token when it is still valid', async () => {
    const { resolveServerAuthTokens, getUser, refreshSession } =
      await loadServerAuthModule();

    getUser.mockResolvedValue({
      data: {
        user: { id: 'user_valid' },
      },
      error: null,
    });

    await expect(
      resolveServerAuthTokens({
        accessToken: 'access_valid',
        refreshToken: 'refresh_valid',
      })
    ).resolves.toMatchObject({
      didRefresh: false,
      session: null,
      user: {
        id: 'user_valid',
      },
    });
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('refreshes the session when the access token is stale', async () => {
    const { resolveServerAuthTokens, getUser, refreshSession } =
      await loadServerAuthModule();

    getUser.mockResolvedValue({
      data: {
        user: null,
      },
      error: new Error('expired'),
    });
    refreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'access_fresh',
          refresh_token: 'refresh_fresh',
          expires_in: 3600,
          expires_at: 1_900_000_000,
          token_type: 'bearer',
          user: { id: 'user_refreshed' },
        },
        user: {
          id: 'user_refreshed',
        },
      },
      error: null,
    });

    await expect(
      resolveServerAuthTokens({
        accessToken: 'access_stale',
        refreshToken: 'refresh_stale',
      })
    ).resolves.toMatchObject({
      didRefresh: true,
      session: {
        access_token: 'access_fresh',
        refresh_token: 'refresh_fresh',
      },
      user: {
        id: 'user_refreshed',
      },
    });
  });

  it('treats transient Supabase auth failures as a signed-out request', async () => {
    const { resolveServerAuthTokens, getUser, refreshSession } =
      await loadServerAuthModule();

    getUser.mockRejectedValue(new Error('<html>Cloudflare Error 522</html>'));
    refreshSession.mockRejectedValue(new Error('fetch failed'));

    await expect(
      resolveServerAuthTokens({
        accessToken: 'access_stale',
        refreshToken: 'refresh_stale',
      })
    ).resolves.toMatchObject({
      didRefresh: false,
      session: null,
      user: null,
    });
    expect(refreshSession).toHaveBeenCalled();
  });
});
