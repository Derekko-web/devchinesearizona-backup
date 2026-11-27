import { Building2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/EmptyState';
import { TrackedLink } from '@/components/TrackedLink';
import { advertisePath } from '@/lib/advertise';
import {
  cityCategoryPath,
  findMetroCategoryCity,
  formatListingCountLine,
  getCityCategoryIntro,
  getCityCategoryTitle,
  getLocalizedCityName,
  getMetroCategoryHeading,
  getMetroCategoryIntro,
  getMetroCategoryPageData,
  getMetroCategoryTitle,
  metroCategoryPath,
  slugifyCity,
  splitSponsoredListings,
  type MetroCategorySummary,
} from '@/lib/metro-categories';
import { t } from '@/lib/i18n';
import { absoluteUrl } from '@/lib/seo';
import { JsonLd } from '@/lib/schema';
import { withLocale } from '@/lib/routing';
import { defaultSiteProfile, hasLiveDirectoryData, type SiteProfile } from '@/lib/site-config';
import type { Business, BusinessCategory, Locale } from '@/lib/types';
import {
  buildDirectoryHref,
  DirectoryListingCard,
  sectionContainer,
} from '@/views/site-page-shared';

function DirectorySponsoredDisclosure({ locale }: { locale: Locale }) {
  return (
    <p className="text-xs leading-5 text-slate-500">
      {locale === 'zh'
        ? '贊助排序只會影響目錄列表中的顯示順序，不會改變商家的驗證、編輯或審核狀態。'
        : 'Sponsored placement only affects browse-page ordering and does not change verification, editorial, or review status.'}{' '}
      <Link
        href={`${withLocale(locale, advertisePath)}#sponsored`}
        className="font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
      >
        {locale === 'zh' ? '了解「贊助」的意思' : 'What Sponsored means'}
      </Link>
    </p>
  );
}

function localeCanonicalPath(locale: Locale, path: string): string {
  return locale === 'zh' ? withLocale('zh', path) : path;
}

function CategoryCityFilters({
  locale,
  site,
  summary,
  activeCitySlug,
}: {
  locale: Locale;
  site: SiteProfile;
  summary: MetroCategorySummary;
  activeCitySlug?: string;
}) {
  if (summary.cities.length === 0) {
    return null;
  }

  const chipClassName = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
      active
        ? 'bg-brand-600 text-white shadow-[0_14px_28px_-22px_rgba(187,61,41,0.9)]'
        : 'bg-[#f2e6d9] text-[#5f4b3f] hover:bg-[#ecdbc9] hover:text-brand-700'
    }`;
  const countClassName = (active: boolean) => `text-xs font-medium ${active ? 'text-white/80' : 'text-[#9a8575]'}`;
  const slug = summary.category.slug;

  return (
    <nav aria-label={locale === 'zh' ? '依城市篩選' : 'Filter by city'} className="flex flex-wrap gap-2">
      <Link
        href={withLocale(locale, metroCategoryPath(slug))}
        aria-current={activeCitySlug ? undefined : 'page'}
        className={chipClassName(!activeCitySlug)}
      >
        {locale === 'zh' ? '全部城市' : 'All cities'}
        <span className={countClassName(!activeCitySlug)}>{summary.count}</span>
      </Link>
      {summary.cities.map((city) => {
        const active = city.slug === activeCitySlug;
        return (
          <Link
            key={city.slug}
            href={withLocale(locale, cityCategoryPath(city.city, slug))}
            aria-current={active ? 'page' : undefined}
            className={chipClassName(active)}
          >
            {getLocalizedCityName(city.city, site, locale)}
            <span className={countClassName(active)}>{city.count}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SponsoredCategorySpots({
  locale,
  site,
  category,
  sponsored,
  pagePath,
}: {
  locale: Locale;
  site: SiteProfile;
  category: BusinessCategory;
  sponsored: Business[];
  pagePath: string;
}) {
  return (
    <section
      aria-labelledby="sponsored-category-spots"
      className="rounded-[22px] border border-brand-100 bg-[#fff6f0] px-4 py-4 shadow-[0_20px_48px_-42px_rgba(74,49,27,0.45)] sm:px-5"
    >
      <h2 id="sponsored-category-spots" className="flex flex-wrap items-baseline gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">
          {locale === 'zh' ? '贊助' : 'Sponsored'}
        </span>
        <span className="text-xs font-semibold text-[#a3826f]" lang={locale === 'zh' ? 'en' : 'zh-Hant'}>
          {locale === 'zh' ? 'Sponsored' : '贊助'}
        </span>
      </h2>
      {sponsored.length > 0 ? (
        <div className="mt-4 space-y-4">
          {sponsored.map((business) => (
            <DirectoryListingCard
              key={business.id}
              business={business}
              category={category}
              locale={locale}
              pagePath={pagePath}
              site={site}
              stateCode={site.stateCode}
            />
          ))}
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm leading-6 text-[#6d584c]">
            {locale === 'zh'
              ? '此分類的贊助版位開放中，可讓你的商家出現在本頁最上方。'
              : 'This sponsored spot is open. Put your business at the top of this page.'}
          </p>
          <Link
            href={`${withLocale(locale, advertisePath)}?plan=sponsored-category#contact`}
            className="inline-flex items-center rounded-[14px] border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-400"
          >
            {locale === 'zh' ? '成為贊助商家' : 'Sponsor this category'}
          </Link>
        </div>
      )}
      <div className="mt-3">
        <DirectorySponsoredDisclosure locale={locale} />
      </div>
    </section>
  );
}

function CategoryBreadcrumb({
  locale,
  items,
}: {
  locale: Locale;
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav
      aria-label={locale === 'zh' ? '麵包屑' : 'Breadcrumb'}
      className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#776d62]"
    >
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
          {index > 0 ? <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          {item.href ? (
            <Link href={item.href} className="transition-colors hover:text-[#b7282e]">
              {item.label}
            </Link>
          ) : (
            <span className="text-[#2c2722]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export async function MetroCategoryPageView({
  locale,
  category,
  site = defaultSiteProfile,
}: {
  locale: Locale;
  category: string;
  site?: SiteProfile;
}) {
  if (!hasLiveDirectoryData(site)) {
    return null;
  }

  const data = await getMetroCategoryPageData(category, site);
  if (!data) {
    return null;
  }

  const { summary, listings, otherCategories } = data;
  const categoryRecord = summary.category;
  const path = metroCategoryPath(categoryRecord.slug);
  const pagePath = withLocale(locale, path);
  const otherLocale: Locale = locale === 'zh' ? 'en' : 'zh';
  const heading = getMetroCategoryHeading(categoryRecord, locale);
  const title = getMetroCategoryTitle(categoryRecord, site, locale);
  const alternateTitle = getMetroCategoryTitle(categoryRecord, site, otherLocale);
  const { sponsored, organic } = splitSponsoredListings(listings);
  const businessesLabel = locale === 'zh' ? '華人商家' : 'Chinese Businesses';
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: locale === 'zh' ? '首頁' : 'Home', item: absoluteUrl(localeCanonicalPath(locale, '/'), site) },
        { '@type': 'ListItem', position: 2, name: businessesLabel, item: absoluteUrl(localeCanonicalPath(locale, '/business'), site) },
        { '@type': 'ListItem', position: 3, name: heading, item: absoluteUrl(localeCanonicalPath(locale, path), site) },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: title,
      numberOfItems: listings.length,
      itemListElement: listings.slice(0, 50).map((business, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: t(business.name, locale),
        url: absoluteUrl(localeCanonicalPath(locale, `/business/${business.slug}`), site),
      })),
    },
  ];

  return (
    <div className="flex-grow overflow-x-hidden bg-transparent text-[#261b15]">
      <JsonLd data={jsonLd} />

      <section className="bg-[#fcf8f1]">
        <div className="mx-auto max-w-7xl space-y-5 px-4 py-7 sm:px-6 sm:py-8 lg:px-8">
          <CategoryBreadcrumb
            locale={locale}
            items={[
              { label: locale === 'zh' ? '首頁' : 'Home', href: withLocale(locale, '/') },
              { label: businessesLabel, href: withLocale(locale, '/business') },
              { label: heading },
            ]}
          />

          <div className="max-w-4xl">
            <h1
              className="text-[2.6rem] font-black leading-[0.95] tracking-tight text-[#2c2019] sm:text-[3.4rem] [font-family:var(--font-display)]"
              style={{ WebkitTextStroke: '0.35px rgba(44, 32, 25, 0.42)' }}
            >
              {title}
            </h1>
            <p className="mt-3 text-lg font-semibold text-[#8d5737]" lang={otherLocale === 'zh' ? 'zh-Hant' : 'en'}>
              {alternateTitle}
            </p>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#665247]">
              {getMetroCategoryIntro(categoryRecord, site, locale)}
            </p>
            <p className="mt-3 text-sm font-semibold text-[#30231c]">{formatListingCountLine(summary, locale)}</p>
          </div>

          <CategoryCityFilters locale={locale} site={site} summary={summary} />
        </div>
      </section>

      <section className="border-b border-[#dccbbb] bg-[#fcf8f1]">
        <div className="mx-auto max-w-7xl space-y-6 px-4 pb-10 sm:px-6 lg:px-8">
          <SponsoredCategorySpots
            locale={locale}
            site={site}
            category={categoryRecord}
            sponsored={sponsored}
            pagePath={pagePath}
          />

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-[#2c2722]">
              {locale === 'zh' ? `全部${heading}` : `All ${heading}`}
            </h2>
            {organic.length === 0 ? (
              <EmptyState
                title={locale === 'zh' ? '這個分類還在成長中' : 'This category is still growing'}
                description={
                  locale === 'zh'
                    ? '目前還沒有公開商家，歡迎提交你信任的在地服務者。'
                    : 'There are no public listings here yet. Submit the providers you trust and help build local coverage.'
                }
              />
            ) : (
              organic.map((business) => (
                <DirectoryListingCard
                  key={business.id}
                  business={business}
                  category={categoryRecord}
                  locale={locale}
                  pagePath={pagePath}
                  site={site}
                  stateCode={site.stateCode}
                />
              ))
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-[#e1d0bd] bg-[#fffaf3] px-4 py-4 text-sm text-[#6d584c]">
            <p>
              {locale === 'zh'
                ? '知道這裡還少了哪家商家？歡迎新增或認領。'
                : 'Know a business that belongs here? Add or claim it.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={buildDirectoryHref(locale, { category: categoryRecord.slug })}
                className="inline-flex items-center rounded-[14px] border border-[#d9c8b6] bg-white px-4 py-2 font-semibold text-[#5c493d] transition-colors hover:border-brand-200 hover:text-brand-700"
              >
                {locale === 'zh' ? '依評分與條件篩選' : 'Filter by rating and more'}
              </Link>
              <TrackedLink
                href={withLocale(locale, '/add-business')}
                eventType="claim_click"
                className="inline-flex items-center gap-2 rounded-[14px] bg-brand-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-brand-700"
              >
                <Building2 className="h-4 w-4" aria-hidden="true" />
                {locale === 'zh' ? '新增／認領商家' : 'Add or claim a business'}
              </TrackedLink>
            </div>
          </div>

          {otherCategories.length > 0 ? (
            <nav aria-labelledby="other-categories" className="space-y-3">
              <h2 id="other-categories" className="text-lg font-semibold text-[#2c2722]">
                {locale === 'zh' ? '其他分類' : 'Other categories'}
              </h2>
              <div className="flex flex-wrap gap-2">
                {otherCategories.map((item) => (
                  <Link
                    key={item.category.slug}
                    href={withLocale(locale, metroCategoryPath(item.category.slug))}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#e3d3c2] bg-white px-3.5 py-2 text-sm font-semibold text-[#5f4b3f] transition-colors hover:border-brand-200 hover:text-brand-700"
                  >
                    {getMetroCategoryHeading(item.category, locale)}
                    <span className="text-xs font-medium text-[#9a8575]">{item.count}</span>
                  </Link>
                ))}
              </div>
            </nav>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export async function CityCategoryPageView({
  locale,
  city,
  category,
  site = defaultSiteProfile,
}: {
  locale: Locale;
  city: string;
  category: string;
  site?: SiteProfile;
}) {
  if (!hasLiveDirectoryData(site)) {
    return null;
  }

  const data = await getMetroCategoryPageData(category, site);
  if (!data) {
    return null;
  }

  const { summary } = data;
  const categoryRecord = summary.category;
  const resolvedCity = findMetroCategoryCity(summary, city);
  const listings = resolvedCity
    ? data.listings.filter((business) => slugifyCity(business.city) === resolvedCity.slug)
    : [];
  const citySlug = resolvedCity?.slug ?? slugifyCity(city);
  const cityCategoryPagePath = withLocale(locale, `/business/${citySlug}/${categoryRecord.slug}`);
  const cityLabel = resolvedCity ? getLocalizedCityName(resolvedCity.city, site, locale) : city;
  const metroTitle = getMetroCategoryTitle(categoryRecord, site, locale);
  const cityTitle = getCityCategoryTitle(categoryRecord, cityLabel, site, locale);
  const canonicalCityPath = `/business/${citySlug}/${categoryRecord.slug}`;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { name: locale === 'zh' ? '首頁' : 'Home', path: '/' },
        { name: locale === 'zh' ? '華人商家' : 'Chinese Businesses', path: '/business' },
        { name: getMetroCategoryHeading(categoryRecord, locale), path: metroCategoryPath(categoryRecord.slug) },
        { name: cityLabel, path: canonicalCityPath },
      ].map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: absoluteUrl(localeCanonicalPath(locale, item.path), site),
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: cityTitle,
      numberOfItems: listings.length,
      itemListElement: listings.slice(0, 50).map((business, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: t(business.name, locale),
        url: absoluteUrl(localeCanonicalPath(locale, `/business/${business.slug}`), site),
      })),
    },
  ];

  return sectionContainer(
    <div className="space-y-8 py-12">
      <JsonLd data={jsonLd} />
      <div className="max-w-3xl space-y-3">
        <CategoryBreadcrumb
          locale={locale}
          items={[
            { label: locale === 'zh' ? '華人商家' : 'Chinese Businesses', href: withLocale(locale, '/business') },
            { label: metroTitle, href: withLocale(locale, metroCategoryPath(categoryRecord.slug)) },
            { label: cityLabel },
          ]}
        />
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">{cityTitle}</h1>
        <p className="text-base leading-7 text-slate-600">
          {getCityCategoryIntro(categoryRecord, cityLabel, site, locale)}
        </p>
      </div>

      <CategoryCityFilters locale={locale} site={site} summary={summary} activeCitySlug={resolvedCity?.slug} />

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-sm text-slate-600">
          {locale === 'zh'
            ? `目前顯示 ${listings.length} 筆符合這個城市與分類的公開商家。`
            : `Showing ${listings.length} public listings that match this city and category.`}
        </div>
        <div className="mt-1">
          <DirectorySponsoredDisclosure locale={locale} />
        </div>
      </div>

      {listings.length === 0 ? (
        <EmptyState
          title={locale === 'zh' ? '這個城市頁面還在成長中' : 'This city landing page is still growing'}
          description={
            locale === 'zh'
              ? '目前還沒有公開商家，歡迎提交你信任的在地服務者。'
              : 'There are no public listings here yet. Submit the providers you trust and help build local coverage.'
          }
        />
      ) : (
        <div className="space-y-4">
          {listings.map((business) => (
            <DirectoryListingCard
              key={business.id}
              business={business}
              category={categoryRecord}
              locale={locale}
              pagePath={cityCategoryPagePath}
              site={site}
              stateCode={site.stateCode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
