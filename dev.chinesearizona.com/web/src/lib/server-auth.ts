import type { Session, User } from '@supabase/supabase-js';
import type { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getSupabaseClient } from '@/lib/supabase';

export const ACCESS_TOKEN_COOKIE = 'ca-access-token';
export const REFRESH_TOKEN_COOKIE = 'ca-refresh-token';

const COOKIE_PATH = '/';
const DEFAULT_REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30;

type TokenPair = {
  accessToken?: string;
  refreshToken?: string;
};

type SessionCookiePayload = Pick<
  Session,
  'access_token' | 'refresh_token' | 'expires_in'
> & {
  expires_at?: number;
};

export type ResolvedServerAuth = {
  didRefresh: boolean;
  session: Session | null;
  user: User | null;
};

type CookieTarget = {
  set: (name: string, value: string, options: ReturnType<typeof cookieOptions>) => unknown;
};

function cookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: COOKIE_PATH,
    ...(typeof maxAge === 'number' && maxAge > 0 ? { maxAge } : {}),
  };
}

function sanitizeToken(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function readAuthTokensFromRequest(request: NextRequest): TokenPair {
  return {
    accessToken: sanitizeToken(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value),
    refreshToken: sanitizeToken(request.cookies.get(REFRESH_TOKEN_COOKIE)?.value),
  };
}

export async function readAuthTokensFromCookies(): Promise<TokenPair> {
  const cookieStore = await cookies();

  return {
    accessToken: sanitizeToken(cookieStore.get(ACCESS_TOKEN_COOKIE)?.value),
    refreshToken: sanitizeToken(cookieStore.get(REFRESH_TOKEN_COOKIE)?.value),
  };
}

export function writeSessionCookies(response: NextResponse, session: SessionCookiePayload) {
  applySessionCookies(response.cookies, session);
}

function applySessionCookies(target: CookieTarget, session: SessionCookiePayload) {
  const accessTokenMaxAge =
    typeof session.expires_in === 'number' && session.expires_in > 0
      ? Math.max(60, session.expires_in)
      : undefined;

  target.set(
    ACCESS_TOKEN_COOKIE,
    session.access_token,
    cookieOptions(accessTokenMaxAge)
  );
  target.set(
    REFRESH_TOKEN_COOKIE,
    session.refresh_token,
    cookieOptions(DEFAULT_REFRESH_TOKEN_MAX_AGE)
  );
}

export function clearSessionCookies(response: NextResponse) {
  clearSessionCookiesOnTarget(response.cookies);
}

function clearSessionCookiesOnTarget(target: CookieTarget) {
  target.set(ACCESS_TOKEN_COOKIE, '', {
    ...cookieOptions(0),
    maxAge: 0,
  });
  target.set(REFRESH_TOKEN_COOKIE, '', {
    ...cookieOptions(0),
    maxAge: 0,
  });
}

export async function resolveServerAuthTokens(tokens: TokenPair): Promise<ResolvedServerAuth> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      didRefresh: false,
      session: null,
      user: null,
    };
  }

  if (tokens.accessToken) {
    const { data, error } = await supabase.auth.getUser(tokens.accessToken);
    if (!error && data.user) {
      return {
        didRefresh: false,
        session: null,
        user: data.user,
      };
    }
  }

  if (!tokens.refreshToken) {
    return {
      didRefresh: false,
      session: null,
      user: null,
    };
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: tokens.refreshToken,
  });
  if (error || !data.session) {
    return {
      didRefresh: false,
      session: null,
      user: null,
    };
  }

  return {
    didRefresh: true,
    session: data.session,
    user: data.user ?? data.session.user ?? null,
  };
}

export async function getServerAuthFromRequest(request: NextRequest): Promise<ResolvedServerAuth> {
  return resolveServerAuthTokens(readAuthTokensFromRequest(request));
}

export async function getServerAuthFromCookies(): Promise<ResolvedServerAuth> {
  const cookieStore = await cookies();
  const tokens = {
    accessToken: sanitizeToken(cookieStore.get(ACCESS_TOKEN_COOKIE)?.value),
    refreshToken: sanitizeToken(cookieStore.get(REFRESH_TOKEN_COOKIE)?.value),
  };
  const auth = await resolveServerAuthTokens(tokens);

  if (auth.didRefresh && auth.session) {
    applySessionCookies(cookieStore, auth.session);
  } else if (!auth.user && (tokens.accessToken || tokens.refreshToken)) {
    clearSessionCookiesOnTarget(cookieStore);
  }

  return auth;
}

export async function getServerUserFromRequest(request: NextRequest): Promise<User | null> {
  const auth = await getServerAuthFromRequest(request);
  return auth.user;
}

export async function getServerUserFromCookies(): Promise<User | null> {
  const auth = await getServerAuthFromCookies();
  return auth.user;
}
