import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { resolveLocale } from '@/lib/i18n';
import { getShopLaunchDisabledMessage, isShopPublicLaunchReady } from '@/lib/shop-launch-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { createStripeConnectLinkForContext } from '@/lib/shop-payments';
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
    locale === 'zh' ? '管理賣家帳號' : 'manage seller account settings'
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
  if (!checkRateLimit(`shop-connect:${key}`, 10, 60_000)) {
    return json(
      { message: locale === 'zh' ? '賣家設定操作太頻繁，請稍候再試。' : 'Seller settings actions are happening too quickly. Please wait and try again.' },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as { sellerSlug?: string };
    if (!body.sellerSlug) {
      return json(
        { message: locale === 'zh' ? '缺少賣家 slug。' : 'Missing seller slug.' },
        { status: 400 }
      );
    }

    const result = await createStripeConnectLinkForContext(
      context,
      locale,
      body.sellerSlug,
      request.nextUrl.origin
    );
    return json({
      message: result.message,
      mode: result.mode,
      ...(result.mode === 'redirect' ? { url: result.url } : {}),
    });
  } catch (error) {
    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : locale === 'zh'
              ? '無法更新賣家設定。'
              : 'Unable to update seller settings.',
      },
      { status: 400 }
    );
  }
}
