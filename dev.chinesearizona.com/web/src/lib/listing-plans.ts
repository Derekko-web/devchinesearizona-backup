import type Stripe from 'stripe';

import { getDirectoryAdsRuntimeMode, type DirectoryAdsRuntimeMode } from '@/lib/directory-ads';
import {
  SPONSORED_CATEGORY_PLAN_LIMIT,
  addListingPlanTerm,
  findListingPlanOffer,
  isListingPlanId,
  isListingPlanInterval,
  listingPlanIds,
  listingPlanNames,
  listingPlanPriceCents,
  qualifiesForFoundingPrice,
  type ListingPlanCheckoutOutcome,
  type ListingPlanId,
  type ListingPlanInterval,
  type ListingPlanOwnerState,
} from '@/lib/listing-plan-offers';
import { withLocale } from '@/lib/routing';
import { siteUrl } from '@/lib/seo';
import { getStripeClient, isStripeConfigured } from '@/lib/stripe';
import { getSupabaseServiceClient, isSupabaseServiceConfigured } from '@/lib/supabase';
import type { Business, Locale } from '@/lib/types';

export type ListingPlanRow = {
  id: string;
  business_id: string;
  owner_profile_id: string;
  plan_id: ListingPlanId;
  billing_interval: ListingPlanInterval;
  amount_cents: number;
  founding: boolean;
  status: 'active' | 'cancelled';
  scope_category: string | null;
  starts_at: string;
  ends_at: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ListingPlanAvailability = {
  mode: DirectoryAdsRuntimeMode;
  unavailableReason?: 'configuration' | 'schema';
};

export type ListingPlanCheckoutResult = {
  message: string;
  mode: 'redirect';
  url: string;
};

export class ListingPlanError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ListingPlanError';
    this.status = status;
  }
}

const LISTING_PLAN_TABLE = 'directory_listing_plans';
const SCHEMA_CACHE_TTL_MS = 60_000;
const CHECKOUT_KIND = 'listing_plan';

let schemaReadyCache: { checkedAt: number; ready: boolean } | undefined;

function text(locale: Locale, en: string, zh: string) {
  return locale === 'zh' ? zh : en;
}

function requireServiceClient() {
  const client = getSupabaseServiceClient();
  if (!client) {
    throw new ListingPlanError('Supabase service role is required for listing plans.', 503);
  }

  return client;
}

function isMissingTableError(error?: { code?: string | null; message?: string | null } | null) {
  return error?.code === 'PGRST205' || (error?.message ?? '').includes(LISTING_PLAN_TABLE);
}

export function resetListingPlanSchemaCache() {
  schemaReadyCache = undefined;
}

async function isListingPlansSchemaReady() {
  if (!isSupabaseServiceConfigured()) {
    return false;
  }

  const now = Date.now();
  if (schemaReadyCache && now - schemaReadyCache.checkedAt < SCHEMA_CACHE_TTL_MS) {
    return schemaReadyCache.ready;
  }

  const { error } = await requireServiceClient().from(LISTING_PLAN_TABLE).select('id').limit(1);
  schemaReadyCache = { checkedAt: now, ready: !error };
  return !error;
}

export async function getListingPlanAvailability(): Promise<ListingPlanAvailability> {
  const mode = getDirectoryAdsRuntimeMode();
  if (mode === 'read_only') {
    return { mode, unavailableReason: 'configuration' };
  }

  if (!(await isListingPlansSchemaReady())) {
    return { mode: 'read_only', unavailableReason: 'schema' };
  }

  return { mode };
}

export function isListingPlanRowLive(row: Pick<ListingPlanRow, 'status' | 'starts_at' | 'ends_at'>, now: Date) {
  const time = now.getTime();
  return (
    row.status === 'active' &&
    new Date(row.starts_at).getTime() <= time &&
    new Date(row.ends_at).getTime() > time
  );
}

// Paid plans that are running right now, by business. The sponsored category
// plan only counts on the category it was bought for.
export function getLivePlanIdsForBusiness(
  business: Pick<Business, 'id' | 'categorySlug'>,
  rows: ListingPlanRow[],
  now: Date
): ListingPlanId[] {
  const live = new Set<ListingPlanId>();
  for (const row of rows) {
    if (row.business_id !== business.id || !isListingPlanRowLive(row, now)) {
      continue;
    }

    if (
      row.plan_id === 'sponsored-category' &&
      row.scope_category &&
      row.scope_category !== business.categorySlug
    ) {
      continue;
    }

    live.add(row.plan_id);
  }

  return listingPlanIds.filter((planId) => live.has(planId));
}

export function applyListingPlansToBusinesses(
  businesses: Business[],
  rows: ListingPlanRow[],
  now = new Date()
): Business[] {
  if (rows.length === 0) {
    return businesses;
  }

  return businesses.map((business) => {
    const paidPlans = getLivePlanIdsForBusiness(business, rows, now);
    if (paidPlans.length === 0) {
      return business;
    }

    return {
      ...business,
      paidPlans,
      // A sponsored category plan always carries the "Sponsored / 贊助" label.
      // It never touches `featured`, which editors choose and is never sold.
      sponsored: business.sponsored || paidPlans.includes('sponsored-category'),
    };
  });
}

async function listUnexpiredPlanRows(now = new Date()): Promise<ListingPlanRow[]> {
  const client = requireServiceClient();
  const { data, error } = await client
    .from(LISTING_PLAN_TABLE)
    .select('*')
    .eq('status', 'active')
    .gt('ends_at', now.toISOString());

  if (error) {
    if (!isMissingTableError(error)) {
      console.error('[listing-plans] Unable to load listing plans:', error.message);
    }
    return [];
  }

  return (data ?? []) as ListingPlanRow[];
}

export async function attachActiveListingPlans(businesses: Business[]): Promise<Business[]> {
  if (businesses.length === 0 || !isSupabaseServiceConfigured()) {
    return businesses;
  }

  try {
    const now = new Date();
    return applyListingPlansToBusinesses(businesses, await listUnexpiredPlanRows(now), now);
  } catch (error) {
    console.error('[listing-plans] Unable to attach listing plans:', error);
    return businesses;
  }
}

// Businesses (other than `exceptBusinessId`) holding a sponsored category plan
// that has not ended yet in `category`.
export function countSponsoredCategoryHolders(
  rows: ListingPlanRow[],
  category: string,
  exceptBusinessId: string,
  now: Date
) {
  const holders = new Set<string>();
  for (const row of rows) {
    if (
      row.plan_id === 'sponsored-category' &&
      row.status === 'active' &&
      new Date(row.ends_at).getTime() > now.getTime() &&
      row.scope_category === category &&
      row.business_id !== exceptBusinessId
    ) {
      holders.add(row.business_id);
    }
  }

  return holders.size;
}

export function countFoundingBusinesses(rows: Pick<ListingPlanRow, 'business_id' | 'plan_id' | 'founding'>[], planId: ListingPlanId) {
  return new Set(
    rows.filter((row) => row.plan_id === planId && row.founding).map((row) => row.business_id)
  ).size;
}

export function buildListingPlanOwnerStates(input: {
  business: Pick<Business, 'id' | 'categorySlug'>;
  businessRows: ListingPlanRow[];
  foundingRows: Pick<ListingPlanRow, 'business_id' | 'plan_id' | 'founding'>[];
  unexpiredRows: ListingPlanRow[];
  now: Date;
}): ListingPlanOwnerState[] {
  const { business, businessRows, foundingRows, unexpiredRows, now } = input;

  return listingPlanIds.map((planId) => {
    const ownRows = businessRows.filter(
      (row) => row.business_id === business.id && row.plan_id === planId
    );
    const activeUntil = ownRows
      .filter((row) => row.status === 'active' && new Date(row.ends_at).getTime() > now.getTime())
      .map((row) => row.ends_at)
      .sort()
      .at(-1);
    const foundingPrice = qualifiesForFoundingPrice({
      businessAlreadyFounding: ownRows.some((row) => row.founding),
      foundingBusinessCount: countFoundingBusinesses(foundingRows, planId),
    });
    const soldOut =
      planId === 'sponsored-category' &&
      !activeUntil &&
      countSponsoredCategoryHolders(unexpiredRows, business.categorySlug, business.id, now) >=
        SPONSORED_CATEGORY_PLAN_LIMIT;

    return { planId, activeUntil, foundingPrice, soldOut };
  });
}

async function listFoundingRows() {
  const { data, error } = await requireServiceClient()
    .from(LISTING_PLAN_TABLE)
    .select('business_id, plan_id, founding')
    .eq('founding', true);

  if (error) {
    throw new ListingPlanError('Unable to check founding offers right now.', 503);
  }

  return (data ?? []) as Pick<ListingPlanRow, 'business_id' | 'plan_id' | 'founding'>[];
}

async function listRowsForBusinessIds(businessIds: string[]) {
  if (businessIds.length === 0) {
    return [];
  }

  const { data, error } = await requireServiceClient()
    .from(LISTING_PLAN_TABLE)
    .select('*')
    .in('business_id', businessIds)
    .order('ends_at', { ascending: false });

  if (error) {
    throw new ListingPlanError('Unable to load listing plans right now.', 503);
  }

  return (data ?? []) as ListingPlanRow[];
}

export async function getListingPlanStatesForOwnerBusinesses(
  businesses: Business[]
): Promise<Map<string, ListingPlanOwnerState[]>> {
  const states = new Map<string, ListingPlanOwnerState[]>();
  if (businesses.length === 0 || !(await isListingPlansSchemaReady())) {
    return states;
  }

  try {
    const now = new Date();
    const [businessRows, foundingRows, unexpiredRows] = await Promise.all([
      listRowsForBusinessIds(businesses.map((business) => business.id)),
      listFoundingRows(),
      listUnexpiredPlanRows(now),
    ]);

    for (const business of businesses) {
      states.set(
        business.id,
        buildListingPlanOwnerStates({ business, businessRows, foundingRows, unexpiredRows, now })
      );
    }
  } catch (error) {
    console.error('[listing-plans] Unable to load owner plan states:', error);
  }

  return states;
}

type OwnedBusiness = {
  id: string;
  slug: string;
  name_en: string;
  city: string;
  categorySlug: string;
};

async function getOwnedLiveBusiness(profileId: string, businessSlug: string, locale: Locale): Promise<OwnedBusiness> {
  const { data, error } = await requireServiceClient()
    .from('businesses')
    .select(
      'id, slug, owner_profile_id, name_en, city, status, verification_state, category:business_categories!inner (slug)'
    )
    .eq('slug', businessSlug)
    .maybeSingle();

  if (error || !data) {
    throw new ListingPlanError(text(locale, 'Business not found.', '找不到這個商家。'), 404);
  }

  const row = data as {
    id: string;
    slug: string;
    owner_profile_id?: string | null;
    name_en: string;
    city: string;
    status: string;
    verification_state?: string | null;
    category?: { slug: string } | Array<{ slug: string }> | null;
  };

  if (row.owner_profile_id !== profileId) {
    throw new ListingPlanError(
      text(locale, 'You cannot buy a plan for this listing.', '你無法為這個商家購買方案。'),
      403
    );
  }

  if (row.status !== 'live' || (row.verification_state ?? 'unverified') === 'unverified') {
    throw new ListingPlanError(
      text(
        locale,
        'Only claimed listings that are live can buy a plan.',
        '只有已認領且已上線的商家可以購買方案。'
      )
    );
  }

  const category = Array.isArray(row.category) ? row.category[0] : row.category;

  return {
    id: row.id,
    slug: row.slug,
    name_en: row.name_en,
    city: row.city,
    categorySlug: category?.slug ?? '',
  };
}

function dashboardReturnUrl(
  locale: Locale,
  businessSlug: string,
  outcome: 'success' | 'cancelled',
  baseUrl = siteUrl
) {
  const url = new URL(withLocale(locale, '/dashboard'), baseUrl);
  url.searchParams.set('listingPlan', outcome);
  url.searchParams.set('business', businessSlug);
  return url.toString();
}

// Stripe swaps in the session ID only when the braces are not URL-encoded, so
// the placeholder is appended as plain text. The dashboard uses it to save the
// plan as soon as the owner is back (#449).
function stripeSuccessUrl(locale: Locale, businessSlug: string, baseUrl = siteUrl) {
  return `${dashboardReturnUrl(locale, businessSlug, 'success', baseUrl)}&session_id={CHECKOUT_SESSION_ID}`;
}

function mockId(prefix: 'cs_test' | 'pi_test') {
  return `${prefix}_listing_plan_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// Saves one paid term. Safe to call twice for the same checkout: the second
// call does nothing. A failed read or write throws, so the webhook answers
// non-2xx and Stripe retries instead of a payment never turning a plan on.
export async function recordListingPlanPurchase(input: {
  amountCents: number;
  businessId: string;
  checkoutSessionId: string;
  founding: boolean;
  interval: ListingPlanInterval;
  ownerProfileId: string;
  paymentIntentId?: string | null;
  planId: ListingPlanId;
  scopeCategory?: string | null;
  now?: Date;
}) {
  const client = requireServiceClient();
  const now = input.now ?? new Date();

  const { data: existing, error: existingError } = await client
    .from(LISTING_PLAN_TABLE)
    .select('id')
    .eq('stripe_checkout_session_id', input.checkoutSessionId)
    .maybeSingle();
  if (existingError) {
    throw new Error('Unable to check whether this plan purchase was already saved.');
  }
  if (existing) {
    return 'duplicate' as const;
  }

  const { data: business, error: businessError } = await client
    .from('businesses')
    .select('id')
    .eq('id', input.businessId)
    .maybeSingle();
  if (businessError || !business) {
    throw new Error('Unable to load the business for this plan purchase.');
  }

  const { data: latest, error: latestError } = await client
    .from(LISTING_PLAN_TABLE)
    .select('ends_at')
    .eq('business_id', input.businessId)
    .eq('plan_id', input.planId)
    .eq('status', 'active')
    .gt('ends_at', now.toISOString())
    .order('ends_at', { ascending: false })
    .limit(1);
  if (latestError) {
    throw new Error('Unable to load the current plan term.');
  }

  // Buying while a plan is running adds the new term after the current one.
  const currentEnd = (latest as Array<{ ends_at: string }> | null)?.[0]?.ends_at;
  const startsAt = currentEnd && new Date(currentEnd).getTime() > now.getTime() ? new Date(currentEnd) : now;
  const endsAt = addListingPlanTerm(startsAt, input.interval);
  const timestamp = now.toISOString();

  const { error: insertError } = await client.from(LISTING_PLAN_TABLE).insert({
    business_id: input.businessId,
    owner_profile_id: input.ownerProfileId,
    plan_id: input.planId,
    billing_interval: input.interval,
    amount_cents: input.amountCents,
    founding: input.founding,
    status: 'active',
    scope_category: input.planId === 'sponsored-category' ? input.scopeCategory || null : null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    stripe_checkout_session_id: input.checkoutSessionId,
    stripe_payment_intent_id: input.paymentIntentId ?? null,
    created_at: timestamp,
    updated_at: timestamp,
  });

  if (insertError) {
    // Two deliveries of the same event raced; the other one saved it.
    if (insertError.code === '23505') {
      return 'duplicate' as const;
    }
    throw new Error('Unable to save the plan purchase.');
  }

  return 'saved' as const;
}

export async function createListingPlanCheckoutForProfile(input: {
  baseUrl?: string;
  businessSlug: string;
  interval: string;
  locale: Locale;
  planId: string;
  profileId: string;
  userEmail?: string | null;
}): Promise<ListingPlanCheckoutResult> {
  const { locale } = input;
  if (!isListingPlanId(input.planId) || !isListingPlanInterval(input.interval)) {
    throw new ListingPlanError(text(locale, 'Choose a plan first.', '請先選擇方案。'));
  }

  const offer = findListingPlanOffer(input.planId, input.interval);
  if (!offer) {
    throw new ListingPlanError(text(locale, 'That plan is not offered.', '沒有這個方案。'));
  }

  const availability = await getListingPlanAvailability();
  if (availability.mode === 'read_only') {
    throw new ListingPlanError(
      text(locale, 'Online plan checkout is not set up yet.', '線上購買方案尚未開放。'),
      503
    );
  }

  const business = await getOwnedLiveBusiness(input.profileId, input.businessSlug, locale);
  const now = new Date();
  const [ownRows, foundingRows, unexpiredRows] = await Promise.all([
    listRowsForBusinessIds([business.id]),
    listFoundingRows(),
    listUnexpiredPlanRows(now),
  ]);
  const [state] = buildListingPlanOwnerStates({
    business,
    businessRows: ownRows,
    foundingRows,
    unexpiredRows,
    now,
  }).filter((item) => item.planId === offer.planId);

  if (state?.soldOut) {
    throw new ListingPlanError(
      text(
        locale,
        'All 3 sponsored spots in this category are taken. Ask us to be told when one opens.',
        '此分類的 3 個贊助版位都已售出。歡迎聯絡我們，有空位時會通知你。'
      ),
      409
    );
  }

  const founding = Boolean(state?.foundingPrice);
  const amountCents = listingPlanPriceCents(offer, founding);
  const metadata = {
    checkout_kind: CHECKOUT_KIND,
    plan_id: offer.planId,
    plan_interval: offer.interval,
    business_id: business.id,
    business_slug: business.slug,
    owner_profile_id: input.profileId,
    founding: founding ? 'true' : 'false',
    price_cents: String(amountCents),
    scope_category: offer.planId === 'sponsored-category' ? business.categorySlug : '',
  };

  if (availability.mode === 'mock') {
    await recordListingPlanPurchase({
      amountCents,
      businessId: business.id,
      checkoutSessionId: mockId('cs_test'),
      founding,
      interval: offer.interval,
      ownerProfileId: input.profileId,
      paymentIntentId: mockId('pi_test'),
      planId: offer.planId,
      scopeCategory: metadata.scope_category,
    });

    return {
      message: 'Test plan turned on in local development mode. No Stripe charge was created.',
      mode: 'redirect',
      url: dashboardReturnUrl(locale, business.slug, 'success', input.baseUrl),
    };
  }

  const stripe = getStripeClient();
  if (!stripe || !isStripeConfigured()) {
    throw new ListingPlanError(
      text(locale, 'Online plan checkout is not set up yet.', '線上購買方案尚未開放。'),
      503
    );
  }

  const name = listingPlanNames[offer.planId].en;
  const term = offer.interval === 'year' ? '1 year' : '1 month';
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: stripeSuccessUrl(locale, business.slug, input.baseUrl),
    cancel_url: dashboardReturnUrl(locale, business.slug, 'cancelled', input.baseUrl),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: `${name} (${term})`,
            description: [
              business.name_en,
              business.city,
              offer.planId === 'sponsored-category' ? business.categorySlug : '',
              founding ? 'Founding sponsor price' : '',
            ]
              .filter(Boolean)
              .join(' · '),
          },
        },
      },
    ],
    metadata,
    customer_email: input.userEmail ?? undefined,
    // Chinese-speaking owners pay on a Traditional Chinese checkout page.
    locale: locale === 'zh' ? 'zh-TW' : 'en',
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });

  if (!session.url) {
    throw new ListingPlanError('Stripe did not return a checkout URL.', 502);
  }

  return { message: 'Plan checkout created.', mode: 'redirect', url: session.url };
}

async function finalizeListingPlanCheckout(
  session: Stripe.Checkout.Session
): Promise<ListingPlanCheckoutOutcome> {
  const metadata = session.metadata ?? {};
  if (metadata.checkout_kind !== CHECKOUT_KIND) {
    return 'ignored';
  }

  // A delayed payment method (bank debit) completes checkout before the money
  // arrives. The plan turns on when `checkout.session.async_payment_succeeded`
  // reports the payment.
  if (session.payment_status === 'unpaid') {
    return 'pending';
  }

  const planId = metadata.plan_id;
  const interval = metadata.plan_interval;
  if (!isListingPlanId(planId) || !isListingPlanInterval(interval) || !metadata.business_id) {
    console.error('[listing-plans] Checkout session has unusable plan metadata:', session.id);
    return 'ignored';
  }

  return recordListingPlanPurchase({
    amountCents: session.amount_total ?? Number(metadata.price_cents ?? 0),
    businessId: metadata.business_id,
    checkoutSessionId: session.id,
    founding: metadata.founding === 'true',
    interval,
    ownerProfileId: metadata.owner_profile_id ?? '',
    paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    planId,
    scopeCategory: metadata.scope_category || null,
  });
}

const CHECKOUT_SESSION_ID_PATTERN = /^cs_(?:test|live)_[A-Za-z0-9]{1,250}$/;

// Saves the plan when the owner comes back from Stripe Checkout, so a paid
// plan never depends only on the webhook arriving (#449). It runs the same
// save as the webhook, and whichever comes second does nothing. Only the
// owner the checkout was made for can trigger it.
export async function confirmListingPlanCheckoutForProfile(input: {
  checkoutSessionId: string;
  profileId: string;
}): Promise<ListingPlanCheckoutOutcome> {
  if (!CHECKOUT_SESSION_ID_PATTERN.test(input.checkoutSessionId) || !isSupabaseServiceConfigured()) {
    return 'ignored';
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return 'ignored';
  }

  const session = await stripe.checkout.sessions.retrieve(input.checkoutSessionId);
  if (session.metadata?.owner_profile_id !== input.profileId) {
    return 'ignored';
  }

  return finalizeListingPlanCheckout(session);
}

export async function handleListingPlanStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      await finalizeListingPlanCheckout(event.data.object as Stripe.Checkout.Session);
      break;
    default:
      break;
  }
}

export type AdminListingPlan = {
  id: string;
  businessSlug: string;
  businessName: string;
  planId: ListingPlanId;
  interval: ListingPlanInterval;
  amountCents: number;
  founding: boolean;
  scopeCategory: string | null;
  startsAt: string;
  endsAt: string;
  live: boolean;
};

// Plans that have not ended yet, newest first, for the admin page.
export async function getAdminListingPlans(limit = 50): Promise<AdminListingPlan[]> {
  if (!(await isListingPlansSchemaReady())) {
    return [];
  }

  const now = new Date();
  const { data, error } = await requireServiceClient()
    .from(LISTING_PLAN_TABLE)
    .select('*, business:businesses (slug, name_en)')
    .eq('status', 'active')
    .gt('ends_at', now.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return (data as Array<ListingPlanRow & { business?: { slug: string; name_en: string } | null }>).map(
    (row) => ({
      id: row.id,
      businessSlug: row.business?.slug ?? '',
      businessName: row.business?.name_en ?? row.business_id,
      planId: row.plan_id,
      interval: row.billing_interval,
      amountCents: row.amount_cents,
      founding: row.founding,
      scopeCategory: row.scope_category,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      live: isListingPlanRowLive(row, now),
    })
  );
}
