import type { LocalizedText } from '@/lib/types';

export type HousingMetroGroup =
  | 'central'
  | 'east'
  | 'southeast'
  | 'west'
  | 'foothills';

export type HousingMapPosition = {
  x: number;
  y: number;
};

export type HousingListingsMode = 'static' | 'live';

export type HousingListing = {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price?: number;
  beds?: number;
  baths?: number;
  squareFeet?: number;
  lotSize?: number;
  pricePerSquareFoot?: number;
  hoaPerMonth?: number;
  yearBuilt?: number;
  daysOnMarket?: number;
  status?: string;
  listingUrl: string;
  mlsNumber?: string;
  latitude?: number;
  longitude?: number;
  isNewConstruction?: boolean;
};

export type HousingRegionDefinition = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  browseUrl: string;
  sourceLabel: string;
  metroGroup: HousingMetroGroup;
  mapPosition: HousingMapPosition;
  queries: {
    market: string;
    regionId: number;
    regionType: number;
    refererPath: string;
  }[];
};

export type HousingRegionSnapshot = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  browseUrl: string;
  sourceLabel: string;
  metroGroup: HousingMetroGroup;
  mapPosition: HousingMapPosition;
  listingsMode: HousingListingsMode;
  listings: HousingListing[];
  fetchedAt: string;
  samplePriceRange?: {
    min: number;
    max: number;
  };
  averageDaysOnMarket?: number;
  error?: string;
};
