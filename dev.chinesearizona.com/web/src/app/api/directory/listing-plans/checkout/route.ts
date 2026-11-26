import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { resolveLocale } from '@/lib/i18n';
import { ListingPlanError, createListingPlanCheckoutForProfile } from '@/lib/listing-plans';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientAddress, getRequestBaseUrl } from '@/lib/request-url';

export async function POST(request: NextRequest) {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  const zh = locale === 'zh';
  const auth = await requireApiUser(request, locale, zh ? '購買商家方案' : 'buy a listing plan');
  if (auth.response) {
    return auth.response;
  }

  const json = (body: unknown, init?: ResponseInit) =>
    withApiAuthSession(NextResponse.json(body, init), auth);

  if (!auth.profile?.id) {
    return json(
      { message: zh ? '目前無法載入你的商家帳號。' : 'Unable to load your business account right now.' },
      { status: 503 }
    );
  }

  if (!checkRateLimit(`listing-plan-checkout:${getClientAddress(request)}`, 12, 60_000)) {
    return json(
      {
        message: zh
          ? '操作太頻繁，請稍候再試。'
          : 'Too many checkout attempts. Please wait a minute and try again.',
      },
      { status: 429 }
    );
  }

  let body: { businessSlug?: unknown; interval?: unknown; planId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (
    typeof body.businessSlug !== 'string' ||
    typeof body.planId !== 'string' ||
    typeof body.interval !== 'string'
  ) {
    return json(
      { message: zh ? '缺少商家或方案資料。' : 'Missing business or plan details.' },
      { status: 400 }
    );
  }

  try {
    const result = await createListingPlanCheckoutForProfile({
      baseUrl: getRequestBaseUrl(request),
      businessSlug: body.businessSlug,
      interval: body.interval,
      locale,
      planId: body.planId,
      profileId: auth.profile.id,
      userEmail: auth.user.email,
    });

    return json(result);
  } catch (error) {
    if (error instanceof ListingPlanError) {
      return json({ message: error.message }, { status: error.status });
    }

    console.error('[listing-plans] Checkout failed:', error);
    return json(
      {
        message: zh
          ? '目前無法建立方案結帳頁，請稍後再試。'
          : 'Unable to start plan checkout right now. Please try again later.',
      },
      { status: 500 }
    );
  }
}
