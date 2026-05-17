import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { resolveLocale } from '@/lib/i18n';
import { getShopLaunchDisabledMessage, isShopPublicLaunchReady } from '@/lib/shop-launch-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getOrCreateShopContextForUser, toggleShopWatchlistForContext } from '@/lib/shop-service';

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
    locale === 'zh' ? '加入追蹤清單' : 'save items to your watchlist'
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
  if (!checkRateLimit(`shop-watchlist:${key}`, 20, 60_000)) {
    return json(
      { message: locale === 'zh' ? '操作太快了，請稍候再試。' : 'Too many watchlist updates. Please wait and try again.' },
      { status: 429 }
    );
  }

  const body = (await request.json()) as { listingSlug?: string };
  if (!body.listingSlug) {
    return json(
      { message: locale === 'zh' ? '缺少商品 slug。' : 'Missing listing slug.' },
      { status: 400 }
    );
  }

  const result = await toggleShopWatchlistForContext(context, body.listingSlug);
  return json({
    message:
      locale === 'zh'
        ? result.saved
          ? '已加入追蹤清單。'
          : '已從追蹤清單移除。'
        : result.saved
          ? 'Added to watchlist.'
          : 'Removed from watchlist.',
  });
}
