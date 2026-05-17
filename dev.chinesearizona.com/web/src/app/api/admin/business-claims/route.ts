import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { parseBusinessPhotoSet } from '@/lib/business-media';
import { approveBusinessClaim } from '@/lib/directory-moderation';
import { resolveLocale } from '@/lib/i18n';
import { checkRateLimit } from '@/lib/rate-limit';

function requesterKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') ?? 'local-request';
}

export async function POST(request: NextRequest) {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  const auth = await requireApiUser(
    request,
    locale,
    locale === 'zh' ? '管理商家認領審核' : 'manage business claim approvals'
  );
  if (auth.response) {
    return auth.response;
  }

  const json = (body: unknown, init?: ResponseInit) =>
    withApiAuthSession(NextResponse.json(body, init), auth);

  if (!auth.profile || !['moderator', 'admin'].includes(auth.profile.role)) {
    return json(
      {
        message:
          locale === 'zh'
            ? '只有管理員或版主可以核准商家認領。'
            : 'Only moderators and admins can approve business claims.',
      },
      { status: 403 }
    );
  }

  const key = requesterKey(request);
  if (!checkRateLimit(`admin-business-claims:${key}`, 10, 60_000)) {
    return json(
      {
        message:
          locale === 'zh'
            ? '認領審核操作太頻繁，請稍候再試。'
            : 'Business claim approval actions are happening too quickly. Please wait and try again.',
      },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as {
      claimId?: string;
      categorySlug?: string;
      city?: string;
      heroImage?: string;
      gallery?: string;
    };

    if (!body.claimId) {
      return json(
        { message: locale === 'zh' ? '缺少認領申請 ID。' : 'Missing claim id.' },
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

    const result = await approveBusinessClaim({
      claimId: body.claimId,
      actorRole: auth.profile.role,
      categorySlug: body.categorySlug,
      city: body.city,
      heroImage: photos.heroImage,
      gallery: photos.gallery,
    });

    return json({
      message:
        locale === 'zh'
          ? result.createdListing
            ? '認領已核准，商家已上架到目錄並連結到主理人後台。'
            : '認領已核准，商家已發布到目錄並連結到主理人後台。'
          : result.createdListing
            ? 'Claim approved. The business is now live in the directory and connected to the owner dashboard.'
            : 'Claim approved. The listing is now live in the directory and connected to the owner dashboard.',
      businessSlug: result.businessSlug,
    });
  } catch (error) {
    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : locale === 'zh'
              ? '無法核准這筆商家認領。'
              : 'Unable to approve this business claim.',
      },
      { status: 400 }
    );
  }
}
