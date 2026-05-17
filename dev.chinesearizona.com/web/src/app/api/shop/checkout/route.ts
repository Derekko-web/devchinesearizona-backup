import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { resolveLocale } from '@/lib/i18n';
import { getShopLaunchDisabledMessage, isShopPublicLaunchReady } from '@/lib/shop-launch-server';
import { createCheckoutForContext } from '@/lib/shop-payments';
import { checkRateLimit } from '@/lib/rate-limit';
import { getOrCreateShopContextForUser } from '@/lib/shop-service';

function requesterKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') ?? 'local-request';
}

export async function POST(request: NextRequest) {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  if (!isShopPublicLaunchReady()) {
    return NextResponse.json({ message: getShopLaunchDisabledMessage(locale) }, { status: 503 });
  }

  const auth = await requireApiUser(
    request,
    locale,
    locale === 'zh' ? '完成結帳' : 'complete checkout'
  );
  if (auth.response) {
    return auth.response;
  }
  const json = (body: unknown, init?: ResponseInit) =>
    withApiAuthSession(NextResponse.json(body, init), auth);
  const context = await getOrCreateShopContextForUser(auth.user);
  if (!context) {
    return json(
      {
        message: locale === 'zh' ? '目前無法載入你的 Shop 帳號。' : 'Unable to load your shop profile right now.',
      },
      { status: 503 }
    );
  }

  const key = requesterKey(request);
  if (!checkRateLimit(`shop-checkout:${key}`, 10, 60_000)) {
    return json(
      { message: locale === 'zh' ? '結帳嘗試太頻繁，請稍候再試。' : 'Checkout attempts are happening too quickly. Please wait and try again.' },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as {
      offerId?: string;
      shippingAddress?: string;
      paymentMethod?: string;
    };

    const result = await createCheckoutForContext(context, {
      baseUrl: request.nextUrl.origin,
      locale,
      offerId: body.offerId,
      shippingAddress: body.shippingAddress,
      paymentMethod: body.paymentMethod,
    });

    return json({
      message: result.message,
      mode: result.mode,
      orderIds: result.orderIds,
      ...(result.mode === 'redirect'
        ? {
            url: result.url,
            checkoutSessionId: result.checkoutSessionId,
          }
        : {}),
    });
  } catch (error) {
    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : locale === 'zh'
              ? '無法完成結帳。'
              : 'Unable to complete checkout.',
      },
      { status: 400 }
    );
  }
}
