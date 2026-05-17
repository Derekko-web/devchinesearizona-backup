import { describe, expect, it } from 'vitest';

import { applyBusinessDirectoryOverride } from '@/lib/business-directory-overrides';
import type { Business } from '@/lib/types';

function businessFixture(slug: string, overrides: Partial<Business> = {}): Business {
  return {
    id: slug,
    slug,
    name: { en: 'Fixture Business' },
    categorySlug: 'dining',
    city: 'Phoenix',
    region: 'Greater Phoenix',
    address: '123 Example St, Phoenix, AZ 85001',
    serviceAreaText: undefined,
    phone: '(602) 555-0100',
    email: undefined,
    website: 'https://example.com',
    heroImage: undefined,
    gallery: [],
    shortDescription: { en: 'Chinese dining listing sourced from the AZ AANHPI Directory.' },
    description: { en: 'Listed in the Chinese section of the AZ AANHPI Directory for Phoenix, Arizona.' },
    services: [],
    languages: ['English'],
    searchAliases: [],
    verified: true,
    bilingual: false,
    newcomerFriendly: false,
    sponsored: false,
    featured: false,
    ownerProfileSlug: undefined,
    rating: 4.2,
    reviewCount: 100,
    lastUpdated: '2026-04-21T00:00:00.000Z',
    status: 'live',
    verificationState: 'editor_verified',
    hours: [],
    coordinates: undefined,
    ...overrides,
  };
}

describe('business directory overrides', () => {
  it('replaces placeholder directory copy and unsafe website links with source-backed overrides', () => {
    const updated = applyBusinessDirectoryOverride(
      businessFixture('great-wall-cuisine-phoenix', {
        website: 'https://greatwallcuisineaz.com/',
      })
    );

    expect(updated.shortDescription.en).toContain('dim sum');
    expect(updated.description.en).toContain('Camelback Road');
    expect(updated.website).toBe('https://greatwallaz.kwickmenu.com/');
  });

  it('marks listings as stale when public sources show they are closed', () => {
    const updated = applyBusinessDirectoryOverride(
      businessFixture('china-village-phoenix', {
        website: 'https://chinavillagerestaurantaz.business.site/',
      })
    );

    expect(updated.status).toBe('stale');
    expect(updated.website).toBeUndefined();
    expect(updated.description.en).toContain('closed');
  });
});
