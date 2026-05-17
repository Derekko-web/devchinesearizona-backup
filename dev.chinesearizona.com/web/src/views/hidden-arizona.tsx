import { ChevronLeft, ChevronRight, Compass, ExternalLink, MapPin, Route, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { HiddenArizonaCard } from '@/components/HiddenArizonaCard';
import { HiddenArizonaMap } from '@/components/HiddenArizonaMap';
import { EmptyState } from '@/components/EmptyState';
import { hiddenArizonaKindLabel, t } from '@/lib/i18n';
import {
  getHiddenArizonaEntries,
  getHiddenArizonaEntryBySlug,
  getHiddenArizonaEntryPath,
  getHiddenArizonaFeaturedEntries,
  getHiddenArizonaFilterOptions,
  getHiddenArizonaRelatedEntries,
} from '@/lib/hidden-arizona';
import {
  resolveLocalizedHiddenArizonaCardTextList,
  resolveLocalizedHiddenArizonaDetailText,
  resolveLocalizedHiddenArizonaFilterLabelList,
  resolveLocalizedHiddenArizonaTagLabelList,
  resolveLocalizedHiddenArizonaTitleMap,
} from '@/lib/hidden-arizona-localization';
import { withLocale } from '@/lib/routing';
import { absoluteUrl } from '@/lib/seo';
import { JsonLd } from '@/lib/schema';
import type { HiddenArizonaFilters, HiddenArizonaKind, HiddenArizonaPlace, Locale } from '@/lib/types';

type HiddenArizonaSearchParams = {
  q?: string;
  kind?: string;
  city?: string;
  tag?: string;
  view?: string;
  page?: string;
};

type HiddenArizonaViewMode = 'list' | 'map';

const HIDDEN_ARIZONA_ENTRIES_PER_PAGE = 6;

function sectionContainer(children: React.ReactNode) {
  return <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>;
}

function parseKind(value?: string): HiddenArizonaFilters['kind'] {
  if (!value || value === 'all') {
    return 'all';
  }

  if (value === 'place' || value === 'story' || value === 'list' || value === 'itinerary') {
    return value;
  }

  return 'all';
}

function parseViewMode(value?: string): HiddenArizonaViewMode {
  return value === 'map' ? 'map' : 'list';
}

function parsePageNumber(value?: string): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildPaginationItems(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 1) {
    return [1];
  }

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
  }

  const sortedPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  const items: Array<number | 'ellipsis'> = [];
  let previousPage: number | null = null;

  sortedPages.forEach((page) => {
    if (previousPage !== null && page - previousPage > 1) {
      items.push('ellipsis');
    }

    items.push(page);
    previousPage = page;
  });

  return items;
}

function buildHubHref(locale: Locale, values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value && value !== 'all') {
      params.set(key, value);
    }
  });
  const query = params.toString();
  return `${withLocale(locale, '/hidden-arizona')}${query ? `?${query}` : ''}`;
}

function isPlaceEntry(entry: ReturnType<typeof getHiddenArizonaEntries>[number]): entry is HiddenArizonaPlace {
  return entry.kind === 'place';
}

function prioritizeSelection(values: string[], selected?: string) {
  if (!selected || !values.includes(selected)) {
    return values;
  }

  return [selected, ...values.filter((value) => value !== selected)];
}

export function HiddenArizonaTeaser({ locale }: { locale: Locale }) {
  const featuredEntries = getHiddenArizonaFeaturedEntries(3);
  if (featuredEntries.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-amber-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_40%),linear-gradient(135deg,_#fff7ed,_#ffffff)] p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
            {locale === 'zh' ? '亞利桑那秘境' : 'Hidden Arizona'}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            {locale === 'zh' ? '把 Atlas Obscura 的 Arizona 發現路線加進站內探索' : 'Add a new layer of Arizona discovery beyond the business directory'}
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            {locale === 'zh'
              ? '新的亞利桑那秘境區塊把 Atlas Obscura 授權內容整理成可搜尋、可地圖瀏覽、可雙語閱讀的在地發現入口。'
              : 'The new Hidden Arizona section turns licensed Atlas Obscura Arizona entries into a searchable, bilingual discovery layer with map browsing and editorial context.'}
          </p>
        </div>

        <Link
          href={withLocale(locale, '/hidden-arizona')}
          className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
        >
          <Compass className="h-4 w-4" />
          {locale === 'zh' ? '打開亞利桑那秘境' : 'Open Hidden Arizona'}
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {featuredEntries.map((entry) => (
          <HiddenArizonaCard key={entry.slug} entry={entry} locale={locale} />
        ))}
      </div>
    </section>
  );
}

export async function HiddenArizonaHubPageView({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: HiddenArizonaSearchParams;
}) {
  const filters: HiddenArizonaFilters = {
    q: searchParams.q,
    kind: parseKind(searchParams.kind),
    city: searchParams.city,
    tag: searchParams.tag,
  };
  const viewMode = parseViewMode(searchParams.view);
  const currentPageRequest = parsePageNumber(searchParams.page);
  const entries = getHiddenArizonaEntries(filters);
  const places = entries.filter(isPlaceEntry);
  const totalEntries = entries.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / HIDDEN_ARIZONA_ENTRIES_PER_PAGE));
  const currentPage = Math.min(currentPageRequest, totalPages);
  const pageStartIndex = (currentPage - 1) * HIDDEN_ARIZONA_ENTRIES_PER_PAGE;
  const paginatedEntries = entries.slice(pageStartIndex, pageStartIndex + HIDDEN_ARIZONA_ENTRIES_PER_PAGE);
  const paginationItems = buildPaginationItems(currentPage, totalPages);
  const visibleRangeStart = totalEntries === 0 ? 0 : pageStartIndex + 1;
  const visibleRangeEnd = totalEntries === 0 ? 0 : pageStartIndex + paginatedEntries.length;
  const pageStatusLabel =
    locale === 'zh' ? `第 ${currentPage} / ${totalPages} 頁` : `Page ${currentPage} of ${totalPages}`;
  const pageRangeSummary =
    locale === 'zh'
      ? `本頁顯示第 ${visibleRangeStart}-${visibleRangeEnd} 筆`
      : `Entries ${visibleRangeStart}-${visibleRangeEnd} on this page`;
  const resultsSummary =
    totalEntries === 0
      ? locale === 'zh'
        ? '目前沒有亞利桑那秘境項目'
        : 'Showing 0 Hidden Arizona entries'
      : locale === 'zh'
        ? `目前顯示第 ${visibleRangeStart}-${visibleRangeEnd} 筆，共 ${totalEntries} 筆亞利桑那秘境項目`
        : `Showing ${visibleRangeStart}-${visibleRangeEnd} of ${totalEntries} Hidden Arizona entries`;
  const { cities, tags } = getHiddenArizonaFilterOptions();

  const tabs: Array<{ kind: HiddenArizonaFilters['kind']; label: string }> = [
    { kind: 'all', label: locale === 'zh' ? '全部' : 'All' },
    { kind: 'place', label: locale === 'zh' ? '地點' : 'Places' },
    { kind: 'story', label: locale === 'zh' ? '故事' : 'Stories' },
    { kind: 'list', label: locale === 'zh' ? '清單' : 'Lists' },
    { kind: 'itinerary', label: locale === 'zh' ? '行程' : 'Itineraries' },
  ];

  const activeKind = filters.kind ?? 'all';
  const showMapToggle = activeKind === 'place';
  const showCityFilters = showMapToggle || Boolean(filters.city);
  const prioritizedCities = showCityFilters ? prioritizeSelection(cities, filters.city) : [];
  const prioritizedTags = prioritizeSelection(tags, filters.tag);
  const [localizedCities, localizedTags, localizedPaginatedEntries, localizedMapTitleBySlug] = await Promise.all([
    resolveLocalizedHiddenArizonaFilterLabelList(prioritizedCities, locale),
    resolveLocalizedHiddenArizonaTagLabelList(prioritizedTags, locale),
    resolveLocalizedHiddenArizonaCardTextList(paginatedEntries, locale),
    showMapToggle && viewMode === 'map' ? resolveLocalizedHiddenArizonaTitleMap(places, locale) : Promise.resolve({}),
  ]);
  const localizedCardTextBySlug = new Map(
    localizedPaginatedEntries.map(({ entry, localizedText }) => [entry.slug, localizedText])
  );
  const featuredCities = localizedCities.slice(0, 12);
  const overflowCities = localizedCities.slice(12);
  const featuredTags = localizedTags.slice(0, 12);
  const overflowTags = localizedTags.slice(12);
  const buildPaginationHref = (page: number) =>
    buildHubHref(locale, {
      q: filters.q,
      kind: activeKind === 'all' ? undefined : activeKind,
      city: filters.city,
      tag: filters.tag,
      view: showMapToggle ? viewMode : undefined,
      page: page === 1 ? undefined : String(page),
    });
  const previousPageHref = currentPage > 1 ? buildPaginationHref(currentPage - 1) : null;
  const nextPageHref = currentPage < totalPages ? buildPaginationHref(currentPage + 1) : null;
  const renderPageStepButton = (direction: 'previous' | 'next') => {
    const isPrevious = direction === 'previous';
    const href = isPrevious ? previousPageHref : nextPageHref;
    const label = locale === 'zh' ? (isPrevious ? '上一頁' : '下一頁') : isPrevious ? 'Previous' : 'Next';
    const icon = isPrevious ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />;
    const content = isPrevious ? (
      <>
        {icon}
        {label}
      </>
    ) : (
      <>
        {label}
        {icon}
      </>
    );

    if (!href) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-400">
          {content}
        </span>
      );
    }

    return (
      <Link
        href={href}
        rel={isPrevious ? 'prev' : 'next'}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
      >
        {content}
      </Link>
    );
  };

  return sectionContainer(
    <div className="space-y-6 py-10">
      <div className="space-y-3 rounded-3xl border border-amber-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.2),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(194,65,12,0.14),_transparent_34%),linear-gradient(135deg,_#fffbeb,_#fff7ed_52%,_#ffffff)] p-6 shadow-[0_18px_45px_rgba(120,53,15,0.08)] md:p-7">
        <div className="inline-flex rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
          {locale === 'zh' ? '亞利桑那秘境' : 'Hidden Arizona'}
        </div>
        <div className="max-w-4xl space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            {locale === 'zh' ? '把 Arizona 的奇妙地點、故事與行程放進同一張探索地圖' : "Arizona's hidden side"}
          </h1>
          <p className="text-base leading-7 text-slate-600">
            {locale === 'zh'
              ? '奇異地點、難忘故事與公路旅行靈感'
              : 'Strange places, unforgettable stories, and road-trip ideas'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const href = buildHubHref(locale, {
              q: filters.q,
              kind: tab.kind === 'all' ? undefined : tab.kind,
              city: tab.kind === 'place' ? filters.city : undefined,
              tag: filters.tag,
              view: tab.kind === 'place' ? viewMode : undefined,
            });
            const active = tab.kind === activeKind;
            return (
              <Link
                key={tab.label}
                href={href}
                className={[
                  'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                  active ? 'bg-brand-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                ].join(' ')}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <form action={withLocale(locale, '/hidden-arizona')} method="get" className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 shadow-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              id="q"
              name="q"
              defaultValue={filters.q}
              placeholder={locale === 'zh' ? '搜尋地點、故事、行程、主題…' : 'Search places, stories, itineraries, themes...'}
              className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-700 outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {activeKind && activeKind !== 'all' ? <input type="hidden" name="kind" value={activeKind} /> : null}
            {filters.city ? <input type="hidden" name="city" value={filters.city} /> : null}
            {filters.tag ? <input type="hidden" name="tag" value={filters.tag} /> : null}
            {showMapToggle ? <input type="hidden" name="view" value={viewMode} /> : null}
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
            >
              {locale === 'zh' ? '套用搜尋' : 'Apply search'}
            </button>
            <Link
              href={withLocale(locale, '/hidden-arizona')}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              {locale === 'zh' ? '清除' : 'Reset'}
            </Link>
          </div>
        </form>

        {showCityFilters && cities.length > 0 ? (
          <div className="mt-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {locale === 'zh' ? '城市' : 'Cities'}
              </div>
              {overflowCities.length > 0 ? (
                <div className="text-xs text-slate-400">
                  {locale === 'zh' ? `共 ${cities.length} 個城市` : `${cities.length} cities`}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {featuredCities.map((city) => {
                const href = buildHubHref(locale, {
                  q: filters.q,
                  kind: activeKind === 'place' ? 'place' : undefined,
                  city: filters.city === city.value ? undefined : city.value,
                  tag: filters.tag,
                  view: showMapToggle ? viewMode : undefined,
                });
                const active = filters.city === city.value;
                return (
                  <Link
                    key={city.value}
                    href={href}
                    className={[
                      'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                      active ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                    ].join(' ')}
                  >
                    {city.label}
                  </Link>
                );
              })}
            </div>
            {overflowCities.length > 0 ? (
              <details className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <summary className="cursor-pointer text-sm font-medium text-slate-600">
                  {locale === 'zh' ? `更多城市 (${overflowCities.length})` : `More cities (${overflowCities.length})`}
                </summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  {overflowCities.map((city) => {
                    const href = buildHubHref(locale, {
                      q: filters.q,
                      kind: activeKind === 'place' ? 'place' : undefined,
                      city: filters.city === city.value ? undefined : city.value,
                      tag: filters.tag,
                      view: showMapToggle ? viewMode : undefined,
                    });
                    const active = filters.city === city.value;
                    return (
                      <Link
                        key={city.value}
                        href={href}
                        className={[
                          'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                          active ? 'bg-amber-100 text-amber-900' : 'bg-white text-slate-600 hover:bg-slate-200',
                        ].join(' ')}
                      >
                        {city.label}
                      </Link>
                    );
                  })}
                </div>
              </details>
            ) : null}
          </div>
        ) : null}

        {tags.length > 0 ? (
          <div className="mt-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {locale === 'zh' ? '主題標籤' : 'Tag focus'}
              </div>
              {overflowTags.length > 0 ? (
                <div className="text-xs text-slate-400">
                  {locale === 'zh' ? `顯示 ${featuredTags.length} / ${tags.length}` : `Showing ${featuredTags.length} of ${tags.length}`}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {featuredTags.map((tag) => {
                const href = buildHubHref(locale, {
                  q: filters.q,
                  kind: activeKind === 'all' ? undefined : activeKind,
                  city: filters.city,
                  tag: filters.tag === tag.value ? undefined : tag.value,
                  view: showMapToggle ? viewMode : undefined,
                });
                const active = filters.tag === tag.value;
                return (
                  <Link
                    key={tag.value}
                    href={href}
                    className={[
                      'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                      active ? 'bg-sky-100 text-sky-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                    ].join(' ')}
                  >
                    {tag.label}
                  </Link>
                );
              })}
            </div>
            {overflowTags.length > 0 ? (
              <details className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <summary className="cursor-pointer text-sm font-medium text-slate-600">
                  {locale === 'zh' ? `更多標籤 (${overflowTags.length})` : `More tags (${overflowTags.length})`}
                </summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  {overflowTags.map((tag) => {
                    const href = buildHubHref(locale, {
                      q: filters.q,
                      kind: activeKind === 'all' ? undefined : activeKind,
                      city: filters.city,
                      tag: filters.tag === tag.value ? undefined : tag.value,
                      view: showMapToggle ? viewMode : undefined,
                    });
                    const active = filters.tag === tag.value;
                    return (
                      <Link
                        key={tag.value}
                        href={href}
                        className={[
                          'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                          active ? 'bg-sky-100 text-sky-900' : 'bg-white text-slate-600 hover:bg-slate-200',
                        ].join(' ')}
                      >
                        {tag.label}
                      </Link>
                    );
                  })}
                </div>
              </details>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span>{resultsSummary}</span>
          {totalPages > 1 ? (
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {pageStatusLabel}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {showMapToggle ? (
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
              {(['list', 'map'] as const).map((mode) => {
                const href = buildHubHref(locale, {
                  q: filters.q,
                  kind: 'place',
                  city: filters.city,
                  tag: filters.tag,
                  view: mode,
                  page: currentPage > 1 ? String(currentPage) : undefined,
                });
                const active = viewMode === mode;
                return (
                  <Link
                    key={mode}
                    href={href}
                    className={[
                      'rounded-full px-3 py-1.5 text-sm font-semibold transition-colors',
                      active ? 'bg-brand-900 text-white' : 'text-slate-600 hover:bg-slate-100',
                    ].join(' ')}
                  >
                    {locale === 'zh'
                      ? mode === 'map'
                        ? '地圖'
                        : '列表'
                      : mode === 'map'
                        ? 'Map'
                        : 'List'}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title={locale === 'zh' ? '目前沒有符合條件的亞利桑那秘境項目' : 'No Hidden Arizona entries match these filters'}
          description={
            locale === 'zh'
              ? '可以改成較寬鬆的搜尋，或先回到全部項目繼續探索。'
              : 'Try a broader search, or reset the filters to explore the full Arizona set.'
          }
        />
      ) : (
        <div className="space-y-6">
          {totalPages > 1 ? (
            <nav
              aria-label={locale === 'zh' ? '頁首亞利桑那秘境分頁' : 'Hidden Arizona top pagination'}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                  {pageStatusLabel}
                </span>
                <span>{pageRangeSummary}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {renderPageStepButton('previous')}
                {renderPageStepButton('next')}
              </div>
            </nav>
          ) : null}
          {showMapToggle && viewMode === 'map' ? (
            <HiddenArizonaMap entries={places} locale={locale} localizedTitleBySlug={localizedMapTitleBySlug} />
          ) : null}
          <div className="grid gap-5 [grid-auto-rows:1fr] lg:grid-cols-2 xl:grid-cols-3">
            {paginatedEntries.map((entry) => {
              const localizedCardText = localizedCardTextBySlug.get(entry.slug);

              return (
                <HiddenArizonaCard
                  key={entry.slug}
                  entry={entry}
                  locale={locale}
                  localizedTitle={localizedCardText?.title}
                  localizedExcerpt={localizedCardText?.excerpt}
                  localizedCityLabel={localizedCardText?.cityLabel}
                  localizedTags={localizedCardText?.tags}
                />
              );
            })}
          </div>
          {totalPages > 1 ? (
            <nav
              aria-label={locale === 'zh' ? '亞利桑那秘境分頁' : 'Hidden Arizona pagination'}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                  {pageStatusLabel}
                </span>
                <span>{pageRangeSummary}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {renderPageStepButton('previous')}

                {paginationItems.map((item, index) =>
                  item === 'ellipsis' ? (
                    <span key={`ellipsis-${index}`} className="px-1 text-sm text-slate-400">
                      ...
                    </span>
                  ) : (
                    <Link
                      key={item}
                      href={buildPaginationHref(item)}
                      aria-current={item === currentPage ? 'page' : undefined}
                      className={[
                        'inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors',
                        item === currentPage
                          ? 'bg-brand-900 text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                      ].join(' ')}
                    >
                      {item}
                    </Link>
                  )
                )}

                {renderPageStepButton('next')}
              </div>
            </nav>
          ) : null}
        </div>
      )}
    </div>
  );
}

export async function HiddenArizonaDetailPageView({
  locale,
  kind,
  slug,
}: {
  locale: Locale;
  kind: HiddenArizonaKind;
  slug: string;
}) {
  const entry = getHiddenArizonaEntryBySlug(kind, slug);
  if (!entry) {
    return null;
  }

  const relatedEntries = getHiddenArizonaRelatedEntries(entry, 3);
  const [localizedEntry, localizedRelatedEntries] = await Promise.all([
    resolveLocalizedHiddenArizonaDetailText(entry, locale),
    resolveLocalizedHiddenArizonaCardTextList(relatedEntries, locale),
  ]);
  const localizedRelatedCardTextBySlug = new Map(
    localizedRelatedEntries.map(({ entry: relatedEntry, localizedText }) => [relatedEntry.slug, localizedText])
  );
  const jsonLd =
    entry.kind === 'place'
      ? {
          '@context': 'https://schema.org',
          '@type': 'TouristAttraction',
          name: localizedEntry.title,
          description: localizedEntry.excerpt,
          image: entry.heroImage ? [entry.heroImage, ...entry.gallery] : entry.gallery,
          url: absoluteUrl(withLocale(locale, getHiddenArizonaEntryPath(entry))),
          address: entry.address,
          geo: entry.coordinates
            ? {
                '@type': 'GeoCoordinates',
                latitude: entry.coordinates.lat,
                longitude: entry.coordinates.lng,
              }
            : undefined,
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: localizedEntry.title,
          description: localizedEntry.excerpt,
          image: entry.heroImage ? [entry.heroImage, ...entry.gallery] : entry.gallery,
          url: absoluteUrl(withLocale(locale, getHiddenArizonaEntryPath(entry))),
          datePublished: entry.publishedAt,
          dateModified: entry.updatedAt,
        };

  return sectionContainer(
    <div className="space-y-10 py-12">
      <JsonLd data={jsonLd} />

      <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative h-80 w-full bg-slate-200">
          {entry.heroImage ? (
            <Image
              src={entry.heroImage}
              alt={`${localizedEntry.title} ${locale === 'zh' ? '封面圖' : 'cover image'}`}
              fill
              sizes="100vw"
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.16),_transparent_30%),linear-gradient(135deg,_#e2e8f0,_#f8fafc)]" />
          )}
        </div>

        <div className="space-y-8 p-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                {hiddenArizonaKindLabel(entry.kind, locale)}
              </span>
              {entry.kind === 'place' && localizedEntry.cityLabel ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
                  <MapPin className="h-4 w-4" />
                  {localizedEntry.cityLabel}
                </span>
              ) : null}
            </div>

            <div className="max-w-4xl space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">{localizedEntry.title}</h1>
              <p className="text-lg leading-8 text-slate-600">{localizedEntry.excerpt}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={entry.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
              >
                <ExternalLink className="h-4 w-4" />
                {locale === 'zh' ? '查看 Atlas 原始頁' : 'Open original Atlas page'}
              </a>
              {entry.kind === 'place' && entry.visitWebsite ? (
                <a
                  href={entry.visitWebsite}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Route className="h-4 w-4" />
                  {locale === 'zh' ? '官方造訪資訊' : 'Visit website'}
                </a>
              ) : null}
              {entry.kind === 'place' && entry.directionsUrl ? (
                <a
                  href={entry.directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <MapPin className="h-4 w-4" />
                  {locale === 'zh' ? '路線' : 'Directions'}
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.4fr,0.8fr]">
            <div className="space-y-8">
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900">
                  {entry.kind === 'place'
                    ? locale === 'zh'
                      ? '關於這個地點'
                      : 'About'
                    : locale === 'zh'
                      ? '內容摘要'
                      : 'Story'}
                </h2>
                <div className="space-y-4">
                  {localizedEntry.body.map((paragraph, index) => (
                    <p key={`${entry.slug}-body-${index}`} className="text-base leading-8 text-slate-700">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>

              {entry.kind === 'place' && localizedEntry.knowBeforeYouGo.length > 0 ? (
                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {locale === 'zh' ? '行前須知' : 'Know Before You Go'}
                  </h2>
                  <div className="mt-4 space-y-3">
                    {localizedEntry.knowBeforeYouGo.map((paragraph, index) => (
                      <p key={`${entry.slug}-travel-note-${index}`} className="text-sm leading-7 text-slate-700">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ) : null}

              {entry.gallery.length > 0 ? (
                <section className="space-y-4">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {locale === 'zh' ? '延伸圖集' : 'Gallery'}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {entry.gallery.slice(0, 6).map((imageUrl) => (
                      <div key={imageUrl} className="relative h-52 overflow-hidden rounded-2xl bg-slate-200">
                        <Image
                          src={imageUrl}
                          alt={`${localizedEntry.title} ${locale === 'zh' ? '圖集照片' : 'gallery image'}`}
                          fill
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  {locale === 'zh' ? '來源與授權' : 'Source and license'}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {locale === 'zh'
                    ? '這筆內容來自已授權的 Atlas Obscura Arizona 內容同步，頁面保留原始來源連結與稽核欄位。'
                    : 'This entry is part of the licensed Atlas Obscura Arizona sync and keeps source attribution plus source-audit fields.'}
                </p>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-900">{locale === 'zh' ? '來源' : 'Source'}:</span> {entry.sourceName}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">{locale === 'zh' ? '原始 ID' : 'Source ID'}:</span> {entry.sourceId}
                  </div>
                </div>
              </section>

              {entry.kind === 'place' ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  {locale === 'zh' ? '位置資訊' : 'Location'}
                </h2>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                    {localizedEntry.cityLabel ? (
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                        <span>{localizedEntry.cityLabel}</span>
                      </div>
                    ) : null}
                    {entry.address ? (
                      <div className="flex items-start gap-2">
                        <Route className="mt-0.5 h-4 w-4 text-slate-400" />
                        <span>{entry.address}</span>
                      </div>
                    ) : null}
                    {entry.coordinates ? (
                      <div className="flex items-start gap-2">
                        <Compass className="mt-0.5 h-4 w-4 text-slate-400" />
                        <span>
                          {entry.coordinates.lat.toFixed(6)}, {entry.coordinates.lng.toFixed(6)}
                        </span>
                      </div>
                    ) : (
                      <p>{locale === 'zh' ? '目前沒有公開座標資料。' : 'Public coordinates are not available for this entry yet.'}</p>
                    )}
                  </div>
                </section>
              ) : null}

              {entry.relatedLinks.length > 0 ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {locale === 'zh' ? '更多 Atlas 相關連結' : 'More Atlas links'}
                  </h2>
                  <div className="mt-4 space-y-3">
                    {entry.relatedLinks.slice(0, 5).map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        <span>{t(link.label, locale)}</span>
                        <ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                      </a>
                    ))}
                  </div>
                </section>
              ) : null}
            </aside>
          </div>
        </div>
      </article>

      {relatedEntries.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">
              {locale === 'zh' ? '延伸 Arizona 發現' : 'More Arizona discoveries'}
            </h2>
            <Link
              href={withLocale(locale, '/hidden-arizona')}
              className="text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              {locale === 'zh' ? '回到總覽' : 'Back to hub'}
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {relatedEntries.map((relatedEntry) => {
              const localizedCardText = localizedRelatedCardTextBySlug.get(relatedEntry.slug);

              return (
                <HiddenArizonaCard
                  key={relatedEntry.slug}
                  entry={relatedEntry}
                  locale={locale}
                  localizedTitle={localizedCardText?.title}
                  localizedExcerpt={localizedCardText?.excerpt}
                  localizedCityLabel={localizedCardText?.cityLabel}
                  localizedTags={localizedCardText?.tags}
                />
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
