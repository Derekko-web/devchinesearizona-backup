import { NextRequest, NextResponse } from 'next/server';

import {
  AdvertiseInquiryError,
  parseAdvertiseInquiryInput,
  submitAdvertiseInquiry,
} from '@/lib/advertise-inquiries';
import { INQUIRY_HONEYPOT_FIELD } from '@/lib/business-inquiry-fields';
import { resolveLocale } from '@/lib/i18n';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientAddress } from '@/lib/request-url';
import { resolveSiteProfileFromRequestHosts } from '@/lib/site-config';
import type { Locale } from '@/lib/types';

// Same limits as the listing inquiry route.
const INQUIRY_LIMIT = 5;
const INQUIRY_WINDOW_MS = 10 * 60_000;

function successMessage(locale: Locale) {
  return locale === 'zh'
    ? '謝謝！我們已收到你的訊息，會在一個工作天內透過你留下的 Email、電話或微信回覆你。'
    : 'Thank you! We have your message and will reply within one business day, using the email, phone or WeChat you gave us.';
}

// Advertising inquiries from /advertise (#474). Saved on our side, so they no
// longer depend on the visitor's email app or on a mailbox that can't receive.
export async function POST(request: NextRequest) {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  const visitorAddress = getClientAddress(request);

  if (!checkRateLimit(`advertise-inquiry:${visitorAddress}`, INQUIRY_LIMIT, INQUIRY_WINDOW_MS)) {
    return NextResponse.json(
      {
        message:
          locale === 'zh'
            ? '送出次數太多，請稍候幾分鐘再試。'
            : 'Too many messages. Please wait a few minutes and try again.',
      },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: locale === 'zh' ? '無法讀取表單內容。' : 'Unable to read the form.' },
      { status: 400 }
    );
  }

  const honeypot = (body as Record<string, unknown> | null)?.[INQUIRY_HONEYPOT_FIELD];
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    // Look successful so the bot moves on, but save and send nothing.
    return NextResponse.json({ message: successMessage(locale) });
  }

  try {
    const inquiry = parseAdvertiseInquiryInput(body, locale);
    const site = resolveSiteProfileFromRequestHosts({
      host: request.headers.get('host'),
      forwardedHost: request.headers.get('x-forwarded-host'),
    });
    await submitAdvertiseInquiry({ inquiry, locale, site });
    return NextResponse.json({ message: successMessage(locale) });
  } catch (error) {
    if (error instanceof AdvertiseInquiryError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        message:
          locale === 'zh' ? '目前無法送出訊息，請稍後再試。' : 'Unable to send your message right now. Please try again.',
      },
      { status: 500 }
    );
  }
}
