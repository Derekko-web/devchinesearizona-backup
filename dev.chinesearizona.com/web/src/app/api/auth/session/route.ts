import { NextRequest, NextResponse } from 'next/server';

import {
  clearSessionCookies,
  getServerAuthFromRequest,
  readAuthTokensFromRequest,
  writeSessionCookies,
} from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  const tokens = readAuthTokensFromRequest(request);
  if (!tokens.accessToken && !tokens.refreshToken) {
    return NextResponse.json({ user: null });
  }

  const auth = await getServerAuthFromRequest(request);
  if (!auth.user) {
    const response = NextResponse.json({ user: null }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }

  const response = NextResponse.json({ user: auth.user });
  if (auth.didRefresh && auth.session) {
    writeSessionCookies(response, auth.session);
  }

  return response;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    expiresAt?: number;
  };

  if (!body.accessToken || !body.refreshToken) {
    return NextResponse.json({ message: 'Missing session tokens.' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  writeSessionCookies(response, {
    access_token: body.accessToken,
    refresh_token: body.refreshToken,
    expires_in: body.expiresIn ?? 3600,
    expires_at:
      body.expiresAt ?? Math.floor(Date.now() / 1000) + Math.max(60, body.expiresIn ?? 3600),
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
