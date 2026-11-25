import { NextRequest, NextResponse } from 'next/server';

import { INQUIRY_HONEYPOT_FIELD } from '@/lib/business-inquiry-fields';
import { BusinessLeadError, parseBusinessInquiryInput, submitBusinessInquiry } from '@/lib/business-leads';
import { resolveLocale } from '@/lib/i18n';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientAddress } from '@/lib/request-url';
import type { Locale } from '@/lib/types';

const INQUIRY_LIMIT = 5;
const INQUIRY_WINDOW_MS = 10 * 60_000;

function successMessage(locale: Locale) {
  return locale === 'zh'
    ? '已送出。商家會直接以 Email 或電話回覆你。'
    : 'Sent. The business will reply to you by email or phone.';
}

export async function POST(request: NextRequest) {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  const visitorAddress = getClientAddress(request);

  if (!checkRateLimit(`business-inquiry:${visitorAddress}`, INQUIRY_LIMIT, INQUIRY_WINDOW_MS)) {
    return NextResponse.json(
      {
        message:
          locale === 'zh'
            ? '送出次數太多，請稍候再試，或直接聯絡商家。'
            : 'Too many messages. Please wait a few minutes, or contact the business directly.',
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
    const inquiry = parseBusinessInquiryInput(body, locale);
    await submitBusinessInquiry(inquiry);
    return NextResponse.json({ message: successMessage(locale) });
  } catch (error) {
    if (error instanceof BusinessLeadError) {
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
