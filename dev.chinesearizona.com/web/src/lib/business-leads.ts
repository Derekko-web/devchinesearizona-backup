import 'server-only';

import { createHmac } from 'node:crypto';

import { getAdminNotificationEmail, isEmailConfigured, sendEmail } from '@/lib/email';
import { defaultSiteProfile, type SiteProfile } from '@/lib/site-config';
import { getSupabaseServiceClient, isSupabaseServiceConfigured } from '@/lib/supabase';
import type { Locale, LocalizedText } from '@/lib/types';

// Free leads for listings (issue #410). Leads are never billed per inquiry or
// per closed deal. For real estate and mortgage that is required by RESPA
// section 8 and Arizona referral rules, so sponsors there pay flat
// advertising fees only.

// Categories where a visitor usually wants a reply before calling. Insurance
// lives under legal-finance, dental under medical, tutoring under education.
const INQUIRY_CATEGORY_SLUGS = new Set([
  'real-estate',
  'legal-finance',
  'medical',
  'education',
  'home-services',
]);

export const INQUIRY_TYPES = ['question', 'quote'] as const;
export type InquiryType = (typeof INQUIRY_TYPES)[number];

export const CONTACT_ACTIONS = ['call', 'website', 'directions'] as const;
export type ContactAction = (typeof CONTACT_ACTIONS)[number];

const NAME_MAX = 120;
const EMAIL_MAX = 254;
const PHONE_MAX = 40;
const MESSAGE_MAX = 2000;
const PAGE_PATH_MAX = 300;
const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

export class BusinessLeadError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'BusinessLeadError';
    this.status = status;
  }
}

function localized(locale: Locale, en: string, zh: string) {
  return locale === 'zh' ? zh : en;
}

export function isInquiryCategory(categorySlug?: string | null): boolean {
  return Boolean(categorySlug && INQUIRY_CATEGORY_SLUGS.has(categorySlug));
}

// Leads need a real Supabase row behind the listing, which only the main site
// has (city sites read static JSON).
export function businessLeadsEnabled(site: SiteProfile): boolean {
  return (
    site.key === defaultSiteProfile.key &&
    isSupabaseServiceConfigured() &&
    process.env.DIRECTORY_USE_FIXTURES !== '1'
  );
}

export function isContactAction(value: unknown): value is ContactAction {
  return typeof value === 'string' && (CONTACT_ACTIONS as readonly string[]).includes(value);
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export type BusinessInquiryInput = {
  businessSlug: string;
  inquiryType: InquiryType;
  name: string;
  email: string;
  phone?: string;
  message: string;
  locale: Locale;
  pagePath?: string;
};

export function parseBusinessInquiryInput(body: unknown, locale: Locale): BusinessInquiryInput {
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const businessSlug = readText(record.businessSlug);
  const name = readText(record.name);
  const email = readText(record.email).toLowerCase();
  const phone = readText(record.phone);
  const message = readText(record.message);
  const pagePath = readText(record.pagePath);
  const inquiryType = readText(record.inquiryType) || 'question';

  if (!businessSlug || !name || !email || !message) {
    throw new BusinessLeadError(
      localized(locale, 'Please add your name, email, and message.', '請填寫姓名、Email 和訊息內容。'),
      400
    );
  }

  if (!(INQUIRY_TYPES as readonly string[]).includes(inquiryType)) {
    throw new BusinessLeadError(localized(locale, 'Unknown request type.', '無法辨識的詢問類型。'), 400);
  }

  if (email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email)) {
    throw new BusinessLeadError(
      localized(locale, 'Please enter a valid email address.', '請輸入有效的 Email。'),
      400
    );
  }

  if (name.length > NAME_MAX || phone.length > PHONE_MAX || message.length > MESSAGE_MAX) {
    throw new BusinessLeadError(
      localized(
        locale,
        `Please keep your name under ${NAME_MAX} characters and your message under ${MESSAGE_MAX}.`,
        `姓名請少於 ${NAME_MAX} 字，訊息請少於 ${MESSAGE_MAX} 字。`
      ),
      400
    );
  }

  return {
    businessSlug,
    inquiryType: inquiryType as InquiryType,
    name,
    email,
    phone: phone || undefined,
    message,
    locale,
    pagePath: pagePath.startsWith('/') ? pagePath.slice(0, PAGE_PATH_MAX) : undefined,
  };
}

function requireLeadClient(locale: Locale) {
  const client = getSupabaseServiceClient();
  if (!client) {
    throw new BusinessLeadError(
      localized(
        locale,
        'Messages are not available right now. Please call the business directly.',
        '目前無法傳送訊息，請直接聯絡商家。'
      ),
      503
    );
  }

  return client;
}

type LeadBusinessRow = {
  id: string;
  slug: string;
  name_en: string;
  name_zh_tw: string | null;
  status: string | null;
  owner_profile_id: string | null;
  category?: { slug: string | null } | Array<{ slug: string | null }> | null;
};

async function findLeadBusiness(
  client: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  slug: string
): Promise<LeadBusinessRow | null> {
  const { data, error } = await client
    .from('businesses')
    .select('id, slug, name_en, name_zh_tw, status, owner_profile_id, category:business_categories(slug)')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as LeadBusinessRow;
}

function categorySlugOf(row: LeadBusinessRow): string | null {
  const category = Array.isArray(row.category) ? row.category[0] : row.category;
  return category?.slug ?? null;
}

function isPublicStatus(status: string | null): boolean {
  return status === 'live' || status === 'stale';
}

async function findOwnerEmail(
  client: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  ownerProfileId: string
): Promise<string | null> {
  const { data: profile } = await client
    .from('profiles')
    .select('auth_user_id')
    .eq('id', ownerProfileId)
    .maybeSingle();
  const authUserId = (profile as { auth_user_id?: string | null } | null)?.auth_user_id;
  if (!authUserId) {
    return null;
  }

  const { data: authProfile } = await client
    .from('auth_profiles')
    .select('email')
    .eq('id', authUserId)
    .maybeSingle();
  const email = (authProfile as { email?: string | null } | null)?.email?.trim();
  return email ? email : null;
}

export function buildInquiryEmail(input: {
  businessName: LocalizedText;
  inquiry: BusinessInquiryInput;
  listingUrl: string;
  recipient: 'owner' | 'admin';
}): { subject: string; text: string } {
  const { businessName, inquiry, listingUrl, recipient } = input;
  const nameZh = businessName.zh && businessName.zh !== businessName.en ? businessName.zh : businessName.en;
  const typeEn = inquiry.inquiryType === 'quote' ? 'Quote request' : 'Question';
  const typeZh = inquiry.inquiryType === 'quote' ? '報價詢問' : '一般提問';
  const prefix = recipient === 'admin' ? '[Unclaimed listing] ' : '';

  const lines = [
    recipient === 'admin'
      ? `This listing has no owner yet, so the inquiry came to the admin. Forward it to the business, or invite them to claim the listing: ${listingUrl}`
      : `Someone found ${businessName.en} on ChineseArizona and sent you a message. Reply to this email to answer them directly.`,
    recipient === 'admin'
      ? '此商家尚未被認領，詢價先寄給管理員。請轉寄給商家，或邀請商家認領。'
      : `有人在 ChineseArizona 看到 ${nameZh}，傳來以下訊息。直接回覆這封信即可聯絡對方。`,
    '',
    `Type 類型: ${typeEn} / ${typeZh}`,
    `Name 姓名: ${inquiry.name}`,
    `Email: ${inquiry.email}`,
    ...(inquiry.phone ? [`Phone 電話: ${inquiry.phone}`] : []),
    `Language 語言: ${inquiry.locale === 'zh' ? '中文' : 'English'}`,
    '',
    'Message 訊息:',
    inquiry.message,
    '',
    `Listing 商家頁面: ${listingUrl}`,
    '',
    'This lead is free. ChineseArizona never charges per lead or per closed deal.',
    '此詢價免費。ChineseArizona 不按詢價或成交收費。',
  ];

  return {
    subject: `${prefix}New ${typeEn.toLowerCase()} for ${businessName.en} / ${nameZh} 新詢價`,
    text: lines.join('\n'),
  };
}

export type BusinessInquiryResult = {
  id: string;
  notified: boolean;
};

export async function submitBusinessInquiry(inquiry: BusinessInquiryInput): Promise<BusinessInquiryResult> {
  const { locale } = inquiry;
  const client = requireLeadClient(locale);
  const business = await findLeadBusiness(client, inquiry.businessSlug);

  if (!business || !isPublicStatus(business.status)) {
    throw new BusinessLeadError(localized(locale, 'Listing not found.', '找不到這個商家。'), 404);
  }

  if (!isInquiryCategory(categorySlugOf(business))) {
    throw new BusinessLeadError(
      localized(
        locale,
        'This listing does not take messages here. Please contact the business directly.',
        '此商家未開放線上詢價，請直接聯絡商家。'
      ),
      400
    );
  }

  const { data: inserted, error: insertError } = await client
    .from('business_inquiries')
    .insert({
      business_id: business.id,
      inquiry_type: inquiry.inquiryType,
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone ?? null,
      message: inquiry.message,
      locale: inquiry.locale,
      page_path: inquiry.pagePath ?? null,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    throw new BusinessLeadError(
      localized(locale, 'Unable to send your message right now. Please try again.', '目前無法送出訊息，請稍後再試。'),
      500
    );
  }

  const inquiryId = (inserted as { id: string }).id;
  const ownerEmail = business.owner_profile_id ? await findOwnerEmail(client, business.owner_profile_id) : null;
  const recipient: 'owner' | 'admin' = ownerEmail ? 'owner' : 'admin';
  const to = ownerEmail ?? getAdminNotificationEmail();

  let notifyError: string | null = null;
  if (!isEmailConfigured()) {
    notifyError = 'email_not_configured';
  } else if (!to) {
    notifyError = 'no_recipient';
  } else {
    // The configured site address, never the request's Host header, so a
    // spoofed header cannot put a foreign link into the owner's email.
    const listingUrl = `${defaultSiteProfile.url.replace(/\/+$/, '')}/business/${business.slug}`;
    const email = buildInquiryEmail({
      businessName: { en: business.name_en, zh: business.name_zh_tw },
      inquiry,
      listingUrl,
      recipient,
    });

    try {
      await sendEmail({ to, subject: email.subject, text: email.text, replyTo: inquiry.email });
    } catch (error) {
      notifyError = error instanceof Error ? error.message.slice(0, 200) : 'email_failed';
    }
  }

  // The inquiry is already saved; a failed status update only loses the note.
  await client
    .from('business_inquiries')
    .update(
      notifyError
        ? { notify_error: notifyError }
        : { notified_to: recipient, notified_at: new Date().toISOString(), notify_error: null }
    )
    .eq('id', inquiryId);

  return { id: inquiryId, notified: notifyError === null };
}

// One click per listing, per action, per visitor, per UTC day. The address is
// hashed with a server secret so raw IPs are never stored.
export function buildContactClickDedupeKey(
  businessId: string,
  action: ContactAction,
  visitorAddress: string,
  now = new Date()
): string {
  const visitor = createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '')
    .update(visitorAddress.trim())
    .digest('hex')
    .slice(0, 32);

  return ['contact-click', businessId, action, now.toISOString().slice(0, 10), visitor].join(':');
}

export async function recordBusinessContactClick(input: {
  businessSlug: string;
  action: ContactAction;
  visitorAddress: string;
}): Promise<{ recorded: boolean }> {
  const client = getSupabaseServiceClient();
  if (!client) {
    return { recorded: false };
  }

  const { data: business, error } = await client
    .from('businesses')
    .select('id')
    .eq('slug', input.businessSlug)
    .maybeSingle();

  if (error || !business) {
    return { recorded: false };
  }

  const businessId = (business as { id: string }).id;
  const { data: inserted, error: insertError } = await client
    .from('business_contact_clicks')
    .upsert(
      {
        business_id: businessId,
        action: input.action,
        dedupe_key: buildContactClickDedupeKey(businessId, input.action, input.visitorAddress),
      },
      { onConflict: 'dedupe_key', ignoreDuplicates: true }
    )
    .select('id');

  if (insertError) {
    return { recorded: false };
  }

  return { recorded: Array.isArray(inserted) && inserted.length > 0 };
}

// Arizona stays on UTC-7 all year (no daylight saving), so the month starts at
// 07:00 UTC on the 1st, in Arizona's calendar.
export function startOfLeadMonth(now = new Date()): Date {
  const arizonaNow = new Date(now.getTime() - 7 * 60 * 60 * 1000);
  return new Date(Date.UTC(arizonaNow.getUTCFullYear(), arizonaNow.getUTCMonth(), 1, 7));
}

export type BusinessLeadCounts = {
  businessId: string;
  slug: string;
  name: LocalizedText;
  claimed: boolean;
  callClicks: number;
  websiteClicks: number;
  directionsClicks: number;
  inquiries: number;
};

type LeadCountRow = {
  business_id: string;
  business_slug: string;
  business_name_en: string;
  business_name_zh_tw: string | null;
  claimed: boolean;
  call_clicks: number | string;
  website_clicks: number | string;
  directions_clicks: number | string;
  inquiries: number | string;
};

export async function getBusinessLeadCounts(
  options: { businessIds?: string[]; since?: Date; limit?: number } = {}
): Promise<BusinessLeadCounts[]> {
  if (options.businessIds && options.businessIds.length === 0) {
    return [];
  }

  const client = getSupabaseServiceClient();
  if (!client) {
    return [];
  }

  const since = options.since ?? startOfLeadMonth();
  let query = client.rpc('business_lead_counts', {
    p_since: since.toISOString(),
    p_business_ids: options.businessIds ?? null,
  });
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error || !Array.isArray(data)) {
    return [];
  }

  return (data as LeadCountRow[]).map((row) => ({
    businessId: row.business_id,
    slug: row.business_slug,
    name: { en: row.business_name_en, zh: row.business_name_zh_tw },
    claimed: Boolean(row.claimed),
    callClicks: Number(row.call_clicks) || 0,
    websiteClicks: Number(row.website_clicks) || 0,
    directionsClicks: Number(row.directions_clicks) || 0,
    inquiries: Number(row.inquiries) || 0,
  }));
}

export type BusinessInquirySummary = {
  id: string;
  inquiryType: InquiryType;
  name: string;
  email: string;
  phone?: string;
  message: string;
  createdAt: string;
  notifiedTo?: 'owner' | 'admin';
  notifyError?: string;
  business?: {
    slug: string;
    name: LocalizedText;
  };
};

type InquiryRow = {
  id: string;
  inquiry_type: InquiryType;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  created_at: string;
  notified_to: 'owner' | 'admin' | null;
  notify_error: string | null;
  business?:
    | { slug: string; name_en: string; name_zh_tw: string | null }
    | Array<{ slug: string; name_en: string; name_zh_tw: string | null }>
    | null;
};

export async function getRecentBusinessInquiries(
  options: { businessIds?: string[]; limit?: number } = {}
): Promise<BusinessInquirySummary[]> {
  if (options.businessIds && options.businessIds.length === 0) {
    return [];
  }

  const client = getSupabaseServiceClient();
  if (!client) {
    return [];
  }

  let query = client
    .from('business_inquiries')
    .select(
      'id, inquiry_type, name, email, phone, message, created_at, notified_to, notify_error, business:businesses(slug, name_en, name_zh_tw)'
    )
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 20);
  if (options.businessIds) {
    query = query.in('business_id', options.businessIds);
  }

  const { data, error } = await query;
  if (error || !Array.isArray(data)) {
    return [];
  }

  return (data as InquiryRow[]).map((row) => {
    const business = Array.isArray(row.business) ? row.business[0] : row.business;
    return {
      id: row.id,
      inquiryType: row.inquiry_type,
      name: row.name,
      email: row.email,
      phone: row.phone ?? undefined,
      message: row.message,
      createdAt: row.created_at,
      notifiedTo: row.notified_to ?? undefined,
      notifyError: row.notify_error ?? undefined,
      business: business
        ? { slug: business.slug, name: { en: business.name_en, zh: business.name_zh_tw } }
        : undefined,
    };
  });
}
