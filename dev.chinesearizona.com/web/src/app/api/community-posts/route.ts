import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { resolveLocale } from '@/lib/i18n';
import { checkRateLimit } from '@/lib/rate-limit';
import { createCommunityPost, recordAnalyticsEvent } from '@/lib/runtime-store';

function requesterKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') ?? 'local-request';
}

export async function POST(request: NextRequest) {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  const auth = await requireApiUser(
    request,
    locale,
    locale === 'zh' ? '發佈社群貼文' : 'publish in the community'
  );
  if (auth.response) {
    return auth.response;
  }
  const json = (body: unknown, init?: ResponseInit) =>
    withApiAuthSession(NextResponse.json(body, init), auth);

  const key = requesterKey(request);
  if (!checkRateLimit(`community-post:${key}`, 4, 60_000)) {
    return json(
      {
        message:
          locale === 'zh'
            ? '送出得太快了，請稍候再試。'
            : 'Posting too quickly. Please wait before submitting again.',
      },
      { status: 429 }
    );
  }

  const body = (await request.json()) as {
    type?: 'board' | 'classified';
    titleEn?: string;
    titleZh?: string;
    excerptEn?: string;
    excerptZh?: string;
    bodyEn?: string;
    bodyZh?: string;
    city?: string;
    linkUrl?: string;
    price?: string;
  };

  if (
    !body.type ||
    !body.titleEn ||
    !body.titleZh ||
    !body.excerptEn ||
    !body.excerptZh ||
    !body.bodyEn ||
    !body.bodyZh ||
    !body.city
  ) {
    return json(
      { message: locale === 'zh' ? '缺少必填欄位。' : 'Missing required fields.' },
      { status: 400 }
    );
  }

  const post = createCommunityPost({
    type: body.type,
    title: {
      en: body.titleEn,
      'zh': body.titleZh,
    },
    excerpt: {
      en: body.excerptEn,
      'zh': body.excerptZh,
    },
    body: [
      {
        en: body.bodyEn,
        'zh': body.bodyZh,
      },
    ],
    authorSlug: 'newcomer-derek',
    city: body.city,
    price: body.price,
    linkUrl: body.linkUrl,
  });

  recordAnalyticsEvent('community_post_submission', post.slug, '/community');

  return json({
    message:
      locale === 'zh'
        ? `貼文已發布，現在就能查看；在帳號建立信任之前，搜尋引擎仍會維持不收錄。Slug：${post.slug}`
        : `Post published. It is live now, but it will remain noindex until the account establishes trust. Slug: ${post.slug}`,
  });
}
