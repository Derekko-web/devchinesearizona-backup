import { NextRequest, NextResponse } from 'next/server';

import { submitModerationReport } from '@/lib/directory-moderation';
import { resolveLocale } from '@/lib/i18n';
import { checkRateLimit } from '@/lib/rate-limit';
import { recordAnalyticsEvent } from '@/lib/runtime-store';

function requesterKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') ?? 'local-request';
}

export async function POST(request: NextRequest) {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  const key = requesterKey(request);
  if (!checkRateLimit(`report:${key}`, 10, 60_000)) {
    return NextResponse.json(
      {
        message:
          locale === 'zh'
            ? '這個 IP 的檢舉次數過多，請稍候再試。'
            : 'Too many reports from this IP. Please wait and try again.',
      },
      { status: 429 }
    );
  }

  const body = (await request.json()) as {
    entitySlug?: string;
    entityType?: 'community_post' | 'review' | 'business';
    reason?: string;
  };
  if (!body.entitySlug || !body.reason) {
    return NextResponse.json(
      { message: locale === 'zh' ? '缺少檢舉必填資訊。' : 'Missing required report details.' },
      { status: 400 }
    );
  }

  await submitModerationReport({
    entitySlug: body.entitySlug,
    entityType: body.entityType,
    reason: body.reason,
  });
  recordAnalyticsEvent('report_submission', body.entitySlug, body.entityType === 'business' ? '/directory' : '/community');

  return NextResponse.json({
    message:
      locale === 'zh'
        ? '已收到檢舉，審核佇列已更新。'
        : 'Report received. The moderation queue has been updated.',
  });
}
