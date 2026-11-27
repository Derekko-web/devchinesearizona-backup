import { NextRequest, NextResponse } from 'next/server';

import { resolveLocale } from '@/lib/i18n';
import { NewsletterError, parseNewsletterSignupInput, subscribeToNewsletter } from '@/lib/newsletter';
import {
  NEWSLETTER_HONEYPOT_FIELD,
  newsletterResultCopy,
  type NewsletterResultCode,
} from '@/lib/newsletter-fields';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientAddress } from '@/lib/request-url';
import { resolveSiteProfileFromRequestHosts } from '@/lib/site-config';
import type { Locale } from '@/lib/types';

const SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW_MS = 10 * 60_000;

function respond(code: NewsletterResultCode, locale: Locale, status = 200) {
  const copy = newsletterResultCopy[code];
  return NextResponse.json({ code, message: locale === 'zh' ? copy.zh : copy.en }, { status });
}

// Footer newsletter sign-up (issue #441). The answer is the same whether the
// email is new or already on the list, so the form never reveals who subscribed.
export async function POST(request: NextRequest) {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  const visitorAddress = getClientAddress(request);

  if (!checkRateLimit(`newsletter-signup:${visitorAddress}`, SIGNUP_LIMIT, SIGNUP_WINDOW_MS)) {
    return respond('rate_limited', locale, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return respond('invalid_email', locale, 400);
  }

  const honeypot = (body as Record<string, unknown> | null)?.[NEWSLETTER_HONEYPOT_FIELD];
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    // Look successful so the bot moves on, but save nothing.
    return respond('subscribed', locale);
  }

  try {
    const input = parseNewsletterSignupInput(body);
    const site = resolveSiteProfileFromRequestHosts({
      host: request.headers.get('host'),
      forwardedHost: request.headers.get('x-forwarded-host'),
    });
    await subscribeToNewsletter({ ...input, site, locale });
    return respond('subscribed', locale);
  } catch (error) {
    if (error instanceof NewsletterError) {
      return respond(error.code, locale, error.status);
    }

    return respond('error', locale, 500);
  }
}
