import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildDirectoryAdEventDedupeKey,
  buildDirectoryAdMetrics,
  DIRECTORY_AD_MAX_BUDGET_CENTS,
  DIRECTORY_AD_MIN_BUDGET_CENTS,
  getDirectoryAdsRuntimeMode,
  isDirectoryAdEligiblePath,
  resolveDirectoryAdCampaignStatus,
  validateDirectoryAdBudgetCents,
} from '@/lib/directory-ads';
import type { Business } from '@/lib/types';

const env = process.env as Record<string, string | undefined>;
const originalNodeEnv = env.NODE_ENV;
const originalDirectoryAdsDevMode = env.DIRECTORY_ADS_DEV_MODE;
const originalStripeSecretKey = env.STRIPE_SECRET_KEY;
const originalStripeWebhookSecret = env.STRIPE_WEBHOOK_SECRET;
const originalSupabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const originalServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();

  if (originalNodeEnv === undefined) {
    delete env.NODE_ENV;
  } else {
    env.NODE_ENV = originalNodeEnv;
  }

  if (originalDirectoryAdsDevMode === undefined) {
    delete env.DIRECTORY_ADS_DEV_MODE;
  } else {
    env.DIRECTORY_ADS_DEV_MODE = originalDirectoryAdsDevMode;
  }

  if (originalStripeSecretKey === undefined) {
    delete env.STRIPE_SECRET_KEY;
  } else {
    env.STRIPE_SECRET_KEY = originalStripeSecretKey;
  }

  if (originalStripeWebhookSecret === undefined) {
    delete env.STRIPE_WEBHOOK_SECRET;
  } else {
    env.STRIPE_WEBHOOK_SECRET = originalStripeWebhookSecret;
  }

  if (originalSupabaseUrl === undefined) {
    delete env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
  }

  if (originalServiceRoleKey === undefined) {
    delete env.SUPABASE_SERVICE_ROLE_KEY;
  } else {
    env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
  }
});

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

async function loadDirectoryAdsModuleWithSchemaReady(schemaReady: boolean) {
  const stripeCheckoutCreate = vi.fn();

  vi.doMock('@/lib/supabase', () => ({
    getSupabaseServiceClient: vi.fn(() => ({
      from: vi.fn((table: string) => {
        if (table !== 'directory_ad_campaigns') {
          throw new Error(`Unexpected table: ${table}`);
        }

        return {
          select: vi.fn(() => ({
            limit: vi.fn(async () =>
              schemaReady
                ? { data: [], error: null }
                : {
                    data: null,
                    error: {
                      code: 'PGRST205',
                      message:
                        "Could not find the table 'public.directory_ad_campaigns' in the schema cache",
                    },
                  }
            ),
          })),
        };
      }),
    })),
    isSupabaseServiceConfigured: vi.fn(() => true),
  }));

  vi.doMock('@/lib/stripe', () => ({
    getStripeClient: vi.fn(() => ({
      checkout: {
        sessions: {
          create: stripeCheckoutCreate,
        },
      },
      webhooks: {
        constructEvent: vi.fn(),
      },
    })),
    getStripeWebhookSecret: vi.fn(() => 'whsec_123'),
    isStripeConfigured: vi.fn(() => true),
  }));

  return {
    stripeCheckoutCreate,
    ...(await import('@/lib/directory-ads')),
  };
}

function businessFixture(overrides: Partial<Business> = {}): Business {
  return {
    id: 'business-1',
    slug: 'lotus-market',
    name: { en: 'Lotus Market', zh: '蓮花市場' },
    categorySlug: 'grocery',
    city: 'Phoenix',
    region: 'AZ',
    gallery: [],
    shortDescription: { en: 'Short description' },
    description: { en: 'Description' },
    services: [],
    languages: ['English'],
    searchAliases: [],
    verified: false,
    bilingual: false,
    newcomerFriendly: false,
    sponsored: false,
    featured: false,
    rating: 0,
    reviewCount: 0,
    lastUpdated: '2026-04-19T00:00:00.000Z',
    status: 'live',
    verificationState: 'claimed',
    hours: [],
    ...overrides,
  };
}

describe('directory ad helpers', () => {
  it('validates campaign budgets against min, max, and increment rules', () => {
    expect(validateDirectoryAdBudgetCents(DIRECTORY_AD_MIN_BUDGET_CENTS).valid).toBe(true);
    expect(validateDirectoryAdBudgetCents(DIRECTORY_AD_MIN_BUDGET_CENTS - 100).valid).toBe(false);
    expect(validateDirectoryAdBudgetCents(DIRECTORY_AD_MAX_BUDGET_CENTS + 100).valid).toBe(false);
    expect(validateDirectoryAdBudgetCents(11_000).valid).toBe(false);
  });

  it('normalizes dedupe keys by event, campaign, path, and session', () => {
    expect(
      buildDirectoryAdEventDedupeKey('click', ' campaign-1 ', '/en/directory/', ' session-1 ')
    ).toBe('directory-ad:click:campaign-1:/en/directory:session-1');
  });

  it('recognizes only eligible sponsored browse paths', () => {
    expect(isDirectoryAdEligiblePath('/en/business')).toBe(true);
    expect(isDirectoryAdEligiblePath('/zh/business/phoenix/medical')).toBe(true);
    expect(isDirectoryAdEligiblePath('/en/business/test-business')).toBe(false);
    expect(isDirectoryAdEligiblePath('/en/directory')).toBe(true);
    expect(isDirectoryAdEligiblePath('/zh/directory/phoenix/medical')).toBe(true);
    expect(isDirectoryAdEligiblePath('/en/directory/business/test-business')).toBe(false);
    expect(isDirectoryAdEligiblePath('/community/news')).toBe(false);
  });

  it('resolves campaign status from timing and remaining budget', () => {
    const baseCampaign = {
      cost_per_click_cents: 300,
      ends_at: '2026-05-01T00:00:00.000Z',
      remaining_budget_cents: 900,
      status: 'active' as const,
    };

    expect(resolveDirectoryAdCampaignStatus(baseCampaign, new Date('2026-04-20T00:00:00.000Z'))).toBe(
      'active'
    );
    expect(
      resolveDirectoryAdCampaignStatus(
        { ...baseCampaign, remaining_budget_cents: 200 },
        new Date('2026-04-20T00:00:00.000Z')
      )
    ).toBe('exhausted');
    expect(
      resolveDirectoryAdCampaignStatus(
        { ...baseCampaign, status: 'paused' },
        new Date('2026-04-20T00:00:00.000Z')
      )
    ).toBe('paused');
    expect(resolveDirectoryAdCampaignStatus(baseCampaign, new Date('2026-05-02T00:00:00.000Z'))).toBe(
      'expired'
    );
    expect(
      resolveDirectoryAdCampaignStatus(
        { ...baseCampaign, status: 'pending_payment' },
        new Date('2026-04-20T00:00:00.000Z')
      )
    ).toBe('pending_payment');
  });

  it('aggregates impressions, clicks, ctr, and spend', () => {
    expect(
      buildDirectoryAdMetrics([
        { campaign_id: 'campaign-1', event_type: 'impression', cost_cents: 0 },
        { campaign_id: 'campaign-1', event_type: 'impression', cost_cents: 0 },
        { campaign_id: 'campaign-1', event_type: 'click', cost_cents: 300 },
      ])
    ).toEqual({
      impressions: 2,
      clicks: 1,
      ctr: 50,
      spendCents: 300,
    });
  });

  it('reports runtime mode for read-only, local mock, and full Stripe states', () => {
    env.NODE_ENV = 'development';
    env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    delete env.STRIPE_SECRET_KEY;
    delete env.STRIPE_WEBHOOK_SECRET;
    delete env.DIRECTORY_ADS_DEV_MODE;

    expect(getDirectoryAdsRuntimeMode()).toBe('read_only');

    env.DIRECTORY_ADS_DEV_MODE = '1';
    expect(getDirectoryAdsRuntimeMode()).toBe('mock');

    env.STRIPE_SECRET_KEY = 'sk_test_123';
    env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
    expect(getDirectoryAdsRuntimeMode()).toBe('stripe');
  });

  it('reports read-only availability when the directory ad tables are not deployed yet', async () => {
    env.NODE_ENV = 'development';
    env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    env.STRIPE_SECRET_KEY = 'sk_test_123';
    env.STRIPE_WEBHOOK_SECRET = 'whsec_123';

    const { getDirectoryAdsAvailability } = await loadDirectoryAdsModuleWithSchemaReady(false);

    await expect(getDirectoryAdsAvailability()).resolves.toEqual({
      mode: 'read_only',
      unavailableReason: 'schema',
    });
  });

  it('blocks Stripe checkout creation until the directory ad schema is deployed', async () => {
    env.NODE_ENV = 'development';
    env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    env.STRIPE_SECRET_KEY = 'sk_test_123';
    env.STRIPE_WEBHOOK_SECRET = 'whsec_123';

    const { createDirectoryAdCheckoutForProfile, stripeCheckoutCreate } =
      await loadDirectoryAdsModuleWithSchemaReady(false);

    await expect(
      createDirectoryAdCheckoutForProfile({
        baseUrl: 'https://preview.chinesearizona.com',
        budgetCents: DIRECTORY_AD_MIN_BUDGET_CENTS,
        businessSlug: 'lotus-market',
        locale: 'en',
        profileId: 'profile-1',
        userEmail: 'owner@example.com',
      })
    ).rejects.toThrow(
      'Directory sponsorship is not fully set up yet. Apply the directory ads Supabase migration before creating checkout.'
    );
    expect(stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it('honors paid Stripe directory ad sessions when the ad schema is missing', async () => {
    const paidSessionCreatedAt = Math.floor(Date.now() / 1000);
    const stripeCheckoutList = vi.fn(async () => ({
      data: [
        {
          id: 'cs_paid_123',
          created: paidSessionCreatedAt,
          metadata: {
            budget_cents: '200000',
            business_id: 'business-1',
            checkout_kind: 'directory_ad',
            owner_profile_id: 'owner-1',
            scope_category: 'grocery',
            scope_city: 'Phoenix',
          },
          payment_intent: 'pi_paid_123',
          payment_status: 'paid',
          status: 'complete',
        },
      ],
      has_more: false,
    }));

    vi.doMock('@/lib/supabase', () => ({
      getSupabaseServiceClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
          if (table !== 'directory_ad_campaigns') {
            throw new Error(`Unexpected table: ${table}`);
          }

          return {
            select: vi.fn(() => ({
              limit: vi.fn(async () => ({
                data: null,
                error: {
                  code: 'PGRST205',
                  message:
                    "Could not find the table 'public.directory_ad_campaigns' in the schema cache",
                },
              })),
            })),
          };
        }),
      })),
      isSupabaseServiceConfigured: vi.fn(() => true),
    }));

    vi.doMock('@/lib/stripe', () => ({
      getStripeClient: vi.fn(() => ({
        checkout: {
          sessions: {
            create: vi.fn(),
            list: stripeCheckoutList,
          },
        },
        webhooks: {
          constructEvent: vi.fn(),
        },
      })),
      getStripeWebhookSecret: vi.fn(() => 'whsec_123'),
      isStripeConfigured: vi.fn(() => true),
    }));

    const { attachActiveDirectoryAdCampaigns: attachActiveCampaigns, getDirectoryAdCampaignsForOwnerBusinesses: getOwnerCampaigns } =
      await import('@/lib/directory-ads');

    const [business] = await attachActiveCampaigns([businessFixture()]);
    expect(business.sponsored).toBe(true);
    expect(business.activeDirectoryAdCampaign?.stripeCheckoutSessionId).toBe('cs_paid_123');
    expect(business.activeDirectoryAdCampaign?.remainingBudgetCents).toBe(200_000);

    const ownerCampaigns = await getOwnerCampaigns('owner-1', [businessFixture()]);
    expect(ownerCampaigns.get('business-1')?.stripeCheckoutSessionId).toBe('cs_paid_123');
    expect(stripeCheckoutList).toHaveBeenCalledWith({
      created: {
        gte: expect.any(Number),
      },
      limit: 100,
    });
  });
});

type FakeQuery = {
  action: 'select' | 'insert' | 'update';
  filters: Record<string, unknown>;
  payload?: unknown;
  table: string;
};

type FakeResult = { data?: unknown; error?: unknown };

function fakeServiceClient(respond: (query: FakeQuery) => FakeResult) {
  const queries: FakeQuery[] = [];
  const settle = (query: FakeQuery) => {
    queries.push({ ...query, filters: { ...query.filters } });
    return { data: null, error: null, ...respond(query) };
  };

  const client = {
    from: vi.fn((table: string) => {
      const query: FakeQuery = { action: 'select', filters: {}, table };
      const builder = {
        select: vi.fn(() => builder),
        insert: vi.fn((payload: unknown) => {
          query.action = 'insert';
          query.payload = payload;
          return builder;
        }),
        update: vi.fn((payload: unknown) => {
          query.action = 'update';
          query.payload = payload;
          return builder;
        }),
        eq: vi.fn((column: string, value: unknown) => {
          query.filters[column] = value;
          return builder;
        }),
        limit: vi.fn(() => builder),
        maybeSingle: vi.fn(async () => settle(query)),
        then: (resolve: (value: FakeResult) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(settle(query)).then(resolve, reject),
      };
      return builder;
    }),
  };

  return { client, queries };
}

const futureEndsAt = () => new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

function existingCampaignRow() {
  return {
    id: 'campaign-1',
    business_id: 'business-1',
    owner_profile_id: 'owner-1',
    status: 'active',
    budget_cents: 10_000,
    remaining_budget_cents: 4_000,
    cost_per_click_cents: 300,
    scope_city: 'Phoenix',
    scope_category: 'grocery',
    starts_at: new Date().toISOString(),
    ends_at: futureEndsAt(),
    stripe_checkout_session_id: 'cs_old',
    stripe_payment_intent_id: 'pi_old',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// A paid checkout for business-1 whose owner matches, so only the database
// responses decide whether the campaign can be saved.
function webhookResponder(overrides: Partial<Record<'sessionLookup' | 'business' | 'existingCampaign' | 'insert' | 'update', FakeResult>> = {}) {
  return (query: FakeQuery): FakeResult => {
    if (query.table === 'businesses') {
      return overrides.business ?? { data: { id: 'business-1', owner_profile_id: 'owner-1', city: 'Phoenix' } };
    }

    if (query.action === 'insert') {
      return overrides.insert ?? { error: null };
    }

    if (query.action === 'update') {
      return overrides.update ?? { error: null };
    }

    if ('stripe_checkout_session_id' in query.filters) {
      return overrides.sessionLookup ?? { data: null };
    }

    return overrides.existingCampaign ?? { data: existingCampaignRow() };
  };
}

function completedDirectoryAdCheckout(metadata: Record<string, string> = {}) {
  return {
    id: 'evt_checkout_completed',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_new',
        payment_intent: 'pi_new',
        payment_status: 'paid',
        status: 'complete',
        metadata: {
          checkout_kind: 'directory_ad',
          budget_cents: '10000',
          business_id: 'business-1',
          owner_profile_id: 'owner-1',
          scope_city: 'Phoenix',
          scope_category: 'grocery',
          ...metadata,
        },
      },
    },
  } as never;
}

async function loadWebhookHandler(respond: (query: FakeQuery) => FakeResult) {
  const fake = fakeServiceClient(respond);

  vi.doMock('@/lib/supabase', () => ({
    getSupabaseServiceClient: vi.fn(() => fake.client),
    isSupabaseServiceConfigured: vi.fn(() => true),
  }));
  vi.doMock('@/lib/stripe', () => ({
    getStripeClient: vi.fn(() => null),
    getStripeWebhookSecret: vi.fn(() => 'whsec_123'),
    isStripeConfigured: vi.fn(() => true),
  }));

  const { handleDirectoryAdStripeEvent } = await import('@/lib/directory-ads');
  return { handleDirectoryAdStripeEvent, queries: fake.queries };
}

describe('directory ad Stripe webhook handling', () => {
  it('creates a campaign for a paid checkout', async () => {
    const { handleDirectoryAdStripeEvent, queries } = await loadWebhookHandler(webhookResponder());

    await expect(handleDirectoryAdStripeEvent(completedDirectoryAdCheckout())).resolves.toBeUndefined();

    expect(queries.filter((query) => query.action === 'insert')).toHaveLength(1);
  });

  it('fails the event when the new campaign cannot be saved', async () => {
    const { handleDirectoryAdStripeEvent } = await loadWebhookHandler(
      webhookResponder({ insert: { error: { message: 'insert failed' } } })
    );

    await expect(handleDirectoryAdStripeEvent(completedDirectoryAdCheckout())).rejects.toThrow();
  });

  it('fails the event when the top-up cannot be saved', async () => {
    const { handleDirectoryAdStripeEvent } = await loadWebhookHandler(
      webhookResponder({ update: { error: { message: 'update failed' } } })
    );

    await expect(
      handleDirectoryAdStripeEvent(completedDirectoryAdCheckout({ campaign_id: 'campaign-1' }))
    ).rejects.toThrow();
  });

  it('fails the event without saving when the duplicate-session check errors', async () => {
    const { handleDirectoryAdStripeEvent, queries } = await loadWebhookHandler(
      webhookResponder({ sessionLookup: { error: { message: 'lookup failed' } } })
    );

    await expect(handleDirectoryAdStripeEvent(completedDirectoryAdCheckout())).rejects.toThrow();
    expect(queries.some((query) => query.action === 'insert' || query.action === 'update')).toBe(false);
  });

  it('fails the event instead of starting a new campaign when the top-up lookup errors', async () => {
    const { handleDirectoryAdStripeEvent, queries } = await loadWebhookHandler(
      webhookResponder({ existingCampaign: { error: { message: 'lookup failed' } } })
    );

    await expect(
      handleDirectoryAdStripeEvent(completedDirectoryAdCheckout({ campaign_id: 'campaign-1' }))
    ).rejects.toThrow();
    expect(queries.some((query) => query.action === 'insert')).toBe(false);
  });
});


// In-memory stand-in for the two directory ad tables, including the unique
// dedupe_key index and the remaining-budget guard used when billing clicks.
function fakeDirectoryAdDatabase() {
  const campaign = {
    id: 'campaign-1',
    business_id: 'business-1',
    owner_profile_id: 'owner-1',
    status: 'active',
    budget_cents: 10_000,
    remaining_budget_cents: 10_000,
    cost_per_click_cents: 300,
    scope_city: 'Phoenix',
    scope_category: 'grocery',
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    stripe_checkout_session_id: 'cs_1',
    stripe_payment_intent_id: 'pi_1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const events = new Map<string, Record<string, unknown>>();

  const client = {
    from: vi.fn((table: string) => {
      const filters: Record<string, unknown> = {};
      let action: 'select' | 'insert' | 'update' = 'select';
      let payload: Record<string, unknown> = {};

      const run = () => {
        if (table === 'directory_ad_events') {
          if (action === 'insert') {
            const key = String(payload.dedupe_key);
            if (events.has(key)) {
              return {
                data: null,
                error: { message: 'duplicate key value violates unique constraint "directory_ad_events_dedupe_key_idx"' },
              };
            }
            events.set(key, { ...payload });
            return { data: { campaign_id: payload.campaign_id }, error: null };
          }

          if (action === 'update') {
            const event = events.get(String(filters.dedupe_key));
            if (event) {
              Object.assign(event, payload);
            }
          }

          return { data: null, error: null };
        }

        if (table === 'directory_ad_campaigns') {
          if (filters.id !== campaign.id) {
            return { data: null, error: null };
          }

          if (action === 'update') {
            if (
              'remaining_budget_cents' in filters &&
              filters.remaining_budget_cents !== campaign.remaining_budget_cents
            ) {
              return { data: null, error: null };
            }
            Object.assign(campaign, payload);
          }

          return { data: { ...campaign }, error: null };
        }

        throw new Error(`Unexpected table: ${table}`);
      };

      const builder = {
        select: vi.fn(() => builder),
        insert: vi.fn((value: Record<string, unknown>) => {
          action = 'insert';
          payload = value;
          return builder;
        }),
        update: vi.fn((value: Record<string, unknown>) => {
          action = 'update';
          payload = value;
          return builder;
        }),
        eq: vi.fn((column: string, value: unknown) => {
          filters[column] = value;
          return builder;
        }),
        maybeSingle: vi.fn(async () => run()),
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(run()).then(resolve, reject),
      };
      return builder;
    }),
  };

  return { campaign, client, events };
}

async function loadDirectoryAdEventRecorder() {
  const database = fakeDirectoryAdDatabase();

  vi.doMock('@/lib/supabase', () => ({
    getSupabaseServiceClient: vi.fn(() => database.client),
    isSupabaseServiceConfigured: vi.fn(() => true),
  }));
  vi.doMock('@/lib/stripe', () => ({
    getStripeClient: vi.fn(() => null),
    getStripeWebhookSecret: vi.fn(() => 'whsec_123'),
    isStripeConfigured: vi.fn(() => true),
  }));

  const { recordDirectoryAdEvent } = await import('@/lib/directory-ads');
  return { database, recordDirectoryAdEvent };
}

function sponsoredClick(sessionId: string, visitorAddress: string) {
  return {
    businessId: 'business-1',
    campaignId: 'campaign-1',
    eventType: 'click' as const,
    pagePath: '/en/directory',
    sessionId,
    visitorAddress,
  };
}

describe('directory ad click billing', () => {
  it('bills a visitor once per campaign per day, whatever session id they send', async () => {
    const { database, recordDirectoryAdEvent } = await loadDirectoryAdEventRecorder();

    const first = await recordDirectoryAdEvent(sponsoredClick('session-a', '203.0.113.7'));
    const second = await recordDirectoryAdEvent(sponsoredClick('session-b', '203.0.113.7'));
    const third = await recordDirectoryAdEvent({
      ...sponsoredClick('session-c', '203.0.113.7'),
      pagePath: '/zh/directory',
    });

    expect(first.billed).toBe(true);
    expect(second.billed).toBe(false);
    expect(third.billed).toBe(false);
    expect(database.campaign.remaining_budget_cents).toBe(9_700);
  });

  it('bills clicks from different visitors separately', async () => {
    const { database, recordDirectoryAdEvent } = await loadDirectoryAdEventRecorder();

    await recordDirectoryAdEvent(sponsoredClick('session-a', '203.0.113.7'));
    await recordDirectoryAdEvent(sponsoredClick('session-a', '198.51.100.4'));

    expect(database.campaign.remaining_budget_cents).toBe(9_400);
  });

  it('does not store the visitor address in the dedupe key', async () => {
    const { database, recordDirectoryAdEvent } = await loadDirectoryAdEventRecorder();

    await recordDirectoryAdEvent(sponsoredClick('session-a', '203.0.113.7'));

    expect([...database.events.keys()].some((key) => key.includes('203.0.113.7'))).toBe(false);
  });
});
