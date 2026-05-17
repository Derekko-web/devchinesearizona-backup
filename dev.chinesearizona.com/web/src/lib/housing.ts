import 'server-only';

import type { HousingListing, HousingRegionDefinition, HousingRegionSnapshot } from '@/lib/housing-types';

const REDFIN_BASE_URL = 'https://www.redfin.com';
const REDFIN_STINGRAY_URL = `${REDFIN_BASE_URL}/stingray/api/gis`;
const REDFIN_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REGION_CACHE_TTL_MS = 30 * 60_000;
const DEFAULT_LISTING_LIMIT = 3;
const DEFAULT_FETCH_COUNT = 6;
const STATIC_SNAPSHOT_TIMESTAMP = '2026-05-17T00:00:00.000Z';

type RedfinRegionQuery = {
  market: string;
  regionId: number;
  regionType: number;
  refererPath: string;
};

type RedfinScalar<T> = T | { value?: RedfinScalar<T>; level?: number };

type RedfinLatLong =
  | {
      latitude?: number;
      longitude?: number;
    }
  | {
      value?: {
        latitude?: number;
        longitude?: number;
      };
      level?: number;
    };

type RedfinHome = {
  propertyId?: number;
  listingId?: number;
  url?: string;
  streetLine?: RedfinScalar<string>;
  unitNumber?: RedfinScalar<string>;
  city?: RedfinScalar<string>;
  state?: RedfinScalar<string>;
  zip?: RedfinScalar<string>;
  postalCode?: RedfinScalar<string>;
  price?: RedfinScalar<number>;
  beds?: RedfinScalar<number>;
  baths?: RedfinScalar<number>;
  sqFt?: RedfinScalar<number>;
  lotSize?: RedfinScalar<number>;
  pricePerSqFt?: RedfinScalar<number>;
  hoa?: RedfinScalar<number>;
  yearBuilt?: RedfinScalar<number>;
  dom?: RedfinScalar<number>;
  mlsStatus?: RedfinScalar<string>;
  mlsId?: RedfinScalar<string>;
  latLong?: RedfinLatLong;
  isNewConstruction?: boolean;
};

type RedfinResponse = {
  payload?: {
    homes?: RedfinHome[];
  };
};

export const housingRegionDefinitions: HousingRegionDefinition[] = [
  {
    id: 'phoenix',
    title: {
      en: 'Phoenix',
      zh: 'Phoenix',
    },
    description: {
      en: 'Central Phoenix is the broadest starting point if you want the biggest mix of commute patterns, neighborhoods, and price bands.',
      zh: '如果你想先看最完整的社區、通勤與價格帶組合，Phoenix 是最寬的起點。',
    },
    browseUrl: `${REDFIN_BASE_URL}/city/14240/AZ/Phoenix`,
    sourceLabel: 'Redfin / ARMLS',
    metroGroup: 'central',
    mapPosition: { x: 35, y: 47 },
    queries: [
      {
        market: 'phoenix',
        regionId: 14240,
        regionType: 6,
        refererPath: '/city/14240/AZ/Phoenix',
      },
    ],
  },
  {
    id: 'tempe',
    title: {
      en: 'Tempe',
      zh: 'Tempe',
    },
    description: {
      en: 'Tempe is useful when ASU access, airport reach, and central positioning matter more than newer master-planned inventory.',
      zh: '若你更在意 ASU、機場與中樞位置，而不是全新大型社區，Tempe 很值得先看。',
    },
    browseUrl: `${REDFIN_BASE_URL}/city/18607/AZ/Tempe`,
    sourceLabel: 'Redfin / ARMLS',
    metroGroup: 'central',
    mapPosition: { x: 49, y: 56 },
    queries: [
      {
        market: 'phoenix',
        regionId: 18607,
        regionType: 6,
        refererPath: '/city/18607/AZ/Tempe',
      },
    ],
  },
  {
    id: 'scottsdale',
    title: {
      en: 'Scottsdale',
      zh: 'Scottsdale',
    },
    description: {
      en: 'Scottsdale skews higher-end, but it is still a key comparison city for school options, dining access, and northeast mobility.',
      zh: 'Scottsdale 價格通常更高，但在學校、餐飲與東北側移動便利上仍是重要比較點。',
    },
    browseUrl: `${REDFIN_BASE_URL}/city/16660/AZ/Scottsdale`,
    sourceLabel: 'Redfin / ARMLS',
    metroGroup: 'central',
    mapPosition: { x: 54, y: 34 },
    queries: [
      {
        market: 'phoenix',
        regionId: 16660,
        regionType: 6,
        refererPath: '/city/16660/AZ/Scottsdale',
      },
    ],
  },
  {
    id: 'mesa',
    title: {
      en: 'Mesa',
      zh: 'Mesa',
    },
    description: {
      en: 'Mesa gives you one of the widest East Valley inventory pools, with tradeoffs that vary sharply by zip code and commute pattern.',
      zh: 'Mesa 的東谷供給量很大，但不同郵遞區號的生活節奏與通勤差異也很大。',
    },
    browseUrl: `${REDFIN_BASE_URL}/city/11736/AZ/Mesa`,
    sourceLabel: 'Redfin / ARMLS',
    metroGroup: 'east',
    mapPosition: { x: 65, y: 53 },
    queries: [
      {
        market: 'phoenix',
        regionId: 11736,
        regionType: 6,
        refererPath: '/city/11736/AZ/Mesa',
      },
    ],
  },
  {
    id: 'chandler',
    title: {
      en: 'Chandler',
      zh: 'Chandler',
    },
    description: {
      en: 'A common East Valley search for school rhythm, airport practicality, and established family routines.',
      zh: '在東谷裡，Chandler 常是兼顧學校、機場與家庭節奏的熱門起點。',
    },
    browseUrl: `${REDFIN_BASE_URL}/city/3104/AZ/Chandler`,
    sourceLabel: 'Redfin / ARMLS',
    metroGroup: 'east',
    mapPosition: { x: 56, y: 70 },
    queries: [
      {
        market: 'phoenix',
        regionId: 3104,
        regionType: 6,
        refererPath: '/city/3104/AZ/Chandler',
      },
    ],
  },
  {
    id: 'gilbert',
    title: {
      en: 'Gilbert',
      zh: 'Gilbert',
    },
    description: {
      en: 'A second East Valley lens for master-planned neighborhoods, schools, and weekend family flow.',
      zh: '若你在比較東谷的學校、社區與家庭週末節奏，Gilbert 也是關鍵區域。',
    },
    browseUrl: `${REDFIN_BASE_URL}/city/6998/AZ/Gilbert`,
    sourceLabel: 'Redfin / ARMLS',
    metroGroup: 'east',
    mapPosition: { x: 68, y: 70 },
    queries: [
      {
        market: 'phoenix',
        regionId: 6998,
        regionType: 6,
        refererPath: '/city/6998/AZ/Gilbert',
      },
    ],
  },
  {
    id: 'queen-creek',
    title: {
      en: 'Queen Creek',
      zh: 'Queen Creek',
    },
    description: {
      en: 'Queen Creek is a common stretch option for households willing to trade longer drives for newer homes and larger lots.',
      zh: '若家庭願意用更長車程換取較新房屋與較大地坪，Queen Creek 常會進入名單。',
    },
    browseUrl: `${REDFIN_BASE_URL}/city/30786/AZ/Queen-Creek`,
    sourceLabel: 'Redfin / ARMLS',
    metroGroup: 'southeast',
    mapPosition: { x: 77, y: 83 },
    queries: [
      {
        market: 'phoenix',
        regionId: 30786,
        regionType: 6,
        refererPath: '/city/30786/AZ/Queen-Creek',
      },
    ],
  },
  {
    id: 'apache-junction',
    title: {
      en: 'Apache Junction',
      zh: 'Apache Junction',
    },
    description: {
      en: 'Apache Junction gives you a far-east comparison point where mountain access and lot size can outweigh central convenience.',
      zh: 'Apache Junction 是東側更外圍的比較點，山景與地坪有時會比市中心便利更吸引人。',
    },
    browseUrl: `${REDFIN_BASE_URL}/city/30787/AZ/Apache-Junction`,
    sourceLabel: 'Redfin / ARMLS',
    metroGroup: 'southeast',
    mapPosition: { x: 84, y: 53 },
    queries: [
      {
        market: 'phoenix',
        regionId: 30787,
        regionType: 6,
        refererPath: '/city/30787/AZ/Apache-Junction',
      },
    ],
  },
  {
    id: 'glendale',
    title: {
      en: 'Glendale',
      zh: 'Glendale',
    },
    description: {
      en: 'Glendale is a practical west-side comparison if you want more price variety without going as far out as Buckeye or Surprise.',
      zh: '如果你想在西谷先看價格帶更廣的選項，又不想一路外擴到 Buckeye 或 Surprise，Glendale 很實用。',
    },
    browseUrl: `${REDFIN_BASE_URL}/city/7102/AZ/Glendale`,
    sourceLabel: 'Redfin / ARMLS',
    metroGroup: 'west',
    mapPosition: { x: 27, y: 36 },
    queries: [
      {
        market: 'phoenix',
        regionId: 7102,
        regionType: 6,
        refererPath: '/city/7102/AZ/Glendale',
      },
    ],
  },
  {
    id: 'peoria',
    title: {
      en: 'Peoria',
      zh: 'Peoria',
    },
    description: {
      en: 'Peoria stays important for northwest inventory and shorter TSMC-side driving patterns.',
      zh: 'Peoria 仍然是比較西北谷供給與較短 TSMC 通勤時的重要城市。',
    },
    browseUrl: `${REDFIN_BASE_URL}/city/14000/AZ/Peoria`,
    sourceLabel: 'Redfin / ARMLS',
    metroGroup: 'west',
    mapPosition: { x: 25, y: 25 },
    queries: [
      {
        market: 'phoenix',
        regionId: 14000,
        regionType: 6,
        refererPath: '/city/14000/AZ/Peoria',
      },
    ],
  },
  {
    id: 'avondale',
    title: {
      en: 'Avondale',
      zh: 'Avondale',
    },
    description: {
      en: 'Avondale is a value-check city for households comparing west-side commute relief against fewer East Valley community anchors.',
      zh: 'Avondale 適合拿來檢查西谷性價比，看看通勤改善是否值得交換較少的東谷社群機能。',
    },
    browseUrl: `${REDFIN_BASE_URL}/city/1249/AZ/Avondale`,
    sourceLabel: 'Redfin / ARMLS',
    metroGroup: 'west',
    mapPosition: { x: 22, y: 67 },
    queries: [
      {
        market: 'phoenix',
        regionId: 1249,
        regionType: 6,
        refererPath: '/city/1249/AZ/Avondale',
      },
    ],
  },
  {
    id: 'goodyear',
    title: {
      en: 'Goodyear',
      zh: 'Goodyear',
    },
    description: {
      en: 'Goodyear is a west-side expansion option when newer subdivisions and larger homes matter more than airport proximity.',
      zh: '如果你更看重新社區與較大房型，而不是靠近機場，Goodyear 會是常見的西谷延伸選項。',
    },
    browseUrl: `${REDFIN_BASE_URL}/city/7245/AZ/Goodyear`,
    sourceLabel: 'Redfin / ARMLS',
    metroGroup: 'west',
    mapPosition: { x: 17, y: 72 },
    queries: [
      {
        market: 'phoenix',
        regionId: 7245,
        regionType: 6,
        refererPath: '/city/7245/AZ/Goodyear',
      },
    ],
  },
  {
    id: 'surprise',
    title: {
      en: 'Surprise',
      zh: 'Surprise',
    },
    description: {
      en: 'Surprise pushes farther west, but it can open up newer inventory and different budget tradeoffs for larger households.',
      zh: 'Surprise 更往西，但對人口較多的家庭來說，常能換到較新供給與不同的預算解法。',
    },
    browseUrl: `${REDFIN_BASE_URL}/city/18267/AZ/Surprise`,
    sourceLabel: 'Redfin / ARMLS',
    metroGroup: 'west',
    mapPosition: { x: 18, y: 22 },
    queries: [
      {
        market: 'phoenix',
        regionId: 18267,
        regionType: 6,
        refererPath: '/city/18267/AZ/Surprise',
      },
    ],
  },
  {
    id: 'buckeye',
    title: {
      en: 'Buckeye',
      zh: 'Buckeye',
    },
    description: {
      en: 'Buckeye is the outer west edge of the common comparison set and is mostly about maximizing home size for budget.',
      zh: 'Buckeye 幾乎是西谷外緣，比較時通常是在看能否用同樣預算換到更大的房子。',
    },
    browseUrl: `${REDFIN_BASE_URL}/city/2047/AZ/Buckeye`,
    sourceLabel: 'Redfin / ARMLS',
    metroGroup: 'west',
    mapPosition: { x: 8, y: 77 },
    queries: [
      {
        market: 'phoenix',
        regionId: 2047,
        regionType: 6,
        refererPath: '/city/2047/AZ/Buckeye',
      },
    ],
  },
  {
    id: 'paradise-valley',
    title: {
      en: 'Paradise Valley',
      zh: 'Paradise Valley',
    },
    description: {
      en: 'Paradise Valley is a luxury outlier, but it belongs in the set when higher-end relocations are comparing privacy and prestige.',
      zh: 'Paradise Valley 屬於高端例外值，但在高預算搬遷案裡仍常被拿來比較隱私與地段。',
    },
    browseUrl: `${REDFIN_BASE_URL}/city/13625/AZ/Paradise-Valley`,
    sourceLabel: 'Redfin / ARMLS',
    metroGroup: 'foothills',
    mapPosition: { x: 48, y: 38 },
    queries: [
      {
        market: 'phoenix',
        regionId: 13625,
        regionType: 6,
        refererPath: '/city/13625/AZ/Paradise-Valley',
      },
    ],
  },
  {
    id: 'fountain-hills',
    title: {
      en: 'Fountain Hills',
      zh: 'Fountain Hills',
    },
    description: {
      en: 'Fountain Hills is another foothills comparison city where views and quiet can matter more than central access.',
      zh: 'Fountain Hills 也是山麓比較點，景觀與安靜程度有時比靠近市中心更重要。',
    },
    browseUrl: `${REDFIN_BASE_URL}/city/6516/AZ/Fountain-Hills`,
    sourceLabel: 'Redfin / ARMLS',
    metroGroup: 'foothills',
    mapPosition: { x: 75, y: 31 },
    queries: [
      {
        market: 'phoenix',
        regionId: 6516,
        regionType: 6,
        refererPath: '/city/6516/AZ/Fountain-Hills',
      },
    ],
  },
];

let housingRegionCache:
  | {
      expiresAt: number;
      snapshots: HousingRegionSnapshot[];
    }
  | null = null;
let housingRegionLoadPromise: Promise<HousingRegionSnapshot[]> | null = null;

export function isLiveHousingListingsEnabled(): boolean {
  return process.env.HOUSING_LIVE_LISTINGS_ENABLED === '1';
}

function toStaticHousingRegionSnapshot(definition: HousingRegionDefinition): HousingRegionSnapshot {
  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    browseUrl: definition.browseUrl,
    sourceLabel: definition.sourceLabel,
    metroGroup: definition.metroGroup,
    mapPosition: definition.mapPosition,
    listingsMode: 'static',
    listings: [],
    fetchedAt: STATIC_SNAPSHOT_TIMESTAMP,
  };
}

export function getStaticHousingRegionSnapshots(): HousingRegionSnapshot[] {
  return housingRegionDefinitions.map((definition) => toStaticHousingRegionSnapshot(definition));
}

function unwrapScalar<T>(value: RedfinScalar<T> | undefined): T | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'object' && 'value' in value) {
    return unwrapScalar(value.value as RedfinScalar<T> | undefined);
  }

  if (typeof value === 'object') {
    return undefined;
  }

  return value as T;
}

function unwrapLatLong(value: RedfinLatLong | undefined): { latitude?: number; longitude?: number } | undefined {
  if (!value) {
    return undefined;
  }

  if ('value' in value) {
    return value.value;
  }

  return value as { latitude?: number; longitude?: number };
}

function toAddress(home: RedfinHome): string {
  const streetLine = unwrapScalar(home.streetLine);
  const unitNumber = unwrapScalar(home.unitNumber);
  const parts = [streetLine].filter(
    (part): part is string => typeof part === 'string' && part.trim().length > 0
  );

  if (
    typeof unitNumber === 'string' &&
    unitNumber.trim().length > 0 &&
    !parts.some((part) => part.toLowerCase().includes(unitNumber.trim().toLowerCase()))
  ) {
    parts.push(unitNumber);
  }

  return parts.join(' ').trim();
}

function toPostalCode(home: RedfinHome): string {
  return unwrapScalar(home.postalCode) ?? unwrapScalar(home.zip) ?? '';
}

function toListingUrl(path: string | undefined): string | undefined {
  if (!path) {
    return undefined;
  }

  return new URL(path, REDFIN_BASE_URL).toString();
}

function toHousingListing(home: RedfinHome): HousingListing | null {
  const listingUrl = toListingUrl(home.url);
  const address = toAddress(home);
  if (!listingUrl || !address) {
    return null;
  }

  const latLong = unwrapLatLong(home.latLong);
  const propertyId = home.propertyId ?? home.listingId;

  return {
    id: propertyId ? String(propertyId) : listingUrl,
    address,
    city: unwrapScalar(home.city) ?? '',
    state: unwrapScalar(home.state) ?? '',
    zip: toPostalCode(home),
    price: unwrapScalar(home.price),
    beds: unwrapScalar(home.beds),
    baths: unwrapScalar(home.baths),
    squareFeet: unwrapScalar(home.sqFt),
    lotSize: unwrapScalar(home.lotSize),
    pricePerSquareFoot: unwrapScalar(home.pricePerSqFt),
    hoaPerMonth: unwrapScalar(home.hoa),
    yearBuilt: unwrapScalar(home.yearBuilt),
    daysOnMarket: unwrapScalar(home.dom),
    status: unwrapScalar(home.mlsStatus),
    listingUrl,
    mlsNumber: unwrapScalar(home.mlsId),
    latitude: latLong?.latitude,
    longitude: latLong?.longitude,
    isNewConstruction: home.isNewConstruction,
  };
}

function buildSamplePriceRange(listings: HousingListing[]): { min: number; max: number } | undefined {
  const prices = listings
    .map((listing) => listing.price)
    .filter((price): price is number => typeof price === 'number' && Number.isFinite(price))
    .sort((left, right) => left - right);

  if (prices.length === 0) {
    return undefined;
  }

  return {
    min: prices[0],
    max: prices[prices.length - 1],
  };
}

function buildAverageDaysOnMarket(listings: HousingListing[]): number | undefined {
  const values = listings
    .map((listing) => listing.daysOnMarket)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  if (values.length === 0) {
    return undefined;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

export function parseRedfinSearchResponse(
  definition: HousingRegionDefinition,
  responseText: string,
  listingLimit = DEFAULT_LISTING_LIMIT
): HousingRegionSnapshot {
  if (!responseText.startsWith('{}&&')) {
    throw new Error('Unexpected Redfin response format.');
  }

  const payload = JSON.parse(responseText.slice(4)) as RedfinResponse;
  const homes = Array.isArray(payload.payload?.homes) ? payload.payload.homes : [];
  const listings = homes
    .map((home) => toHousingListing(home))
    .filter((listing): listing is HousingListing => Boolean(listing))
    .slice(0, listingLimit);

  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    browseUrl: definition.browseUrl,
    sourceLabel: definition.sourceLabel,
    metroGroup: definition.metroGroup,
    mapPosition: definition.mapPosition,
    listingsMode: 'live',
    listings,
    fetchedAt: new Date().toISOString(),
    samplePriceRange: buildSamplePriceRange(listings),
    averageDaysOnMarket: buildAverageDaysOnMarket(listings),
  };
}

async function fetchRedfinRegionResponse(
  query: RedfinRegionQuery,
  listingFetchCount = DEFAULT_FETCH_COUNT
): Promise<string> {
  const searchParams = new URLSearchParams({
    al: '1',
    market: query.market,
    num_homes: String(listingFetchCount),
    ord: 'redfin-recommended-asc',
    page_number: '1',
    region_id: String(query.regionId),
    region_type: String(query.regionType),
    sf: '1,2,3,5,6,7',
    status: '9',
    uipt: '1,2,3,4,5,6,7,8',
  });

  const response = await fetch(`${REDFIN_STINGRAY_URL}?${searchParams.toString()}`, {
    headers: {
      Accept: 'application/json,text/plain,*/*',
      Referer: `${REDFIN_BASE_URL}${query.refererPath}`,
      'User-Agent': REDFIN_USER_AGENT,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`Redfin request failed with ${response.status}.`);
  }

  return await response.text();
}

async function loadHousingRegionSnapshot(
  definition: HousingRegionDefinition,
  listingLimit = DEFAULT_LISTING_LIMIT
): Promise<HousingRegionSnapshot> {
  try {
    const responses = await Promise.all(
      definition.queries.map((query) => fetchRedfinRegionResponse(query))
    );
    const mergedListings = responses
      .flatMap((responseText) => parseRedfinSearchResponse(definition, responseText, listingLimit).listings)
      .slice(0, listingLimit);

    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      browseUrl: definition.browseUrl,
      sourceLabel: definition.sourceLabel,
      metroGroup: definition.metroGroup,
      mapPosition: definition.mapPosition,
      listingsMode: 'live',
      listings: mergedListings,
      fetchedAt: new Date().toISOString(),
      samplePriceRange: buildSamplePriceRange(mergedListings),
      averageDaysOnMarket: buildAverageDaysOnMarket(mergedListings),
    };
  } catch (error) {
    console.error(`Unable to load housing listings for ${definition.id}.`, error);

    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      browseUrl: definition.browseUrl,
      sourceLabel: definition.sourceLabel,
      metroGroup: definition.metroGroup,
      mapPosition: definition.mapPosition,
      listingsMode: 'live',
      listings: [],
      fetchedAt: new Date().toISOString(),
      error: 'unavailable',
    };
  }
}

export async function getHousingRegionSnapshots(): Promise<HousingRegionSnapshot[]> {
  if (!isLiveHousingListingsEnabled()) {
    return getStaticHousingRegionSnapshots();
  }

  const now = Date.now();
  if (housingRegionCache && housingRegionCache.expiresAt > now) {
    return housingRegionCache.snapshots;
  }

  if (!housingRegionLoadPromise) {
    housingRegionLoadPromise = (async () => {
      const snapshots = await Promise.all(
        housingRegionDefinitions.map((definition) => loadHousingRegionSnapshot(definition))
      );

      housingRegionCache = {
        expiresAt: Date.now() + REGION_CACHE_TTL_MS,
        snapshots,
      };

      return snapshots;
    })().finally(() => {
      housingRegionLoadPromise = null;
    });
  }

  return housingRegionLoadPromise;
}
