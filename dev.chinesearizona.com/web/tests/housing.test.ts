import { describe, expect, it } from 'vitest';

import {
  getHousingRegionSnapshots,
  getStaticHousingRegionSnapshots,
  housingRegionDefinitions,
  isLiveHousingListingsEnabled,
  parseRedfinSearchResponse,
} from '@/lib/housing';

describe('housing feed parser', () => {
  it('covers the main Greater Phoenix city set instead of only a few handpicked markets', () => {
    expect(housingRegionDefinitions.length).toBeGreaterThanOrEqual(12);
    expect(housingRegionDefinitions.map((definition) => definition.id)).toEqual(
      expect.arrayContaining(['phoenix', 'mesa', 'chandler', 'gilbert', 'glendale', 'peoria', 'scottsdale'])
    );
  });

  it('has map positions for every public housing region', () => {
    expect(housingRegionDefinitions.map((definition) => definition.id)).toEqual(
      expect.arrayContaining([
        'phoenix',
        'tempe',
        'scottsdale',
        'mesa',
        'chandler',
        'gilbert',
        'peoria',
        'glendale',
        'surprise',
        'goodyear',
        'buckeye',
        'queen-creek',
        'apache-junction',
        'paradise-valley',
        'fountain-hills',
      ])
    );

    for (const definition of housingRegionDefinitions) {
      expect(definition.mapPosition.x).toBeGreaterThanOrEqual(0);
      expect(definition.mapPosition.x).toBeLessThanOrEqual(100);
      expect(definition.mapPosition.y).toBeGreaterThanOrEqual(0);
      expect(definition.mapPosition.y).toBeLessThanOrEqual(100);
    }
  });

  it('defaults to static housing snapshots unless live listings are explicitly enabled', async () => {
    const previousFlag = process.env.HOUSING_LIVE_LISTINGS_ENABLED;
    delete process.env.HOUSING_LIVE_LISTINGS_ENABLED;

    try {
      expect(isLiveHousingListingsEnabled()).toBe(false);

      const snapshots = await getHousingRegionSnapshots();

      expect(snapshots).toHaveLength(housingRegionDefinitions.length);
      expect(snapshots.every((snapshot) => snapshot.listingsMode === 'static')).toBe(true);
      expect(snapshots.every((snapshot) => snapshot.listings.length === 0)).toBe(true);
      expect(snapshots.find((snapshot) => snapshot.id === 'chandler')?.mapPosition).toEqual({
        x: 56,
        y: 70,
      });
    } finally {
      if (previousFlag === undefined) {
        delete process.env.HOUSING_LIVE_LISTINGS_ENABLED;
      } else {
        process.env.HOUSING_LIVE_LISTINGS_ENABLED = previousFlag;
      }
    }
  });

  it('builds static housing snapshots for the release fallback', () => {
    const snapshots = getStaticHousingRegionSnapshots();

    expect(snapshots).toHaveLength(housingRegionDefinitions.length);
    expect(snapshots[0]).toMatchObject({
      listingsMode: 'static',
      listings: [],
      fetchedAt: '2026-05-17T00:00:00.000Z',
    });
  });

  it('maps Redfin search payloads into listing cards', () => {
    const region = housingRegionDefinitions.find((definition) => definition.id === 'peoria');
    const response = `{}&&${JSON.stringify({
      payload: {
        homes: [
          {
            propertyId: 12345,
            url: '/AZ/Peoria/123-W-Cactus-Rd-85345/home/12345',
            streetLine: { value: '123 W Cactus Rd' },
            city: 'Peoria',
            state: 'AZ',
            zip: '85345',
            price: { value: 489000 },
            beds: 4,
            baths: 2.5,
            sqFt: { value: 2100 },
            lotSize: { value: 6900 },
            pricePerSqFt: { value: 233 },
            hoa: { value: 110 },
            yearBuilt: { value: 2004 },
            dom: 6,
            mlsStatus: 'Active',
            mlsId: { value: '7000001' },
            latLong: { value: { latitude: 33.5, longitude: -112.2 } },
            isNewConstruction: false,
          },
        ],
      },
    })}`;

    expect(region).toBeDefined();

    const snapshot = parseRedfinSearchResponse(region!, response);

    expect(snapshot.id).toBe('peoria');
    expect(snapshot.metroGroup).toBe('west');
    expect(snapshot.mapPosition).toEqual({ x: 25, y: 25 });
    expect(snapshot.listingsMode).toBe('live');
    expect(snapshot.listings).toHaveLength(1);
    expect(snapshot.samplePriceRange).toEqual({ min: 489000, max: 489000 });
    expect(snapshot.averageDaysOnMarket).toBe(6);
    expect(snapshot.listings[0]).toMatchObject({
      address: '123 W Cactus Rd',
      city: 'Peoria',
      state: 'AZ',
      zip: '85345',
      price: 489000,
      beds: 4,
      baths: 2.5,
      squareFeet: 2100,
      lotSize: 6900,
      pricePerSquareFoot: 233,
      hoaPerMonth: 110,
      yearBuilt: 2004,
      daysOnMarket: 6,
      status: 'Active',
      mlsNumber: '7000001',
      listingUrl: 'https://www.redfin.com/AZ/Peoria/123-W-Cactus-Rd-85345/home/12345',
    });
  });

  it('normalizes nested Redfin scalar objects before listing text is rendered', () => {
    const region = housingRegionDefinitions.find((definition) => definition.id === 'mesa');
    const response = `{}&&${JSON.stringify({
      payload: {
        homes: [
          {
            propertyId: 67890,
            url: '/AZ/Mesa/456-E-Mesa-Dr-85204/home/67890',
            streetLine: { value: { value: '456 E Mesa Dr' } },
            city: { value: 'Mesa' },
            state: { value: 'AZ' },
            zip: { value: '85204' },
            price: { value: 399000 },
            beds: { value: 3 },
            baths: { value: 2 },
            dom: { value: 14 },
            mlsStatus: { value: { value: 'Active' } },
            mlsId: { value: '7000002' },
          },
        ],
      },
    })}`;

    expect(region).toBeDefined();

    const snapshot = parseRedfinSearchResponse(region!, response);

    expect(snapshot.listings[0]).toMatchObject({
      address: '456 E Mesa Dr',
      city: 'Mesa',
      state: 'AZ',
      zip: '85204',
      beds: 3,
      baths: 2,
      daysOnMarket: 14,
      status: 'Active',
      mlsNumber: '7000002',
    });
  });
});
