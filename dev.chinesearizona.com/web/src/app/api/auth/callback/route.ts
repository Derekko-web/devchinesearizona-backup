import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { buildPostAuthRedirectUrl, resolvePostAuthPath } from '@/lib/auth';
import { resolveLocale } from '@/lib/i18n';
import { getRequestBaseUrl } from '@/lib/request-url';
import { writeSessionCookies } from '@/lib/server-auth';
import { getSupabasePublicKey, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const baseUrl = getRequestBaseUrl(request);
  const locale = resolveLocale(request.nextUrl.searchParams.get('locale') ?? undefined);
  const nextPath = request.nextUrl.searchParams.get('next');
  const authCode = request.nextUrl.searchParams.get('code');
  const redirectTarget = buildPostAuthRedirectUrl(baseUrl, locale, nextPath);

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL(resolvePostAuthPath(locale, nextPath), baseUrl), { status: 303 });
  }

  if (!authCode) {
    return NextResponse.redirect(new URL(redirectTarget), { status: 303 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    getSupabasePublicKey() as string,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  const { data, error } = await supabase.auth
    .exchangeCodeForSession(authCode)
    .catch((error: unknown) => ({ data: { session: null }, error }));
  if (error || !data.session) {
    return NextResponse.redirect(new URL(redirectTarget), { status: 303 });
  }

  const response = NextResponse.redirect(new URL(redirectTarget), { status: 303 });
  writeSessionCookies(response, data.session);
  return response;
}
