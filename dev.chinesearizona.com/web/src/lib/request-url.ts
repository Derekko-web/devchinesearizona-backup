import type { NextRequest } from 'next/server';

import { normalizeAuthBaseUrl } from '@/lib/auth';

function readFirstHeaderValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const firstValue = value.split(',')[0]?.trim();
  return firstValue && firstValue.length > 0 ? firstValue : null;
}

export function getRequestBaseUrl(request: Pick<NextRequest, 'headers' | 'nextUrl'>): string {
  const protocol =
    readFirstHeaderValue(request.headers.get('x-forwarded-proto')) ??
    request.nextUrl.protocol.replace(/:$/, '');
  const host =
    readFirstHeaderValue(request.headers.get('x-forwarded-host')) ??
    readFirstHeaderValue(request.headers.get('host')) ??
    request.nextUrl.host;

  return normalizeAuthBaseUrl(`${protocol}://${host}`);
}

// Public traffic reaches the app through Traefik (port 443), then nginx, then the
// host router. Traefik replaces any client-sent X-Forwarded-For with the real
// remote address, and nginx appends its own peer (Traefik on 127.0.0.1) with
// $proxy_add_x_forwarded_for. So the visitor is the rightmost entry that is not
// one of our own proxies on a loopback or private address.
function isInternalProxyAddress(address: string): boolean {
  const value = address
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/^::ffff:/, '');

  if (value === '::1' || value === 'localhost') {
    return true;
  }

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(value);
  if (ipv4) {
    const first = Number(ipv4[1]);
    const second = Number(ipv4[2]);
    return (
      first === 127 ||
      first === 10 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 169 && second === 254)
    );
  }

  // IPv6 unique-local (fc00::/7) and link-local (fe80::/10) addresses.
  return /^f[cd][0-9a-f]{0,2}:/.test(value) || /^fe[89ab][0-9a-f]?:/.test(value);
}

export function getClientAddress(request: Pick<NextRequest, 'headers'>): string {
  const entries =
    request.headers
      .get('x-forwarded-for')
      ?.split(',')
      .map((entry) => entry.trim())
      .filter(Boolean) ?? [];

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    if (!isInternalProxyAddress(entries[index])) {
      return entries[index];
    }
  }

  // Only internal addresses (local development): the leftmost is the original client.
  return entries[0] ?? 'local-request';
}
