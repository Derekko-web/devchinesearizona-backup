import { NextResponse } from 'next/server';

import { getAdminNotificationEmail, isEmailConfigured } from '@/lib/email';
import { isStripeConfigured, getStripeWebhookSecret } from '@/lib/stripe';
import { isSupabaseConfigured, isSupabaseServiceConfigured, probeSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type HealthCheck = {
  message: string;
  ok: boolean;
  required: boolean;
};

function check(message: string, ok: boolean, required = true): HealthCheck {
  return {
    message,
    ok,
    required,
  };
}

function envValue(name: string) {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export async function GET() {
  const supabaseProbe = await probeSupabase();

  const checks = {
    app: check('Next.js route handler responded.', true),
    siteUrl: check('NEXT_PUBLIC_SITE_URL is configured.', Boolean(envValue('NEXT_PUBLIC_SITE_URL'))),
    supabasePublic: check('Supabase public client is configured.', isSupabaseConfigured()),
    supabaseReachable: check(supabaseProbe.message, supabaseProbe.ok),
    supabaseService: check('Supabase service role is configured.', isSupabaseServiceConfigured(), false),
    stripeSecret: check('Stripe secret key is configured.', isStripeConfigured(), false),
    stripeWebhook: check('Stripe webhook secret is configured.', Boolean(getStripeWebhookSecret()), false),
    // Not required: inquiries and claims are saved and shown in /dashboard and
    // /admin without email, but nobody is emailed about them (#464).
    email: check(
      isEmailConfigured()
        ? 'Email sending (RESEND_API_KEY and EMAIL_FROM) is configured.'
        : 'Email is off: RESEND_API_KEY or EMAIL_FROM is missing. Inquiries and claims are saved and shown in /dashboard and /admin, but nobody is emailed about them.',
      isEmailConfigured(),
      false
    ),
    adminNotificationEmail: check(
      getAdminNotificationEmail()
        ? 'ADMIN_NOTIFICATION_EMAIL is configured.'
        : 'ADMIN_NOTIFICATION_EMAIL is missing, so new claims and inquiries on unclaimed listings have no one to email.',
      Boolean(getAdminNotificationEmail()),
      false
    ),
  };

  const ok = Object.values(checks).every((item) => !item.required || item.ok);

  return NextResponse.json(
    {
      ok,
      gitSha:
        envValue('GIT_SHA') ??
        envValue('NEXT_PUBLIC_GIT_SHA') ??
        envValue('VERCEL_GIT_COMMIT_SHA') ??
        'unknown',
      buildTime: envValue('BUILD_TIME') ?? envValue('NEXT_PUBLIC_BUILD_TIME') ?? 'unknown',
      uptimeSeconds: Math.round(process.uptime()),
      checks,
    },
    {
      status: ok ? 200 : 503,
      headers: {
        'cache-control': 'no-store',
      },
    }
  );
}
