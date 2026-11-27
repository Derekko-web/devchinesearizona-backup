import 'server-only';

import { newsletterConsentCopy, type NewsletterResultCode } from '@/lib/newsletter-fields';
import type { SiteProfile } from '@/lib/site-config';
import { getSupabaseServiceClient } from '@/lib/supabase';
import type { Locale } from '@/lib/types';

// Footer newsletter sign-ups (issue #441). Nothing is sent yet; this only
// keeps the list in public.newsletter_subscribers, which only the server can
// read or write.

const EMAIL_MAX = 254;
const SOURCE_PATH_MAX = 300;
const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
// Tokens are 64 hex characters (see the migration).
const UNSUBSCRIBE_TOKEN_PATTERN = /^[a-f0-9]{32,128}$/;

export type SubscribeOutcome = 'subscribed' | 'resubscribed' | 'already_subscribed';

export class NewsletterError extends Error {
  readonly code: NewsletterResultCode;
  readonly status: number;

  constructor(code: NewsletterResultCode, status: number) {
    super(code);
    this.name = 'NewsletterError';
    this.code = code;
    this.status = status;
  }
}

export type NewsletterSignupInput = {
  email: string;
  sourcePath?: string;
};

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseNewsletterSignupInput(body: unknown): NewsletterSignupInput {
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const email = readText(record.email).toLowerCase();
  const sourcePath = readText(record.sourcePath);

  if (!email || email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email)) {
    throw new NewsletterError('invalid_email', 400);
  }

  return {
    email,
    // Only a path on this site, never a full URL someone typed in.
    sourcePath: sourcePath.startsWith('/') && !sourcePath.startsWith('//')
      ? sourcePath.slice(0, SOURCE_PATH_MAX)
      : undefined,
  };
}

export function isValidUnsubscribeToken(value: unknown): value is string {
  return typeof value === 'string' && UNSUBSCRIBE_TOKEN_PATTERN.test(value);
}

// Stored with each sign-up as proof of the wording the visitor agreed to.
export function buildConsentText(site: SiteProfile): string {
  const copy = newsletterConsentCopy(site.brandName);
  return `${copy.en} / ${copy.zh}`;
}

function requireNewsletterClient() {
  const client = getSupabaseServiceClient();
  if (!client) {
    throw new NewsletterError('unavailable', 503);
  }

  return client;
}

function isSubscribeOutcome(value: unknown): value is SubscribeOutcome {
  return value === 'subscribed' || value === 'resubscribed' || value === 'already_subscribed';
}

export async function subscribeToNewsletter(input: {
  email: string;
  site: SiteProfile;
  locale: Locale;
  sourcePath?: string;
}): Promise<SubscribeOutcome> {
  const client = requireNewsletterClient();
  const { data, error } = await client.rpc('newsletter_subscribe', {
    p_email: input.email,
    p_site_key: input.site.key,
    p_locale: input.locale,
    p_source_path: input.sourcePath ?? null,
    p_consent_text: buildConsentText(input.site),
  });

  if (error || !isSubscribeOutcome(data)) {
    throw new NewsletterError('error', 500);
  }

  return data;
}

// Returns false when no subscriber has this token.
export async function unsubscribeFromNewsletter(token: string): Promise<boolean> {
  if (!isValidUnsubscribeToken(token)) {
    return false;
  }

  const client = requireNewsletterClient();
  const { data, error } = await client.rpc('newsletter_unsubscribe', { p_token: token });
  if (error) {
    throw new NewsletterError('error', 500);
  }

  return data === true;
}
