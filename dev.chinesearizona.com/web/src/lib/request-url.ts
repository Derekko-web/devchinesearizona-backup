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

// nginx forwards with $proxy_add_x_forwarded_for, which appends the real remote
// address after anything the client sent, so only the last entry can be trusted.
export function getClientAddress(request: Pick<NextRequest, 'headers'>): string {
  const entries =
    request.headers
      .get('x-forwarded-for')
      ?.split(',')
      .map((entry) => entry.trim())
      .filter(Boolean) ?? [];

  return entries.at(-1) ?? 'local-request';
}
