import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { resolveSiteProfileFromHost, shouldNoIndexSiteProfile } from '@/lib/site-config';

const apexHost = 'chinesearizona.com';
const redirectHosts = new Set(['www.chinesearizona.com']);
const apexRedirectBypassPaths = new Set(['/ads.txt']);
// Mutations use route handlers here; synthetic action headers only create noisy Next runtime errors.
const serverActionHeader = 'next-action';
const noIndexHeader = 'X-Robots-Tag';
const noIndexHeaderValue = 'noindex, nofollow';

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

export function shouldEmitNoIndexHeader(host?: string | null): boolean {
  return shouldNoIndexSiteProfile(resolveSiteProfileFromHost(host));
}

function withNoIndexHeader(response: NextResponse, host?: string | null): NextResponse {
  if (shouldEmitNoIndexHeader(host)) {
    response.headers.set(noIndexHeader, noIndexHeaderValue);
  }

  return response;
}

export function proxy(request: NextRequest) {
  if (shouldRejectServerActionRequest(request)) {
    return new NextResponse(null, { status: 400 });
  }

  const requestHost = request.headers.get('host');
  const host = normalizeHost(requestHost);

  if (!shouldRedirectToApex(host) || shouldBypassApexRedirect(request.nextUrl.pathname)) {
    return withNoIndexHeader(NextResponse.next(), requestHost);
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
