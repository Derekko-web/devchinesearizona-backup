import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { parseBusinessPhotoSet } from '@/lib/business-media';
import {
  deleteBusinessForProfile,
  updateBusinessPhotosForProfile,
} from '@/lib/directory-owner';
import { resolveLocale } from '@/lib/i18n';
import { checkRateLimit } from '@/lib/rate-limit';

function requesterKey(request: NextRequest) {
  return request.headers.get('x-forwarded-for') ?? 'local-request';
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  const auth = await requireApiUser(
    request,
    locale,
    locale === 'zh' ? '更新商家照片' : 'update business photos'
  );
  if (auth.response) {
    return auth.response;
  }

  const json = (body: unknown, init?: ResponseInit) =>
    withApiAuthSession(NextResponse.json(body, init), auth);

  if (!auth.profile?.id) {
    return json(
      {
        message:
          locale === 'zh'
            ? '目前無法載入你的商家帳號。'
            : 'Unable to load your business account right now.',
      },
      { status: 503 }
    );
  }

  const key = requesterKey(request);
  if (!checkRateLimit(`directory-business-photos:${key}`, 20, 60_000)) {
    return json(
      {
        message:
          locale === 'zh'
            ? '照片更新操作太頻繁，請稍候再試。'
            : 'Photo updates are happening too quickly. Please wait and try again.',
      },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as {
      heroImage?: string;
      gallery?: string;
    };
    const { slug } = await params;

    if (!slug) {
      return json(
        {
          message:
            locale === 'zh' ? '缺少商家資料。' : 'Missing business details.',
        },
        { status: 400 }
      );
    }

    const photos = parseBusinessPhotoSet(
      {
        heroImage: body.heroImage,
        galleryText: body.gallery,
      },
      locale
    );

    const result = await updateBusinessPhotosForProfile({
      businessSlug: slug,
      profileId: auth.profile.id,
      role: auth.profile.role,
      heroImage: photos.heroImage,
      gallery: photos.gallery,
    });

    return json({
      businessSlug: result.businessSlug,
      message:
        locale === 'zh' ? '商家照片已更新。' : 'Business photos updated.',
    });
  } catch (error) {
    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : locale === 'zh'
              ? '目前無法更新商家照片。'
              : 'Unable to update business photos right now.',
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  const auth = await requireApiUser(
    request,
    locale,
    locale === 'zh' ? '刪除商家' : 'delete a business listing'
  );
  if (auth.response) {
    return auth.response;
  }

  const json = (body: unknown, init?: ResponseInit) =>
    withApiAuthSession(NextResponse.json(body, init), auth);

  if (!auth.profile?.id) {
    return json(
      {
        message:
          locale === 'zh'
            ? '目前無法載入你的商家帳號。'
            : 'Unable to load your business account right now.',
      },
      { status: 503 }
    );
  }

  const key = requesterKey(request);
  if (!checkRateLimit(`directory-business-delete:${key}`, 5, 60_000)) {
    return json(
      {
        message:
          locale === 'zh'
            ? '刪除操作太頻繁，請稍候再試。'
            : 'Delete requests are happening too quickly. Please wait and try again.',
      },
      { status: 429 }
    );
  }

  try {
    const { slug } = await params;

    if (!slug) {
      return json(
        {
          message: locale === 'zh' ? '缺少商家資料。' : 'Missing business details.',
        },
        { status: 400 }
      );
    }

    const result = await deleteBusinessForProfile({
      businessSlug: slug,
      profileId: auth.profile.id,
      role: auth.profile.role,
    });

    return json({
      businessSlug: result.businessSlug,
      message: locale === 'zh' ? '商家已刪除。' : 'Business deleted.',
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : locale === 'zh'
          ? '目前無法刪除這筆商家。'
          : 'Unable to delete this business right now.';
    const normalizedMessage = message.toLowerCase();
    const status =
      normalizedMessage.includes('not found')
        ? 404
        : normalizedMessage.includes('cannot delete')
          ? 403
          : 400;

    return json(
      {
        message,
      },
      { status }
    );
  }
}
