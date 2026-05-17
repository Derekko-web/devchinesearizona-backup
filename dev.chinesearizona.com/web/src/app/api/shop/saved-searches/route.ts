import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { resolveLocale } from '@/lib/i18n';
import { getShopLaunchDisabledMessage, isShopPublicLaunchReady } from '@/lib/shop-launch-server';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  createShopSavedSearchForContext,
  deleteShopSavedSearchForContext,
  getOrCreateShopContextForUser,
} from '@/lib/shop-service';
import type { ShopBrowseSort, ShopCondition } from '@/lib/types';

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
    locale === 'zh' ? '儲存搜尋' : 'save a search'
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
  if (!checkRateLimit(`shop-saved-search:${key}`, 20, 60_000)) {
    return json(
      { message: locale === 'zh' ? '儲存搜尋太頻繁，請稍候再試。' : 'Saving searches too quickly. Please wait and try again.' },
      { status: 429 }
    );
  }

  const body = (await request.json()) as {
    action?: 'delete';
    id?: string;
    label?: string;
    query?: string;
    category?: string;
    condition?: ShopCondition;
    offerOnly?: boolean;
    pickupOnly?: boolean;
    priceMin?: string;
    priceMax?: string;
    sort?: ShopBrowseSort;
  };

  if (body.action === 'delete') {
    if (!body.id) {
      return json(
        { message: locale === 'zh' ? '缺少搜尋 ID。' : 'Missing saved-search id.' },
        { status: 400 }
      );
    }

    await deleteShopSavedSearchForContext(context, body.id);
    return json({
      message: locale === 'zh' ? '已刪除儲存搜尋。' : 'Saved search deleted.',
    });
  }

  if (!body.label) {
    return json(
      { message: locale === 'zh' ? '請先命名這個搜尋。' : 'Please add a label for this search.' },
      { status: 400 }
    );
  }

  await createShopSavedSearchForContext(context, {
    label: body.label,
    query: body.query ?? '',
    category: body.category ?? undefined,
    condition: body.condition ?? undefined,
    offerOnly: body.offerOnly ?? false,
    pickupOnly: body.pickupOnly ?? false,
    priceMin: body.priceMin ? Number(body.priceMin) : undefined,
    priceMax: body.priceMax ? Number(body.priceMax) : undefined,
    sort: body.sort ?? 'best_match',
  });

  return json({
    message: locale === 'zh' ? '已儲存目前搜尋條件。' : 'Current search saved.',
  });
}
