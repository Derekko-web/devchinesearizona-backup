import type { NextRequest } from 'next/server';

import { radarAdminJson, requireRadarAdmin } from '@/lib/radar-admin';
import { unpublishRadarArticleAsync } from '@/lib/radar';

export async function POST(request: NextRequest) {
  const auth = await requireRadarAdmin(
    request,
    request.headers.get('x-locale') === 'zh' ? '撤下 Arizona Radar 內容' : 'unpublish Arizona Radar content'
  );
  if (auth.response) {
    return auth.response;
  }

  const body = (await request.json()) as { articleId?: string };
  if (!body.articleId) {
    return radarAdminJson(
      auth,
      {
        message: auth.locale === 'zh' ? '缺少文章 id。' : 'Missing article id.',
      },
      { status: 400 }
    );
  }

  await unpublishRadarArticleAsync(body.articleId);

  return radarAdminJson(auth, {
    message: auth.locale === 'zh' ? '內容已撤下。' : 'Article unpublished.',
  });
}
