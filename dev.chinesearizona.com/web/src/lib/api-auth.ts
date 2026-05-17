import type { Session, User } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { ensureProfileForAuthUser, type AppProfileRow } from '@/lib/profile-auth';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getServerAuthFromRequest,
  readAuthTokensFromRequest,
  writeSessionCookies,
} from '@/lib/server-auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Locale } from '@/lib/types';

type RequireApiUserResult =
  | {
      response: NextResponse;
      profile: null;
      sessionToPersist: null;
      user: null;
    }
  | {
      profile: AppProfileRow | null;
      response: null;
      sessionToPersist: Session | null;
      user: User;
    };

function authRequiredMessage(locale: Locale, actionLabel?: string): string {
  if (locale === 'zh') {
    return actionLabel
      ? `請先登入，再${actionLabel}。`
      : '請先登入，再繼續這個操作。';
  }

  return actionLabel
    ? `Please log in to ${actionLabel}.`
    : 'Please log in before continuing.';
}

function readBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get('authorization')?.trim();
  if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  const token = authorization.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function requireApiUser(
  request: NextRequest,
  locale: Locale,
  actionLabel?: string
): Promise<RequireApiUserResult> {
  if (!isSupabaseConfigured()) {
    return {
      response: NextResponse.json(
        {
          message:
            locale === 'zh'
              ? '尚未設定登入環境，暫時無法完成這個帳號操作。'
              : 'Auth is not configured yet, so this account action is temporarily unavailable.',
        },
        { status: 503 }
      ),
      profile: null,
      sessionToPersist: null,
      user: null,
    };
  }

  const accessToken = readBearerToken(request) ?? readAuthTokensFromRequest(request).accessToken ?? null;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value?.trim() || null;
  const hasAccessCookie = Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value?.trim());
  if (!accessToken && !hasAccessCookie && !refreshToken) {
    return {
      response: NextResponse.json(
        {
          message: authRequiredMessage(locale, actionLabel),
        },
        { status: 401 }
      ),
      profile: null,
      sessionToPersist: null,
      user: null,
    };
  }

  const auth = await getServerAuthFromRequest(request);
  if (!auth.user) {
    return {
      response: NextResponse.json(
        {
          message: authRequiredMessage(locale, actionLabel),
        },
        { status: 401 }
      ),
      profile: null,
      sessionToPersist: null,
      user: null,
    };
  }

  const profile = await ensureProfileForAuthUser(auth.user);

  return {
    profile,
    response: null,
    sessionToPersist: auth.didRefresh ? auth.session : null,
    user: auth.user,
  };
}

export function withApiAuthSession<T extends NextResponse>(
  response: T,
  auth: { sessionToPersist: Session | null }
): T {
  if (auth.sessionToPersist) {
    writeSessionCookies(response, auth.sessionToPersist);
  }

  return response;
}
