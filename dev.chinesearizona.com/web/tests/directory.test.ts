import { afterEach, describe, expect, it, vi } from 'vitest';

import sfBayDirectoryBusinesses from '@/data/generated-sf-bay-directory-businesses.json';
import losAngelesDirectoryBusinesses from '@/data/los-angeles-directory-businesses.json';
import austinDirectoryBusinesses from '@/data/sites/austin/businesses.json';
import {
  applyDirectoryQueryFilters,
  compareFeaturedSignals,
  countActiveDirectoryFilters,
  getDirectoryBusinessBySlug,
  getDirectoryBusinesses,
  getDirectoryFilterOptions,
  getDirectoryPage,
  getBusinessHoursState,
  hasPlaceholderDomain,
  hasPlaceholderPhone,
  isPublicDirectoryBusiness,
  qualifiesForHomepageFeature,
} from '@/lib/directory';
import { directoryMetadata } from '@/lib/page-metadata';
import { resolveSiteProfileFromHost, siteProfiles } from '@/lib/site-config';
import type { Business } from '@/lib/types';

const AUSTIN_DIRECTORY_CITIES = [
  'Austin',
  'Bastrop',
  'Bee Cave',
  'Buda',
  'Cedar Park',
  'Dripping Springs',
  'Elgin',
  'Georgetown',
  'Hutto',
  'Kyle',
  'Lago Vista',
  'Lakeway',
  'Leander',
  'Liberty Hill',
  'Manor',
  'Pflugerville',
  'Round Rock',
  'San Marcos',
  'Sunset Valley',
  'Taylor',
  'Wimberley',
];

const LOS_ANGELES_DIRECTORY_CITIES = [
  'Alhambra',
  'Arcadia',
  'Hacienda Heights',
  'Los Angeles',
  'Monterey Park',
  'Pasadena',
  'Rosemead',
  'Rowland Heights',
  'San Gabriel',
  'Temple City',
];

const SF_BAY_DIRECTORY_CITIES = [
  'Berkeley',
  'Cupertino',
  'Daly City',
  'Fremont',
  'Milpitas',
  'Oakland',
  'San Francisco',
  'San Jose',
  'Santa Clara',
  'Sunnyvale',
];

const NON_ARIZONA_FORBIDDEN_PATTERN =
  /ChineseArizona|\bPhoenix\b|\bChandler\b|\bTempe\b|\bGilbert\b|\bScottsdale\b|Mesa,\s*AZ|AZ 85/;

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

  it('serves Austin-only static directory businesses for chineseaustin.com', async () => {
    const businesses = await getDirectoryBusinesses({}, { site: siteProfiles.austin, limit: 1000 });
    const text = JSON.stringify(businesses);

    expect(businesses.length).toBeGreaterThanOrEqual(200);
    expect(businesses.map((business) => business.slug)).toEqual(
      expect.arrayContaining([
        'house-of-three-gorges-austin',
        'h-mart-austin',
        'austin-chinese-school',
        'cheng-wooster-real-estate-austin',
        'soupleaf-hot-pot-austin',
        'austin-table-tennis-club-austin',
        'austin-chinese-church-austin',
      ])
    );
    expect(new Set(businesses.map((business) => business.city))).toEqual(
      new Set(AUSTIN_DIRECTORY_CITIES)
    );
    expect(text).toContain('Austin, TX');
    expect(text).not.toContain('Phoenix');
    expect(text).not.toContain('Chandler');
    expect(text).not.toContain('Tempe');
    expect(text).not.toContain('ChineseArizona');
    expect(text).not.toContain('generated-directory-businesses.json');
  });

  it('does not fall back to Arizona fixtures for Austin or non-live city lookups', async () => {
    const nonLiveSite = resolveSiteProfileFromHost('missing-city.example');

    await expect(getDirectoryBusinessBySlug('bido-cafe', { site: siteProfiles.austin })).resolves.toBeUndefined();
    await expect(
      getDirectoryBusinessBySlug('house-of-three-gorges-austin', { site: siteProfiles.austin })
    ).resolves.toMatchObject({
      city: 'Austin',
      region: 'North Austin',
      address: expect.stringContaining('Austin, TX'),
    });

    await expect(getDirectoryBusinesses({}, { site: nonLiveSite, limit: 50 })).resolves.toEqual([]);
    await expect(getDirectoryPage({}, 1, 10, { site: nonLiveSite })).resolves.toMatchObject({
      businesses: [],
      totalCount: 0,
      totalPages: 1,
    });
  });

  it('exposes Austin-specific directory filters', async () => {
    const options = await getDirectoryFilterOptions(siteProfiles.austin);

    expect(options.cities).toEqual(AUSTIN_DIRECTORY_CITIES);
    expect(options.categories.map((category) => category.slug)).toEqual([
      'real-estate',
      'medical',
      'legal-finance',
      'dining',
      'shopping',
      'local-services',
      'education',
      'faith-community',
    ]);
    expect(options.languages).toEqual(['English', 'Mandarin', 'Taiwanese', 'Traditional Chinese']);
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

  it('serves Los Angeles directory listings from LA data without Arizona fixture fallback', async () => {
    const site = siteProfiles['los-angeles'];
    const businesses = await getDirectoryBusinesses({}, { site, limit: 1000 });
    const serialized = JSON.stringify(businesses);

    expect(businesses.length).toBeGreaterThanOrEqual(200);
    expect(businesses.map((business) => business.slug)).toEqual(
      expect.arrayContaining([
        'lunasia-dim-sum-house-alhambra',
        'irn-realty-arcadia',
        'chinatown-service-center-los-angeles',
        'bistro-na-s-temple-city',
        'chicha-san-chen-san-gabriel-san-gabriel',
        'buddhist-tzu-chi-medical-foundation-alhambra-health-center-alhambra',
      ])
    );
    expect(new Set(businesses.map((business) => business.city))).toEqual(
      new Set(LOS_ANGELES_DIRECTORY_CITIES)
    );
    expect(serialized).not.toMatch(
      /Phoenix|Chandler|Tempe|Mesa|Gilbert|Scottsdale|Arizona|ChineseArizona|亞利桑那|菲尼克斯|鳳凰城/
    );
  });

  it('keeps Los Angeles seed listings source-backed and California-local', () => {
    expect(losAngelesDirectoryBusinesses.length).toBeGreaterThanOrEqual(200);

    for (const business of losAngelesDirectoryBusinesses) {
      const locationText = [business.address, business.serviceAreaText, business.city].filter(Boolean).join(' ');
      expect(locationText).toMatch(/CA|Los Angeles|Alhambra|Arcadia|Monterey Park|San Gabriel|Pasadena|Temple City|Hacienda Heights|Rosemead|Rowland Heights/);
      expect(business.sourceUrls.length).toBeGreaterThan(0);
      expect(business.sourceUrls.every((url) => url.startsWith('http'))).toBe(true);
      expect(JSON.stringify(business)).not.toMatch(
        /Phoenix|Chandler|Tempe|Mesa|Scottsdale|AZ 85|Arizona|亞利桑那|菲尼克斯|鳳凰城/
      );
    }
  });

  it('does not resolve Arizona business slugs or filter misses for Los Angeles', async () => {
    const site = siteProfiles['los-angeles'];

    await expect(getDirectoryBusinessBySlug('bido-cafe', { site })).resolves.toBeUndefined();
    await expect(getDirectoryBusinessBySlug('lunasia-dim-sum-house-alhambra', { site })).resolves.toMatchObject({
      city: 'Alhambra',
      region: 'San Gabriel Valley',
    });

    const phoenixPage = await getDirectoryPage({ city: 'Phoenix' }, 1, 24, { site });
    expect(phoenixPage.totalCount).toBe(0);
    expect(phoenixPage.businesses).toEqual([]);
  });

  it('uses Los Angeles-specific categories, cities, and metadata', async () => {
    const site = siteProfiles['los-angeles'];
    const filterOptions = await getDirectoryFilterOptions(site);
    const metadata = directoryMetadata('en', '/business', undefined, site);

    expect(filterOptions.cities).toEqual([
      ...LOS_ANGELES_DIRECTORY_CITIES,
    ]);
    expect(filterOptions.categories.map((category) => category.slug)).toEqual(
      expect.arrayContaining(['dining', 'shopping', 'real-estate', 'legal-finance', 'medical'])
    );
    expect(metadata.title).toBe('Chinese Businesses | ChineseLosAngeles');
    expect(metadata.description).toContain('Chinese businesses in Los Angeles');
    expect(metadata.description).not.toContain('Arizona');
    expect(metadata.robots).toBeUndefined();
  });

  it('serves SF Bay directory listings from SF Bay data without Arizona fixture fallback', async () => {
    const site = siteProfiles['sf-bay'];
    const businesses = await getDirectoryBusinesses({}, { site, limit: 1000 });
    const serialized = JSON.stringify(businesses);

    expect(businesses.length).toBeGreaterThanOrEqual(200);
    expect(businesses.map((business) => business.slug)).toEqual(
      expect.arrayContaining([
        'r-g-lounge-san-francisco',
        'asian-health-services-oakland',
        'asian-law-alliance-san-jose',
        'chinese-hospital-san-francisco',
        'mister-jiu-s-san-francisco',
        'chinese-historical-society-of-america-san-francisco',
      ])
    );
    expect(new Set(businesses.map((business) => business.city))).toEqual(
      new Set(SF_BAY_DIRECTORY_CITIES)
    );
    expect(serialized).not.toMatch(
      /Phoenix|Chandler|Tempe|Mesa|Gilbert|Scottsdale|Arizona|ChineseArizona|亞利桑那|菲尼克斯|鳳凰城/
    );
  });

  it('keeps SF Bay seed listings source-backed and California-local', () => {
    expect(sfBayDirectoryBusinesses.length).toBeGreaterThanOrEqual(200);

    for (const business of sfBayDirectoryBusinesses) {
      expect(business.address ?? business.serviceAreaText).toMatch(
        /CA|Bay Area|San Francisco|San Jose|Oakland|Cupertino|Sunnyvale|Santa Clara|Berkeley|Daly City|Fremont|Milpitas/
      );
      expect(business.sourceUrls.length).toBeGreaterThan(0);
      expect(business.sourceUrls.every((url) => url.startsWith('http'))).toBe(true);
      expect(JSON.stringify(business)).not.toMatch(
        /Phoenix|Chandler|Tempe|Mesa|Scottsdale|AZ 85|Arizona|亞利桑那|菲尼克斯|鳳凰城/
      );
    }
  });

  it('keeps expanded non-Arizona city fixtures deduped and source-backed', () => {
    const cityFixtures = [
      { label: 'Austin', businesses: austinDirectoryBusinesses, minimumCount: 200 },
      { label: 'Los Angeles', businesses: losAngelesDirectoryBusinesses, minimumCount: 200 },
      { label: 'SF Bay', businesses: sfBayDirectoryBusinesses, minimumCount: 200 },
    ];

    for (const fixture of cityFixtures) {
      const slugs = fixture.businesses.map((business) => business.slug);
      expect(fixture.businesses.length, fixture.label).toBeGreaterThanOrEqual(fixture.minimumCount);
      expect(new Set(slugs).size, fixture.label).toBe(slugs.length);

      for (const business of fixture.businesses) {
        expect(business.sourceUrls.length, `${fixture.label}:${business.slug}`).toBeGreaterThan(0);
        expect(JSON.stringify(business), `${fixture.label}:${business.slug}`).not.toMatch(NON_ARIZONA_FORBIDDEN_PATTERN);
      }
    }
  });

  it('hydrates launched non-Arizona city directories with generated images without changing Arizona fixtures', async () => {
    const citySites = [siteProfiles.austin, siteProfiles['los-angeles'], siteProfiles['sf-bay']];

    for (const site of citySites) {
      const businesses = await getDirectoryBusinesses({}, { site, limit: 1000 });

      expect(businesses.length, site.key).toBeGreaterThan(0);
      for (const business of businesses) {
        expect(business.heroImage, `${site.key}:${business.slug}`).toMatch(/^\/city-site-images\/.+\.webp$/);
        expect(business.gallery.length, `${site.key}:${business.slug}`).toBeGreaterThanOrEqual(4);
        expect(business.gallery.every((image) => image.startsWith('/city-site-images/')), `${site.key}:${business.slug}`).toBe(true);
      }
    }

    await expect(getDirectoryBusinessBySlug('house-of-three-gorges-austin', { site: siteProfiles.austin })).resolves.toMatchObject({
      heroImage: '/city-site-images/house-of-three-gorges-austin.webp',
    });
    await expect(getDirectoryBusinessBySlug('lunasia-dim-sum-house-alhambra', { site: siteProfiles['los-angeles'] })).resolves.toMatchObject({
      heroImage: '/city-site-images/lunasia-dim-sum-house-alhambra.webp',
    });

    const arizonaBusinesses = await getDirectoryBusinesses({}, { site: siteProfiles.arizona, limit: 1000 });
    expect(arizonaBusinesses.some((business) => business.heroImage?.startsWith('/city-site-images/'))).toBe(false);
  });

  it('keeps SF Bay filters and details from falling back to Arizona listings', async () => {
    const site = siteProfiles['sf-bay'];

    const page = await getDirectoryPage({ city: 'San Francisco' }, 1, 20, { site });
    expect(page.totalCount).toBeGreaterThan(0);
    expect(page.businesses.every((business) => business.city === 'San Francisco')).toBe(true);

    await expect(getDirectoryBusinessBySlug('bido-cafe', { site })).resolves.toBeUndefined();
    await expect(getDirectoryBusinessBySlug('r-g-lounge-san-francisco', { site })).resolves.toMatchObject({
      city: 'San Francisco',
      region: 'San Francisco Chinatown',
    });
  });

  it('uses SF Bay-specific categories, cities, and metadata', async () => {
    const site = siteProfiles['sf-bay'];
    const filterOptions = await getDirectoryFilterOptions(site);
    const metadata = directoryMetadata('en', '/business', undefined, site);

    expect(filterOptions.cities).toEqual([
      ...SF_BAY_DIRECTORY_CITIES,
    ]);
    expect(filterOptions.categories.map((category) => category.slug)).toEqual(
      expect.arrayContaining(['dining', 'shopping', 'education', 'legal-finance', 'medical'])
    );
    expect(metadata.title).toBe('Chinese Businesses | ChineseSFBay');
    expect(metadata.description).toContain('Chinese businesses in SF Bay');
    expect(metadata.description).not.toContain('Arizona');
    expect(metadata.robots).toBeUndefined();
  });

  it('returns an empty directory for non-live city configs instead of Arizona fixtures', async () => {
    const site = resolveSiteProfileFromHost('missing-city.example');
    const [businesses, filters] = await Promise.all([
      getDirectoryBusinesses({}, { site, limit: 1000 }),
      getDirectoryFilterOptions(site),
    ]);

    expect(businesses).toEqual([]);
    expect(filters.cities).toEqual([]);
    expect(filters.categories).toEqual([]);
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
