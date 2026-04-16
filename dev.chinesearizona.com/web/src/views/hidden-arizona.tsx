import { Compass, ExternalLink, MapPin, Route, Search } from 'lucide-react';
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
};

type HiddenArizonaViewMode = 'list' | 'map';

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
            {locale === 'zh' ? 'Hidden Arizona' : 'Hidden Arizona'}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            {locale === 'zh' ? '把 Atlas Obscura 的 Arizona 發現路線加進站內探索' : 'Add a new layer of Arizona discovery beyond the business directory'}
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            {locale === 'zh'
              ? '新的 Hidden Arizona 區塊把 Atlas Obscura 授權內容整理成可搜尋、可地圖瀏覽、可雙語閱讀的在地發現入口。'
              : 'The new Hidden Arizona section turns licensed Atlas Obscura Arizona entries into a searchable, bilingual discovery layer with map browsing and editorial context.'}
          </p>
        </div>

        <Link
          href={withLocale(locale, '/hidden-arizona')}
          className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
        >
          <Compass className="h-4 w-4" />
          {locale === 'zh' ? '打開 Hidden Arizona' : 'Open Hidden Arizona'}
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

export function HiddenArizonaHubPageView({
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
  const entries = getHiddenArizonaEntries(filters);
  const places = entries.filter(isPlaceEntry);
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

  return sectionContainer(
    <div className="space-y-8 py-12">
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.12),_transparent_34%),linear-gradient(135deg,_#ffffff,_#f8fafc)] p-8 shadow-sm">
        <div className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
          {locale === 'zh' ? '亞利桑那秘境' : 'Hidden Arizona'}
        </div>
        <div className="max-w-4xl space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            {locale === 'zh' ? '把 Arizona 的奇妙地點、故事與行程放進同一張探索地圖' : 'One discovery hub for Arizona places, stories, lists, and itineraries'}
          </h1>
          <p className="text-base leading-7 text-slate-600">
            {locale === 'zh'
              ? '這個區塊把授權 Atlas Obscura Arizona 內容整理成站內可搜尋、可切換地圖／列表、可雙語閱讀的探索入口。'
              : 'This section republishes licensed Atlas Obscura Arizona content as a bilingual hub with search, filters, map browsing for places, and linked editorial detail pages.'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const href = buildHubHref(locale, {
              q: filters.q,
              kind: tab.kind === 'all' ? undefined : tab.kind,
              city: filters.city,
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

        <form action={withLocale(locale, '/hidden-arizona')} method="get" className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 shadow-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              id="q"
              name="q"
              defaultValue={filters.q}
              placeholder={locale === 'zh' ? '搜尋地點、故事、行程、主題…' : 'Search places, stories, itineraries, themes...'}
              className="w-full bg-transparent px-3 py-3 text-sm text-slate-700 outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {activeKind && activeKind !== 'all' ? <input type="hidden" name="kind" value={activeKind} /> : null}
            {filters.city ? <input type="hidden" name="city" value={filters.city} /> : null}
            {filters.tag ? <input type="hidden" name="tag" value={filters.tag} /> : null}
            {showMapToggle ? <input type="hidden" name="view" value={viewMode} /> : null}
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
            >
              {locale === 'zh' ? '套用搜尋' : 'Apply search'}
            </button>
            <Link
              href={withLocale(locale, '/hidden-arizona')}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              {locale === 'zh' ? '清除' : 'Reset'}
            </Link>
          </div>
        </form>

        {cities.length > 0 ? (
          <div className="mt-5 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {locale === 'zh' ? '城市' : 'Cities'}
            </div>
            <div className="flex flex-wrap gap-2">
              {cities.map((city) => {
                const href = buildHubHref(locale, {
                  q: filters.q,
                  kind: activeKind === 'all' ? undefined : activeKind,
                  city: filters.city === city ? undefined : city,
                  tag: filters.tag,
                  view: showMapToggle ? viewMode : undefined,
                });
                const active = filters.city === city;
                return (
                  <Link
                    key={city}
                    href={href}
                    className={[
                      'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                      active ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                    ].join(' ')}
                  >
                    {city}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        {tags.length > 0 ? (
          <div className="mt-5 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {locale === 'zh' ? '主題標籤' : 'Tag focus'}
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const href = buildHubHref(locale, {
                  q: filters.q,
                  kind: activeKind === 'all' ? undefined : activeKind,
                  city: filters.city,
                  tag: filters.tag === tag ? undefined : tag,
                  view: showMapToggle ? viewMode : undefined,
                });
                const active = filters.tag === tag;
                return (
                  <Link
                    key={tag}
                    href={href}
                    className={[
                      'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                      active ? 'bg-sky-100 text-sky-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                    ].join(' ')}
                  >
                    {tag}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <span>
          {locale === 'zh'
            ? `目前顯示 ${entries.length} 筆 Hidden Arizona 項目`
            : `Showing ${entries.length} Hidden Arizona entries`}
        </span>
        {showMapToggle ? (
          <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
            {(['list', 'map'] as const).map((mode) => {
              const href = buildHubHref(locale, {
                q: filters.q,
                kind: 'place',
                city: filters.city,
                tag: filters.tag,
                view: mode,
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

      {entries.length === 0 ? (
        <EmptyState
          title={locale === 'zh' ? '目前沒有符合條件的 Hidden Arizona 項目' : 'No Hidden Arizona entries match these filters'}
          description={
            locale === 'zh'
              ? '可以改成較寬鬆的搜尋，或先回到全部項目繼續探索。'
              : 'Try a broader search, or reset the filters to explore the full Arizona set.'
          }
        />
      ) : (
        <div className="space-y-6">
          {showMapToggle && viewMode === 'map' ? <HiddenArizonaMap entries={places} locale={locale} /> : null}
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {entries.map((entry) => (
              <HiddenArizonaCard key={entry.slug} entry={entry} locale={locale} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function HiddenArizonaDetailPageView({
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
  const jsonLd =
    entry.kind === 'place'
      ? {
          '@context': 'https://schema.org',
          '@type': 'TouristAttraction',
          name: entry.title.en,
          description: entry.excerpt.en,
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
          headline: entry.title.en,
          description: entry.excerpt.en,
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
              alt={`${t(entry.title, locale)} ${locale === 'zh' ? '封面圖' : 'cover image'}`}
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
              {entry.kind === 'place' && entry.city ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
                  <MapPin className="h-4 w-4" />
                  {entry.city}
                </span>
              ) : null}
            </div>

            <div className="max-w-4xl space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t(entry.title, locale)}</h1>
              <p className="text-lg leading-8 text-slate-600">{t(entry.excerpt, locale)}</p>
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
                  {entry.body.map((paragraph, index) => (
                    <p key={`${entry.slug}-body-${index}`} className="text-base leading-8 text-slate-700">
                      {t(paragraph, locale)}
                    </p>
                  ))}
                </div>
              </section>

              {entry.kind === 'place' && entry.knowBeforeYouGo && entry.knowBeforeYouGo.length > 0 ? (
                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {locale === 'zh' ? '行前須知' : 'Know Before You Go'}
                  </h2>
                  <div className="mt-4 space-y-3">
                    {entry.knowBeforeYouGo.map((paragraph, index) => (
                      <p key={`${entry.slug}-travel-note-${index}`} className="text-sm leading-7 text-slate-700">
                        {t(paragraph, locale)}
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
                          alt={`${t(entry.title, locale)} ${locale === 'zh' ? '圖集照片' : 'gallery image'}`}
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
                    {entry.city ? (
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                        <span>{entry.city}</span>
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
            {relatedEntries.map((relatedEntry) => (
              <HiddenArizonaCard key={relatedEntry.slug} entry={relatedEntry} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
