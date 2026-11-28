import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { notifyAdminOfBusinessClaim } from '@/lib/claim-notifications';
import { parseBusinessPhotoSet } from '@/lib/business-media';
import { submitBusinessClaim } from '@/lib/directory-moderation';
import { resolveLocale } from '@/lib/i18n';
import { checkRateLimit } from '@/lib/rate-limit';
import { recordAnalyticsEvent } from '@/lib/runtime-store';

function requesterKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') ?? 'local-request';
}

export async function POST(request: NextRequest) {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  const auth = await requireApiUser(
    request,
    locale,
    locale === 'zh' ? '提交商家認領或新增申請' : 'claim or add a business'
  );
  if (auth.response) {
    return auth.response;
  }
  const json = (body: unknown, init?: ResponseInit) =>
    withApiAuthSession(NextResponse.json(body, init), auth);

  const key = requesterKey(request);
  if (!checkRateLimit(`business-claim:${key}`, 8, 60_000)) {
    return json(
      {
        message:
          locale === 'zh'
            ? '提交次數過多，請稍候一下再試。'
            : 'Too many submissions. Please wait a moment and try again.',
      },
      { status: 429 }
    );
  }

  const body = (await request.json()) as {
    businessSlug?: string;
    businessName?: string;
    claimantName?: string;
    email?: string;
    category?: string;
    city?: string;
    details?: string;
    heroImage?: string;
    gallery?: string;
  };

  if (!body.businessName || !body.claimantName || !body.email) {
    return json(
      { message: locale === 'zh' ? '缺少必填欄位。' : 'Missing required fields.' },
      { status: 400 }
    );
  }

  try {
    const photos = parseBusinessPhotoSet(
      {
        heroImage: body.heroImage,
        galleryText: body.gallery,
      },
      locale
    );

    const claim = await submitBusinessClaim({
      businessSlug: body.businessSlug,
      businessName: body.businessName,
      claimantName: body.claimantName,
      email: body.email,
      profileId: auth.profile?.id ?? undefined,
      category: body.category,
      city: body.city,
      details: body.details,
      heroImage: photos.heroImage,
      gallery: photos.gallery,
    });

    recordAnalyticsEvent('claim_submission', claim.businessSlug ?? claim.businessName, '/add-business');
    // Best effort: the claim is saved even if this email fails or email is off (#464).
    await notifyAdminOfBusinessClaim(claim);

    // A request without a listing is a new business, not a claim (#469).
    const isClaim = Boolean(claim.businessSlug);
    return json({
      message: isClaim
        ? locale === 'zh'
          ? '已收到你的認領申請。我們會人工審核，通常在一個工作天內完成。核准後，這家商家會出現在你的商家後台。'
          : 'Claim request received. We review every claim by hand, usually within one business day. Once it is approved, the listing appears in your dashboard.'
        : locale === 'zh'
          ? '已收到你的新增商家申請。我們會人工審核，通常在一個工作天內完成。核准後，商家會上架並出現在你的商家後台。'
          : 'New business request received. We review every request by hand, usually within one business day. Once it is approved, the listing goes live and appears in your dashboard.',
    });
  } catch (error) {
    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : locale === 'zh'
              ? '無法提交商家申請。'
              : 'Unable to submit this business request.',
      },
      { status: 400 }
    );
  }
}
