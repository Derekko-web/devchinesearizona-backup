import { NextRequest, NextResponse } from 'next/server';

import { recordDirectoryAdEvent } from '@/lib/directory-ads';
import { resolveLocale } from '@/lib/i18n';
import { checkRateLimit } from '@/lib/rate-limit';

function requesterKey(request: NextRequest) {
  return request.headers.get('x-forwarded-for') ?? 'local-request';
}

export async function POST(request: NextRequest) {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  const key = requesterKey(request);
  if (!checkRateLimit(`directory-ad-events:${key}`, 180, 60_000)) {
    return NextResponse.json(
      {
        message:
          locale === 'zh'
            ? '贊助事件回報太頻繁，請稍候再試。'
            : 'Sponsored placement events are happening too quickly. Please wait and try again.',
      },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as {
      businessId?: string;
      campaignId?: string;
      eventType?: 'impression' | 'click';
      pagePath?: string;
      sessionId?: string;
    };

    if (!body.businessId || !body.campaignId || !body.eventType || !body.pagePath || !body.sessionId) {
      return NextResponse.json(
        {
          message:
            locale === 'zh'
              ? '缺少贊助事件資料。'
              : 'Missing sponsored placement event data.',
        },
        { status: 400 }
      );
    }

    const result = await recordDirectoryAdEvent({
      businessId: body.businessId,
      campaignId: body.campaignId,
      eventType: body.eventType,
      pagePath: body.pagePath,
      sessionId: body.sessionId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : locale === 'zh'
              ? '目前無法記錄贊助事件。'
              : 'Unable to record the sponsored placement event right now.',
      },
      { status: 400 }
    );
  }
}
