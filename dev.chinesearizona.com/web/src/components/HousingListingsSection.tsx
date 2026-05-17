'use client';

import { Building2, ChevronRight, Clock3, ExternalLink, Map as MapIcon, MapPin } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { t } from '@/lib/i18n';
import type { HousingListing, HousingMetroGroup, HousingRegionSnapshot } from '@/lib/housing-types';
import type { Locale } from '@/lib/types';

type HousingListingsSectionProps = {
  locale: Locale;
  regions: HousingRegionSnapshot[];
};

const metroGroupOrder: HousingMetroGroup[] = ['central', 'east', 'southeast', 'west', 'foothills'];
const mapWidth = 720;
const mapHeight = 360;

const metroGroupAreas: Record<
  HousingMetroGroup,
  {
    path: string;
    fill: string;
    stroke: string;
  }
> = {
  west: {
    path: 'M42 77H261C289 77 310 100 304 128L265 313H35C20 313 8 301 12 286L45 96C48 85 56 77 42 77Z',
    fill: '#eef0df',
    stroke: '#c6c99f',
  },
  central: {
    path: 'M250 70H438C462 70 480 90 474 114L424 262C419 277 405 287 389 287H239C215 287 197 266 204 242L248 82C250 75 256 70 250 70Z',
    fill: '#f2e4cf',
    stroke: '#d7b98e',
  },
  east: {
    path: 'M410 122H566C590 122 608 143 603 166L566 294C562 310 548 321 532 321H390C368 321 351 302 356 280L394 145C397 132 407 122 410 122Z',
    fill: '#e6f0df',
    stroke: '#abc596',
  },
  southeast: {
    path: 'M526 169H665C689 169 706 191 700 214L668 330C664 346 650 356 633 356H507C484 356 467 335 474 312L512 190C515 178 524 169 526 169Z',
    fill: '#f2e8d8',
    stroke: '#d5b58c',
  },
  foothills: {
    path: 'M445 52H669C694 52 711 75 703 99L651 202C646 216 633 225 618 225H444C421 225 404 204 411 182L445 52Z',
    fill: '#e4eee5',
    stroke: '#9fbea8',
  },
};

const mapLabelOffsets: Record<string, { dx: number; dy: number; anchor?: 'start' | 'middle' | 'end' }> = {
  buckeye: { dx: 10, dy: 19 },
  goodyear: { dx: 10, dy: -13 },
  avondale: { dx: 10, dy: 20 },
  surprise: { dx: 10, dy: -13 },
  peoria: { dx: 10, dy: -13 },
  glendale: { dx: 10, dy: 20 },
  phoenix: { dx: -12, dy: -15, anchor: 'end' },
  'paradise-valley': { dx: 12, dy: -12 },
  scottsdale: { dx: 12, dy: -12 },
  tempe: { dx: -10, dy: 21, anchor: 'end' },
  chandler: { dx: -10, dy: 22, anchor: 'end' },
  mesa: { dx: 12, dy: -12 },
  gilbert: { dx: 12, dy: 20 },
  'fountain-hills': { dx: 12, dy: -12 },
  'apache-junction': { dx: 12, dy: 20 },
  'queen-creek': { dx: 12, dy: 20 },
};

function formatCurrency(value: number | undefined, locale: Locale): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return locale === 'zh' ? '查看房源' : 'See listing';
  }

  return new Intl.NumberFormat(locale === 'zh' ? 'zh-Hant' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatInteger(value: number | undefined, locale: Locale): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return new Intl.NumberFormat(locale === 'zh' ? 'zh-Hant' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPriceRange(
  range: HousingRegionSnapshot['samplePriceRange'],
  locale: Locale
): string | null {
  if (!range) {
    return null;
  }

  if (range.min === range.max) {
    return formatCurrency(range.min, locale);
  }

  return `${formatCurrency(range.min, locale)} - ${formatCurrency(range.max, locale)}`;
}

function groupLabel(group: HousingMetroGroup, locale: Locale): string {
  if (locale === 'zh') {
    switch (group) {
      case 'central':
        return '核心區';
      case 'east':
        return '東谷';
      case 'southeast':
        return '東南外圍';
      case 'west':
        return '西谷';
      case 'foothills':
        return '山麓高地';
    }
  }

  switch (group) {
    case 'central':
      return 'Core Cities';
    case 'east':
      return 'East Valley';
    case 'southeast':
      return 'Outer Southeast';
    case 'west':
      return 'West Valley';
    case 'foothills':
      return 'Foothills';
  }
}

function daysOnMarketLabel(value: number | undefined, locale: Locale): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  if (locale === 'zh') {
    return `上市 ${value} 天`;
  }

  return value === 1 ? '1 day on market' : `${value} days on market`;
}

function mapPoint(region: HousingRegionSnapshot): { x: number; y: number } {
  return {
    x: (region.mapPosition.x / 100) * mapWidth,
    y: (region.mapPosition.y / 100) * mapHeight,
  };
}

function StaticHousingFallback({
  locale,
  selectedRegion,
}: {
  locale: Locale;
  selectedRegion: HousingRegionSnapshot;
}) {
  return (
    <div className="border-y border-[#decbb8] py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
        {locale === 'zh' ? '靜態城市導覽' : 'Static city orientation'}
      </p>
      <h3 className="mt-2 text-2xl font-semibold text-[#2b1f18] [font-family:var(--font-display)]">
        {locale === 'zh' ? '先比較生活圈，再打開完整搜尋' : 'Compare the area first, then open the full search'}
      </h3>
      <p className="mt-3 text-sm leading-7 text-[#6a5547]">
        {locale === 'zh'
          ? '公開版先使用穩定的城市比較與官方房源入口，不讓第三方即時資料影響頁面載入。'
          : 'The public page starts with stable city comparison and direct city-search links, so third-party listing feeds do not control page loading.'}
      </p>
      <a
        href={selectedRegion.browseUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
      >
        {locale === 'zh' ? '打開完整城市搜尋' : 'Open full city search'}
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  );
}

function GreaterPhoenixMap({
  locale,
  regions,
  selectedRegion,
}: {
  locale: Locale;
  regions: HousingRegionSnapshot[];
  selectedRegion: HousingRegionSnapshot;
}) {
  const selectedGroup = selectedRegion.metroGroup;
  const orderedRegions = [...regions].sort((left, right) => {
    if (left.id === selectedRegion.id) {
      return 1;
    }
    if (right.id === selectedRegion.id) {
      return -1;
    }
    return 0;
  });
  const selectedPoint = mapPoint(selectedRegion);

  return (
    <div className="overflow-hidden border border-[#decbb8] bg-[#f8efe4]">
      <div className="border-b border-[#decbb8] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
              {locale === 'zh' ? '大鳳凰城地圖' : 'Greater Phoenix map'}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-[#2b1f18] [font-family:var(--font-display)]">
              {t(selectedRegion.title, locale)}
            </h3>
          </div>
          <MapIcon className="h-5 w-5 flex-shrink-0 text-brand-700" aria-hidden="true" />
        </div>
      </div>

      <svg
        role="img"
        aria-label={
          locale === 'zh'
            ? `大鳳凰城示意地圖，目前選取 ${t(selectedRegion.title, locale)}`
            : `Schematic Greater Phoenix map with ${t(selectedRegion.title, locale)} selected`
        }
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        className="h-auto w-full"
      >
        <title>
          {locale === 'zh'
            ? `大鳳凰城示意地圖：${t(selectedRegion.title, locale)}`
            : `Greater Phoenix schematic map: ${t(selectedRegion.title, locale)}`}
        </title>
        <rect width={mapWidth} height={mapHeight} fill="#f6efe6" />
        {Array.from({ length: 12 }).map((_, index) => (
          <path
            key={`grid-x-${index}`}
            d={`M${40 + index * 56} 24V338`}
            stroke="#eadfce"
            strokeWidth="1"
            opacity="0.72"
          />
        ))}
        {Array.from({ length: 6 }).map((_, index) => (
          <path
            key={`grid-y-${index}`}
            d={`M24 ${54 + index * 48}H696`}
            stroke="#eadfce"
            strokeWidth="1"
            opacity="0.72"
          />
        ))}

        {metroGroupOrder.map((group) => {
          const area = metroGroupAreas[group];
          const active = group === selectedGroup;

          return (
            <path
              key={group}
              d={area.path}
              fill={area.fill}
              stroke={area.stroke}
              strokeWidth={active ? 2.4 : 1.4}
              opacity={active ? 0.8 : 0.36}
            />
          );
        })}

        <path d="M36 206C134 197 210 205 301 193C396 181 480 169 682 171" stroke="#a8bfd6" strokeWidth="13" strokeLinecap="round" opacity="0.72" />
        <path d="M36 206C134 197 210 205 301 193C396 181 480 169 682 171" stroke="#f8fbff" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
        <path d="M265 42C265 122 261 184 260 323" stroke="#a8bfd6" strokeWidth="11" strokeLinecap="round" opacity="0.66" />
        <path d="M265 42C265 122 261 184 260 323" stroke="#f8fbff" strokeWidth="3.5" strokeLinecap="round" opacity="0.9" />
        <path d="M252 146C334 102 410 88 497 105C570 119 626 151 691 199" stroke="#a8bfd6" strokeWidth="11" strokeLinecap="round" opacity="0.62" />
        <path d="M252 146C334 102 410 88 497 105C570 119 626 151 691 199" stroke="#f8fbff" strokeWidth="3.5" strokeLinecap="round" opacity="0.9" />
        <path d="M336 247C403 240 457 235 518 248C581 262 632 292 689 322" stroke="#a8bfd6" strokeWidth="10" strokeLinecap="round" opacity="0.58" />
        <path d="M336 247C403 240 457 235 518 248C581 262 632 292 689 322" stroke="#f8fbff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
        <path d="M372 63C401 109 423 153 437 222C446 264 447 298 448 333" stroke="#a8bfd6" strokeWidth="10" strokeLinecap="round" opacity="0.56" />
        <path d="M372 63C401 109 423 153 437 222C446 264 447 298 448 333" stroke="#f8fbff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />

        {[
          { label: 'I-10', x: 172, y: 187 },
          { label: 'I-17', x: 280, y: 104 },
          { label: '101', x: 438, y: 105 },
          { label: '202', x: 430, y: 239 },
          { label: 'US 60', x: 606, y: 178 },
        ].map((route) => (
          <g key={route.label}>
            <rect x={route.x - 18} y={route.y - 10} width="36" height="20" rx="6" fill="#fffaf3" stroke="#b9c7d6" />
            <text x={route.x} y={route.y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#52687c">
              {route.label}
            </text>
          </g>
        ))}

        {orderedRegions.map((region) => {
          const point = mapPoint(region);
          const selected = region.id === selectedRegion.id;
          const inSelectedGroup = region.metroGroup === selectedGroup;
          const labelOffset = mapLabelOffsets[region.id] ?? { dx: 10, dy: -10 };
          const labelX = point.x + labelOffset.dx;
          const labelY = point.y + labelOffset.dy;

          return (
            <g key={region.id}>
              <circle
                cx={point.x}
                cy={point.y}
                r={selected ? 11 : inSelectedGroup ? 7 : 5}
                fill={selected ? '#bb3d29' : inSelectedGroup ? '#d59a52' : '#9d8a7b'}
                stroke="#fffaf3"
                strokeWidth={selected ? 5 : 3}
              />
              {selected ? (
                <circle cx={point.x} cy={point.y} r="18" fill="none" stroke="#bb3d29" strokeWidth="1.5" opacity="0.35" />
              ) : null}
              <text
                x={labelX}
                y={labelY}
                textAnchor={labelOffset.anchor ?? 'start'}
                fontSize={selected ? 13 : 10}
                fontWeight={selected || inSelectedGroup ? 700 : 600}
                fill={selected ? '#2b1f18' : inSelectedGroup ? '#4f382a' : '#806c5f'}
              >
                {t(region.title, locale)}
              </text>
            </g>
          );
        })}

        <path
          d={`M${selectedPoint.x - 18} ${selectedPoint.y + 24}H${Math.min(selectedPoint.x + 118, mapWidth - 30)}`}
          stroke="#bb3d29"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>

      <div className="grid gap-3 border-t border-[#decbb8] px-4 py-4 text-xs leading-5 text-[#6f5a4c]">
        <p>
          {locale === 'zh'
            ? '此為搬遷規劃用示意圖，不代表精準邊界或即時路況。簽約前請用地圖服務確認實際通勤時間。'
            : 'Schematic planning map, not a precise boundary or traffic view. Verify real commute times in a map app before signing.'}
        </p>
        <p className="font-semibold text-[#2b1f18]">
          {locale === 'zh' ? '選取區域：' : 'Selected metro: '}
          {groupLabel(selectedGroup, locale)}
        </p>
      </div>
    </div>
  );
}

function addressLine(listing: HousingListing): string {
  const cityState = [displayText(listing.city), displayText(listing.state)].filter(Boolean).join(', ');
  return [cityState, displayText(listing.zip)].filter(Boolean).join(' ');
}

function displayText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const possibleKeys = ['streetLine', 'line', 'display', 'formatted', 'text', 'value', 'address'];

    for (const key of possibleKeys) {
      const nextValue = record[key];
      if (nextValue === value) {
        continue;
      }

      const text = displayText(nextValue);
      if (text) {
        return text;
      }
    }
  }

  return '';
}

function listingMeta(listing: HousingListing, locale: Locale): string {
  const bits = [
    typeof listing.beds === 'number' ? (locale === 'zh' ? `${listing.beds} 房` : `${listing.beds} bd`) : null,
    typeof listing.baths === 'number'
      ? locale === 'zh'
        ? `${listing.baths} 衛`
        : `${listing.baths} ba`
      : null,
    formatInteger(listing.squareFeet, locale)
      ? locale === 'zh'
        ? `${formatInteger(listing.squareFeet, locale)} 平方英尺`
        : `${formatInteger(listing.squareFeet, locale)} sqft`
      : null,
  ].filter((item): item is string => Boolean(item));

  return bits.join(' • ');
}

function ListingRow({
  listing,
  locale,
}: {
  listing: HousingListing;
  locale: Locale;
}) {
  const meta = listingMeta(listing, locale);
  const daysOnMarket = daysOnMarketLabel(listing.daysOnMarket, locale);

  return (
    <a
      href={listing.listingUrl}
      target="_blank"
      rel="noreferrer"
      className="group flex items-start justify-between gap-4 border-t border-[#e0d0bd] py-4 transition-colors hover:bg-[#fff7ec]"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-semibold text-[#2b1f18]">{formatCurrency(listing.price, locale)}</span>
          {listing.status ? (
            <span className="bg-[#f1e4d6] px-2 py-0.5 text-[11px] font-semibold text-[#765c4a]">
              {listing.status}
            </span>
          ) : null}
        </div>
        <p className="truncate text-sm font-medium text-[#3a2a21]">{displayText(listing.address)}</p>
        <p className="truncate text-xs text-[#806c5f]">{addressLine(listing)}</p>
        <div className="flex flex-wrap gap-2 text-xs text-[#806c5f]">
          {meta ? <span>{meta}</span> : null}
          {daysOnMarket ? <span>{daysOnMarket}</span> : null}
        </div>
      </div>

      <span className="inline-flex items-center gap-1 self-center whitespace-nowrap text-sm font-semibold text-brand-700">
        {locale === 'zh' ? '打開' : 'Open'}
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </a>
  );
}

function FeaturedListing({
  listing,
  locale,
}: {
  listing: HousingListing;
  locale: Locale;
}) {
  const meta = listingMeta(listing, locale);
  const daysOnMarket = daysOnMarketLabel(listing.daysOnMarket, locale);
  const pricePerSquareFoot = formatInteger(listing.pricePerSquareFoot, locale);
  const lotSize = formatInteger(listing.lotSize, locale);
  const yearBuilt = formatInteger(listing.yearBuilt, locale);

  return (
    <div className="border-y border-[#decbb8] py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold text-[#2b1f18] [font-family:var(--font-display)]">
            {formatCurrency(listing.price, locale)}
          </p>
          <p className="mt-2 text-base font-semibold text-[#3a2a21]">{displayText(listing.address)}</p>
          <p className="mt-1 text-sm text-[#806c5f]">{addressLine(listing)}</p>
        </div>
        {listing.status ? (
          <span className="bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
            {listing.status}
          </span>
        ) : null}
      </div>

      {meta ? <p className="mt-4 text-sm font-medium text-[#5d493c]">{meta}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#806c5f]">
        {daysOnMarket ? (
          <span className="inline-flex items-center gap-1 bg-[#f1e4d6] px-2.5 py-1">
            <Clock3 className="h-3.5 w-3.5" />
            {daysOnMarket}
          </span>
        ) : null}
        {pricePerSquareFoot ? (
          <span className="bg-[#f1e4d6] px-2.5 py-1">
            {locale === 'zh' ? `${pricePerSquareFoot} / 平方英尺` : `${pricePerSquareFoot} / sqft`}
          </span>
        ) : null}
        {lotSize ? (
          <span className="bg-[#f1e4d6] px-2.5 py-1">
            {locale === 'zh' ? `地坪 ${lotSize}` : `Lot ${lotSize}`}
          </span>
        ) : null}
        {yearBuilt ? (
          <span className="bg-[#f1e4d6] px-2.5 py-1">
            {locale === 'zh' ? `${yearBuilt} 年建` : `Built ${yearBuilt}`}
          </span>
        ) : null}
        {listing.isNewConstruction ? (
          <span className="bg-[#f1e4d6] px-2.5 py-1">
            {locale === 'zh' ? '新建案' : 'New construction'}
          </span>
        ) : null}
      </div>

      <a
        href={listing.listingUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
      >
        {locale === 'zh' ? '查看完整房源' : 'Open full listing'}
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}

export function HousingListingsSection({ locale, regions }: HousingListingsSectionProps) {
  const initialRegion = regions.find((region) => region.id === 'chandler') ?? regions[0] ?? null;
  const [selectedRegionId, setSelectedRegionId] = useState(initialRegion?.id ?? '');

  if (!initialRegion) {
    return null;
  }

  const selectedRegion = regions.find((region) => region.id === selectedRegionId) ?? initialRegion;
  const selectedGroup = selectedRegion.metroGroup;
  const regionsInSelectedGroup = regions.filter((region) => region.metroGroup === selectedGroup);
  const availableGroups = metroGroupOrder.filter((group) =>
    regions.some((region) => region.metroGroup === group)
  );
  const liveListingsEnabled = regions.some((region) => region.listingsMode === 'live');
  const hasListings = liveListingsEnabled && regions.some((region) => region.listings.length > 0);
  const featuredListing = selectedRegion.listings[0];
  const secondaryListings = selectedRegion.listings.slice(1);
  const priceRange = formatPriceRange(selectedRegion.samplePriceRange, locale);
  const averageDays = daysOnMarketLabel(selectedRegion.averageDaysOnMarket, locale);

  return (
    <section className="space-y-7">
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <aside className="space-y-7">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              {liveListingsEnabled
                ? locale === 'zh'
                  ? '即時房源快照'
                  : 'Live homes snapshot'
                : locale === 'zh'
                  ? '城市導覽地圖'
                  : 'Neighborhood orientation'}
            </div>
            <div>
              <h2 className="text-4xl font-semibold leading-tight text-[#2b1f18] [font-family:var(--font-display)]">
                {locale === 'zh' ? '比較大鳳凰城落腳區' : 'Compare Greater Phoenix neighborhoods'}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#6a5547]">
                {liveListingsEnabled
                  ? locale === 'zh'
                    ? '用區域、城市、價格帶與代表性房源快速建立方向，再進入完整城市搜尋。'
                    : 'Use metro slices, city rhythm, price bands, and representative listings to orient the housing search before opening the full city view.'
                  : locale === 'zh'
                    ? '用區域、城市節奏與生活圈位置快速建立方向，再進入完整城市搜尋。'
                    : 'Use metro slices, city rhythm, and community anchors to orient the housing search before opening the full city view.'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#806c5f]">
              {locale === 'zh' ? '先選區域' : 'Choose a metro'}
            </p>
            <div className="space-y-1">
              {availableGroups.map((group) => {
                const active = group === selectedGroup;

                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => {
                      const nextRegion = regions.find((region) => region.metroGroup === group);
                      if (nextRegion) {
                        setSelectedRegionId(nextRegion.id);
                      }
                    }}
                    className={
                      active
                        ? 'flex w-full items-center justify-between border-l-4 border-brand-600 bg-[#fff4e8] px-4 py-4 text-left text-sm font-semibold text-[#2b1f18]'
                        : 'flex w-full items-center justify-between border-l border-[#d8c5b2] px-4 py-4 text-left text-sm font-semibold text-[#5f4b3f] transition-colors hover:border-brand-300 hover:bg-[#fff7ec] hover:text-brand-700'
                    }
                  >
                    <span>{groupLabel(group, locale)}</span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>

          <p className="border-t border-[#decbb8] pt-4 text-xs leading-5 text-[#806c5f]">
            {liveListingsEnabled
              ? locale === 'zh'
                ? `涵蓋 ${regions.length} 個城市，每城精簡顯示 3 筆。資料源自 Redfin / ARMLS。`
                : `${regions.length} cities covered. Three listings shown per city. Source: Redfin / ARMLS.`
              : locale === 'zh'
                ? `涵蓋 ${regions.length} 個城市。靜態示意圖用於比較生活圈，完整房源請打開城市搜尋。`
                : `${regions.length} cities covered. The static map is for neighborhood comparison; open each city search for current listings.`}
          </p>
        </aside>

        <div className="space-y-6 border-l border-[#decbb8] pl-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#806c5f]">
              {locale === 'zh' ? '再選城市' : 'Then choose a city'}
            </p>
            <div className="flex flex-wrap gap-2">
              {regionsInSelectedGroup.map((region) => {
                const active = region.id === selectedRegion.id;

                return (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => setSelectedRegionId(region.id)}
                    className={
                      active
                        ? 'bg-brand-600 px-4 py-2 text-sm font-semibold text-white'
                        : 'border border-[#d8c5b2] bg-white/60 px-4 py-2 text-sm font-semibold text-[#5f4b3f] transition-colors hover:border-brand-300 hover:text-brand-700'
                    }
                  >
                    {t(region.title, locale)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative overflow-hidden border-y border-[#decbb8] py-6">
            <div
              className="absolute inset-x-0 top-0 h-40 opacity-70"
              style={{
                background:
                  'linear-gradient(90deg, rgba(252,248,241,0.94), rgba(252,248,241,0.48)), radial-gradient(circle at 75% 20%, rgba(187,61,41,0.15), transparent 24%), linear-gradient(135deg, #f4dec4, #f9efe3)',
              }}
            />
            <div className="relative">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-5xl font-semibold leading-none text-[#2b1f18] [font-family:var(--font-display)]">
                    {t(selectedRegion.title, locale)}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6a5547]">
                    {t(selectedRegion.description, locale)}
                  </p>
                </div>
                <a
                  href={selectedRegion.browseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 self-start border border-brand-200 bg-white/78 px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                >
                  <MapPin className="h-4 w-4" />
                  {locale === 'zh' ? '打開完整城市搜尋' : 'Browse full city search'}
                </a>
              </div>

              <div className="mt-7 grid gap-4 border-y border-[#decbb8] py-5 sm:grid-cols-3">
                {liveListingsEnabled ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#806c5f]">
                      {locale === 'zh' ? '顯示房源' : 'Listings shown'}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#2b1f18] [font-family:var(--font-display)]">
                      {selectedRegion.listings.length}
                    </p>
                  </div>
                ) : null}
                {liveListingsEnabled && priceRange ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#806c5f]">
                      {locale === 'zh' ? '樣本價格帶' : 'Sample range'}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#2b1f18] [font-family:var(--font-display)]">
                      {priceRange}
                    </p>
                  </div>
                ) : null}
                {liveListingsEnabled && averageDays ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#806c5f]">
                      {locale === 'zh' ? '市場節奏' : 'Market pace'}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#2b1f18] [font-family:var(--font-display)]">
                      {averageDays}
                    </p>
                  </div>
                ) : null}
                {!liveListingsEnabled ? (
                  <>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#806c5f]">
                        {locale === 'zh' ? '選取區域' : 'Selected metro'}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[#2b1f18] [font-family:var(--font-display)]">
                        {groupLabel(selectedGroup, locale)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#806c5f]">
                        {locale === 'zh' ? '房源入口' : 'Listing entry'}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[#2b1f18] [font-family:var(--font-display)]">
                        {locale === 'zh' ? '城市搜尋' : 'City search'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#806c5f]">
                        {locale === 'zh' ? '公開模式' : 'Public mode'}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[#2b1f18] [font-family:var(--font-display)]">
                        {locale === 'zh' ? '靜態導覽' : 'Static guide'}
                      </p>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  {
                    title: locale === 'zh' ? '通勤' : 'Commute',
                    body:
                      locale === 'zh'
                        ? '先用實際上班時段測試路線，不只看地圖半徑。'
                        : 'Test the actual drive window, not just the map radius.',
                  },
                  {
                    title: locale === 'zh' ? '學校' : 'Schools',
                    body:
                      locale === 'zh'
                        ? '同步看學區邊界、接送動線與課後安排。'
                        : 'Check boundaries, pickup flow, and after-school coverage together.',
                  },
                  {
                    title: locale === 'zh' ? '社群' : 'Community fit',
                    body:
                      locale === 'zh'
                        ? '週末中文課、超市、醫療與家庭活動會影響長期舒適度。'
                        : 'Weekend Chinese classes, groceries, care, and family activities shape the weekly rhythm.',
                  },
                ].map((note) => (
                  <div key={note.title} className="border-l border-[#decbb8] pl-4">
                    <p className="text-sm font-semibold text-[#2b1f18]">{note.title}</p>
                    <p className="mt-2 text-xs leading-6 text-[#6a5547]">{note.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {liveListingsEnabled && selectedRegion.error ? (
            <EmptyState
              title={locale === 'zh' ? '這個城市目前無法取得即時房源' : 'Live listings are unavailable for this city right now'}
              description={
                locale === 'zh'
                  ? '可先點上方連結直接進入城市房源頁面，或稍後再回來查看。'
                  : 'Use the city search link above for now, or check back in a bit.'
              }
            />
          ) : liveListingsEnabled && featuredListing ? (
            <FeaturedListing listing={featuredListing} locale={locale} />
          ) : !liveListingsEnabled ? (
            <StaticHousingFallback locale={locale} selectedRegion={selectedRegion} />
          ) : (
            <EmptyState
              title={locale === 'zh' ? '這個城市目前沒有可顯示的房源' : 'There are no listings to show for this city yet'}
              description={
                locale === 'zh'
                  ? '可先使用上方的城市搜尋連結查看最新結果。'
                  : 'Use the city search link above to see the latest results directly.'
              }
            />
          )}
        </div>

        <aside className="space-y-5 border-l border-[#decbb8] pl-6">
          <GreaterPhoenixMap locale={locale} regions={regions} selectedRegion={selectedRegion} />

          {liveListingsEnabled ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                    {locale === 'zh' ? '精選房源' : 'Sample homes'}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-[#2b1f18] [font-family:var(--font-display)]">
                    {locale === 'zh' ? '快速比較清單' : 'Quick comparison list'}
                  </h3>
                </div>
                <ExternalLink className="mt-1 h-4 w-4 text-brand-700" aria-hidden="true" />
              </div>

              {secondaryListings.length > 0 ? (
                <div>
                  {secondaryListings.map((listing) => (
                    <ListingRow key={listing.id} listing={listing} locale={locale} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={locale === 'zh' ? '這個城市目前只有一筆可顯示房源' : 'Only one listing is available for this city right now'}
                  description={
                    locale === 'zh'
                      ? '可使用城市搜尋連結查看完整結果。'
                      : 'Use the city search link to see broader results.'
                  }
                />
              )}
            </>
          ) : (
            <div className="border-y border-[#decbb8] py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                {locale === 'zh' ? '比較時先看' : 'Compare first'}
              </p>
              <div className="mt-4 space-y-4">
                {[
                  {
                    title: locale === 'zh' ? '工作與學校' : 'Work and school',
                    body:
                      locale === 'zh'
                        ? '用實際上班與接送時段測通勤，不只看城市距離。'
                        : 'Test work and pickup routes at real travel times, not just city distance.',
                  },
                  {
                    title: locale === 'zh' ? '華人生活圈' : 'Chinese community access',
                    body:
                      locale === 'zh'
                        ? '把超市、週末中文課、醫療與家庭活動一起放進週計畫。'
                        : 'Map groceries, weekend Chinese classes, care, and family activities into the weekly plan.',
                  },
                  {
                    title: locale === 'zh' ? '夏季住宅成本' : 'Summer home costs',
                    body:
                      locale === 'zh'
                        ? '比較電費、冷氣、HOA、庭院、泳池與保險，不只比較租金或房貸。'
                        : 'Compare electric bills, AC, HOA, yard, pool, and insurance, not only rent or mortgage.',
                  },
                ].map((item) => (
                  <div key={item.title} className="border-l border-[#decbb8] pl-4">
                    <p className="text-sm font-semibold text-[#2b1f18]">{item.title}</p>
                    <p className="mt-2 text-xs leading-6 text-[#6a5547]">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {liveListingsEnabled && !hasListings ? (
        <EmptyState
          title={locale === 'zh' ? '目前暫時抓不到公開房源' : 'Live housing listings are temporarily unavailable'}
          description={
            locale === 'zh'
              ? '房源入口有時會限制自動請求。你仍然可以先閱讀指南內容，再點城市連結進入完整搜尋。'
              : 'Real-estate portals sometimes rate-limit automated requests. You can still use the guide and jump into the full city searches below.'
          }
        />
      ) : null}
    </section>
  );
}
