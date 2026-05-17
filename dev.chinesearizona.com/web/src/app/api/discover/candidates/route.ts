import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { createOrRefreshDiscoverCandidate } from '@/lib/discover-arizona';
import { isDiscoveryCategory, isDiscoveryQueueStatus } from '@/lib/discovery-taxonomy';
import { resolveLocale } from '@/lib/i18n';
import { checkRateLimit } from '@/lib/rate-limit';
import type { ProfileRole } from '@/lib/types';

function requesterKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') ?? 'local-request';
}

function resolveRole(
  profileRole: ProfileRole | null | undefined,
  appMetadataRole: unknown
): ProfileRole | null {
  if (
    profileRole === 'member' ||
    profileRole === 'business_owner' ||
    profileRole === 'editor' ||
    profileRole === 'moderator' ||
    profileRole === 'admin'
  ) {
    return profileRole;
  }

  return appMetadataRole === 'member' ||
    appMetadataRole === 'business_owner' ||
    appMetadataRole === 'editor' ||
    appMetadataRole === 'moderator' ||
    appMetadataRole === 'admin'
    ? appMetadataRole
    : null;
}

export async function POST(request: NextRequest) {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  const auth = await requireApiUser(
    request,
    locale,
    locale === 'zh' ? '管理 Discover Arizona 候選內容' : 'manage Discover Arizona candidates'
  );
  if (auth.response) {
    return auth.response;
  }

  const json = (body: unknown, init?: ResponseInit) =>
    withApiAuthSession(NextResponse.json(body, init), auth);
  const role = resolveRole(auth.profile?.role, auth.user.app_metadata?.role);
  if (role !== 'moderator' && role !== 'admin') {
    return json(
      {
        message:
          locale === 'zh'
            ? '只有管理員或版主可以建立 Discover Arizona 候選內容。'
            : 'Only moderators and admins can create Discover Arizona candidates.',
      },
      { status: 403 }
    );
  }

  const key = requesterKey(request);
  if (!checkRateLimit(`discover-candidates:${key}`, 20, 60_000)) {
    return json(
      {
        message:
          locale === 'zh'
            ? '新增候選內容太頻繁，請稍候再試。'
            : 'Candidate intake is happening too quickly. Please wait and try again.',
      },
      { status: 429 }
    );
  }

  const body = (await request.json()) as {
    sourceUrl?: string;
    discoveredCategory?: string;
    sourceSurface?: string;
    queueStatus?: string;
    collectorNotes?: string;
  };

  if (!body.sourceUrl || !body.discoveredCategory || !isDiscoveryCategory(body.discoveredCategory)) {
    return json(
      {
        message:
          locale === 'zh'
            ? '請提供有效的 TikTok URL 與 Discover Arizona 分類。'
            : 'Please provide a valid TikTok URL and Discover Arizona category.',
      },
      { status: 400 }
    );
  }

  try {
    const candidate = await createOrRefreshDiscoverCandidate({
      sourceUrl: body.sourceUrl,
      discoveredCategories: [body.discoveredCategory],
      sourceSurface: body.sourceSurface?.trim() || 'manual_admin',
      queueStatus:
        body.queueStatus && isDiscoveryQueueStatus(body.queueStatus)
          ? body.queueStatus
          : 'queued',
      collectorNotes:
        body.collectorNotes?.trim() ||
        (locale === 'zh'
          ? '由管理端手動加入 Discover Arizona。'
          : 'Added manually from the Discover Arizona admin panel.'),
    });

    return json({
      message:
        locale === 'zh'
          ? `候選內容已加入佇列。Post ID：${candidate.postId}`
          : `Candidate added to the queue. Post ID: ${candidate.postId}`,
    });
  } catch (error) {
    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : locale === 'zh'
              ? '無法建立 Discover Arizona 候選內容。'
              : 'Unable to create the Discover Arizona candidate.',
      },
      { status: 400 }
    );
  }
}
