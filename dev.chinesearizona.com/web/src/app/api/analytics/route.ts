import { NextRequest, NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/rate-limit';
import { recordAnalyticsEvent } from '@/lib/runtime-store';

function requesterKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') ?? 'local-request';
}

export async function POST(request: NextRequest) {
  const key = requesterKey(request);
  if (!checkRateLimit(`analytics:${key}`, 60, 60_000)) {
    return NextResponse.json({ message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const body = (await request.json()) as { type?: string; entitySlug?: string; path?: string };
  if (!body.type) {
    return NextResponse.json({ message: 'Missing event type.' }, { status: 400 });
  }

  recordAnalyticsEvent(body.type, body.entitySlug, body.path);
  return NextResponse.json({ ok: true });
}
