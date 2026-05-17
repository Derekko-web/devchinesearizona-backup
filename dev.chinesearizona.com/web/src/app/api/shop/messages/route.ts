import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { resolveLocale } from '@/lib/i18n';
import { getShopLaunchDisabledMessage, isShopPublicLaunchReady } from '@/lib/shop-launch-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getOrCreateShopContextForUser, sendShopMessageForContext } from '@/lib/shop-service';

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
    locale === 'zh' ? '聯絡賣家' : 'message a seller'
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
  if (!checkRateLimit(`shop-messages:${key}`, 10, 60_000)) {
    return json(
      { message: locale === 'zh' ? '訊息發送太頻繁，請稍候再試。' : 'Messaging too quickly. Please wait and try again.' },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as {
      sellerSlug?: string;
      listingSlug?: string;
      orderId?: string;
      topic?: 'pre_sale' | 'order_support' | 'pickup';
      body?: string;
    };

    if (!body.sellerSlug || !body.topic || !body.body) {
      return json(
        { message: locale === 'zh' ? '缺少訊息必填欄位。' : 'Missing required message fields.' },
        { status: 400 }
      );
    }

    await sendShopMessageForContext(context, {
      sellerSlug: body.sellerSlug,
      body: body.body,
      listingSlug: body.listingSlug ?? undefined,
      orderId: body.orderId ?? undefined,
      topic: body.topic,
    });

    return json({
      message: locale === 'zh' ? '訊息已送出。' : 'Message sent.',
    });
  } catch (error) {
    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : locale === 'zh'
              ? '訊息送出失敗。'
              : 'Unable to send message.',
      },
      { status: 400 }
    );
  }
}
