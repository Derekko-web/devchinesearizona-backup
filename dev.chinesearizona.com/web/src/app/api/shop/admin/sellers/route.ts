import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { resolveLocale } from '@/lib/i18n';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  approveShopSellerForContext,
  getOrCreateShopContextForUser,
} from '@/lib/shop-service';

function requesterKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') ?? 'local-request';
}

export async function POST(request: NextRequest) {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  const auth = await requireApiUser(
    request,
    locale,
    locale === 'zh' ? '管理賣家審核' : 'manage seller approvals'
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
  if (!checkRateLimit(`shop-admin-sellers:${key}`, 10, 60_000)) {
    return json(
      {
        message:
          locale === 'zh'
            ? '賣家審核操作太頻繁，請稍候再試。'
            : 'Seller approval actions are happening too quickly. Please wait and try again.',
      },
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

    await approveShopSellerForContext(context, body.sellerSlug);
    return json({
      message: locale === 'zh' ? '賣家已核准。' : 'Seller approved.',
    });
  } catch (error) {
    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : locale === 'zh'
              ? '無法更新賣家審核狀態。'
              : 'Unable to update seller approval.',
      },
      { status: 400 }
    );
  }
}
