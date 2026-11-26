import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { BilingualDetailsError } from '@/lib/business-bilingual';
import { updateBusinessBilingualDetailsForProfile } from '@/lib/directory-owner';
import { resolveLocale } from '@/lib/i18n';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientAddress } from '@/lib/request-url';

// Saves a listing's bilingual details (issue #411): spoken languages,
// WeChat ID, WeChat Pay / Alipay and Chinese menus or forms.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  const zh = locale === 'zh';
  const auth = await requireApiUser(request, locale, zh ? '更新商家雙語資訊' : 'update listing details');
  if (auth.response) {
    return auth.response;
  }

  const json = (body: unknown, init?: ResponseInit) =>
    withApiAuthSession(NextResponse.json(body, init), auth);

  if (!auth.profile?.id) {
    return json(
      { message: zh ? '目前無法載入你的商家帳號。' : 'Unable to load your business account right now.' },
      { status: 503 }
    );
  }

  if (!checkRateLimit(`directory-business-details:${getClientAddress(request)}`, 20, 60_000)) {
    return json(
      { message: zh ? '更新太頻繁，請稍候再試。' : 'Too many updates. Please wait a minute and try again.' },
      { status: 429 }
    );
  }

  const { slug } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  if (!slug || !body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ message: zh ? '缺少商家資料。' : 'Missing listing details.' }, { status: 400 });
  }

  try {
    const result = await updateBusinessBilingualDetailsForProfile({
      businessSlug: slug,
      details: body as Record<string, unknown>,
      locale,
      profileId: auth.profile.id,
      role: auth.profile.role,
    });

    return json({
      businessSlug: result.businessSlug,
      details: result.details,
      message: zh ? '雙語資訊已儲存。' : 'Bilingual details saved.',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : zh ? '目前無法儲存雙語資訊。' : 'Unable to save bilingual details right now.';
    return json({ message }, { status: error instanceof BilingualDetailsError ? 422 : 400 });
  }
}
