import 'server-only';

import { getAdvertisePlans, isAdvertisePlanId, type AdvertisePlanId } from '@/lib/advertise';
import { getAdminNotificationEmail, isEmailConfigured, sendEmail } from '@/lib/email';
import { defaultSiteProfile, siteProfiles, type SiteProfile } from '@/lib/site-config';
import { getSupabaseServiceClient } from '@/lib/supabase';
import type { Locale } from '@/lib/types';

// Advertising inquiries from the "Talk to us" form on /advertise (#474). They
// used to open an email to the site's hello@ address, which cannot receive
// mail, so they were lost. Now each one is saved, shown on /admin, and emailed
// to ADMIN_NOTIFICATION_EMAIL when email is set up.

const NAME_MAX = 120;
const BUSINESS_NAME_MAX = 160;
const CONTACT_MAX = 200;
const MESSAGE_MAX = 2000;
const PAGE_PATH_MAX = 300;
const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

export class AdvertiseInquiryError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdvertiseInquiryError';
    this.status = status;
  }
}

function localized(locale: Locale, en: string, zh: string) {
  return locale === 'zh' ? zh : en;
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export type AdvertiseInquiryInput = {
  name: string;
  businessName: string;
  contact: string;
  planId?: AdvertisePlanId;
  message?: string;
  pagePath?: string;
};

export function parseAdvertiseInquiryInput(body: unknown, locale: Locale): AdvertiseInquiryInput {
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const name = readText(record.name);
  const businessName = readText(record.businessName);
  const contact = readText(record.contact);
  const message = readText(record.message);
  const planId = readText(record.planId);
  const pagePath = readText(record.pagePath);

  if (!name || !businessName || !contact) {
    throw new AdvertiseInquiryError(
      localized(
        locale,
        'Please fill in your name, business name and how to reach you.',
        '請填寫姓名、商家名稱與聯絡方式。'
      ),
      400
    );
  }

  if (
    name.length > NAME_MAX ||
    businessName.length > BUSINESS_NAME_MAX ||
    contact.length > CONTACT_MAX ||
    message.length > MESSAGE_MAX
  ) {
    throw new AdvertiseInquiryError(
      localized(
        locale,
        `Please keep your message under ${MESSAGE_MAX} characters and each other field shorter.`,
        `訊息請少於 ${MESSAGE_MAX} 字，其他欄位也請精簡。`
      ),
      400
    );
  }

  if (planId && !isAdvertisePlanId(planId)) {
    throw new AdvertiseInquiryError(localized(locale, 'Unknown plan.', '無法辨識的方案。'), 400);
  }

  return {
    name,
    businessName,
    contact,
    planId: planId ? (planId as AdvertisePlanId) : undefined,
    message: message || undefined,
    pagePath: pagePath.startsWith('/') ? pagePath.slice(0, PAGE_PATH_MAX) : undefined,
  };
}

export function buildAdvertiseInquiryEmail(input: {
  inquiry: AdvertiseInquiryInput;
  locale: Locale;
  site: SiteProfile;
}): { subject: string; text: string; replyTo?: string } {
  const { inquiry, locale, site } = input;
  const plan = inquiry.planId ? getAdvertisePlans(site).find((item) => item.id === inquiry.planId) : undefined;
  const siteUrl = defaultSiteProfile.url.replace(/\/+$/, '');
  const lines = [
    `${inquiry.name} from ${inquiry.businessName} asked about advertising on ${site.brandName}.`,
    `${inquiry.businessName} 想了解在 ${site.brandNameZh} 的廣告合作。`,
    'We promised a reply within one business day. / 我們承諾在一個工作天內回覆。',
    '',
    `Name 姓名: ${inquiry.name}`,
    `Business 商家: ${inquiry.businessName}`,
    `Reach them at 聯絡方式: ${inquiry.contact}`,
    `Plan 方案: ${plan ? `${plan.name.en} / ${plan.name.zh}` : 'Not sure yet / 尚未決定'}`,
    `Site 網站: ${site.domain}`,
    `Language 語言: ${locale === 'zh' ? '中文' : 'English'}`,
    ...(inquiry.message ? ['', 'Message 訊息:', inquiry.message] : []),
    '',
    `All advertising inquiries / 所有廣告詢問: ${siteUrl}/admin`,
  ];

  return {
    subject: `Advertising inquiry / 廣告合作詢問: ${inquiry.businessName} (${site.brandName})`,
    text: lines.join('\n'),
    replyTo: EMAIL_PATTERN.test(inquiry.contact) ? inquiry.contact : undefined,
  };
}

export async function submitAdvertiseInquiry(input: {
  inquiry: AdvertiseInquiryInput;
  locale: Locale;
  site: SiteProfile;
}): Promise<{ id: string; notified: boolean }> {
  const { inquiry, locale, site } = input;
  const client = getSupabaseServiceClient();
  if (!client) {
    throw new AdvertiseInquiryError(
      localized(
        locale,
        'Messages are not available right now. Please try again later.',
        '目前無法傳送訊息，請稍後再試。'
      ),
      503
    );
  }

  const { data: inserted, error } = await client
    .from('advertise_inquiries')
    .insert({
      site_key: site.key,
      plan_id: inquiry.planId ?? null,
      name: inquiry.name,
      business_name: inquiry.businessName,
      contact: inquiry.contact,
      message: inquiry.message ?? null,
      locale,
      page_path: inquiry.pagePath ?? null,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    throw new AdvertiseInquiryError(
      localized(locale, 'Unable to send your message right now. Please try again.', '目前無法送出訊息，請稍後再試。'),
      500
    );
  }

  const id = (inserted as { id: string }).id;
  const to = getAdminNotificationEmail();
  let notifyError: string | null = null;
  if (!isEmailConfigured()) {
    notifyError = 'email_not_configured';
  } else if (!to) {
    notifyError = 'no_recipient';
  } else {
    try {
      const email = buildAdvertiseInquiryEmail({ inquiry, locale, site });
      await sendEmail({ to, subject: email.subject, text: email.text, replyTo: email.replyTo });
    } catch (sendError) {
      notifyError = sendError instanceof Error ? sendError.message.slice(0, 200) : 'email_failed';
    }
  }

  // The inquiry is already saved; a failed status update only loses the note.
  await client
    .from('advertise_inquiries')
    .update(notifyError ? { notify_error: notifyError } : { notified_at: new Date().toISOString(), notify_error: null })
    .eq('id', id);

  return { id, notified: notifyError === null };
}

export type AdvertiseInquirySummary = {
  id: string;
  siteKey: string;
  siteName: string;
  planName?: string;
  name: string;
  businessName: string;
  contact: string;
  message?: string;
  locale: Locale;
  createdAt: string;
  notifiedAt?: string;
  notifyError?: string;
};

type AdvertiseInquiryRow = {
  id: string;
  site_key: string;
  plan_id: string | null;
  name: string;
  business_name: string;
  contact: string;
  message: string | null;
  locale: string;
  created_at: string;
  notified_at: string | null;
  notify_error: string | null;
};

export async function getRecentAdvertiseInquiries(limit = 20): Promise<AdvertiseInquirySummary[]> {
  const client = getSupabaseServiceClient();
  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from('advertise_inquiries')
    .select('id, site_key, plan_id, name, business_name, contact, message, locale, created_at, notified_at, notify_error')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !Array.isArray(data)) {
    return [];
  }

  return (data as AdvertiseInquiryRow[]).map((row) => {
    const site = Object.values(siteProfiles).find((profile) => profile.key === row.site_key);
    const plan = isAdvertisePlanId(row.plan_id)
      ? getAdvertisePlans(site ?? defaultSiteProfile).find((item) => item.id === row.plan_id)
      : undefined;
    return {
      id: row.id,
      siteKey: row.site_key,
      siteName: site?.brandName ?? row.site_key,
      planName: plan ? `${plan.name.en} / ${plan.name.zh}` : undefined,
      name: row.name,
      businessName: row.business_name,
      contact: row.contact,
      message: row.message ?? undefined,
      locale: row.locale === 'zh' ? 'zh' : 'en',
      createdAt: row.created_at,
      notifiedAt: row.notified_at ?? undefined,
      notifyError: row.notify_error ?? undefined,
    };
  });
}
