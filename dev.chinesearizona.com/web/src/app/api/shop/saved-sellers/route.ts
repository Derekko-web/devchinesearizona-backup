import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { resolveLocale } from '@/lib/i18n';
import { getShopLaunchDisabledMessage, isShopPublicLaunchReady } from '@/lib/shop-launch-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getOrCreateShopContextForUser, toggleShopSavedSellerForContext } from '@/lib/shop-service';

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
    locale === 'zh' ? '收藏賣家' : 'save a seller'
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
  if (!checkRateLimit(`shop-saved-seller:${key}`, 20, 60_000)) {
    return json(
      { message: locale === 'zh' ? '操作太快了，請稍候再試。' : 'Too many saved-seller updates. Please wait and try again.' },
      { status: 429 }
    );
  }

  const body = (await request.json()) as { sellerSlug?: string };
  if (!body.sellerSlug) {
    return json(
      { message: locale === 'zh' ? '缺少賣家 slug。' : 'Missing seller slug.' },
      { status: 400 }
    );
  }

  const result = await toggleShopSavedSellerForContext(context, body.sellerSlug);
  return json({
    message:
      locale === 'zh'
        ? result.saved
          ? '已收藏賣家。'
          : '已取消收藏賣家。'
        : result.saved
          ? 'Seller saved.'
          : 'Seller removed from saved list.',
  });
}
