import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { localeFromPath, PAGE_LOCALE_HEADER } from '@/lib/routing';
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

// "/en" or "/en/business?x" -> "/" or "/business?x". English pages are served
// at the unprefixed URL; the /en copies only split ranking signals.
export function englishCanonicalPath(pathname?: string | null): string | null {
  if (!pathname || (pathname !== '/en' && !pathname.startsWith('/en/'))) {
    return null;
  }

  return pathname.slice(3) || '/';
}

function firstHeaderValue(value: string | null): string | null {
  const first = value?.split(',')[0]?.trim();
  return first ? first : null;
}

// Traefik terminates TLS and nginx passes the Host header through, so the
// app itself sees plain http; redirects must use the public scheme and host.
function publicRequestOrigin(request: Pick<NextRequest, 'headers' | 'nextUrl'>): string {
  const protocol =
    firstHeaderValue(request.headers.get('x-forwarded-proto')) ?? request.nextUrl.protocol.replace(/:$/, '');
  const host = firstHeaderValue(request.headers.get('host')) ?? request.nextUrl.host;
  return `${protocol}://${host}`;
}

// Tells the root layout the page language, so <html lang> is right in the
// server HTML crawlers read. Always overwritten, never taken from the client.
function nextWithPageLocale(request: NextRequest): NextResponse {
  const headers = new Headers(request.headers);
  headers.set(PAGE_LOCALE_HEADER, localeFromPath(request.nextUrl.pathname));
  return NextResponse.next({ request: { headers } });
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
  const englishPath = englishCanonicalPath(request.nextUrl.pathname);

  if (!shouldRedirectToApex(host) || shouldBypassApexRedirect(request.nextUrl.pathname)) {
    if (englishPath) {
      const targetUrl = new URL(`${englishPath}${request.nextUrl.search}`, publicRequestOrigin(request));
      return withNoIndexHeader(NextResponse.redirect(targetUrl, 308), requestHost);
    }

    return withNoIndexHeader(nextWithPageLocale(request), requestHost);
  }

  const targetUrl = request.nextUrl.clone();
  targetUrl.protocol = 'https';
  targetUrl.hostname = apexHost;
  targetUrl.port = '';
  if (englishPath) {
    targetUrl.pathname = englishPath;
  }

  return NextResponse.redirect(targetUrl, 308);
}

export const config = {
  matcher: '/:path*',
};
