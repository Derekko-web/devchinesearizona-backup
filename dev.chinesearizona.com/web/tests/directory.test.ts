import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  applyDirectoryQueryFilters,
  compareFeaturedSignals,
  countActiveDirectoryFilters,
  getDirectoryPage,
  getBusinessHoursState,
  hasPlaceholderDomain,
  hasPlaceholderPhone,
  isPublicDirectoryBusiness,
  qualifiesForHomepageFeature,
} from '@/lib/directory';
import { directoryMetadata } from '@/lib/page-metadata';
import type { Business } from '@/lib/types';

function businessFixture(overrides: Partial<Business> = {}): Business {
  return {
    id: 'biz-test',
    slug: 'trusted-test-business',
    name: { en: 'Trusted Test Business' },
    categorySlug: 'real-estate',
    city: 'Phoenix',
    region: 'Greater Phoenix',
    address: '123 W Main St, Phoenix, AZ 85001',
    serviceAreaText: undefined,
    phone: '(602) 999-0000',
    email: 'team@trustedtest.com',
    website: 'https://trustedtest.com',
    heroImage: undefined,
    gallery: [],
    shortDescription: { en: 'Short description' },
    description: { en: 'Longer description for a public listing.' },
    services: [],
    languages: ['English'],
    searchAliases: ['trusted test'],
    verified: false,
    bilingual: false,
    newcomerFriendly: true,
    sponsored: false,
    featured: false,
    ownerProfileSlug: undefined,
    rating: 4.8,
    reviewCount: 12,
    lastUpdated: '2026-04-10T00:00:00.000Z',
    status: 'live',
    verificationState: 'unverified',
    hours: [],
    coordinates: undefined,
    ...overrides,
  };
}

class FakeDirectoryQuery {
  calls: Array<{
    method: string;
    args: unknown[];
  }> = [];

  contains(column: string, value: readonly unknown[]) {
    this.calls.push({ method: 'contains', args: [column, value] });
    return this;
  }

  eq(column: string, value: unknown) {
    this.calls.push({ method: 'eq', args: [column, value] });
    return this;
  }

  gte(column: string, value: unknown) {
    this.calls.push({ method: 'gte', args: [column, value] });
    return this;
  }

  ilike(column: string, value: string) {
    this.calls.push({ method: 'ilike', args: [column, value] });
    return this;
  }

  in(column: string, values: readonly unknown[]) {
    this.calls.push({ method: 'in', args: [column, values] });
    return this;
  }

  limit(count: number) {
    this.calls.push({ method: 'limit', args: [count] });
    return this;
  }

  neq(column: string, value: unknown) {
    this.calls.push({ method: 'neq', args: [column, value] });
    return this;
  }

  order(column: string, options: { ascending: boolean }) {
    this.calls.push({ method: 'order', args: [column, options] });
    return this;
  }

  textSearch(
    column: string,
    query: string,
    options: {
      config: 'simple';
      type: 'websearch';
    }
  ) {
    this.calls.push({ method: 'textSearch', args: [column, query, options] });
    return this;
  }
}

const originalNodeEnv = process.env.NODE_ENV;
const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalSupabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function setEnv(name: string, value?: string) {
  const env = process.env as Record<string, string | undefined>;

  if (value === undefined) {
    delete env[name];
    return;
  }

  env[name] = value;
}

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();

  if (originalNodeEnv === undefined) {
    setEnv('NODE_ENV');
  } else {
    setEnv('NODE_ENV', originalNodeEnv);
  }

  if (originalSupabaseUrl === undefined) {
    setEnv('NEXT_PUBLIC_SUPABASE_URL');
  } else {
    setEnv('NEXT_PUBLIC_SUPABASE_URL', originalSupabaseUrl);
  }

  if (originalSupabasePublishableKey === undefined) {
    setEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  } else {
    setEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', originalSupabasePublishableKey);
  }

  if (originalSupabaseAnonKey === undefined) {
    setEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  } else {
    setEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', originalSupabaseAnonKey);
  }
});

describe('directory trust gates', () => {
  it('rejects placeholder domains and 555 phone numbers', () => {
    expect(hasPlaceholderDomain('https://example.com/business')).toBe(true);
    expect(hasPlaceholderDomain('https://realbusiness.com')).toBe(false);
    expect(hasPlaceholderPhone('(602) 555-0198')).toBe(true);
    expect(hasPlaceholderPhone('(602) 999-0000')).toBe(false);
  });

  it('blocks public listings that fail the placeholder/source checks', () => {
    expect(
      isPublicDirectoryBusiness(
        businessFixture({
          website: 'https://example.com/fake-listing',
        })
      )
    ).toBe(false);

    expect(
      isPublicDirectoryBusiness(
        businessFixture({
          phone: undefined,
          website: undefined,
          email: undefined,
        })
      )
    ).toBe(false);

    expect(
      isPublicDirectoryBusiness(
        businessFixture({
          address: undefined,
          serviceAreaText: undefined,
          phone: undefined,
          website: undefined,
          email: 'owner@trustedtest.com',
          verificationState: 'claimed',
          verified: true,
        })
      )
    ).toBe(true);
  });

  it('requires claimed or editor verified listings for homepage features', () => {
    expect(qualifiesForHomepageFeature(businessFixture())).toBe(false);
    expect(
      qualifiesForHomepageFeature(
        businessFixture({
          verificationState: 'claimed',
          verified: true,
        })
      )
    ).toBe(true);
    expect(
      qualifiesForHomepageFeature(
        businessFixture({
          address: undefined,
          serviceAreaText: undefined,
          phone: undefined,
          website: undefined,
          email: 'owner@trustedtest.com',
          verificationState: 'claimed',
          verified: true,
        })
      )
    ).toBe(false);
  });

  it('counts active filters including rating, status, and non-default sort values', () => {
    expect(
      countActiveDirectoryFilters({
        q: '  dentist  ',
        city: 'Mesa',
        minRating: 4.5,
        businessStatus: 'open_now',
        sort: 'rating',
        newcomerFriendlyOnly: true,
      })
    ).toBe(6);

    expect(
      countActiveDirectoryFilters({
        sort: 'featured',
      })
    ).toBe(0);
  });

  it('derives open and closed states from structured business hours in Arizona time', () => {
    expect(
      getBusinessHoursState(
        businessFixture({
          hours: [{ label: 'Mon-Fri', value: '9:00 AM - 6:00 PM' }],
        }),
        new Date('2026-04-15T17:00:00.000Z')
      )
    ).toBe('open');

    expect(
      getBusinessHoursState(
        businessFixture({
          hours: [{ label: 'Mon-Fri', value: '9:00 AM - 5:00 PM' }],
        }),
        new Date('2026-04-15T02:00:00.000Z')
      )
    ).toBe('closed');

    expect(
      getBusinessHoursState(
        businessFixture({
          hours: [{ label: 'Sat', value: 'By appointment' }],
        }),
        new Date('2026-04-15T17:00:00.000Z')
      )
    ).toBe('unknown');
  });

  it('pushes directory filters into the Supabase query before limiting results', () => {
    const query = new FakeDirectoryQuery();

    applyDirectoryQueryFilters(
      query,
      {
        q: 'family doctor',
        city: 'Phoenix',
        category: 'medical',
        language: 'Mandarin',
        minRating: 4.5,
        verifiedOnly: true,
        newcomerFriendlyOnly: true,
      },
      {
        excludeSlug: 'trusted-test-business',
      }
    );

    expect(query.calls).toEqual([
      { method: 'neq', args: ['slug', 'trusted-test-business'] },
      { method: 'in', args: ['status', ['live', 'stale']] },
      { method: 'ilike', args: ['city', 'Phoenix'] },
      { method: 'eq', args: ['category.slug', 'medical'] },
      { method: 'neq', args: ['verification_state', 'unverified'] },
      { method: 'contains', args: ['languages', ['Mandarin']] },
      { method: 'gte', args: ['rating', 4.5] },
      { method: 'eq', args: ['newcomer_friendly', true] },
      {
        method: 'textSearch',
        args: ['search_document', 'family doctor', { config: 'simple', type: 'websearch' }],
      },
    ]);
  });

  it('prioritizes active paid campaigns ahead of legacy sponsored listings when paid promotion is enabled', () => {
    const legacySponsored = businessFixture({
      sponsored: true,
      legacySponsored: true,
      rating: 5,
      reviewCount: 40,
    });
    const paidCampaign = businessFixture({
      id: 'biz-paid',
      slug: 'paid-campaign-business',
      activeDirectoryAdCampaign: {
        id: 'campaign-1',
        businessId: 'biz-paid',
        ownerProfileId: 'profile-1',
        status: 'active',
        budgetCents: 25_000,
        remainingBudgetCents: 14_000,
        costPerClickCents: 300,
        scopeCity: 'Phoenix',
        scopeCategory: 'real-estate',
        startsAt: '2026-04-15T00:00:00.000Z',
        endsAt: '2026-05-15T00:00:00.000Z',
        createdAt: '2026-04-15T00:00:00.000Z',
        updatedAt: '2026-04-15T00:00:00.000Z',
      },
      sponsored: true,
      legacySponsored: false,
      rating: 4.2,
      reviewCount: 8,
    });

    expect(compareFeaturedSignals(paidCampaign, legacySponsored, true)).toBeLessThan(0);
    expect(compareFeaturedSignals(legacySponsored, paidCampaign, true)).toBeGreaterThan(0);
  });

  it('keeps manually promoted most-popular listings ahead of paid and sponsored placements', () => {
    const mostPopular = businessFixture({
      id: 'biz-bido',
      slug: 'bido-cafe',
      name: { en: 'Bido Cafe' },
      verificationState: 'claimed',
    });
    const paidCampaign = businessFixture({
      id: 'biz-paid',
      slug: 'paid-campaign-business',
      activeDirectoryAdCampaign: {
        id: 'campaign-1',
        businessId: 'biz-paid',
        ownerProfileId: 'profile-1',
        status: 'active',
        budgetCents: 25_000,
        remainingBudgetCents: 14_000,
        costPerClickCents: 300,
        scopeCity: 'Phoenix',
        scopeCategory: 'real-estate',
        startsAt: '2026-04-15T00:00:00.000Z',
        endsAt: '2026-05-15T00:00:00.000Z',
        createdAt: '2026-04-15T00:00:00.000Z',
        updatedAt: '2026-04-15T00:00:00.000Z',
      },
      sponsored: true,
      legacySponsored: false,
    });

    expect(compareFeaturedSignals(mostPopular, paidCampaign, true)).toBeLessThan(0);
    expect(compareFeaturedSignals(paidCampaign, mostPopular, true)).toBeGreaterThan(0);
  });

  it('paginates the public directory listing set', async () => {
    const page = await getDirectoryPage({}, 2, 5);

    expect(page.currentPage).toBe(2);
    expect(page.pageSize).toBe(5);
    expect(page.totalCount).toBeGreaterThan(5);
    expect(page.businesses.length).toBe(Math.min(5, page.totalCount - 5));
  });

  it('falls back to fixture businesses when the Supabase query errors', async () => {
    setEnv('NODE_ENV', 'development');
    setEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    setEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-publishable-key');

    const failingQuery = {
      contains() {
        return this;
      },
      eq() {
        return this;
      },
      gte() {
        return this;
      },
      ilike() {
        return this;
      },
      in() {
        return this;
      },
      limit() {
        return this;
      },
      neq() {
        return this;
      },
      order() {
        return this;
      },
      textSearch() {
        return this;
      },
      data: null,
      error: {
        message: 'relation "public.businesses" does not exist',
      },
    };

    vi.doMock('@/lib/supabase', () => ({
      getSupabaseClient: () => ({
        from: () => ({
          select: () => failingQuery,
        }),
      }),
      getSupabaseServiceClient: () => null,
      isSupabaseConfigured: () => true,
    }));

    const { getDirectoryBusinesses: getReloadedDirectoryBusinesses } = await import('@/lib/directory');
    const businesses = await getReloadedDirectoryBusinesses();

    expect(businesses.length).toBeGreaterThan(200);
  });

  it('keeps plain paginated directory pages self-canonical', () => {
    const metadata = directoryMetadata('en', '/business', { page: '2' });

    expect(metadata.title).toBe('Chinese Businesses Page 2 | ChineseArizona');
    expect(metadata.alternates?.canonical).toBe('https://chinesearizona.com/business?page=2');
    expect(metadata.alternates?.languages?.en).toBe('https://chinesearizona.com/business?page=2');
  });

  it('canonicalizes filtered directory queries back to the base directory page', () => {
    const metadata = directoryMetadata('en', '/business', {
      q: 'doctor',
      page: '3',
      sort: 'rating',
    });

    expect(metadata.title).toBe('Chinese Businesses | ChineseArizona');
    expect(metadata.alternates?.canonical).toBe('https://chinesearizona.com/business');
  });
});
