import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { resolveLocale } from '@/lib/i18n';
import { getShopLaunchDisabledMessage, isShopPublicLaunchReady } from '@/lib/shop-launch-server';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  addShopCartItemForContext,
  clearShopCartForContext,
  getOrCreateShopContextForUser,
  removeShopCartItemForContext,
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
    locale === 'zh' ? '管理購物車' : 'manage your cart'
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
  if (!checkRateLimit(`shop-cart:${key}`, 30, 60_000)) {
    return json(
      { message: locale === 'zh' ? '購物車更新太頻繁，請稍候再試。' : 'Cart updates are happening too quickly. Please wait and try again.' },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as {
      action?: 'add' | 'remove' | 'clear';
      listingSlug?: string;
      variantId?: string;
      quantity?: number;
      itemId?: string;
    };

    if (body.action === 'remove') {
      if (!body.itemId) {
        return json(
          { message: locale === 'zh' ? '缺少購物車項目 ID。' : 'Missing cart item id.' },
          { status: 400 }
        );
      }
      await removeShopCartItemForContext(context, body.itemId);
      return json({
        message: locale === 'zh' ? '已從購物車移除。' : 'Item removed from cart.',
      });
    }

    if (body.action === 'clear') {
      await clearShopCartForContext(context);
      return json({
        message: locale === 'zh' ? '購物車已清空。' : 'Cart cleared.',
      });
    }

    if (!body.listingSlug) {
      return json(
        { message: locale === 'zh' ? '缺少商品 slug。' : 'Missing listing slug.' },
        { status: 400 }
      );
    }

    await addShopCartItemForContext(
      context,
      body.listingSlug,
      Math.max(1, Number(body.quantity ?? 1)),
      body.variantId ?? undefined
    );
    return json({
      message: locale === 'zh' ? '已加入購物車。' : 'Added to cart.',
    });
  } catch (error) {
    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : locale === 'zh'
              ? '購物車更新失敗。'
              : 'Unable to update cart.',
      },
      { status: 400 }
    );
  }
}
