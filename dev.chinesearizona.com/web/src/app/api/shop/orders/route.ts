import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { resolveLocale } from '@/lib/i18n';
import { getShopLaunchDisabledMessage, isShopPublicLaunchReady } from '@/lib/shop-launch-server';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  confirmShopOrderPickupForContext,
  getOrCreateShopContextForUser,
  leaveShopFeedbackForContext,
  markShopOrderShippedForContext,
  openShopCaseForContext,
  requestShopReturnForContext,
  resolveShopCaseForContext,
} from '@/lib/shop-service';
import type { ShopFeedbackSentiment } from '@/lib/types';

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
    locale === 'zh' ? '管理訂單或評價' : 'manage orders or leave feedback'
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
  if (!checkRateLimit(`shop-orders:${key}`, 20, 60_000)) {
    return json(
      { message: locale === 'zh' ? '訂單操作太頻繁，請稍候再試。' : 'Order actions are happening too quickly. Please wait and try again.' },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as {
      action?:
        | 'request_return'
        | 'open_case'
        | 'mark_shipped'
        | 'confirm_pickup'
        | 'leave_feedback'
        | 'resolve_case';
      orderId?: string;
      caseId?: string;
      reason?: string;
      carrier?: string;
      trackingNumber?: string;
      pickupCode?: string;
      sellerSlug?: string;
      sentiment?: ShopFeedbackSentiment;
      titleEn?: string;
      titleZh?: string;
      commentEn?: string;
      commentZh?: string;
      status?: 'resolved' | 'closed';
      notes?: string;
    };

    if (!body.action) {
      return json(
        { message: locale === 'zh' ? '缺少訂單動作。' : 'Missing order action.' },
        { status: 400 }
      );
    }

    if (body.action === 'request_return') {
      if (!body.orderId || !body.reason) {
        return json(
          { message: locale === 'zh' ? '退貨申請資訊不足。' : 'Missing return-request details.' },
          { status: 400 }
        );
      }
      await requestShopReturnForContext(context, body.orderId, body.reason);
      return json({
        message: locale === 'zh' ? '已建立退貨申請。' : 'Return request created.',
      });
    }

    if (body.action === 'open_case') {
      if (!body.orderId || !body.reason) {
        return json(
          { message: locale === 'zh' ? '案件資訊不足。' : 'Missing case details.' },
          { status: 400 }
        );
      }
      await openShopCaseForContext(context, body.orderId, body.reason);
      return json({
        message: locale === 'zh' ? '案件已建立。' : 'Case opened.',
      });
    }

    if (body.action === 'mark_shipped') {
      if (!body.orderId || !body.carrier || !body.trackingNumber) {
        return json(
          { message: locale === 'zh' ? '出貨資訊不足。' : 'Missing shipment details.' },
          { status: 400 }
        );
      }
      await markShopOrderShippedForContext(context, body.orderId, body.carrier, body.trackingNumber);
      return json({
        message: locale === 'zh' ? '訂單已標記為出貨。' : 'Order marked as shipped.',
      });
    }

    if (body.action === 'confirm_pickup') {
      if (!body.orderId) {
        return json(
          { message: locale === 'zh' ? '缺少訂單 ID。' : 'Missing order id.' },
          { status: 400 }
        );
      }
      await confirmShopOrderPickupForContext(context, body.orderId, body.pickupCode);
      return json({
        message: locale === 'zh' ? '已確認面交取貨。' : 'Pickup confirmed.',
      });
    }

    if (body.action === 'leave_feedback') {
      if (!body.orderId || !body.sellerSlug || !body.sentiment || !body.titleEn || !body.commentEn) {
        return json(
          { message: locale === 'zh' ? '評價欄位不完整。' : 'Missing feedback fields.' },
          { status: 400 }
        );
      }
      await leaveShopFeedbackForContext(context, {
        orderId: body.orderId,
        sellerSlug: body.sellerSlug,
        sentiment: body.sentiment,
        title: { en: body.titleEn, zh: body.titleZh || undefined },
        comment: { en: body.commentEn, zh: body.commentZh || undefined },
      });
      return json({
        message: locale === 'zh' ? '評價已送出。' : 'Feedback submitted.',
      });
    }

    if (!body.caseId || !body.status || !body.notes) {
      return json(
        { message: locale === 'zh' ? '案件結案資訊不足。' : 'Missing case-resolution details.' },
        { status: 400 }
      );
    }
    await resolveShopCaseForContext(context, body.caseId, body.status, body.notes);
    return json({
      message: locale === 'zh' ? '案件狀態已更新。' : 'Case status updated.',
    });
  } catch (error) {
    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : locale === 'zh'
              ? '無法處理訂單動作。'
              : 'Unable to process order action.',
      },
      { status: 400 }
    );
  }
}
