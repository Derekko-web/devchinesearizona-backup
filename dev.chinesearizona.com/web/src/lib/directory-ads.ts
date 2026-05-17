import type Stripe from 'stripe';

import { siteUrl } from '@/lib/seo';
import { withLocale } from '@/lib/routing';
import { getStripeClient, getStripeWebhookSecret, isStripeConfigured } from '@/lib/stripe';
import { getSupabaseServiceClient, isSupabaseServiceConfigured } from '@/lib/supabase';
import type {
  Business,
  DirectoryAdCampaign,
  DirectoryAdCampaignStatus,
  DirectoryAdEventType,
  DirectoryAdMetrics,
  Locale,
  ProfileRole,
} from '@/lib/types';

type DirectoryAdCampaignRow = {
  id: string;
  business_id: string;
  owner_profile_id: string;
  status: DirectoryAdCampaignStatus;
  budget_cents: number;
  remaining_budget_cents: number;
  cost_per_click_cents: number;
  scope_city: string;
  scope_category: string;
  starts_at: string;
  ends_at: string;
  stripe_checkout_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  created_at: string;
  updated_at: string;
};

type DirectoryAdEventRow = {
  campaign_id: string;
  event_type: DirectoryAdEventType;
  cost_cents?: number | null;
};

type OwnedBusinessRow = {
  id: string;
  slug: string;
  owner_profile_id?: string | null;
  name_en: string;
  city: string;
  status: Business['status'];
  verification_state?: Business['verificationState'] | null;
  category?: { slug: string } | Array<{ slug: string }> | null;
};

type DirectoryAdCheckoutResult = {
  message: string;
  mode: 'redirect';
  url: string;
};

type DirectoryAdEventResult = {
  billed: boolean;
  campaign?: DirectoryAdCampaign;
  recorded: boolean;
};

export type DirectoryAdsRuntimeMode = 'read_only' | 'mock' | 'stripe';
export type DirectoryAdsUnavailableReason = 'configuration' | 'schema';
export type DirectoryAdsAvailability = {
  mode: DirectoryAdsRuntimeMode;
  unavailableReason?: DirectoryAdsUnavailableReason;
};

export const DIRECTORY_AD_MIN_BUDGET_CENTS = 10_000;
export const DIRECTORY_AD_MAX_BUDGET_CENTS = 200_000;
export const DIRECTORY_AD_BUDGET_INCREMENT_CENTS = 2_500;
export const DIRECTORY_AD_COST_PER_CLICK_CENTS = 300;
export const DIRECTORY_AD_CAMPAIGN_DURATION_DAYS = 30;

const ACTIVEISH_CAMPAIGN_STATUSES: DirectoryAdCampaignStatus[] = [
  'active',
  'paused',
  'exhausted',
  'pending_payment',
];
const DIRECTORY_AD_SCHEMA_CACHE_TTL_MS = 60_000;
const STRIPE_FALLBACK_CACHE_TTL_MS = 60_000;
const STRIPE_FALLBACK_MAX_PAGES = 5;
const STRIPE_FALLBACK_PAGE_SIZE = 100;

let directoryAdsSchemaReadyCache:
  | {
      checkedAt: number;
      ready: boolean;
    }
  | undefined;
let stripeFallbackCampaignCache:
  | {
      campaigns: DirectoryAdCampaign[];
      checkedAt: number;
    }
  | undefined;

function requireDirectoryAdServiceClient() {
  const client = getSupabaseServiceClient();
  if (!client) {
    throw new Error('Supabase service role is required for directory ad campaigns.');
  }

  return client;
}

function unwrapRelation<T>(value?: T | T[] | null): T | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value ?? undefined;
}

function nowIso() {
  return new Date().toISOString();
}

function isEnabled(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function normalizeString(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

function normalizePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '/';
  }

  const base = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (base.length > 1 && base.endsWith('/')) {
    return base.slice(0, -1);
  }

  return base;
}

function normalizeCitySlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function campaignStatusPriority(status: DirectoryAdCampaignStatus) {
  switch (status) {
    case 'active':
      return 6;
    case 'paused':
      return 5;
    case 'exhausted':
      return 4;
    case 'pending_payment':
      return 3;
    case 'expired':
      return 2;
    case 'cancelled':
      return 1;
    default:
      return 0;
  }
}

export function isDirectoryAdsMockModeEnabled() {
  return process.env.NODE_ENV !== 'production' && isEnabled(process.env.DIRECTORY_ADS_DEV_MODE);
}

export function getDirectoryAdsRuntimeMode(): DirectoryAdsRuntimeMode {
  if (!isSupabaseServiceConfigured()) {
    return 'read_only';
  }

  if (isStripeConfigured() && getStripeWebhookSecret()) {
    return 'stripe';
  }

  if (isDirectoryAdsMockModeEnabled()) {
    return 'mock';
  }

  return 'read_only';
}

function isMissingDirectoryAdsSchemaError(error?: {
  code?: string | null;
  message?: string | null;
}) {
  const message = error?.message?.toLowerCase() ?? '';
  return (
    error?.code === 'PGRST205' &&
    (message.includes('directory_ad_campaigns') || message.includes('directory_ad_events'))
  );
}

async function isDirectoryAdsSchemaReady() {
  if (!isSupabaseServiceConfigured()) {
    return false;
  }

  const now = Date.now();
  if (
    directoryAdsSchemaReadyCache &&
    now - directoryAdsSchemaReadyCache.checkedAt < DIRECTORY_AD_SCHEMA_CACHE_TTL_MS
  ) {
    return directoryAdsSchemaReadyCache.ready;
  }

  const client = requireDirectoryAdServiceClient();
  const { error } = await client.from('directory_ad_campaigns').select('id').limit(1);
  const ready = !error;

  if (error && !isMissingDirectoryAdsSchemaError(error)) {
    directoryAdsSchemaReadyCache = {
      checkedAt: now,
      ready: false,
    };
    return false;
  }

  directoryAdsSchemaReadyCache = {
    checkedAt: now,
    ready,
  };

  return ready;
}

export async function getDirectoryAdsAvailability(): Promise<DirectoryAdsAvailability> {
  const runtimeMode = getDirectoryAdsRuntimeMode();
  if (runtimeMode === 'read_only') {
    return {
      mode: 'read_only',
      unavailableReason: 'configuration',
    };
  }

  if (!(await isDirectoryAdsSchemaReady())) {
    return {
      mode: 'read_only',
      unavailableReason: 'schema',
    };
  }

  return {
    mode: runtimeMode,
  };
}

async function requireDirectoryAdsCheckoutMode() {
  const availability = await getDirectoryAdsAvailability();
  if (availability.mode === 'read_only') {
    if (availability.unavailableReason === 'schema') {
      throw new Error(
        'Directory sponsorship is not fully set up yet. Apply the directory ads Supabase migration before creating checkout.'
      );
    }

    throw new Error('Stripe is not configured for directory sponsorship yet.');
  }

  return availability.mode;
}

export function normalizeDirectoryAdBudgetCents(value: number) {
  if (!Number.isFinite(value)) {
    return NaN;
  }

  return Math.round(value);
}

export function validateDirectoryAdBudgetCents(value: number) {
  const normalized = normalizeDirectoryAdBudgetCents(value);
  if (!Number.isFinite(normalized)) {
    return {
      budgetCents: normalized,
      valid: false,
      message: 'Budget must be a valid number.',
    };
  }

  if (normalized < DIRECTORY_AD_MIN_BUDGET_CENTS) {
    return {
      budgetCents: normalized,
      valid: false,
      message: `Budget must be at least $${DIRECTORY_AD_MIN_BUDGET_CENTS / 100}.`,
    };
  }

  if (normalized > DIRECTORY_AD_MAX_BUDGET_CENTS) {
    return {
      budgetCents: normalized,
      valid: false,
      message: `Budget must be $${DIRECTORY_AD_MAX_BUDGET_CENTS / 100} or less.`,
    };
  }

  if (normalized % DIRECTORY_AD_BUDGET_INCREMENT_CENTS !== 0) {
    return {
      budgetCents: normalized,
      valid: false,
      message: `Budget must be in $${DIRECTORY_AD_BUDGET_INCREMENT_CENTS / 100} increments.`,
    };
  }

  return {
    budgetCents: normalized,
    valid: true,
    message: '',
  };
}

export function isDirectoryAdEligiblePath(path: string) {
  const parsed = parseDirectoryAdPath(path);
  return parsed.kind === 'directory' || parsed.kind === 'city_category';
}

function parseDirectoryAdPath(path: string) {
  const normalized = normalizePath(path);
  const parts = normalized.split('/').filter(Boolean);
  const hasLocalePrefix = parts[0] === 'en' || parts[0] === 'zh';
  const offset = hasLocalePrefix ? 1 : 0;
  const remainingPartCount = parts.length - offset;

  const root = parts[offset];
  if (root !== 'directory' && root !== 'business') {
    return {
      category: undefined,
      city: undefined,
      kind: 'other' as const,
    };
  }

  if (remainingPartCount === 1) {
    return {
      category: undefined,
      city: undefined,
      kind: 'directory' as const,
    };
  }

  if (root === 'directory' && parts[offset + 1] === 'business') {
    return {
      category: undefined,
      city: undefined,
      kind: 'other' as const,
    };
  }

  if (remainingPartCount === 3 && parts[offset + 1] && parts[offset + 2]) {
    return {
      category: parts[offset + 2],
      city: parts[offset + 1],
      kind: 'city_category' as const,
    };
  }

  return {
    category: undefined,
    city: undefined,
    kind: 'other' as const,
  };
}

export function buildDirectoryAdEventDedupeKey(
  eventType: DirectoryAdEventType,
  campaignId: string,
  pagePath: string,
  sessionId: string
) {
  return [
    'directory-ad',
    eventType,
    campaignId.trim(),
    normalizePath(pagePath),
    sessionId.trim(),
  ].join(':');
}

export function resolveDirectoryAdCampaignStatus(
  campaign: Pick<
    DirectoryAdCampaignRow,
    'cost_per_click_cents' | 'ends_at' | 'remaining_budget_cents' | 'status'
  >,
  now = new Date()
): DirectoryAdCampaignStatus {
  if (campaign.status === 'cancelled' || campaign.status === 'pending_payment') {
    return campaign.status;
  }

  if (new Date(campaign.ends_at).getTime() <= now.getTime()) {
    return 'expired';
  }

  if (campaign.remaining_budget_cents < campaign.cost_per_click_cents) {
    return 'exhausted';
  }

  if (campaign.status === 'paused') {
    return 'paused';
  }

  return 'active';
}

export function buildDirectoryAdMetrics(events: DirectoryAdEventRow[]): DirectoryAdMetrics {
  const impressions = events.filter((event) => event.event_type === 'impression').length;
  const clicks = events.filter((event) => event.event_type === 'click').length;
  const spendCents = events.reduce((sum, event) => sum + Number(event.cost_cents ?? 0), 0);

  return {
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    spendCents,
  };
}

function mapCampaignRow(
  row: DirectoryAdCampaignRow,
  metrics?: DirectoryAdMetrics
): DirectoryAdCampaign {
  return {
    id: row.id,
    businessId: row.business_id,
    ownerProfileId: row.owner_profile_id,
    status: row.status,
    budgetCents: row.budget_cents,
    remainingBudgetCents: row.remaining_budget_cents,
    costPerClickCents: row.cost_per_click_cents,
    scopeCity: row.scope_city,
    scopeCategory: row.scope_category,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    stripeCheckoutSessionId: row.stripe_checkout_session_id ?? undefined,
    stripePaymentIntentId: row.stripe_payment_intent_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metrics,
  };
}

function mapStripeSessionToFallbackCampaign(
  session: Stripe.Checkout.Session,
  now = new Date()
): DirectoryAdCampaign | undefined {
  if (
    session.metadata?.checkout_kind !== 'directory_ad' ||
    session.payment_status !== 'paid' ||
    session.status !== 'complete'
  ) {
    return undefined;
  }

  const businessId = session.metadata.business_id?.trim();
  const ownerProfileId = session.metadata.owner_profile_id?.trim();
  const scopeCity = session.metadata.scope_city?.trim();
  const scopeCategory = session.metadata.scope_category?.trim();
  const budgetCents = Number(session.metadata.budget_cents ?? 0);
  if (
    !businessId ||
    !ownerProfileId ||
    !scopeCity ||
    !scopeCategory ||
    !Number.isFinite(budgetCents) ||
    budgetCents <= 0
  ) {
    return undefined;
  }

  const startsAt = new Date(session.created * 1000);
  const endsAt = addDays(startsAt, DIRECTORY_AD_CAMPAIGN_DURATION_DAYS);
  const resolvedStatus = resolveDirectoryAdCampaignStatus(
    {
      cost_per_click_cents: DIRECTORY_AD_COST_PER_CLICK_CENTS,
      ends_at: endsAt.toISOString(),
      remaining_budget_cents: budgetCents,
      status: 'active',
    },
    now
  );
  if (resolvedStatus !== 'active') {
    return undefined;
  }

  return {
    id: `stripe-fallback:${businessId}`,
    businessId,
    ownerProfileId,
    status: 'active',
    budgetCents,
    remainingBudgetCents: budgetCents,
    costPerClickCents: DIRECTORY_AD_COST_PER_CLICK_CENTS,
    scopeCity,
    scopeCategory,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId:
      typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
    createdAt: startsAt.toISOString(),
    updatedAt: startsAt.toISOString(),
  };
}

function mergeStripeFallbackCampaigns(
  existing: DirectoryAdCampaign,
  incoming: DirectoryAdCampaign
): DirectoryAdCampaign {
  const existingUpdatedAt = new Date(existing.updatedAt).getTime();
  const incomingUpdatedAt = new Date(incoming.updatedAt).getTime();
  const latest = incomingUpdatedAt >= existingUpdatedAt ? incoming : existing;

  return {
    ...latest,
    id: `stripe-fallback:${latest.businessId}`,
    budgetCents: existing.budgetCents + incoming.budgetCents,
    remainingBudgetCents: existing.remainingBudgetCents + incoming.remainingBudgetCents,
    startsAt:
      new Date(existing.startsAt).getTime() >= new Date(incoming.startsAt).getTime()
        ? existing.startsAt
        : incoming.startsAt,
    endsAt:
      new Date(existing.endsAt).getTime() >= new Date(incoming.endsAt).getTime()
        ? existing.endsAt
        : incoming.endsAt,
  };
}

async function listStripeFallbackCampaigns(now = new Date()) {
  if (
    stripeFallbackCampaignCache &&
    Date.now() - stripeFallbackCampaignCache.checkedAt < STRIPE_FALLBACK_CACHE_TTL_MS
  ) {
    return stripeFallbackCampaignCache.campaigns;
  }

  const stripe = getStripeClient();
  if (!stripe || !isStripeConfigured()) {
    stripeFallbackCampaignCache = {
      campaigns: [],
      checkedAt: Date.now(),
    };
    return [];
  }

  const createdAfter = Math.floor(addDays(now, -DIRECTORY_AD_CAMPAIGN_DURATION_DAYS).getTime() / 1000);
  const campaignsByBusinessId = new Map<string, DirectoryAdCampaign>();
  let startingAfter: string | undefined;

  for (let page = 0; page < STRIPE_FALLBACK_MAX_PAGES; page += 1) {
    const response = await stripe.checkout.sessions.list({
      created: {
        gte: createdAfter,
      },
      limit: STRIPE_FALLBACK_PAGE_SIZE,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const session of response.data) {
      const campaign = mapStripeSessionToFallbackCampaign(session, now);
      if (!campaign) {
        continue;
      }

      const existing = campaignsByBusinessId.get(campaign.businessId);
      campaignsByBusinessId.set(
        campaign.businessId,
        existing ? mergeStripeFallbackCampaigns(existing, campaign) : campaign
      );
    }

    if (!response.has_more) {
      break;
    }

    startingAfter = response.data.at(-1)?.id;
    if (!startingAfter) {
      break;
    }
  }

  const campaigns = Array.from(campaignsByBusinessId.values());
  stripeFallbackCampaignCache = {
    campaigns,
    checkedAt: Date.now(),
  };
  return campaigns;
}

function applyCampaignsToBusinesses(
  businesses: Business[],
  activeByBusinessId: Map<string, DirectoryAdCampaign>
) {
  return businesses.map((business) => {
    const activeCampaign = activeByBusinessId.get(business.id);
    return {
      ...business,
      sponsored: Boolean(business.legacySponsored) || Boolean(activeCampaign),
      activeDirectoryAdCampaign: activeCampaign,
    };
  });
}

async function syncResolvedCampaignStatuses(rows: DirectoryAdCampaignRow[]) {
  if (rows.length === 0) {
    return rows;
  }

  const client = getSupabaseServiceClient();
  if (!client) {
    return rows.map((row) => ({
      ...row,
      status: resolveDirectoryAdCampaignStatus(row),
    }));
  }

  const nextRows = [...rows];
  for (let index = 0; index < nextRows.length; index += 1) {
    const row = nextRows[index];
    const resolvedStatus = resolveDirectoryAdCampaignStatus(row);
    if (resolvedStatus === row.status) {
      continue;
    }

    const { data } = await client
      .from('directory_ad_campaigns')
      .update({
        status: resolvedStatus,
        updated_at: nowIso(),
      })
      .eq('id', row.id)
      .select('*')
      .maybeSingle();

    nextRows[index] = (data as DirectoryAdCampaignRow | null) ?? {
      ...row,
      status: resolvedStatus,
    };
  }

  return nextRows;
}

function pickDashboardCampaign(rows: DirectoryAdCampaignRow[]) {
  if (rows.length === 0) {
    return undefined;
  }

  return rows
    .slice()
    .sort((left, right) => {
      const statusDelta = campaignStatusPriority(right.status) - campaignStatusPriority(left.status);
      if (statusDelta !== 0) {
        return statusDelta;
      }

      return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    })[0];
}

async function listCampaignRowsForBusinessIds(businessIds: string[]) {
  if (businessIds.length === 0 || !isSupabaseServiceConfigured()) {
    return [] as DirectoryAdCampaignRow[];
  }

  const client = requireDirectoryAdServiceClient();
  const { data, error } = await client
    .from('directory_ad_campaigns')
    .select('*')
    .in('business_id', businessIds)
    .order('updated_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return syncResolvedCampaignStatuses(data as DirectoryAdCampaignRow[]);
}

async function listEventRowsForCampaignIds(campaignIds: string[]) {
  if (campaignIds.length === 0 || !isSupabaseServiceConfigured()) {
    return [] as DirectoryAdEventRow[];
  }

  const client = requireDirectoryAdServiceClient();
  const { data, error } = await client
    .from('directory_ad_events')
    .select('campaign_id, event_type, cost_cents')
    .in('campaign_id', campaignIds);

  if (error || !data) {
    return [];
  }

  return data as DirectoryAdEventRow[];
}

export async function attachActiveDirectoryAdCampaigns(
  businesses: Business[]
): Promise<Business[]> {
  if (businesses.length === 0) {
    return businesses;
  }

  const legacyNormalized = businesses.map((business) => ({
    ...business,
    legacySponsored: business.legacySponsored ?? business.sponsored,
  }));

  if (!(await isDirectoryAdsSchemaReady())) {
    const fallbackCampaigns = await listStripeFallbackCampaigns();
    const activeByBusinessId = fallbackCampaigns.reduce<Map<string, DirectoryAdCampaign>>(
      (accumulator, campaign) => {
        if (campaign.status === 'active') {
          accumulator.set(campaign.businessId, campaign);
        }
        return accumulator;
      },
      new Map()
    );
    return applyCampaignsToBusinesses(legacyNormalized, activeByBusinessId);
  }

  if (!isSupabaseServiceConfigured()) {
    return legacyNormalized;
  }

  const rows = await listCampaignRowsForBusinessIds(legacyNormalized.map((business) => business.id));
  const activeByBusinessId = new Map<string, DirectoryAdCampaign>();

  for (const row of rows) {
    if (row.status !== 'active' || activeByBusinessId.has(row.business_id)) {
      continue;
    }

    activeByBusinessId.set(row.business_id, mapCampaignRow(row));
  }

  return applyCampaignsToBusinesses(legacyNormalized, activeByBusinessId);
}

export async function getDirectoryAdCampaignsForOwnerBusinesses(
  profileId: string,
  businesses: Business[]
) {
  if (businesses.length === 0) {
    return new Map<string, DirectoryAdCampaign>();
  }

  if (!(await isDirectoryAdsSchemaReady())) {
    const businessIds = new Set(businesses.map((business) => business.id));
    const fallbackCampaigns = await listStripeFallbackCampaigns();
    return fallbackCampaigns.reduce<Map<string, DirectoryAdCampaign>>((accumulator, campaign) => {
      if (campaign.ownerProfileId === profileId && businessIds.has(campaign.businessId)) {
        accumulator.set(campaign.businessId, campaign);
      }
      return accumulator;
    }, new Map());
  }

  if (!isSupabaseServiceConfigured()) {
    return new Map<string, DirectoryAdCampaign>();
  }

  const client = requireDirectoryAdServiceClient();
  const { data, error } = await client
    .from('directory_ad_campaigns')
    .select('*')
    .eq('owner_profile_id', profileId)
    .in(
      'business_id',
      businesses.map((business) => business.id)
    )
    .order('updated_at', { ascending: false });

  if (error || !data) {
    return new Map<string, DirectoryAdCampaign>();
  }

  const rows = await syncResolvedCampaignStatuses(data as DirectoryAdCampaignRow[]);
  const selectedByBusinessId = new Map<string, DirectoryAdCampaignRow>();
  for (const business of businesses) {
    const rowsForBusiness = rows.filter((row) => row.business_id === business.id);
    const selected = pickDashboardCampaign(rowsForBusiness);
    if (selected) {
      selectedByBusinessId.set(business.id, selected);
    }
  }

  const metricsRows = await listEventRowsForCampaignIds(
    Array.from(selectedByBusinessId.values()).map((row) => row.id)
  );
  const metricsByCampaignId = metricsRows.reduce<Map<string, DirectoryAdEventRow[]>>((accumulator, row) => {
    const list = accumulator.get(row.campaign_id) ?? [];
    list.push(row);
    accumulator.set(row.campaign_id, list);
    return accumulator;
  }, new Map());

  return Array.from(selectedByBusinessId.entries()).reduce<Map<string, DirectoryAdCampaign>>(
    (accumulator, [businessId, row]) => {
      accumulator.set(
        businessId,
        mapCampaignRow(row, buildDirectoryAdMetrics(metricsByCampaignId.get(row.id) ?? []))
      );
      return accumulator;
    },
    new Map()
  );
}

async function getOwnedBusinessRow(profileId: string, businessSlug: string) {
  const client = requireDirectoryAdServiceClient();
  const { data, error } = await client
    .from('businesses')
    .select(`
      id,
      slug,
      owner_profile_id,
      name_en,
      city,
      status,
      verification_state,
      category:business_categories!inner (
        slug
      )
    `)
    .eq('slug', businessSlug)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Business not found.');
  }

  const row = data as OwnedBusinessRow;
  if (row.owner_profile_id !== profileId) {
    throw new Error('You cannot manage sponsorship for this listing.');
  }
  if (row.status !== 'live') {
    throw new Error('Only live listings can run promoted placement.');
  }
  if ((row.verification_state ?? 'unverified') === 'unverified') {
    throw new Error('Only claimed or verified listings can run promoted placement.');
  }

  return {
    ...row,
    categorySlug: unwrapRelation(row.category)?.slug ?? '',
  };
}

async function getLatestCampaignForBusiness(businessId: string) {
  if (!isSupabaseServiceConfigured()) {
    return undefined;
  }

  const client = requireDirectoryAdServiceClient();
  const { data, error } = await client
    .from('directory_ad_campaigns')
    .select('*')
    .eq('business_id', businessId)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (error || !data) {
    return undefined;
  }

  const rows = await syncResolvedCampaignStatuses(data as DirectoryAdCampaignRow[]);
  return pickDashboardCampaign(rows);
}

function buildDirectoryAdSuccessUrl(locale: Locale, businessSlug: string, baseUrl = siteUrl) {
  const path = withLocale(locale, '/dashboard');
  const url = new URL(path, baseUrl);
  url.searchParams.set('directoryAds', 'success');
  url.searchParams.set('business', businessSlug);
  return url.toString();
}

function buildDirectoryAdCancelUrl(locale: Locale, businessSlug: string, baseUrl = siteUrl) {
  const path = withLocale(locale, '/dashboard');
  const url = new URL(path, baseUrl);
  url.searchParams.set('directoryAds', 'cancelled');
  url.searchParams.set('business', businessSlug);
  return url.toString();
}

function buildMockStripeId(prefix: 'cs_test' | 'pi_test') {
  return `${prefix}_directory_ads_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function upsertDirectoryAdCampaignFromCheckout(input: {
  budgetCents: number;
  businessId: string;
  checkoutSessionId: string;
  existingCampaignId?: string;
  ownerProfileId: string;
  paymentIntentId?: string | null;
  scopeCategory: string;
  scopeCity: string;
}) {
  const client = requireDirectoryAdServiceClient();

  const { data: existingBySession } = await client
    .from('directory_ad_campaigns')
    .select('id')
    .eq('stripe_checkout_session_id', input.checkoutSessionId)
    .maybeSingle();

  if (existingBySession) {
    return;
  }

  const { data: business } = await client
    .from('businesses')
    .select('id, owner_profile_id, city')
    .eq('id', input.businessId)
    .maybeSingle();
  if (!business || business.owner_profile_id !== input.ownerProfileId) {
    throw new Error('Unable to confirm the business owner for this sponsorship.');
  }

  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = addDays(now, DIRECTORY_AD_CAMPAIGN_DURATION_DAYS).toISOString();

  if (input.existingCampaignId) {
    const { data: existing } = await client
      .from('directory_ad_campaigns')
      .select('*')
      .eq('id', input.existingCampaignId)
      .maybeSingle();

    if (existing) {
      const resolvedExisting = (
        await syncResolvedCampaignStatuses([existing as DirectoryAdCampaignRow])
      )[0];
      const nextStatus =
        resolvedExisting.status === 'paused'
          ? 'paused'
          : resolvedExisting.remaining_budget_cents + input.budgetCents >= resolvedExisting.cost_per_click_cents
            ? 'active'
            : 'exhausted';

      await client
        .from('directory_ad_campaigns')
        .update({
          budget_cents: resolvedExisting.budget_cents + input.budgetCents,
          remaining_budget_cents: resolvedExisting.remaining_budget_cents + input.budgetCents,
          status: nextStatus,
          stripe_checkout_session_id: input.checkoutSessionId,
          stripe_payment_intent_id: input.paymentIntentId,
          updated_at: nowIso(),
        })
        .eq('id', resolvedExisting.id);
      return;
    }
  }

  await client.from('directory_ad_campaigns').insert({
    business_id: input.businessId,
    owner_profile_id: input.ownerProfileId,
    status: 'active',
    budget_cents: input.budgetCents,
    remaining_budget_cents: input.budgetCents,
    cost_per_click_cents: DIRECTORY_AD_COST_PER_CLICK_CENTS,
    scope_city: input.scopeCity || business.city,
    scope_category: input.scopeCategory,
    starts_at: startsAt,
    ends_at: endsAt,
    stripe_checkout_session_id: input.checkoutSessionId,
    stripe_payment_intent_id: input.paymentIntentId,
    created_at: startsAt,
    updated_at: startsAt,
  });
}

export async function createDirectoryAdCheckoutForProfile(input: {
  baseUrl?: string;
  budgetCents: number;
  businessSlug: string;
  locale: Locale;
  profileId: string;
  userEmail?: string | null;
}): Promise<DirectoryAdCheckoutResult> {
  const runtimeMode = await requireDirectoryAdsCheckoutMode();
  const stripe = getStripeClient();

  const budget = validateDirectoryAdBudgetCents(input.budgetCents);
  if (!budget.valid) {
    throw new Error(budget.message);
  }

  const business = await getOwnedBusinessRow(input.profileId, input.businessSlug);
  const latestCampaign = await getLatestCampaignForBusiness(business.id);
  const topUpCampaignId =
    latestCampaign &&
    ['active', 'paused', 'exhausted'].includes(latestCampaign.status) &&
    new Date(latestCampaign.ends_at).getTime() > Date.now()
      ? latestCampaign.id
      : undefined;

  if (runtimeMode === 'mock') {
    await upsertDirectoryAdCampaignFromCheckout({
      budgetCents: budget.budgetCents,
      businessId: business.id,
      checkoutSessionId: buildMockStripeId('cs_test'),
      existingCampaignId: topUpCampaignId,
      ownerProfileId: input.profileId,
      paymentIntentId: buildMockStripeId('pi_test'),
      scopeCategory: business.categorySlug,
      scopeCity: business.city,
    });

    return {
      message: 'Test sponsorship activated in local development mode. No Stripe charge was created.',
      mode: 'redirect',
      url: buildDirectoryAdSuccessUrl(input.locale, business.slug, input.baseUrl),
    };
  }

  if (!stripe || !isStripeConfigured()) {
    throw new Error('Stripe is not configured for directory sponsorship yet.');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: buildDirectoryAdSuccessUrl(input.locale, business.slug, input.baseUrl),
    cancel_url: buildDirectoryAdCancelUrl(input.locale, business.slug, input.baseUrl),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${business.name_en} sponsored directory placement`,
            description: `${business.city} · ${business.categorySlug} · ${DIRECTORY_AD_CAMPAIGN_DURATION_DAYS}-day budget`,
          },
          unit_amount: budget.budgetCents,
        },
      },
    ],
    metadata: {
      checkout_kind: 'directory_ad',
      business_id: business.id,
      business_slug: business.slug,
      owner_profile_id: input.profileId,
      budget_cents: String(budget.budgetCents),
      scope_city: business.city,
      scope_category: business.categorySlug,
      ...(topUpCampaignId ? { campaign_id: topUpCampaignId } : {}),
    },
    customer_email: input.userEmail ?? undefined,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL.');
  }

  return {
    message: 'Sponsored placement checkout created.',
    mode: 'redirect',
    url: session.url,
  };
}

export async function updateDirectoryAdCampaignStatusForProfile(input: {
  action: 'pause' | 'resume' | 'cancel';
  campaignId: string;
  profileId: string;
  role?: ProfileRole | null;
}) {
  const client = requireDirectoryAdServiceClient();
  const { data, error } = await client
    .from('directory_ad_campaigns')
    .select('*')
    .eq('id', input.campaignId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Campaign not found.');
  }

  const row = (await syncResolvedCampaignStatuses([data as DirectoryAdCampaignRow]))[0];
  if (row.owner_profile_id !== input.profileId && !['moderator', 'admin'].includes(input.role ?? 'member')) {
    throw new Error('You cannot manage this sponsorship campaign.');
  }

  let nextStatus: DirectoryAdCampaignStatus;
  if (input.action === 'pause') {
    if (row.status !== 'active') {
      throw new Error('Only active campaigns can be paused.');
    }
    nextStatus = 'paused';
  } else if (input.action === 'resume') {
    if (row.status !== 'paused') {
      throw new Error('Only paused campaigns can be resumed.');
    }
    nextStatus = row.remaining_budget_cents >= row.cost_per_click_cents ? 'active' : 'exhausted';
  } else {
    if (row.status === 'cancelled' || row.status === 'expired') {
      throw new Error('This campaign is already closed.');
    }
    nextStatus = 'cancelled';
  }

  const { data: updated, error: updateError } = await client
    .from('directory_ad_campaigns')
    .update({
      status: nextStatus,
      updated_at: nowIso(),
    })
    .eq('id', row.id)
    .select('*')
    .maybeSingle();

  if (updateError || !updated) {
    throw new Error('Unable to update this campaign right now.');
  }

  const metricsRows = await listEventRowsForCampaignIds([updated.id]);
  return mapCampaignRow(updated as DirectoryAdCampaignRow, buildDirectoryAdMetrics(metricsRows));
}

function campaignMatchesPath(campaign: DirectoryAdCampaignRow, pagePath: string) {
  const parsed = parseDirectoryAdPath(pagePath);
  if (parsed.kind === 'directory') {
    return true;
  }

  if (parsed.kind !== 'city_category' || !parsed.city || !parsed.category) {
    return false;
  }

  return (
    normalizeCitySlug(parsed.city) === normalizeCitySlug(campaign.scope_city) &&
    normalizeString(parsed.category) === normalizeString(campaign.scope_category)
  );
}

async function maybeBillDirectoryAdClick(
  row: DirectoryAdCampaignRow
): Promise<{ billed: boolean; row: DirectoryAdCampaignRow }> {
  const client = requireDirectoryAdServiceClient();
  let current = row;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const resolved = resolveDirectoryAdCampaignStatus(current);
    if (resolved !== current.status) {
      current = (
        await syncResolvedCampaignStatuses([current])
      )[0];
    }

    if (current.status !== 'active') {
      return { billed: false, row: current };
    }

    if (current.remaining_budget_cents < current.cost_per_click_cents) {
      const exhaustedRow = (
        await syncResolvedCampaignStatuses([current])
      )[0];
      return { billed: false, row: exhaustedRow };
    }

    const nextRemainingBudget = current.remaining_budget_cents - current.cost_per_click_cents;
    const nextStatus =
      nextRemainingBudget < current.cost_per_click_cents ? 'exhausted' : 'active';
    const { data } = await client
      .from('directory_ad_campaigns')
      .update({
        remaining_budget_cents: nextRemainingBudget,
        status: nextStatus,
        updated_at: nowIso(),
      })
      .eq('id', current.id)
      .eq('remaining_budget_cents', current.remaining_budget_cents)
      .select('*')
      .maybeSingle();

    if (data) {
      return {
        billed: true,
        row: data as DirectoryAdCampaignRow,
      };
    }

    const { data: latest } = await client
      .from('directory_ad_campaigns')
      .select('*')
      .eq('id', current.id)
      .maybeSingle();
    if (!latest) {
      return { billed: false, row: current };
    }

    current = latest as DirectoryAdCampaignRow;
  }

  return { billed: false, row: current };
}

export async function recordDirectoryAdEvent(input: {
  businessId: string;
  campaignId: string;
  eventType: DirectoryAdEventType;
  pagePath: string;
  sessionId: string;
}): Promise<DirectoryAdEventResult> {
  if (!isSupabaseServiceConfigured() || !isDirectoryAdEligiblePath(input.pagePath)) {
    return {
      billed: false,
      recorded: false,
    };
  }

  const client = requireDirectoryAdServiceClient();
  const { data, error } = await client
    .from('directory_ad_campaigns')
    .select('*')
    .eq('id', input.campaignId)
    .maybeSingle();

  if (error || !data) {
    return {
      billed: false,
      recorded: false,
    };
  }

  let campaignRow = (
    await syncResolvedCampaignStatuses([data as DirectoryAdCampaignRow])
  )[0];
  if (campaignRow.business_id !== input.businessId || !campaignMatchesPath(campaignRow, input.pagePath)) {
    return {
      billed: false,
      campaign: mapCampaignRow(campaignRow),
      recorded: false,
    };
  }

  if (input.eventType === 'click' && campaignRow.status !== 'active') {
    return {
      billed: false,
      campaign: mapCampaignRow(campaignRow),
      recorded: false,
    };
  }

  const dedupeKey = buildDirectoryAdEventDedupeKey(
    input.eventType,
    input.campaignId,
    input.pagePath,
    input.sessionId
  );
  const { data: inserted, error: insertError } = await client
    .from('directory_ad_events')
    .insert({
      business_id: input.businessId,
      campaign_id: input.campaignId,
      event_type: input.eventType,
      page_path: normalizePath(input.pagePath),
      dedupe_key: dedupeKey,
      cost_cents: 0,
    })
    .select('campaign_id')
    .maybeSingle();

  if (insertError) {
    if (String(insertError.message ?? '').toLowerCase().includes('duplicate')) {
      return {
        billed: false,
        campaign: mapCampaignRow(campaignRow),
        recorded: false,
      };
    }

    throw new Error('Unable to record the directory ad event.');
  }

  if (!inserted) {
    return {
      billed: false,
      campaign: mapCampaignRow(campaignRow),
      recorded: false,
    };
  }

  let billed = false;
  if (input.eventType === 'click') {
    const billingResult = await maybeBillDirectoryAdClick(campaignRow);
    billed = billingResult.billed;
    campaignRow = billingResult.row;

    if (billed) {
      await client
        .from('directory_ad_events')
        .update({
          cost_cents: campaignRow.cost_per_click_cents,
        })
        .eq('dedupe_key', dedupeKey);
    }
  }

  return {
    billed,
    campaign: mapCampaignRow(campaignRow),
    recorded: true,
  };
}

async function finalizeDirectoryAdCheckout(session: Stripe.Checkout.Session) {
  if (session.metadata?.checkout_kind !== 'directory_ad') {
    return;
  }

  const budgetCents = Number(session.metadata?.budget_cents ?? 0);
  const businessId = session.metadata?.business_id ?? '';
  const ownerProfileId = session.metadata?.owner_profile_id ?? '';
  const scopeCity = session.metadata?.scope_city ?? '';
  const scopeCategory = session.metadata?.scope_category ?? '';
  const existingCampaignId = session.metadata?.campaign_id ?? '';
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : null;
  await upsertDirectoryAdCampaignFromCheckout({
    budgetCents,
    businessId,
    checkoutSessionId: session.id,
    existingCampaignId,
    ownerProfileId,
    paymentIntentId,
    scopeCategory,
    scopeCity,
  });
}

export async function handleDirectoryAdStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await finalizeDirectoryAdCheckout(event.data.object as Stripe.Checkout.Session);
      break;
    default:
      break;
  }
}
