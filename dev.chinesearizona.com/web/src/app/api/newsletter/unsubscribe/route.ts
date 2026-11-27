import { NextRequest, NextResponse } from 'next/server';

import { NewsletterError, unsubscribeFromNewsletter } from '@/lib/newsletter';
import { NEWSLETTER_UNSUBSCRIBE_PATH } from '@/lib/newsletter-fields';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientAddress } from '@/lib/request-url';

const UNSUBSCRIBE_LIMIT = 20;
const UNSUBSCRIBE_WINDOW_MS = 10 * 60_000;

type ParsedRequest = { token: string; oneClick: boolean; wantsJson: boolean };

async function parseRequest(request: NextRequest): Promise<ParsedRequest> {
  const queryToken = request.nextUrl.searchParams.get('token') ?? '';
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
    return {
      token: typeof body?.token === 'string' ? body.token : queryToken,
      oneClick: false,
      wantsJson: true,
    };
  }

  const form = await request.formData().catch(() => null);
  const formToken = form?.get('token');
  return {
    token: typeof formToken === 'string' && formToken ? formToken : queryToken,
    // RFC 8058 one-click unsubscribe from a mail app's button: the token is in
    // the URL and the body is "List-Unsubscribe=One-Click".
    oneClick: form?.get('List-Unsubscribe') === 'One-Click',
    wantsJson: false,
  };
}

// Back to the bilingual page. A relative Location works behind our proxies.
function redirectToPage(status: 'done' | 'invalid' | 'error') {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: `${NEWSLETTER_UNSUBSCRIBE_PATH}?status=${status}` },
  });
}

// Unsubscribes the reader behind a token. Changes happen only on POST, so mail
// scanners that open every link in an email cannot unsubscribe anyone.
export async function POST(request: NextRequest) {
  if (!checkRateLimit(`newsletter-unsubscribe:${getClientAddress(request)}`, UNSUBSCRIBE_LIMIT, UNSUBSCRIBE_WINDOW_MS)) {
    return NextResponse.json({ unsubscribed: false, message: 'Too many requests.' }, { status: 429 });
  }

  const { token, oneClick, wantsJson } = await parseRequest(request);

  let found: boolean;
  try {
    found = await unsubscribeFromNewsletter(token.trim());
  } catch (error) {
    const status = error instanceof NewsletterError ? error.status : 500;
    if (wantsJson || oneClick) {
      return NextResponse.json({ unsubscribed: false }, { status });
    }

    return redirectToPage('error');
  }

  if (wantsJson || oneClick) {
    return NextResponse.json({ unsubscribed: found }, { status: found ? 200 : 404 });
  }

  return redirectToPage(found ? 'done' : 'invalid');
}
