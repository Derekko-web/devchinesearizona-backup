import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { resolveLocale } from '@/lib/i18n';
import { getShopLaunchDisabledMessage, isShopPublicLaunchReady } from '@/lib/shop-launch-server';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  createShopListingForContext,
  getOrCreateShopContextForUser,
  updateShopListingStatusForContext,
} from '@/lib/shop-service';
import type { ShopCondition, ShopListingStatus } from '@/lib/types';

function requesterKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') ?? 'local-request';
}

function parseItemSpecifics(raw: string): Record<string, string> {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((map, line) => {
      const [key, ...rest] = line.split(':');
      if (key && rest.length > 0) {
        map[key.trim()] = rest.join(':').trim();
      }
      return map;
    }, {});
}

export async function POST(request: NextRequest) {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  if (!isShopPublicLaunchReady()) {
    return NextResponse.json({ message: getShopLaunchDisabledMessage(locale) }, { status: 503 });
  }

  const auth = await requireApiUser(
    request,
    locale,
    locale === 'zh' ? '送審或管理商品' : 'submit or manage listings'
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
  if (!checkRateLimit(`shop-listings:${key}`, 10, 60_000)) {
    return json(
      { message: locale === 'zh' ? '商品操作太頻繁，請稍候再試。' : 'Listing actions are happening too quickly. Please wait and try again.' },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as {
      action?: 'set_status';
      listingSlug?: string;
      status?: ShopListingStatus;
      sellerSlug?: string;
      categorySlug?: string;
      titleEn?: string;
      titleZh?: string;
      excerptEn?: string;
      excerptZh?: string;
      descriptionEn?: string;
      descriptionZh?: string;
      condition?: ShopCondition;
      priceCents?: number;
      quantityAvailable?: number;
      allowOffers?: boolean;
      allowLocalPickup?: boolean;
      pickupCity?: string;
      shippingMethods?: string[];
      returnPolicyEn?: string;
      returnPolicyZh?: string;
      itemSpecifics?: string;
      imageUrls?: string[];
    };

    if (body.action === 'set_status') {
      if (!body.listingSlug || !body.status) {
        return json(
          { message: locale === 'zh' ? '缺少商品狀態更新資訊。' : 'Missing listing status update details.' },
          { status: 400 }
        );
      }

      await updateShopListingStatusForContext(context, body.listingSlug, body.status);
      return json({
        message: locale === 'zh' ? '商品狀態已更新。' : 'Listing status updated.',
      });
    }

    if (
      !body.sellerSlug ||
      !body.categorySlug ||
      !body.titleEn ||
      !body.excerptEn ||
      !body.descriptionEn ||
      !body.condition ||
      !body.priceCents ||
      !body.quantityAvailable ||
      !body.pickupCity ||
      !body.returnPolicyEn
    ) {
      return json(
        { message: locale === 'zh' ? '缺少送審商品必填欄位。' : 'Missing required listing-submission fields.' },
        { status: 400 }
      );
    }

    const listing = await createShopListingForContext(context, {
      sellerSlug: body.sellerSlug,
      categorySlug: body.categorySlug,
      title: { en: body.titleEn, zh: body.titleZh || undefined },
      excerpt: { en: body.excerptEn, zh: body.excerptZh || undefined },
      description: [
        {
          en: body.descriptionEn,
          zh: body.descriptionZh || undefined,
        },
      ],
      condition: body.condition,
      priceCents: body.priceCents,
      quantityAvailable: body.quantityAvailable,
      allowOffers: body.allowOffers ?? false,
      allowLocalPickup: body.allowLocalPickup ?? false,
      pickupCity: body.pickupCity,
      shippingMethods: (body.shippingMethods?.filter(Boolean) as Array<'standard' | 'expedited' | 'local_pickup'>) ?? ['standard'],
      returnPolicy: {
        en: body.returnPolicyEn,
        zh: body.returnPolicyZh || undefined,
      },
      itemSpecifics: parseItemSpecifics(body.itemSpecifics ?? ''),
      imageUrls: body.imageUrls ?? [],
    });

    return json({
      message: locale === 'zh' ? '商品已送審。' : 'Listing submitted for review.',
      slug: listing.slug,
    });
  } catch (error) {
    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : locale === 'zh'
              ? '商品送審失敗。'
              : 'Unable to submit listing.',
      },
      { status: 400 }
    );
  }
}
