import type Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getAdvertisePlans } from '@/lib/advertise';
import {
  LISTING_PLAN_FOUNDING_LIMIT,
  addListingPlanTerm,
  findListingPlanOffer,
  formatListingPlanUsd,
  listingPlanOffers,
  qualifiesForFoundingPrice,
} from '@/lib/listing-plan-offers';
import { splitSponsoredListings } from '@/lib/metro-categories';
import type { Business } from '@/lib/types';

type Call = { table: string; ops: Array<[string, ...unknown[]]> };
type Result = { data: unknown; error: unknown };
type Resolver = (call: Call, terminal: 'maybeSingle' | 'many') => Result;

function createFakeClient(resolve: Resolver) {
  const calls: Call[] = [];

  function from(table: string) {
    const call: Call = { table, ops: [] };
    calls.push(call);
    const builder: Record<string, unknown> = {};
    for (const op of ['select', 'eq', 'gt', 'order', 'limit', 'in', 'insert', 'update']) {
      builder[op] = (...args: unknown[]) => {
        call.ops.push([op, ...args]);
        return builder;
      };
    }
    builder.maybeSingle = () => Promise.resolve(resolve(call, 'maybeSingle'));
    builder.then = (onFulfilled: (value: Result) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(resolve(call, 'many')).then(onFulfilled, onRejected);
    return builder;
  }

  return { client: { from }, calls };
}

function hasOp(call: Call, op: string, ...args: unknown[]) {
  return call.ops.some(
    ([name, ...rest]) => name === op && args.every((arg, index) => rest[index] === arg)
  );
}

function opArgs(call: Call, op: string) {
  return call.ops.find(([name]) => name === op)?.slice(1) ?? [];
}

const now = new Date('2026-11-26T12:00:00.000Z');

function planRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'plan-1',
    business_id: 'b-1',
    owner_profile_id: 'profile-1',
    plan_id: 'sponsored-category',
    billing_interval: 'month',
    amount_cents: 5900,
    founding: false,
    status: 'active',
    scope_category: 'restaurants',
    starts_at: '2026-11-20T00:00:00.000Z',
    ends_at: '2026-12-20T00:00:00.000Z',
    stripe_checkout_session_id: 'cs_1',
    stripe_payment_intent_id: 'pi_1',
    created_at: '2026-11-20T00:00:00.000Z',
    updated_at: '2026-11-20T00:00:00.000Z',
    ...overrides,
  } as const;
}

function business(overrides: Partial<Business> = {}): Business {
  return {
    id: 'b-1',
    slug: 'lotus-kitchen',
    name: { en: 'Lotus Kitchen', zh: '蓮花廚房' },
    categorySlug: 'restaurants',
    city: 'Chandler',
    region: 'AZ',
    gallery: [],
    shortDescription: { en: '' },
    description: { en: '' },
    services: [],
    languages: [],
    searchAliases: [],
    verified: false,
    bilingual: false,
    newcomerFriendly: false,
    sponsored: false,
    featured: false,
    rating: 0,
    reviewCount: 0,
    lastUpdated: '2026-11-01',
    hours: [],
    ...overrides,
  };
}

const ownedBusinessRow = {
  id: 'b-1',
  slug: 'lotus-kitchen',
  owner_profile_id: 'profile-1',
  name_en: 'Lotus Kitchen',
  city: 'Chandler',
  status: 'live',
  verification_state: 'claimed',
  category: { slug: 'restaurants' },
};

type Fixture = {
  business?: Record<string, unknown> | null;
  ownRows?: unknown[];
  foundingRows?: unknown[];
  unexpiredRows?: unknown[];
  existingSession?: unknown;
  latestRows?: unknown[];
  insertError?: unknown;
};

function planResolver(fixture: Fixture): Resolver {
  return (call, terminal) => {
    if (call.table === 'businesses') {
      return { data: fixture.business === undefined ? ownedBusinessRow : fixture.business, error: null };
    }
    if (call.table !== 'directory_listing_plans') {
      return { data: null, error: { message: `unexpected ${call.table}` } };
    }
    if (hasOp(call, 'insert')) {
      return { data: null, error: fixture.insertError ?? null };
    }
    if (terminal === 'maybeSingle') {
      return { data: fixture.existingSession ?? null, error: null };
    }
    if (hasOp(call, 'limit', 1) && hasOp(call, 'select', 'id')) {
      return { data: [], error: null };
    }
    if (hasOp(call, 'select', 'ends_at')) {
      return { data: fixture.latestRows ?? [], error: null };
    }
    if (hasOp(call, 'eq', 'founding', true)) {
      return { data: fixture.foundingRows ?? [], error: null };
    }
    if (hasOp(call, 'in')) {
      return { data: fixture.ownRows ?? [], error: null };
    }
    if (hasOp(call, 'gt')) {
      return { data: fixture.unexpiredRows ?? [], error: null };
    }
    return { data: [], error: null };
  };
}

async function loadPlans(
  resolve: Resolver,
  { mode = 'stripe', sessionUrl = 'https://checkout.stripe.test/cs_new' }: { mode?: string; sessionUrl?: string | null } = {}
) {
  const fake = createFakeClient(resolve);
  const createSession = vi.fn().mockResolvedValue({ id: 'cs_new', url: sessionUrl });
  vi.doMock('@/lib/supabase', () => ({
    getSupabaseServiceClient: () => fake.client,
    isSupabaseServiceConfigured: () => true,
  }));
  vi.doMock('@/lib/directory-ads', () => ({
    getDirectoryAdsRuntimeMode: () => mode,
  }));
  vi.doMock('@/lib/stripe', () => ({
    getStripeClient: () => ({ checkout: { sessions: { create: createSession } } }),
    isStripeConfigured: () => true,
  }));
  const plans = await import('@/lib/listing-plans');
  plans.resetListingPlanSchemaCache();
  return { plans, createSession, ...fake };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('listing plan offers', () => {
  it('match the prices published on the Advertise page', () => {
    const plans = getAdvertisePlans();
    for (const offer of listingPlanOffers) {
      const plan = plans.find((item) => item.id === offer.planId);
      expect(plan?.prices).toContainEqual({ amountUsd: offer.priceCents / 100, interval: offer.interval });
      // The founding price is the one the Advertise page promises.
      expect(plan?.foundingOffer?.en).toContain(formatListingPlanUsd(offer.foundingPriceCents));
    }
    expect(findListingPlanOffer('enhanced-listing', 'month')).toBeUndefined();
    expect(findListingPlanOffer('enhanced-listing', 'year')?.foundingPriceCents).toBe(9_900);
  });

  it('adds calendar months and years without rolling past short months', () => {
    expect(addListingPlanTerm(new Date('2026-01-31T15:00:00Z'), 'month').toISOString()).toBe(
      '2026-02-28T15:00:00.000Z'
    );
    expect(addListingPlanTerm(new Date('2026-12-15T00:00:00Z'), 'month').toISOString()).toBe(
      '2027-01-15T00:00:00.000Z'
    );
    expect(addListingPlanTerm(new Date('2028-02-29T00:00:00Z'), 'year').toISOString()).toBe(
      '2029-02-28T00:00:00.000Z'
    );
    expect(addListingPlanTerm(new Date('2026-11-26T12:00:00Z'), 'year').toISOString()).toBe(
      '2027-11-26T12:00:00.000Z'
    );
  });

  it('gives founding prices to the first 10 businesses and keeps them on renewal', () => {
    expect(qualifiesForFoundingPrice({ businessAlreadyFounding: false, foundingBusinessCount: 9 })).toBe(true);
    expect(
      qualifiesForFoundingPrice({
        businessAlreadyFounding: false,
        foundingBusinessCount: LISTING_PLAN_FOUNDING_LIMIT,
      })
    ).toBe(false);
    expect(qualifiesForFoundingPrice({ businessAlreadyFounding: true, foundingBusinessCount: 25 })).toBe(true);
  });
});

describe('listing plan placement', () => {
  it('labels a sponsored category plan holder as sponsored, only in its own category, and never featured', async () => {
    const { plans } = await loadPlans(planResolver({}));
    const rows = [
      planRow(),
      planRow({ id: 'plan-2', business_id: 'b-2', scope_category: 'medical' }),
      planRow({ id: 'plan-3', business_id: 'b-3', plan_id: 'enhanced-listing', billing_interval: 'year', scope_category: null }),
      planRow({ id: 'plan-4', business_id: 'b-4', starts_at: '2026-12-20T00:00:00.000Z', ends_at: '2027-01-20T00:00:00.000Z' }),
      planRow({ id: 'plan-5', business_id: 'b-5', status: 'cancelled' }),
    ];
    const result = plans.applyListingPlansToBusinesses(
      [
        business(),
        business({ id: 'b-2', slug: 'b-2' }),
        business({ id: 'b-3', slug: 'b-3' }),
        business({ id: 'b-4', slug: 'b-4' }),
        business({ id: 'b-5', slug: 'b-5' }),
      ],
      rows as never,
      now
    );

    expect(result[0]).toMatchObject({ paidPlans: ['sponsored-category'], sponsored: true, featured: false });
    expect(result[1].sponsored).toBe(false);
    expect(result[1].paidPlans).toBeUndefined();
    expect(result[2]).toMatchObject({ paidPlans: ['enhanced-listing'], sponsored: false });
    expect(result[3].paidPlans).toBeUndefined();
    expect(result[4].paidPlans).toBeUndefined();
  });

  it('seats sponsored category plan holders before other sponsored listings', () => {
    const listings = [
      business({ id: 'ad-1', sponsored: true }),
      business({ id: 'ad-2', sponsored: true }),
      business({ id: 'organic' }),
      business({ id: 'ad-3', sponsored: true }),
      business({ id: 'plan-1', sponsored: true, paidPlans: ['sponsored-category'] }),
    ];
    const { sponsored, organic } = splitSponsoredListings(listings);

    expect(sponsored.map((item) => item.id)).toEqual(['plan-1', 'ad-1', 'ad-2']);
    expect(organic.map((item) => item.id)).toEqual(['organic', 'ad-3']);
  });

  it('builds dashboard states with founding prices, active terms and sold-out categories', async () => {
    const { plans } = await loadPlans(planResolver({}));
    const holders = ['x-1', 'x-2', 'x-3'].map((id, index) =>
      planRow({ id: `h-${index}`, business_id: id })
    );
    const foundingRows = Array.from({ length: 10 }, (_, index) => ({
      business_id: `f-${index}`,
      plan_id: 'enhanced-listing' as const,
      founding: true,
    }));

    const [enhanced, sponsored] = plans.buildListingPlanOwnerStates({
      business: business(),
      businessRows: [],
      foundingRows,
      unexpiredRows: holders as never,
      now,
    });
    expect(enhanced).toEqual({ planId: 'enhanced-listing', activeUntil: undefined, foundingPrice: false, soldOut: false });
    expect(sponsored).toEqual({ planId: 'sponsored-category', activeUntil: undefined, foundingPrice: true, soldOut: true });

    const ownRows = [
      planRow({ founding: true }),
      planRow({ id: 'plan-next', starts_at: '2026-12-20T00:00:00.000Z', ends_at: '2027-01-20T00:00:00.000Z' }),
    ];
    const [, holder] = plans.buildListingPlanOwnerStates({
      business: business(),
      businessRows: ownRows as never,
      foundingRows: [],
      unexpiredRows: [...holders, ...ownRows] as never,
      now,
    });
    expect(holder).toEqual({
      planId: 'sponsored-category',
      activeUntil: '2027-01-20T00:00:00.000Z',
      foundingPrice: true,
      soldOut: false,
    });
  });
});

describe('recordListingPlanPurchase', () => {
  const purchase = {
    amountCents: 2950,
    businessId: 'b-1',
    checkoutSessionId: 'cs_new',
    founding: true,
    interval: 'month' as const,
    ownerProfileId: 'profile-1',
    paymentIntentId: 'pi_new',
    planId: 'sponsored-category' as const,
    scopeCategory: 'restaurants',
    now,
  };

  it('starts a new term now when no plan is running', async () => {
    const { plans, calls } = await loadPlans(planResolver({ business: { id: 'b-1' } }));

    await expect(plans.recordListingPlanPurchase(purchase)).resolves.toBe('saved');

    const insert = calls.find((call) => hasOp(call, 'insert'));
    expect(opArgs(insert!, 'insert')[0]).toMatchObject({
      amount_cents: 2950,
      billing_interval: 'month',
      business_id: 'b-1',
      founding: true,
      plan_id: 'sponsored-category',
      scope_category: 'restaurants',
      starts_at: '2026-11-26T12:00:00.000Z',
      ends_at: '2026-12-26T12:00:00.000Z',
      status: 'active',
      stripe_checkout_session_id: 'cs_new',
      stripe_payment_intent_id: 'pi_new',
    });
  });

  it('adds the new term after a running one', async () => {
    const { plans, calls } = await loadPlans(
      planResolver({ business: { id: 'b-1' }, latestRows: [{ ends_at: '2026-12-20T00:00:00.000Z' }] })
    );

    await plans.recordListingPlanPurchase({ ...purchase, interval: 'year' });

    const insert = calls.find((call) => hasOp(call, 'insert'));
    expect(opArgs(insert!, 'insert')[0]).toMatchObject({
      starts_at: '2026-12-20T00:00:00.000Z',
      ends_at: '2027-12-20T00:00:00.000Z',
    });
  });

  it('does nothing for a checkout that was already saved, or that a parallel delivery saved', async () => {
    const saved = await loadPlans(planResolver({ existingSession: { id: 'plan-1' } }));
    await expect(saved.plans.recordListingPlanPurchase(purchase)).resolves.toBe('duplicate');
    expect(saved.calls.some((call) => hasOp(call, 'insert'))).toBe(false);

    vi.resetModules();
    const raced = await loadPlans(planResolver({ business: { id: 'b-1' }, insertError: { code: '23505' } }));
    await expect(raced.plans.recordListingPlanPurchase(purchase)).resolves.toBe('duplicate');
  });

  it('throws so Stripe retries when the plan cannot be saved', async () => {
    const { plans } = await loadPlans(
      planResolver({ business: { id: 'b-1' }, insertError: { code: '57014', message: 'timeout' } })
    );

    await expect(plans.recordListingPlanPurchase(purchase)).rejects.toThrow('Unable to save the plan purchase.');
  });
});

describe('handleListingPlanStripeEvent', () => {
  function event(type: string, session: Partial<Stripe.Checkout.Session>) {
    return { type, data: { object: session } } as unknown as Stripe.Event;
  }

  const metadata = {
    checkout_kind: 'listing_plan',
    plan_id: 'enhanced-listing',
    plan_interval: 'year',
    business_id: 'b-1',
    owner_profile_id: 'profile-1',
    founding: 'false',
    price_cents: '19900',
    scope_category: '',
  };

  it('turns the plan on from a paid checkout, using the amount Stripe charged', async () => {
    const { plans, calls } = await loadPlans(planResolver({ business: { id: 'b-1' } }));

    await plans.handleListingPlanStripeEvent(
      event('checkout.session.completed', {
        id: 'cs_paid',
        amount_total: 19_900,
        metadata,
        payment_intent: 'pi_paid',
        payment_status: 'paid',
      })
    );

    const insert = calls.find((call) => hasOp(call, 'insert'));
    expect(opArgs(insert!, 'insert')[0]).toMatchObject({
      amount_cents: 19_900,
      plan_id: 'enhanced-listing',
      billing_interval: 'year',
      scope_category: null,
      stripe_checkout_session_id: 'cs_paid',
    });
  });

  it('ignores ad checkouts, unpaid delayed payments and unusable metadata', async () => {
    const { plans, calls } = await loadPlans(planResolver({ business: { id: 'b-1' } }));

    await plans.handleListingPlanStripeEvent(
      event('checkout.session.completed', { id: 'cs_ad', metadata: { checkout_kind: 'directory_ad' }, payment_status: 'paid' })
    );
    await plans.handleListingPlanStripeEvent(
      event('checkout.session.completed', { id: 'cs_ach', metadata, payment_status: 'unpaid' })
    );
    await plans.handleListingPlanStripeEvent(
      event('checkout.session.completed', {
        id: 'cs_bad',
        metadata: { ...metadata, plan_id: 'homepage-spotlight' },
        payment_status: 'paid',
      })
    );
    await plans.handleListingPlanStripeEvent(event('charge.refunded', { id: 'ch_1' }));

    expect(calls).toHaveLength(0);
  });

  it('turns the plan on when a delayed payment succeeds', async () => {
    const { plans, calls } = await loadPlans(planResolver({ business: { id: 'b-1' } }));

    await plans.handleListingPlanStripeEvent(
      event('checkout.session.async_payment_succeeded', {
        id: 'cs_ach',
        amount_total: 19_900,
        metadata,
        payment_status: 'paid',
      })
    );

    expect(calls.some((call) => hasOp(call, 'insert'))).toBe(true);
  });
});

describe('createListingPlanCheckoutForProfile', () => {
  const input = {
    baseUrl: 'https://chinesearizona.com',
    businessSlug: 'lotus-kitchen',
    interval: 'year',
    locale: 'en' as const,
    planId: 'sponsored-category',
    profileId: 'profile-1',
    userEmail: 'owner@example.com',
  };

  it('creates a fixed-price Stripe checkout with the founding price while spots remain', async () => {
    const { plans, createSession } = await loadPlans(planResolver({}));

    const result = await plans.createListingPlanCheckoutForProfile(input);

    expect(result).toEqual({
      message: 'Plan checkout created.',
      mode: 'redirect',
      url: 'https://checkout.stripe.test/cs_new',
    });
    const params = createSession.mock.calls[0][0];
    expect(params).toMatchObject({
      mode: 'payment',
      customer_email: 'owner@example.com',
      success_url: 'https://chinesearizona.com/en/dashboard?listingPlan=success&business=lotus-kitchen',
      cancel_url: 'https://chinesearizona.com/en/dashboard?listingPlan=cancelled&business=lotus-kitchen',
      metadata: {
        checkout_kind: 'listing_plan',
        plan_id: 'sponsored-category',
        plan_interval: 'year',
        business_id: 'b-1',
        owner_profile_id: 'profile-1',
        founding: 'true',
        price_cents: '29500',
        scope_category: 'restaurants',
      },
    });
    expect(params.line_items[0].price_data).toMatchObject({
      currency: 'usd',
      unit_amount: 29_500,
      product_data: { name: 'Sponsored category spot (1 year)' },
    });
  });

  it('charges the full price once 10 businesses have the founding offer', async () => {
    const foundingRows = Array.from({ length: 10 }, (_, index) => ({
      business_id: `f-${index}`,
      plan_id: 'enhanced-listing',
      founding: true,
    }));
    const { plans, createSession } = await loadPlans(planResolver({ foundingRows }));

    await plans.createListingPlanCheckoutForProfile({ ...input, planId: 'enhanced-listing' });

    const params = createSession.mock.calls[0][0];
    expect(params.line_items[0].price_data.unit_amount).toBe(19_900);
    expect(params.metadata).toMatchObject({ founding: 'false', scope_category: '' });
  });

  it('refuses a sponsored spot when the category already has 3 sponsors', async () => {
    const holders = ['x-1', 'x-2', 'x-3'].map((id, index) => planRow({ id: `h-${index}`, business_id: id }));
    const { plans, createSession } = await loadPlans(planResolver({ unexpiredRows: holders }));

    await expect(plans.createListingPlanCheckoutForProfile(input)).rejects.toMatchObject({ status: 409 });
    expect(createSession).not.toHaveBeenCalled();
  });

  it('rejects unknown plans, other owners, unclaimed listings and unconfigured sites', async () => {
    const { plans } = await loadPlans(planResolver({}));
    await expect(
      plans.createListingPlanCheckoutForProfile({ ...input, planId: 'homepage-spotlight' })
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      plans.createListingPlanCheckoutForProfile({ ...input, planId: 'enhanced-listing', interval: 'month' })
    ).rejects.toMatchObject({ status: 400 });

    vi.resetModules();
    const notOwner = await loadPlans(planResolver({ business: { ...ownedBusinessRow, owner_profile_id: 'someone-else' } }));
    await expect(notOwner.plans.createListingPlanCheckoutForProfile(input)).rejects.toMatchObject({ status: 403 });

    vi.resetModules();
    const unclaimed = await loadPlans(planResolver({ business: { ...ownedBusinessRow, verification_state: 'unverified' } }));
    await expect(unclaimed.plans.createListingPlanCheckoutForProfile(input)).rejects.toMatchObject({ status: 400 });

    vi.resetModules();
    const readOnly = await loadPlans(planResolver({}), { mode: 'read_only' });
    await expect(readOnly.plans.createListingPlanCheckoutForProfile(input)).rejects.toMatchObject({ status: 503 });
  });

  it('turns the plan on directly in local test mode without calling Stripe', async () => {
    const { plans, createSession, calls } = await loadPlans(planResolver({}), { mode: 'mock' });

    const result = await plans.createListingPlanCheckoutForProfile({ ...input, locale: 'zh' });

    expect(createSession).not.toHaveBeenCalled();
    expect(result.url).toBe('https://chinesearizona.com/zh/dashboard?listingPlan=success&business=lotus-kitchen');
    expect(calls.some((call) => hasOp(call, 'insert'))).toBe(true);
  });
});
