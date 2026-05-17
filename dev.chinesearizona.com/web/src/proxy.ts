import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const apexHost = 'chinesearizona.com';
const redirectHosts = new Set(['www.chinesearizona.com']);

function normalizeHost(host?: string | null): string | null {
  if (!host) {
    return null;
  }

  return host.toLowerCase().split(':', 1)[0] ?? null;
}

export function shouldRedirectToApex(host?: string | null): boolean {
  const normalizedHost = normalizeHost(host);
  return normalizedHost ? redirectHosts.has(normalizedHost) : false;
}

export function proxy(request: NextRequest) {
  const host = normalizeHost(request.headers.get('host'));

  if (!shouldRedirectToApex(host)) {
    return NextResponse.next();
  }

  const targetUrl = request.nextUrl.clone();
  targetUrl.protocol = 'https';
  targetUrl.hostname = apexHost;
  targetUrl.port = '';

  return NextResponse.redirect(targetUrl, 308);
}

export const config = {
  matcher: '/:path*',
};
