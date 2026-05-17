import { NextRequest, NextResponse } from 'next/server';

import { buildGoogleAuthPath } from '@/lib/auth';
import { resolveLocale } from '@/lib/i18n';
import { getRequestBaseUrl } from '@/lib/request-url';

export async function GET(request: NextRequest) {
  const baseUrl = getRequestBaseUrl(request);
  const locale = resolveLocale(request.nextUrl.searchParams.get('locale') ?? undefined);
  const nextPath = request.nextUrl.searchParams.get('next');

  return NextResponse.redirect(new URL(buildGoogleAuthPath(locale, nextPath), baseUrl), {
    status: 303,
  });
}
