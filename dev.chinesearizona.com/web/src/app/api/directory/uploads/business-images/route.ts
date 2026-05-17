import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { uploadBusinessImageForProfile } from '@/lib/business-image-storage';
import { resolveLocale } from '@/lib/i18n';
import { checkRateLimit } from '@/lib/rate-limit';

function requesterKey(request: NextRequest, profileId: string) {
  return `${profileId}:${request.headers.get('x-forwarded-for') ?? 'local-request'}`;
}

export async function POST(request: NextRequest) {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  const auth = await requireApiUser(
    request,
    locale,
    locale === 'zh' ? '上傳商家圖片' : 'upload business images'
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

  if (!checkRateLimit(`business-image-upload:${requesterKey(request, auth.profile.id)}`, 12, 60_000)) {
    return json(
      {
        message:
          locale === 'zh'
            ? '圖片上傳太頻繁，請稍候再試。'
            : 'Image uploads are happening too quickly. Please wait and try again.',
      },
      { status: 429 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const targetValue = String(formData.get('target') ?? '').trim().toLowerCase();
    const target = targetValue === 'gallery' ? 'gallery' : 'hero';

    if (!(file instanceof File)) {
      return json(
        {
          message: locale === 'zh' ? '請先貼上一張圖片。' : 'Paste an image first.',
        },
        { status: 400 }
      );
    }

    const result = await uploadBusinessImageForProfile({
      file,
      locale,
      profileId: auth.profile.id,
      target,
    });

    return json({
      message:
        locale === 'zh'
          ? target === 'gallery'
            ? '圖片已上傳並加入圖集欄位。'
            : '圖片已上傳並填入封面欄位。'
          : target === 'gallery'
            ? 'Image uploaded and added to the gallery field.'
            : 'Image uploaded and added to the cover field.',
      url: result.url,
    });
  } catch (error) {
    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : locale === 'zh'
              ? '目前無法上傳這張圖片。'
              : 'Unable to upload this image right now.',
      },
      { status: 400 }
    );
  }
}
