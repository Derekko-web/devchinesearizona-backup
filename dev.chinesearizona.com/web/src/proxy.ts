import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const apexHost = 'chinesearizona.com';
const redirectHosts = new Set(['www.chinesearizona.com']);
const apexRedirectBypassPaths = new Set(['/ads.txt']);
// Mutations use route handlers here; synthetic action headers only create noisy Next runtime errors.
const serverActionHeader = 'next-action';

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

export function shouldBypassApexRedirect(pathname?: string | null): boolean {
  return pathname ? apexRedirectBypassPaths.has(pathname) : false;
}

export function shouldRejectServerActionRequest(request: Pick<NextRequest, 'headers' | 'method'>): boolean {
  return request.method === 'POST' && request.headers.has(serverActionHeader);
}

export function proxy(request: NextRequest) {
  if (shouldRejectServerActionRequest(request)) {
    return new NextResponse(null, { status: 400 });
  }

  const host = normalizeHost(request.headers.get('host'));

  if (!shouldRedirectToApex(host) || shouldBypassApexRedirect(request.nextUrl.pathname)) {
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
