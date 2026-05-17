import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { resolveLocale } from '@/lib/i18n';
import { getShopLaunchDisabledMessage, isShopPublicLaunchReady } from '@/lib/shop-launch-server';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  createShopOfferForContext,
  getOrCreateShopContextForUser,
  respondToShopOfferForContext,
} from '@/lib/shop-service';

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
    locale === 'zh' ? '送出或處理出價' : 'send or manage offers'
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
  if (!checkRateLimit(`shop-offers:${key}`, 20, 60_000)) {
    return json(
      { message: locale === 'zh' ? '議價操作太頻繁，請稍候再試。' : 'Offer activity is too fast right now. Please wait and try again.' },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as {
      offerId?: string;
      action?: 'accepted' | 'declined' | 'countered';
      counterAmountCents?: number;
      listingSlug?: string;
      variantId?: string;
      sellerSlug?: string;
      amountCents?: number;
      message?: string;
    };

    if (body.offerId && body.action) {
      await respondToShopOfferForContext(context, {
        offerId: body.offerId,
        action: body.action,
        counterAmountCents: body.counterAmountCents,
      });
      return json({
        message:
          locale === 'zh'
            ? body.action === 'accepted'
              ? '已接受出價，系統已保留 48 小時結帳窗口。'
              : body.action === 'declined'
                ? '已拒絕出價。'
                : '已送出還價。'
            : body.action === 'accepted'
              ? 'Offer accepted. The buyer now has a 48-hour checkout window.'
              : body.action === 'declined'
                ? 'Offer declined.'
                : 'Counteroffer sent.',
      });
    }

    if (!body.listingSlug || !body.sellerSlug || !body.amountCents) {
      return json(
        { message: locale === 'zh' ? '缺少出價必填欄位。' : 'Missing required offer fields.' },
        { status: 400 }
      );
    }

    await createShopOfferForContext(context, {
      listingSlug: body.listingSlug,
      variantId: body.variantId ?? undefined,
      sellerSlug: body.sellerSlug,
      amountCents: body.amountCents,
      message: body.message ?? undefined,
    });

    return json({
      message: locale === 'zh' ? '出價已送出。' : 'Offer submitted.',
    });
  } catch (error) {
    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : locale === 'zh'
              ? '出價處理失敗。'
              : 'Unable to process offer.',
      },
      { status: 400 }
    );
  }
}
