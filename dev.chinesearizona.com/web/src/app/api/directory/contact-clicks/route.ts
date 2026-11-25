import { NextRequest, NextResponse } from 'next/server';

import { isContactAction, recordBusinessContactClick } from '@/lib/business-leads';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientAddress } from '@/lib/request-url';

const CLICK_LIMIT = 60;
const CLICK_WINDOW_MS = 60_000;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,199}$/;

// Counts Call / Website / Directions clicks on a listing. The browser sends
// these with sendBeacon, so the response body is never read.
export async function POST(request: NextRequest) {
  const visitorAddress = getClientAddress(request);
  if (!checkRateLimit(`contact-clicks:${visitorAddress}`, CLICK_LIMIT, CLICK_WINDOW_MS)) {
    return NextResponse.json({ recorded: false, message: 'Too many clicks.' }, { status: 429 });
  }

  let body: { businessSlug?: unknown; action?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ recorded: false, message: 'Invalid body.' }, { status: 400 });
  }

  const businessSlug = typeof body?.businessSlug === 'string' ? body.businessSlug.trim() : '';
  if (!SLUG_PATTERN.test(businessSlug) || !isContactAction(body?.action)) {
    return NextResponse.json({ recorded: false, message: 'Missing listing or action.' }, { status: 400 });
  }

  try {
    const result = await recordBusinessContactClick({
      businessSlug,
      action: body.action,
      visitorAddress,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ recorded: false }, { status: 500 });
  }
}
