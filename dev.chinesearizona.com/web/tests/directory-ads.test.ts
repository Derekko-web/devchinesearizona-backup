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
    const stripeCheckoutList = vi.fn(async () => ({
      data: [
        {
          id: 'cs_paid_123',
          created: Math.floor(new Date('2026-04-19T12:00:00.000Z').getTime() / 1000),
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
