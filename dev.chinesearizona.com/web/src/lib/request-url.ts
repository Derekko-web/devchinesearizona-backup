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
