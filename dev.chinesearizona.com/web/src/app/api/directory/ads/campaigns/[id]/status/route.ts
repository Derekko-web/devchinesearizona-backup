import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { updateDirectoryAdCampaignStatusForProfile } from '@/lib/directory-ads';
import { resolveLocale } from '@/lib/i18n';
import { checkRateLimit } from '@/lib/rate-limit';

function requesterKey(request: NextRequest) {
  return request.headers.get('x-forwarded-for') ?? 'local-request';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  const auth = await requireApiUser(
    request,
    locale,
    locale === 'zh' ? '管理商家贊助狀態' : 'manage sponsored placement status'
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
  if (!checkRateLimit(`directory-ads-status:${key}`, 30, 60_000)) {
    return json(
      {
        message:
          locale === 'zh'
            ? '贊助狀態操作太頻繁，請稍候再試。'
            : 'Sponsored placement status actions are happening too quickly. Please wait and try again.',
      },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as {
      action?: 'pause' | 'resume' | 'cancel';
    };
    const { id } = await params;

    if (!id || !body.action) {
      return json(
        {
          message:
            locale === 'zh'
              ? '缺少活動或操作資料。'
              : 'Missing campaign or action details.',
        },
        { status: 400 }
      );
    }

    const campaign = await updateDirectoryAdCampaignStatusForProfile({
      action: body.action,
      campaignId: id,
      profileId: auth.profile.id,
      role: auth.profile.role,
    });

    return json({
      campaign,
      message:
        locale === 'zh'
          ? '贊助活動狀態已更新。'
          : 'Sponsored placement status updated.',
    });
  } catch (error) {
    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : locale === 'zh'
              ? '目前無法更新贊助狀態。'
              : 'Unable to update sponsored placement status right now.',
      },
      { status: 400 }
    );
  }
}
