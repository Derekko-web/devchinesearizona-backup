import type { NextRequest } from 'next/server';

import { radarAdminJson, requireRadarAdmin } from '@/lib/radar-admin';
import { blockRadarCandidateAsync } from '@/lib/radar';

export async function POST(request: NextRequest) {
  const auth = await requireRadarAdmin(
    request,
    request.headers.get('x-locale') === 'zh' ? '阻擋 Arizona Radar 候選內容' : 'block Arizona Radar candidates'
  );
  if (auth.response) {
    return auth.response;
  }

  const body = (await request.json()) as { candidateId?: string };
  if (!body.candidateId) {
    return radarAdminJson(
      auth,
      {
        message: auth.locale === 'zh' ? '缺少候選內容 id。' : 'Missing candidate id.',
      },
      { status: 400 }
    );
  }

  await blockRadarCandidateAsync(body.candidateId);

  return radarAdminJson(auth, {
    message: auth.locale === 'zh' ? '候選內容已阻擋。' : 'Candidate blocked.',
  });
}
