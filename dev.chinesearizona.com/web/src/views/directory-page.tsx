import { Building2, MapPin, Search } from 'lucide-react';
import Link from 'next/link';

import { DirectoryFilters } from '@/components/DirectoryFilters';
import { EmptyState } from '@/components/EmptyState';
import { TrackedLink } from '@/components/TrackedLink';
import {
  countActiveDirectoryFilters,
  getDirectoryPage,
  getDirectoryFilterOptions,
} from '@/lib/directory';
import { isPaymentFilter, isSpokenLanguage } from '@/lib/business-bilingual';
import { t } from '@/lib/i18n';
import { isIndexableListingCount, metroCategoryPath } from '@/lib/metro-categories';
import { absoluteUrl } from '@/lib/seo';
import { JsonLd } from '@/lib/schema';
import { withLocale } from '@/lib/routing';
import { defaultSiteProfile, hasLiveDirectoryData, type SiteProfile } from '@/lib/site-config';
import type { Locale, SortOption } from '@/lib/types';
import {
  buildDirectoryHref,
  CityDataUnavailable,
  DirectoryListingCard,
  parsePageNumber,
} from '@/views/site-page-shared';

type DirectorySearchParams = {
  q?: string;
  city?: string;
  category?: string;
  language?: string;
  payment?: string;
  minRating?: string;
  sort?: string;
  page?: string;
};

const directorySortOptions: SortOption[] = [
  'featured',
  'rating',
  'reviewed',
  'alphabetical',
  'distance',
  'newest',
];

const DIRECTORY_PAGE_SIZE = 24;

const directoryQuickCategorySlugs = ['dining', 'real-estate', 'medical', 'education', 'local-services'] as const;

function parseDirectorySortOption(value?: string): SortOption {
  if (value && directorySortOptions.includes(value as SortOption)) {
    return value as SortOption;
  }

  return 'featured';
}

function parseDirectoryMinRating(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export async function DirectoryPageView({
  locale,
  searchParams,
  isHomepage = false,
  site = defaultSiteProfile,
}: {
  locale: Locale;
  searchParams: DirectorySearchParams;
  isHomepage?: boolean;
  site?: SiteProfile;
}) {
  if (!hasLiveDirectoryData(site)) {
    return (
      <div className="flex-grow overflow-x-hidden bg-transparent text-[#261b15]">
        <CityDataUnavailable
          locale={locale}
          title={
            locale === 'zh'
              ? `${site.brandName} 商家目錄尚未接入本地資料`
              : `${site.brandName} directory data is not connected yet`
          }
          description={
            locale === 'zh'
              ? '此城市設定必須先接入自己的商家來源；平台不會回退顯示 ChineseArizona 商家。'
              : 'This city config must connect its own business listing sources first; the platform will not fall back to ChineseArizona listings.'
          }
        />
      </div>
    );
  }

  const requestedPage = parsePageNumber(searchParams.page);
  const filters = {
    q: searchParams.q,
    city: searchParams.city,
    category: searchParams.category,
    language: isSpokenLanguage(searchParams.language) ? searchParams.language : undefined,
    payment: isPaymentFilter(searchParams.payment) ? searchParams.payment : undefined,
    minRating: parseDirectoryMinRating(searchParams.minRating),
    sort: parseDirectorySortOption(searchParams.sort),
  };
  const directoryPagePath = withLocale(locale, '/business');
  const [{ categories, cities, categoryCounts }, directoryPage] = await Promise.all([
    getDirectoryFilterOptions(site),
    getDirectoryPage(filters, requestedPage, DIRECTORY_PAGE_SIZE, { site, usePaidPromotion: true }),
  ]);
  const listings = directoryPage.businesses;
  const activeFilterCount = countActiveDirectoryFilters(filters);
  const categoryBySlug = categories.reduce<Record<string, (typeof categories)[number]>>((accumulator, category) => {
    accumulator[category.slug] = category;
    return accumulator;
  }, {});
  const startListingNumber =
    directoryPage.totalCount === 0 ? 0 : (directoryPage.currentPage - 1) * directoryPage.pageSize + 1;
  const endListingNumber = Math.min(
    directoryPage.currentPage * directoryPage.pageSize,
    directoryPage.totalCount
  );
  const hasListings = directoryPage.totalCount > 0;
  const pageUrl = absoluteUrl(withLocale(locale, '/'), site);
  const directoryUrl = absoluteUrl(withLocale(locale, '/business'), site);
  const homepageJsonLd = isHomepage
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: site.brandName,
          alternateName: [site.brandNameZh, site.regionName],
          url: pageUrl,
          description: locale === 'zh' ? site.description.zh : site.description.en,
        },
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: site.brandName,
          alternateName: site.brandNameZh,
          url: pageUrl,
          inLanguage: locale === 'zh' ? 'zh-Hant' : 'en-US',
          potentialAction: {
            '@type': 'SearchAction',
            target: `${directoryUrl}?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
      ]
    : null;
  const headingTitle = isHomepage
    ? site.brandName
    : locale === 'zh'
      ? '華人商家'
      : 'Chinese Businesses';
  const headingDescription = isHomepage
    ? locale === 'zh'
      ? site.description.zh
      : site.description.en
    : null;
  const quickCategories = directoryQuickCategorySlugs
    .map((slug) => categoryBySlug[slug])
    .filter((category): category is (typeof categories)[number] => Boolean(category));
  const previousPageHref =
    directoryPage.currentPage > 1
      ? buildDirectoryHref(locale, { ...filters, page: directoryPage.currentPage - 1 })
      : null;
  const nextPageHref =
    directoryPage.currentPage < directoryPage.totalPages
      ? buildDirectoryHref(locale, { ...filters, page: directoryPage.currentPage + 1 })
      : null;
  const summaryLine = hasListings
    ? locale === 'zh'
      ? activeFilterCount > 0
        ? `顯示 ${startListingNumber}-${endListingNumber}，共 ${directoryPage.totalCount} 筆`
        : `顯示 ${startListingNumber}-${endListingNumber}，共 ${directoryPage.totalCount} 筆`
      : activeFilterCount > 0
        ? `Showing ${startListingNumber}-${endListingNumber} of ${directoryPage.totalCount}`
        : `Showing ${startListingNumber}-${endListingNumber} of ${directoryPage.totalCount}`
    : locale === 'zh'
      ? activeFilterCount > 0
        ? '目前沒有符合條件的公開商家。'
        : '目前沒有公開商家。'
      : activeFilterCount > 0
        ? 'No public listings match these filters.'
        : 'There are no public listings yet.';
  const renderDirectoryNavigation = () =>
    directoryPage.totalPages > 1 ? (
      <div className="flex flex-wrap gap-3">
        {previousPageHref ? (
          <Link
            href={previousPageHref}
            className="inline-flex items-center rounded-[14px] border border-[#d9c8b6] bg-white px-4 py-2 text-sm font-semibold text-[#5c493d] transition-colors hover:border-brand-200 hover:text-brand-700"
          >
            {locale === 'zh' ? '上一頁' : 'Previous page'}
          </Link>
        ) : (
          <span className="inline-flex items-center rounded-[14px] border border-[#eadfd4] bg-[#fffaf3] px-4 py-2 text-sm font-semibold text-[#c0ab9a]">
            {locale === 'zh' ? '上一頁' : 'Previous page'}
          </span>
        )}
        {nextPageHref ? (
          <Link
            href={nextPageHref}
            className="inline-flex items-center rounded-[14px] bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_36px_-26px_rgba(187,61,41,0.9)] transition-colors hover:bg-brand-700"
          >
            {locale === 'zh' ? '下一頁' : 'Next page'}
          </Link>
        ) : (
          <span className="inline-flex items-center rounded-[14px] border border-brand-100 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-300">
            {locale === 'zh' ? '下一頁' : 'Next page'}
          </span>
        )}
      </div>
    ) : null;

  return (
    <div className="flex-grow overflow-x-hidden bg-transparent text-[#261b15]">
      {homepageJsonLd ? <JsonLd data={homepageJsonLd} /> : null}

      <section className="bg-[#fcf8f1]">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-8 lg:px-8">
          <div className="homepage-rise grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <h1
                className="text-[3rem] font-black leading-[0.9] tracking-tight text-[#2c2019] sm:text-[4rem] lg:text-[4.7rem] [font-family:var(--font-display)]"
                style={{
                  WebkitTextStroke: '0.35px rgba(44, 32, 25, 0.42)',
                }}
              >
                {headingTitle}
              </h1>
              {headingDescription ? <p className="mt-4 max-w-2xl text-base leading-7 text-[#665247]">{headingDescription}</p> : null}
            </div>

            <TrackedLink
              href={withLocale(locale, '/add-business')}
              eventType="claim_click"
              className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_-26px_rgba(187,61,41,0.9)] transition-colors hover:bg-brand-700"
            >
              <Building2 className="h-4 w-4" aria-hidden="true" />
              {locale === 'zh' ? '新增／認領商家' : 'Add or claim a business'}
            </TrackedLink>
          </div>

          <form
            action={directoryPagePath}
            method="get"
            className="homepage-rise homepage-rise-delay-1 mt-5 overflow-hidden rounded-[22px] border border-[#e3d3c2] bg-white shadow-[0_24px_54px_-44px_rgba(79,53,29,0.5)]"
          >
            {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
            {filters.minRating ? <input type="hidden" name="minRating" value={String(filters.minRating)} /> : null}
            {filters.sort && filters.sort !== 'featured' ? <input type="hidden" name="sort" value={filters.sort} /> : null}
            <div className="grid gap-px bg-[#eadbcc] md:grid-cols-[minmax(0,1fr)_170px_132px]">
              <label className="flex min-w-0 items-center gap-3 bg-white px-4 py-3.5">
                <Search className="h-5 w-5 flex-shrink-0 text-[#9a8575]" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="sr-only">{locale === 'zh' ? '搜尋關鍵字' : 'Search businesses'}</span>
                  <input
                    type="text"
                    name="q"
                    defaultValue={filters.q}
                    placeholder={locale === 'zh' ? '餐廳、學校、房仲、醫師' : 'restaurants, schools, realtors, doctors'}
                    className="w-full bg-transparent text-sm font-medium text-[#33251d] outline-none placeholder:text-[#9c8879]"
                  />
                </span>
              </label>

              <label className="flex items-center gap-3 bg-white px-4 py-3.5">
                <MapPin className="h-5 w-5 flex-shrink-0 text-[#9a8575]" aria-hidden="true" />
                <span className="sr-only">{locale === 'zh' ? '城市' : 'City'}</span>
                <select
                  name="city"
                  defaultValue={filters.city ?? ''}
                  className="w-full bg-transparent text-sm font-medium text-[#33251d] outline-none"
                >
                  <option value="">{locale === 'zh' ? '全部城市' : 'All cities'}</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 bg-brand-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                {locale === 'zh' ? '搜尋' : 'Search'}
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {quickCategories.map((category) => (
              <Link
                key={category.slug}
                // Categories with enough listings have an indexable landing page; send
                // shoppers (and search engines) there instead of a filtered copy of /business.
                href={
                  isIndexableListingCount(categoryCounts[category.slug] ?? 0)
                    ? withLocale(locale, metroCategoryPath(category.slug))
                    : buildDirectoryHref(locale, { category: category.slug })
                }
                className="homepage-card inline-flex items-center rounded-full bg-[#f2e6d9] px-3.5 py-2 text-sm font-semibold text-[#5f4b3f] transition-colors hover:bg-[#ecdbc9] hover:text-brand-700"
              >
                {t(category.name, locale)}
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="border-b border-[#dccbbb] bg-[#fcf8f1]">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[310px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <DirectoryFilters
                locale={locale}
                categories={categories}
                cities={cities}
                values={filters}
              />
            </aside>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-[#e1d0bd] bg-[#fffaf3] px-4 py-4 text-sm text-[#6d584c] shadow-[0_20px_48px_-42px_rgba(74,49,27,0.45)]">
                <div className="space-y-1.5">
                  <div className="font-semibold text-[#30231c]">{summaryLine}</div>
                </div>
                {renderDirectoryNavigation()}
              </div>

              {activeFilterCount > 0 ? (
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#7e6a5c]">
                  <span className="rounded-full bg-[#f2e6d9] px-3 py-1.5">
                    {locale === 'zh'
                      ? `已套用 ${activeFilterCount} 個篩選`
                      : `${activeFilterCount} active ${activeFilterCount === 1 ? 'filter' : 'filters'}`}
                  </span>
                </div>
              ) : null}

              {listings.length === 0 ? (
                <EmptyState
                  title={locale === 'zh' ? '目前沒有符合條件的結果' : 'No listings match these filters'}
                  description={
                    locale === 'zh'
                      ? '可以放寬篩選條件，或直接提交你想看到的商家。'
                      : 'Try broadening your search, or submit the business you wish existed here.'
                  }
                />
              ) : (
                listings.map((business) => (
                  <DirectoryListingCard
                    key={business.id}
                    business={business}
                    category={categoryBySlug[business.categorySlug]}
                    locale={locale}
                    pagePath={directoryPagePath}
                    site={site}
                    stateCode={site.stateCode}
                  />
                ))
              )}
              {directoryPage.totalPages > 1 ? (
                <div className="flex justify-end pt-2">{renderDirectoryNavigation()}</div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
