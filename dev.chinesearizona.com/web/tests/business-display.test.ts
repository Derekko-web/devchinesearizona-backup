import { describe, expect, it } from 'vitest';

import {
  getBusinessDirectionsUrl,
  getBusinessHoursPreview,
  getBusinessMenuUrl,
  getBusinessServiceHighlights,
} from '@/lib/business-display';
import type { Business } from '@/lib/types';

function businessFixture(overrides: Partial<Business> = {}): Business {
  return {
    id: 'biz-test',
    slug: 'golden-wok-chandler',
    name: { en: 'Golden Wok' },
    categorySlug: 'dining',
    city: 'Chandler',
    region: 'Greater Phoenix',
    address: '123 W Main St, Chandler, AZ 85225',
    serviceAreaText: undefined,
    phone: '(480) 999-0000',
    email: 'hello@goldenwok.com',
    website: 'https://www.goldenwok.com/menu',
    menuUrl: undefined,
    heroImage: undefined,
    gallery: [],
    shortDescription: { en: 'Order Chinese online for takeout and delivery.' },
    description: { en: 'Browse our menu and order online for pickup or delivery in Chandler.' },
    services: [],
    languages: ['English'],
    searchAliases: ['golden wok menu', 'chandler chinese takeout'],
    verified: true,
    bilingual: false,
    newcomerFriendly: false,
    sponsored: false,
    featured: false,
    ownerProfileSlug: undefined,
    rating: 4.6,
    reviewCount: 148,
    priceRange: '$$',
    lastUpdated: '2026-04-15T00:00:00.000Z',
    status: 'live',
    verificationState: 'editor_verified',
    hours: [
      { label: 'Monday, Tuesday', value: '10:30:00 - 21:00:00' },
      { label: 'Friday, Saturday', value: '10:30:00 - 21:30:00' },
      { label: 'Sunday', value: '11:30:00 - 21:00:00' },
    ],
    coordinates: {
      lat: 33.3029,
      lng: -111.8413,
    },
    ...overrides,
  };
}

describe('business display helpers', () => {
  it('builds compact hours previews with a remaining count', () => {
    expect(getBusinessHoursPreview(businessFixture().hours, 'en')).toEqual({
      items: ['Monday, Tuesday: 10:30 AM - 9:00 PM', 'Friday, Saturday: 10:30 AM - 9:30 PM'],
      remainingCount: 1,
    });
  });

  it('prefers explicit or detectable menu links for dining businesses', () => {
    expect(getBusinessMenuUrl(businessFixture())).toBe('https://www.goldenwok.com/menu');
    expect(
      getBusinessMenuUrl(
        businessFixture({
          categorySlug: 'medical',
          website: 'https://exampleclinic.com',
          shortDescription: { en: 'Primary care clinic' },
          description: { en: 'Appointments available' },
          searchAliases: [],
        })
      )
    ).toBeUndefined();
  });

  it('generates directions links from precise listing coordinates', () => {
    expect(getBusinessDirectionsUrl(businessFixture())).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=33.3029%2C-111.8413'
    );
  });

  it('uses the provided state label for service-area directions links', () => {
    const url = getBusinessDirectionsUrl(
      businessFixture({
        name: { en: 'Chinese Society of Austin' },
        city: 'Austin',
        address: undefined,
        serviceAreaText: 'Greater Austin and surrounding Central Texas communities',
        coordinates: undefined,
      }),
      'TX'
    );

    expect(decodeURIComponent(url ?? '')).toContain(
      'Chinese Society of Austin Austin TX Greater Austin and surrounding Central Texas communities'
    );
    expect(decodeURIComponent(url ?? '')).not.toContain('Arizona');
  });

  it('derives useful service highlights from structured and descriptive content', () => {
    expect(
      getBusinessServiceHighlights(
        businessFixture({
          services: [
            { en: 'golden wok chandler' },
            { en: 'chandler chinese delivery' },
            { en: 'Family dinner catering' },
          ],
        }),
        'en'
      )
    ).toEqual(['Delivery', 'Family Dinner Catering', 'Online ordering']);
  });
});
