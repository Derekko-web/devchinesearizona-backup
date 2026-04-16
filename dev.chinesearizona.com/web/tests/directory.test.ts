import { describe, expect, it } from 'vitest';

import {
  applyDirectoryQueryFilters,
  countActiveDirectoryFilters,
  getBusinessHoursState,
  hasPlaceholderDomain,
  hasPlaceholderPhone,
  isPublicDirectoryBusiness,
  qualifiesForHomepageFeature,
} from '@/lib/directory';
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
        })
      )
    ).toBe(false);
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
      { method: 'eq', args: ['city', 'Phoenix'] },
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
});
