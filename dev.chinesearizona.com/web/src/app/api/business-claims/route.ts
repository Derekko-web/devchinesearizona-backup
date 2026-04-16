import { NextRequest, NextResponse } from 'next/server';

import { submitBusinessClaim } from '@/lib/directory-moderation';
import { resolveLocale } from '@/lib/i18n';
import { checkRateLimit } from '@/lib/rate-limit';
import { recordAnalyticsEvent } from '@/lib/runtime-store';

function requesterKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') ?? 'local-request';
}

export async function POST(request: NextRequest) {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  const key = requesterKey(request);
  if (!checkRateLimit(`business-claim:${key}`, 8, 60_000)) {
    return NextResponse.json(
      {
        message:
          locale === 'zh'
            ? '提交次數過多，請稍候一下再試。'
            : 'Too many submissions. Please wait a moment and try again.',
      },
      { status: 429 }
    );
  }

  const body = (await request.json()) as {
    businessSlug?: string;
    businessName?: string;
    claimantName?: string;
    email?: string;
    category?: string;
    city?: string;
    details?: string;
  };

  if (!body.businessName || !body.claimantName || !body.email) {
    return NextResponse.json(
      { message: locale === 'zh' ? '缺少必填欄位。' : 'Missing required fields.' },
      { status: 400 }
    );
  }

  const claim = await submitBusinessClaim({
    businessSlug: body.businessSlug,
    businessName: body.businessName,
    claimantName: body.claimantName,
    email: body.email,
    category: body.category,
    city: body.city,
    details: body.details,
  });

  recordAnalyticsEvent('claim_submission', claim.businessSlug ?? claim.businessName, '/add-business');

  return NextResponse.json({
    message:
      locale === 'zh'
        ? '已收到申請。我們會先驗證 Email、檢查重複資料，並以後續步驟與你聯繫。'
        : 'Claim request received. We will verify the email, review duplicate matches, and follow up with the next steps.',
  });
}
