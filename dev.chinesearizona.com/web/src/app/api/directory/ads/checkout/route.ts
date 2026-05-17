import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { createDirectoryAdCheckoutForProfile } from '@/lib/directory-ads';
import { resolveLocale } from '@/lib/i18n';
import { checkRateLimit } from '@/lib/rate-limit';

function requesterKey(request: NextRequest) {
  return request.headers.get('x-forwarded-for') ?? 'local-request';
}

export async function POST(request: NextRequest) {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  const auth = await requireApiUser(
    request,
    locale,
    locale === 'zh' ? '管理商家贊助曝光' : 'manage promoted directory placement'
  );
  if (auth.response) {
    return auth.response;
  }

  const json = (body: unknown, init?: ResponseInit) =>
    withApiAuthSession(NextResponse.json(body, init), auth);

  if (!auth.profile?.id) {
    return json(
      {
        message:
          locale === 'zh'
            ? '目前無法載入你的商家帳號。'
            : 'Unable to load your business account right now.',
      },
      { status: 503 }
    );
  }

  const key = requesterKey(request);
  if (!checkRateLimit(`directory-ads-checkout:${key}`, 12, 60_000)) {
    return json(
      {
        message:
          locale === 'zh'
            ? '贊助設定操作太頻繁，請稍候再試。'
            : 'Sponsored placement actions are happening too quickly. Please wait and try again.',
      },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as {
      budgetCents?: number;
      businessSlug?: string;
    };

    if (!body.businessSlug || typeof body.budgetCents !== 'number') {
      return json(
        {
          message:
            locale === 'zh'
              ? '缺少商家或預算資料。'
              : 'Missing business or budget details.',
        },
        { status: 400 }
      );
    }

    const result = await createDirectoryAdCheckoutForProfile({
      baseUrl: request.nextUrl.origin,
      budgetCents: body.budgetCents,
      businessSlug: body.businessSlug,
      locale,
      profileId: auth.profile.id,
      userEmail: auth.user.email,
    });

    return json({
      message: result.message,
      mode: result.mode,
      url: result.url,
    });
  } catch (error) {
    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : locale === 'zh'
              ? '目前無法建立贊助方案結帳。'
              : 'Unable to create sponsored placement checkout right now.',
      },
      { status: 400 }
    );
  }
}
