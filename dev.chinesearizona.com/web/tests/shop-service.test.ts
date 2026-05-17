import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const env = process.env as Record<string, string | undefined>;
const originalNodeEnv = env.NODE_ENV;
const originalShopFlag = env.NEXT_PUBLIC_SHOP_PUBLIC_ENABLED;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  if (originalNodeEnv === undefined) {
    delete env.NODE_ENV;
  } else {
    env.NODE_ENV = originalNodeEnv;
  }

  if (originalShopFlag === undefined) {
    delete env.NEXT_PUBLIC_SHOP_PUBLIC_ENABLED;
  } else {
    env.NEXT_PUBLIC_SHOP_PUBLIC_ENABLED = originalShopFlag;
  }
});

function createEmptyQueryResult() {
  return {
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn(async () => ({ data: [], error: null })),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
  };
}

describe('shop service fallbacks', () => {
  it('keeps seller storefront listings visible when the DB query returns an empty seller slice', async () => {
    vi.doMock('@/lib/supabase', () => ({
      getSupabaseClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
          if (table === 'shop_sellers') {
            return {
              select: vi.fn(() => createEmptyQueryResult()),
            };
          }

          if (table === 'shop_listings') {
            return {
              select: vi.fn(() => createEmptyQueryResult()),
            };
          }

          throw new Error(`Unexpected table: ${table}`);
        }),
      })),
      getSupabaseServiceClient: vi.fn(() => null),
    }));

    const { getShopSellerPageData } = await import('@/lib/shop-service');

    const data = await getShopSellerPageData('east-valley-tech');

    expect(data?.seller.slug).toBe('east-valley-tech');
    expect(data?.listings.map((listing) => listing.slug)).toEqual([
      'macbook-air-m2-13-east-valley',
      'steam-deck-oled-1tb',
    ]);
  });

  it('does not expose seed browse listings in production when live browse data is empty', async () => {
    env.NODE_ENV = 'production';
    delete env.NEXT_PUBLIC_SHOP_PUBLIC_ENABLED;

    vi.doMock('@/lib/supabase', () => ({
      getSupabaseClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
          if (
            table === 'shop_categories' ||
            table === 'shop_sellers' ||
            table === 'shop_listings'
          ) {
            return {
              select: vi.fn(() => createEmptyQueryResult()),
            };
          }

          throw new Error(`Unexpected table: ${table}`);
        }),
      })),
      getSupabaseServiceClient: vi.fn(() => null),
    }));

    const { getShopBrowsePageData } = await import('@/lib/shop-service');

    const data = await getShopBrowsePageData('en');

    expect(data.categories).toEqual([]);
    expect(data.sellers).toEqual([]);
    expect(data.listings).toEqual([]);
    expect(data.totalCount).toBe(0);
  });
});
