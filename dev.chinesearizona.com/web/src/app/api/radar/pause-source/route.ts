import type { NextRequest } from 'next/server';

import { radarAdminJson, requireRadarAdmin } from '@/lib/radar-admin';
import { setRadarSourcePausedAsync } from '@/lib/radar';

export async function POST(request: NextRequest) {
  const auth = await requireRadarAdmin(
    request,
    request.headers.get('x-locale') === 'zh' ? '管理 Arizona Radar 來源' : 'manage Arizona Radar sources'
  );
  if (auth.response) {
    return auth.response;
  }

  const body = (await request.json()) as { paused?: boolean; sourceSlug?: string };
  if (!body.sourceSlug) {
    return radarAdminJson(
      auth,
      {
        message: auth.locale === 'zh' ? '缺少來源 slug。' : 'Missing source slug.',
      },
      { status: 400 }
    );
  }

  const paused = Boolean(body.paused);
  await setRadarSourcePausedAsync(body.sourceSlug, paused);

  return radarAdminJson(auth, {
    message:
      auth.locale === 'zh'
        ? paused
          ? '來源已暫停。'
          : '來源已恢復。'
        : paused
          ? 'Source paused.'
          : 'Source resumed.',
  });
}
