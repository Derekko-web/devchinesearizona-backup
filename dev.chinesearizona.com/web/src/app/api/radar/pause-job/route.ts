import type { NextRequest } from 'next/server';

import { radarAdminJson, requireRadarAdmin } from '@/lib/radar-admin';
import { setRadarJobPausedAsync } from '@/lib/radar';

export async function POST(request: NextRequest) {
  const auth = await requireRadarAdmin(
    request,
    request.headers.get('x-locale') === 'zh' ? '管理 Arizona Radar 排程' : 'manage Arizona Radar jobs'
  );
  if (auth.response) {
    return auth.response;
  }

  const body = (await request.json()) as { paused?: boolean };
  const paused = Boolean(body.paused);
  await setRadarJobPausedAsync(paused);

  return radarAdminJson(auth, {
    message: auth.locale === 'zh' ? (paused ? '排程已暫停。' : '排程已恢復。') : paused ? 'Radar job paused.' : 'Radar job resumed.',
  });
}
