import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { requireApiUser, withApiAuthSession } from '@/lib/api-auth';
import { resolveLocale } from '@/lib/i18n';
import type { Locale, ProfileRole } from '@/lib/types';

type RadarAdminAuth =
  | {
      locale: Locale;
      profile: null;
      response: NextResponse;
      sessionToPersist: null;
      user: null;
    }
  | {
      locale: Locale;
      profile: unknown;
      response: null;
      sessionToPersist: unknown;
      user: unknown;
    };

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

export async function requireRadarAdmin(
  request: NextRequest,
  actionLabel: string
): Promise<RadarAdminAuth> {
  const locale = resolveLocale(request.headers.get('x-locale') ?? undefined);
  const auth = await requireApiUser(request, locale, actionLabel);
  if (auth.response) {
    return {
      locale,
      profile: null,
      response: auth.response,
      sessionToPersist: null,
      user: null,
    };
  }

  const role = resolveRole(auth.profile?.role, auth.user.app_metadata?.role);
  if (role !== 'moderator' && role !== 'admin') {
    return {
      locale,
      profile: null,
      response: withApiAuthSession(
        NextResponse.json(
          {
            message:
              locale === 'zh'
                ? '只有版主或管理員可以管理 Arizona Radar。'
                : 'Only moderators and admins can manage Arizona Radar.',
          },
          { status: 403 }
        ),
        auth
      ),
      sessionToPersist: null,
      user: null,
    };
  }

  return {
    locale,
    profile: auth.profile,
    response: null,
    sessionToPersist: auth.sessionToPersist,
    user: auth.user,
  };
}

export function radarAdminJson(
  auth: { sessionToPersist: unknown },
  body: unknown,
  init?: ResponseInit
) {
  return withApiAuthSession(NextResponse.json(body, init), auth as { sessionToPersist: never });
}
