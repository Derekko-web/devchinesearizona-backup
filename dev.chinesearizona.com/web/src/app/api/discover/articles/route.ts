import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { parseLineList, upsertDiscoverArticle } from '@/lib/discover-arizona';
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
    locale === 'zh' ? '編輯 Discover Arizona 文章' : 'edit Discover Arizona articles'
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
            ? '只有管理員或版主可以儲存 Discover Arizona 文章。'
            : 'Only moderators and admins can save Discover Arizona articles.',
      },
      { status: 403 }
    );
  }

  const key = requesterKey(request);
  if (!checkRateLimit(`discover-articles:${key}`, 20, 60_000)) {
    return json(
      {
        message:
          locale === 'zh'
            ? '文章儲存操作太頻繁，請稍候再試。'
            : 'Article saves are happening too quickly. Please wait and try again.',
      },
      { status: 429 }
    );
  }

  const body = (await request.json()) as {
    candidateId?: string;
    slug?: string;
    primaryCategory?: string;
    queueStatus?: string;
    titleEn?: string;
    titleZh?: string;
    excerptEn?: string;
    excerptZh?: string;
    bodyEn?: string;
    bodyZh?: string;
    heroImageUrl?: string;
    city?: string;
    region?: string;
    tags?: string;
    relatedBusinessSlugs?: string;
    relatedHiddenArizonaSlugs?: string;
    isFeatured?: boolean;
    embedEnabled?: boolean;
  };

  if (
    !body.candidateId ||
    !body.primaryCategory ||
    !isDiscoveryCategory(body.primaryCategory) ||
    !body.queueStatus ||
    !isDiscoveryQueueStatus(body.queueStatus) ||
    !body.titleEn?.trim() ||
    !body.titleZh?.trim() ||
    !body.excerptEn?.trim() ||
    !body.excerptZh?.trim() ||
    !body.bodyEn?.trim() ||
    !body.bodyZh?.trim()
  ) {
    return json(
      {
        message:
          locale === 'zh'
            ? '請補齊候選內容、分類、狀態與中英文文章欄位。'
            : 'Please provide the candidate, category, status, and bilingual article fields.',
      },
      { status: 400 }
    );
  }

  if (body.queueStatus === 'published' && !body.embedEnabled) {
    return json(
      {
        message:
          locale === 'zh'
            ? '若要發布文章，必須啟用 TikTok 嵌入播放器。'
            : 'Published articles must have the TikTok embed player enabled.',
      },
      { status: 400 }
    );
  }

  try {
    const article = await upsertDiscoverArticle({
      candidateId: body.candidateId,
      slug: body.slug,
      primaryCategory: body.primaryCategory,
      titleEn: body.titleEn,
      titleZh: body.titleZh,
      excerptEn: body.excerptEn,
      excerptZh: body.excerptZh,
      bodyEn: body.bodyEn,
      bodyZh: body.bodyZh,
      heroImageUrl: body.heroImageUrl,
      city: body.city,
      region: body.region,
      tags: parseLineList(body.tags ?? ''),
      relatedBusinessSlugs: parseLineList(body.relatedBusinessSlugs ?? ''),
      relatedHiddenArizonaSlugs: parseLineList(body.relatedHiddenArizonaSlugs ?? ''),
      isFeatured: Boolean(body.isFeatured),
      embedEnabled: Boolean(body.embedEnabled),
      queueStatus: body.queueStatus,
    });

    return json({
      message:
        body.queueStatus === 'published'
          ? locale === 'zh'
            ? `文章已發布：${article.slug}`
            : `Article published: ${article.slug}`
          : locale === 'zh'
            ? `文章已儲存到 Discover Arizona 佇列：${article.slug}`
            : `Article saved to the Discover Arizona queue: ${article.slug}`,
    });
  } catch (error) {
    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : locale === 'zh'
              ? '無法儲存 Discover Arizona 文章。'
              : 'Unable to save the Discover Arizona article.',
      },
      { status: 400 }
    );
  }
}
