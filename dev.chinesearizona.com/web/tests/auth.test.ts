import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildAuthCompletePath,
  buildAuthCompleteUrl,
  buildAuthPath,
  buildGoogleAuthPath,
  buildJoinPath,
  buildPostAuthRedirectUrl,
  normalizeAuthBaseUrl,
  resolvePostAuthPath,
  sanitizeAuthRedirect,
} from '@/lib/auth';
import { getRequestBaseUrl } from '@/lib/request-url';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

async function loadPageAuthModule() {
  const redirect = vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  });
  const notFound = vi.fn(() => {
    throw new Error('notFound');
  });
  const getServerUserFromCookies = vi.fn();
  const getProfileByAuthUserId = vi.fn();

  vi.doMock('next/navigation', () => ({
    redirect,
    notFound,
  }));
  vi.doMock('@/lib/server-auth', () => ({
    getServerUserFromCookies,
  }));
  vi.doMock('@/lib/profile-auth', () => ({
    getProfileByAuthUserId,
  }));

  const pageAuth = await import('@/lib/page-auth');

  return {
    ...pageAuth,
    redirect,
    notFound,
    getServerUserFromCookies,
    getProfileByAuthUserId,
  };
}

describe('auth helpers', () => {
  it('accepts only safe relative redirects', () => {
    expect(sanitizeAuthRedirect('/en/dashboard')).toBe('/en/dashboard');
    expect(sanitizeAuthRedirect('https://example.com')).toBeUndefined();
    expect(sanitizeAuthRedirect('//example.com')).toBeUndefined();
  });

  it('falls back to the localized home page when next is missing or points at auth', () => {
    expect(resolvePostAuthPath('en')).toBe('/en');
    expect(resolvePostAuthPath('zh', '/zh/auth')).toBe('/zh');
    expect(resolvePostAuthPath('en', '/auth')).toBe('/en');
    expect(resolvePostAuthPath('en', '/en/auth/login')).toBe('/en');
    expect(resolvePostAuthPath('zh', '/zh/auth/join')).toBe('/zh');
  });

  it('builds localized auth links and keeps the return path', () => {
    expect(buildAuthPath('en')).toBe('/en/auth/login');
    expect(buildJoinPath('en')).toBe('/en/auth/join');
    expect(buildAuthPath('zh', '/zh/community?tab=events')).toBe('/zh/auth/login?next=%2Fzh%2Fcommunity%3Ftab%3Devents');
    expect(buildAuthPath('en', '/en/auth/login')).toBe('/en/auth/login');
    expect(buildGoogleAuthPath('en', '/en/shop')).toBe('/en/auth/google?next=%2Fen%2Fshop');
    expect(buildAuthCompletePath('zh', 'join', '/zh/shop/sell')).toBe('/zh/auth/join?complete=1&next=%2Fzh%2Fshop%2Fsell');
  });

  it('builds absolute post-auth destinations without routing back through auth', () => {
    expect(buildPostAuthRedirectUrl('https://chinesearizona.com', 'en')).toBe('https://chinesearizona.com/en');
    expect(buildPostAuthRedirectUrl('https://chinesearizona.com', 'zh', '/zh/community')).toBe(
      'https://chinesearizona.com/zh/community'
    );
    expect(buildAuthCompleteUrl('https://localhost:3000', 'en', 'login', '/en/shop')).toBe(
      'http://localhost:3000/en/auth/login?complete=1&next=%2Fen%2Fshop'
    );
  });

  it('normalizes localhost auth redirects back to http during local development', () => {
    expect(normalizeAuthBaseUrl('https://localhost:3000')).toBe('http://localhost:3000');
    expect(normalizeAuthBaseUrl('https://127.0.0.1:3000')).toBe('http://127.0.0.1:3000');
    expect(normalizeAuthBaseUrl('https://chinesearizona.com')).toBe('https://chinesearizona.com');
  });

  it('builds request base URLs from forwarded proxy headers when available', () => {
    expect(
      getRequestBaseUrl({
        headers: new Headers({
          'x-forwarded-host': 'dev.chinesearizona.com',
          'x-forwarded-proto': 'https',
        }),
        nextUrl: new URL('http://127.0.0.1:3000/en/auth/join'),
      } as never)
    ).toBe('https://dev.chinesearizona.com');
  });

  it('falls back to the request origin when forwarded headers are absent', () => {
    expect(
      getRequestBaseUrl({
        headers: new Headers(),
        nextUrl: new URL('https://localhost:3000/en/auth/join'),
      } as never)
    ).toBe('http://localhost:3000');
  });
});

describe('page auth guards', () => {
  it('redirects signed-out dashboard visits to localized login and preserves next', async () => {
    const {
      requireAuthenticatedPageUser,
      getServerUserFromCookies,
      redirect,
    } = await loadPageAuthModule();
    getServerUserFromCookies.mockResolvedValue(null);

    await expect(
      requireAuthenticatedPageUser('zh', '/zh/dashboard')
    ).rejects.toThrow('redirect:/zh/auth/login?next=%2Fzh%2Fdashboard');
    expect(redirect).toHaveBeenCalledWith('/zh/auth/login?next=%2Fzh%2Fdashboard');
  });

  it('returns the current user for authenticated dashboard visits', async () => {
    const { requireAuthenticatedPageUser, getServerUserFromCookies } =
      await loadPageAuthModule();
    const user = { id: 'user_1', app_metadata: {}, email: 'owner@example.com' };
    getServerUserFromCookies.mockResolvedValue(user);

    await expect(
      requireAuthenticatedPageUser('en', '/en/dashboard')
    ).resolves.toEqual(user);
  });

  it('returns notFound for unauthorized admin visits', async () => {
    const {
      requireStaffPageContext,
      getServerUserFromCookies,
      getProfileByAuthUserId,
      notFound,
    } = await loadPageAuthModule();
    getServerUserFromCookies.mockResolvedValue({
      id: 'user_2',
      app_metadata: { role: 'member' },
      email: 'member@example.com',
    });
    getProfileByAuthUserId.mockResolvedValue({
      id: 'profile_2',
      slug: 'member',
      name: 'Member',
      name_zh_tw: '會員',
      role: 'member',
      city: 'Phoenix',
      languages: ['English'],
      bio_en: 'Member bio',
      bio_zh_tw: '會員簡介',
      auth_user_id: 'user_2',
    });

    await expect(requireStaffPageContext()).rejects.toThrow('notFound');
    expect(notFound).toHaveBeenCalled();
  });

  it('returns notFound for stale elevated profile roles without app metadata', async () => {
    const {
      requireStaffPageContext,
      getServerUserFromCookies,
      getProfileByAuthUserId,
      notFound,
    } = await loadPageAuthModule();
    getServerUserFromCookies.mockResolvedValue({
      id: 'user_3',
      app_metadata: {},
      email: 'moderator@example.com',
    });
    getProfileByAuthUserId.mockResolvedValue({
      id: 'profile_3',
      slug: 'moderator',
      name: 'Moderator',
      name_zh_tw: '版主',
      role: 'moderator',
      city: 'Mesa',
      languages: ['English', '中文'],
      bio_en: 'Moderator bio',
      bio_zh_tw: '版主簡介',
      auth_user_id: 'user_3',
    });

    await expect(requireStaffPageContext()).rejects.toThrow('notFound');
    expect(notFound).toHaveBeenCalled();
  });

  it('allows moderator and admin app metadata roles into admin surfaces', async () => {
    const {
      requireStaffPageContext,
      getServerUserFromCookies,
      getProfileByAuthUserId,
    } = await loadPageAuthModule();
    getServerUserFromCookies.mockResolvedValue({
      id: 'user_3',
      app_metadata: { role: 'moderator' },
      email: 'moderator@example.com',
    });
    getProfileByAuthUserId.mockResolvedValue({
      id: 'profile_3',
      slug: 'moderator',
      name: 'Moderator',
      name_zh_tw: '版主',
      role: 'member',
      city: 'Mesa',
      languages: ['English', '中文'],
      bio_en: 'Moderator bio',
      bio_zh_tw: '版主簡介',
      auth_user_id: 'user_3',
    });

    await expect(requireStaffPageContext()).resolves.toMatchObject({
      role: 'moderator',
      user: {
        id: 'user_3',
      },
    });
  });
});
