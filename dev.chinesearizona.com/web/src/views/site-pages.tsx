import { BadgeCheck, Building2, CalendarDays, Clock3, ExternalLink, FileWarning, MapPin, Newspaper, ShieldAlert, Star, UserRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { BusinessImage } from '@/components/BusinessImage';
import { BusinessCard } from '@/components/BusinessCard';
import { CommunityCard } from '@/components/CommunityCard';
import { DirectoryFilters } from '@/components/DirectoryFilters';
import { EmptyState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import { GuideCard } from '@/components/GuideCard';
import { TrackedLink } from '@/components/TrackedLink';
import { TrustBadges } from '@/components/TrustBadges';
import { BusinessClaimForm } from '@/components/forms/BusinessClaimForm';
import { CommunityPostComposer } from '@/components/forms/CommunityPostComposer';
import { ReportIssueForm } from '@/components/forms/ReportIssueForm';
import { resolveArticleText, resolveLocalizedTextList } from '@/lib/article-localization';
import {
  getAdminSnapshot,
  getArticlePage,
  getArticleBySlug,
  getArticles,
  getBusinessReviews,
  getEventBySlug,
  getEvents,
  getGuideBySlug,
  getGuides,
  getPostsByAuthor,
  getProfileBySlug,
  getRelatedBusinesses,
  getRelatedEvents,
  getCommunityPostBySlug,
  getCommunityPosts,
  shouldNoIndexCommunityPost,
} from '@/lib/content';
import {
  countActiveDirectoryFilters,
  getDirectoryBusinesses,
  getDirectoryBusinessBySlug,
  getDirectoryCategories,
  getDirectoryFilterOptions,
} from '@/lib/directory';
import {
  getModerationReportsSnapshot,
  getPendingBusinessClaimsSnapshot,
} from '@/lib/directory-moderation';
import {
  articleCategoryLabel,
  articleSeriesLabel,
  businessHoursLabel,
  businessHoursValue,
  descriptiveImageAlt,
  destinationSurfaceLabel,
  directoryFollowUpActionLabel,
  directoryFollowUpStatusLabel,
  formatDate,
  formatDateTime,
  formatLanguageList,
  formatReadTime,
  freshnessTierLabel,
  guideSectionLabel,
  personaTargetLabel,
  profileRoleLabel,
  reportReasonLabel,
  signalDeskReviewStatusLabel,
  sourcePolicyLabel,
  sourceTypeLabel,
  t,
  verificationStateLabel,
} from '@/lib/i18n';
import { phoneHref } from '@/lib/phone';
import { absoluteUrl } from '@/lib/seo';
import { JsonLd } from '@/lib/schema';
import { withLocale } from '@/lib/routing';
import { getMonitoredSources, getSignalDeskQueue, getSignalDeskSummary } from '@/lib/signal-desk';
import type {
  Article,
  Business,
  BusinessCategory,
  CommunityPostType,
  Locale,
  SortOption,
} from '@/lib/types';
import {
  HiddenArizonaTeaser,
} from '@/views/hidden-arizona';

export { HiddenArizonaDetailPageView, HiddenArizonaHubPageView } from '@/views/hidden-arizona';

type DirectorySearchParams = {
  q?: string;
  city?: string;
  category?: string;
  minRating?: string;
  sort?: string;
};

type NewsArchiveSearchParams = {
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

function sectionContainer(children: React.ReactNode) {
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>;
}

function parsePageNumber(value?: string): number {
  if (!value) {
    return 1;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

function newsArchiveHref(locale: Locale, page: number): string {
  const basePath = withLocale(locale, '/community/news');
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

function articleSourcePolicyDescription(policy: Article['sourcePolicy'], locale: Locale): string {
  if (policy === 'signal_only') {
    return locale === 'zh'
      ? '短影音與社群平台只用來發現重複出現的問題與題材，不重用 caption、嵌入或影片素材。'
      : 'Short-video and social platforms are used only to discover recurring topics. ChineseArizona does not reuse captions, embeds, or media assets.';
  }

  if (policy === 'republish_with_permission') {
    return locale === 'zh'
      ? '這篇內容屬於授權轉載或經許可同步，保留原始來源連結。'
      : 'This piece is republished or synchronized with permission and keeps a link back to the original source.';
  }

  return locale === 'zh'
    ? '這篇內容是 ChineseArizona 根據來源頁面撰寫的原創摘要，重點在於整理與連結，而不是複製來源內容。'
    : 'This piece is an original ChineseArizona summary built from linked source pages. The goal is synthesis and guidance rather than copying source copy.';
}

function ArticleMetaRow({
  article,
  locale,
  showDate = false,
}: {
  article: Article;
  locale: Locale;
  showDate?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
      <span>{articleCategoryLabel(article.category, locale)}</span>
      <span className="text-slate-300">/</span>
      <span>{articleSeriesLabel(article.series, locale)}</span>
      <span className="text-slate-300">/</span>
      <span>{freshnessTierLabel(article.freshnessTier, locale)}</span>
      {showDate ? (
        <>
          <span className="text-slate-300">/</span>
          <span className="tracking-normal text-slate-500">{formatDate(article.publishedAt, locale)}</span>
        </>
      ) : null}
    </div>
  );
}

function ArticleAudienceChips({ article, locale }: { article: Article; locale: Locale }) {
  if (article.personaTargets.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {article.personaTargets.map((target) => (
        <span
          key={`${article.slug}-${target}`}
          className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
        >
          {personaTargetLabel(target, locale)}
        </span>
      ))}
    </div>
  );
}

export async function DirectoryPageView({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: DirectorySearchParams;
}) {
  const filters = {
    q: searchParams.q,
    city: searchParams.city,
    category: searchParams.category,
    minRating: parseDirectoryMinRating(searchParams.minRating),
    sort: parseDirectorySortOption(searchParams.sort),
  };
  const [{ categories, cities }, listings] = await Promise.all([
    getDirectoryFilterOptions(),
    getDirectoryBusinesses(filters),
  ]);
  const activeFilterCount = countActiveDirectoryFilters(filters);
  const categoryBySlug = categories.reduce<Record<string, (typeof categories)[number]>>((accumulator, category) => {
    accumulator[category.slug] = category;
    return accumulator;
  }, {});

  return sectionContainer(
    <div className="w-full flex-grow py-12">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-slate-900">
            {locale === 'zh' ? '亞利桑那商家目錄' : 'Arizona Business Directory'}
          </h1>
          <p className="text-slate-600">
            {locale === 'zh'
              ? '可依城市、分類與評分篩選的雙語商家目錄。'
              : 'Browse bilingual local businesses by city, category, and rating.'}
          </p>
        </div>
        <TrackedLink
          href={withLocale(locale, '/add-business')}
          eventType="claim_click"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 font-medium text-white transition hover:bg-brand-700"
        >
          <Building2 className="h-5 w-5" />
          {locale === 'zh' ? '新增／認領商家' : 'Add or claim a business'}
        </TrackedLink>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        <div>
          <DirectoryFilters
            locale={locale}
            categories={categories}
            cities={cities}
            values={filters}
          />
        </div>
        <div className="space-y-4">
          <HiddenArizonaTeaser locale={locale} />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {locale === 'zh'
              ? activeFilterCount > 0
                ? `目前顯示 ${listings.length} 筆符合條件的公開商家。所有公開列表都需要真實聯絡資料與來源註記。`
                : `目前顯示 ${listings.length} 筆公開商家。所有公開列表都需要真實聯絡資料與來源註記。`
              : activeFilterCount > 0
                ? `Showing ${listings.length} public listings that match your filters. Every public profile requires real contact data and source attribution.`
                : `Showing ${listings.length} public listings. Every public profile requires real contact data and source attribution.`}
          </div>
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
              <BusinessCard
                key={business.id}
                business={business}
                category={categoryBySlug[business.categorySlug]}
                locale={locale}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export async function BusinessDetailPageView({ locale, slug }: { locale: Locale; slug: string }) {
  const business = await getDirectoryBusinessBySlug(slug);
  if (!business) {
    return null;
  }

  const [categories, relatedCategoryBusinesses] = await Promise.all([
    getDirectoryCategories(),
    getDirectoryBusinesses(
      {
        category: business.categorySlug,
        city: business.city,
        sort: 'featured',
      },
      {
        excludeSlug: business.slug,
        limit: 2,
      }
    ),
  ]);
  const category = categories.find((item) => item.slug === business.categorySlug);
  const owner = business.ownerProfileSlug ? getProfileBySlug(business.ownerProfileSlug) : undefined;
  const businessReviews = getBusinessReviews(slug);
  const imageSet = [business.heroImage, ...business.gallery].filter((value): value is string => Boolean(value));
  const claimHref = withLocale(
    locale,
    `/add-business?businessSlug=${encodeURIComponent(business.slug)}&businessName=${encodeURIComponent(business.name.en)}`
  );
  const websiteHref = business.website;
  const phoneLink = phoneHref(business.phone);
  const localBusinessJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name.en,
    alternateName: business.name.zh,
    description: business.description.en,
    url: absoluteUrl(withLocale(locale, `/directory/business/${business.slug}`)),
  };

  if (imageSet.length > 0) {
    localBusinessJsonLd.image = imageSet;
  }
  if (business.phone) {
    localBusinessJsonLd.telephone = business.phone;
  }
  if (business.email) {
    localBusinessJsonLd.email = business.email;
  }
  if (business.address) {
    localBusinessJsonLd.address = {
      '@type': 'PostalAddress',
      streetAddress: business.address,
      addressLocality: business.city,
      addressRegion: 'AZ',
      addressCountry: 'US',
    };
  } else if (business.serviceAreaText) {
    localBusinessJsonLd.areaServed = business.serviceAreaText;
  }
  if (business.coordinates) {
    localBusinessJsonLd.geo = {
      '@type': 'GeoCoordinates',
      latitude: business.coordinates.lat,
      longitude: business.coordinates.lng,
    };
  }
  if (business.reviewCount > 0 && business.rating > 0) {
    localBusinessJsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: business.rating,
      reviewCount: business.reviewCount,
    };
  }

  return sectionContainer(
    <div className="space-y-10 py-12">
      <JsonLd data={localBusinessJsonLd} />

      <div className="grid gap-8 lg:grid-cols-[1.4fr,0.8fr]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="relative h-72 w-full bg-slate-200">
            <BusinessImage
              imageUrl={business.heroImage}
              label={descriptiveImageAlt(t(business.name, locale), 'business', locale)}
              locale={locale}
              category={category}
              priority
              className="object-cover"
            />
          </div>
          <div className="space-y-6 p-8">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                {category ? (
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {t(category.name, locale)}
                  </span>
                ) : null}
                <TrustBadges
                  locale={locale}
                  verified={business.verified}
                  bilingual={business.bilingual}
                  sponsored={business.sponsored}
                  verificationState={business.verificationState}
                  status={business.status}
                />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t(business.name, locale)}</h1>
              <p className="max-w-3xl text-base leading-7 text-slate-600">{t(business.description, locale)}</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">
                  {locale === 'zh' ? '聯絡與位置' : 'Contact and location'}
                </h2>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                    <span>{business.address ?? business.serviceAreaText ?? `${business.city}, AZ`}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock3 className="mt-0.5 h-4 w-4 text-slate-400" />
                    <span>
                      {locale === 'zh' ? '最近更新' : 'Last updated'}: {formatDate(business.lastUpdated, locale)}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="mt-0.5 h-4 w-4 fill-current text-amber-400" />
                    <span>
                      {business.reviewCount > 0 ? (
                        business.rating > 0 ? (
                          <>
                            {business.rating.toFixed(1)} · {business.reviewCount}{' '}
                            {locale === 'zh' ? '則評論' : 'reviews'}
                          </>
                        ) : (
                          <>
                            {business.reviewCount} {locale === 'zh' ? '則評論' : 'reviews'}
                          </>
                        )
                      ) : (
                        locale === 'zh' ? '尚無公開評論數' : 'No public review count yet'
                      )}
                    </span>
                  </li>
                </ul>
                <div className="mt-4 flex flex-wrap gap-3">
                  {business.phone && phoneLink ? (
                    <a href={phoneLink} className="rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
                      {locale === 'zh' ? '撥打電話' : 'Call now'}
                    </a>
                  ) : null}
                  {business.website ? (
                    <a
                      href={business.website}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {locale === 'zh' ? '官網' : 'Website'}
                    </a>
                  ) : null}
                  {business.verificationState === 'unverified' ? (
                    <Link href={claimHref} className="rounded-lg border border-brand-300 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100">
                      {locale === 'zh' ? '認領這筆商家' : 'Claim this listing'}
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">
                  {locale === 'zh' ? '網站與更新資訊' : 'Website and updates'}
                </h2>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li>
                    <span className="font-medium text-slate-800">{locale === 'zh' ? '網站' : 'Website'}:</span>{' '}
                    {business.website ?? (locale === 'zh' ? '未提供' : 'Not provided')}
                  </li>
                  <li>
                    <span className="font-medium text-slate-800">{locale === 'zh' ? '更新日期' : 'Updated'}:</span>{' '}
                    {formatDate(business.lastUpdated, locale)}
                  </li>
                  <li>
                    <span className="font-medium text-slate-800">{locale === 'zh' ? '狀態' : 'Status'}:</span>{' '}
                    {business.verificationState
                      ? verificationStateLabel(business.verificationState, locale)
                      : locale === 'zh'
                        ? '已驗證'
                        : 'Verified'}
                  </li>
                </ul>
                {websiteHref ? (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {locale === 'zh' ? '查看商家網站' : 'Visit business website'}
                  </a>
                ) : null}
              </div>
            </div>

            {business.services.length > 0 || business.languages.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">
                  {locale === 'zh' ? '服務內容' : 'Services'}
                </h2>
                {business.services.length > 0 ? (
                  <ul className="space-y-3 text-sm text-slate-600">
                    {business.services.map((service) => (
                      <li key={service.en} className="flex items-start gap-2">
                        <BadgeCheck className="mt-0.5 h-4 w-4 text-brand-500" />
                        <span>{t(service, locale)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-600">
                    {locale === 'zh'
                      ? '目前沒有結構化的服務清單，請先參考商家網站。'
                      : 'Structured services are not available yet. Refer to the business website for now.'}
                  </p>
                )}
                {business.languages.length > 0 ? (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {locale === 'zh' ? '服務語言' : 'Languages'}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">{formatLanguageList(business.languages, locale)}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {business.hours.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">
                  {locale === 'zh' ? '營業時間' : 'Business hours'}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {business.hours.map((row) => (
                    <div key={row.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <span className="font-medium text-slate-800">{businessHoursLabel(row.label, locale)}</span>
                      <span>{businessHoursValue(row.value, locale)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          {owner ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                {locale === 'zh' ? '商家擁有者' : 'Business owner'}
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white ${owner.avatarColor}`}>
                    {owner.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <Link href={withLocale(locale, `/profile/${owner.slug}`)} className="font-semibold text-slate-900 hover:text-brand-600">
                      <span lang="en">{owner.name}</span> · <span lang="zh">{owner.nameZh}</span>
                    </Link>
                    <p className="text-sm text-slate-500">{owner.city}</p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-600">{t(owner.bio, locale)}</p>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              {locale === 'zh' ? '信任與修正' : 'Trust and corrections'}
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              {business.verificationState === 'unverified'
                ? locale === 'zh'
                  ? '如果這是你的商家，請認領它；如果資訊有誤，請直接送出回報。'
                  : 'If this is your business, claim it. If anything is wrong, submit a report and we will review it.'
                : locale === 'zh'
                  ? '若資料有誤，請回報給管理端；如果你是商家擁有者，也可以透過認領流程要求更新。'
                  : 'If any detail is wrong, report it. Business owners can still use the claim flow to request updates.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {business.verificationState === 'unverified' ? (
                <Link href={claimHref} className="rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
                  {locale === 'zh' ? '認領這筆商家' : 'Claim this listing'}
                </Link>
              ) : null}
              {websiteHref ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {locale === 'zh' ? '查看網站' : 'Visit website'}
                </a>
              ) : null}
            </div>
            <div className="mt-5">
              <ReportIssueForm entitySlug={business.slug} entityType="business" locale={locale} />
            </div>
          </div>

          {businessReviews.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                {locale === 'zh' ? '近期評論' : 'Recent reviews'}
              </h2>
              <div className="space-y-4">
                {businessReviews.map((review) => (
                  <div key={review.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">{t(review.title, locale)}</h3>
                      <span className="text-sm text-amber-500">{'★'.repeat(review.rating)}</span>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{t(review.content, locale)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {relatedCategoryBusinesses.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">
              {locale === 'zh' ? '同城市／分類的其他選擇' : 'More options in the same city and category'}
            </h2>
            {category ? (
              <Link
                href={withLocale(locale, `/directory/${business.city.toLowerCase()}/${category.slug}`)}
                className="text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                {locale === 'zh' ? '查看城市頁面' : 'View city landing page'}
              </Link>
            ) : null}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {relatedCategoryBusinesses.map((item) => (
              <BusinessCard key={item.id} business={item} locale={locale} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export async function CityCategoryPageView({
  locale,
  city,
  category,
}: {
  locale: Locale;
  city: string;
  category: string;
}) {
  const [categories, listings] = await Promise.all([
    getDirectoryCategories(),
    getDirectoryBusinesses(
      {
        city,
        category,
        sort: 'featured',
      },
      {
        limit: 100,
      }
    ),
  ]);
  const categoryRecord = categories.find((item) => item.slug === category);
  if (!categoryRecord) {
    return null;
  }

  return sectionContainer(
    <div className="space-y-8 py-12">
      <div className="max-w-3xl space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          {t(categoryRecord.name, locale)} {locale === 'zh' ? '在' : 'in'} {city}
        </h1>
        <p className="text-base leading-7 text-slate-600">{t(categoryRecord.description, locale)}</p>
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
            <BusinessCard key={business.id} business={business} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}

export async function RelocationGuidePageView({ locale }: { locale: Locale }) {
  const guideList = getGuides();
  const articleList = getArticles(6);
  const localizedArticleText = await resolveLocalizedTextList(
    articleList.flatMap((article) => [article.title, article.excerpt]),
    locale
  );
  const localizedArticles = articleList.map((article, index) => ({
    article,
    localizedText: {
      title: localizedArticleText[index * 2] ?? article.title.en,
      excerpt: localizedArticleText[index * 2 + 1] ?? article.excerpt.en,
    },
  }));

  return sectionContainer(
    <div className="space-y-10 py-12">
      <div className="max-w-3xl space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          {locale === 'zh' ? '搬遷與新手資源中心' : 'Relocation and Newcomer Resource Center'}
        </h1>
        <p className="text-base leading-7 text-slate-600">
          {locale === 'zh'
            ? '把搬家、MVD、學校、公用事業、醫療與社群融在一個可搜尋、可分享的雙語知識中心。'
            : 'A searchable bilingual resource center for moving, MVD, schools, utilities, healthcare, and community life in Arizona.'}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {guideList.map((guide) => (
          <GuideCard key={guide.slug} guide={guide} locale={locale} />
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">
          {locale === 'zh' ? '延伸閱讀' : 'Related editorial'}
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {localizedArticles.map(({ article, localizedText }) => (
            <Link key={article.slug} href={withLocale(locale, `/community/news/${article.slug}`)} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <ArticleMetaRow article={article} locale={locale} />
              <h3 className="mt-2 text-xl font-bold text-slate-900">{localizedText.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{localizedText.excerpt}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export async function GuideDetailPageView({ locale, slug }: { locale: Locale; slug: string }) {
  const guide = getGuideBySlug(slug);
  if (!guide) {
    return null;
  }

  const relatedBusinesses = (
    await Promise.all(guide.relatedBusinessSlugs.map((relatedSlug) => getDirectoryBusinessBySlug(relatedSlug)))
  ).filter((business): business is Business => Boolean(business));
  const relatedEvents = getRelatedEvents(guide.relatedEventSlugs);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide.title.en,
      description: guide.excerpt.en,
      datePublished: guide.publishedAt,
      dateModified: guide.updatedAt,
      image: [guide.heroImage],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl(withLocale(locale, '/')) },
        { '@type': 'ListItem', position: 2, name: 'Relocation Guide', item: absoluteUrl(withLocale(locale, '/relocation-guide')) },
        { '@type': 'ListItem', position: 3, name: guide.title.en, item: absoluteUrl(withLocale(locale, `/relocation-guide/${guide.slug}`)) },
      ],
    },
  ];

  return sectionContainer(
    <div className="space-y-10 py-12">
      <JsonLd data={jsonLd} />
      <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative h-72 w-full bg-slate-200">
          <Image
            src={guide.heroImage}
            alt={descriptiveImageAlt(t(guide.title, locale), 'guide', locale)}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="space-y-8 p-8">
          <div className="space-y-4">
            <div className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
              {guideSectionLabel(guide.section, locale)}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t(guide.title, locale)}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
              <span>{formatReadTime(guide.readTime, locale)}</span>
              <span>{formatDate(guide.updatedAt, locale)}</span>
            </div>
            <p className="max-w-3xl text-base leading-7 text-slate-600">{t(guide.excerpt, locale)}</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.4fr,0.8fr]">
            <div className="space-y-5">
              {guide.body.map((paragraph, index) => (
                <p key={`${guide.slug}-${index}`} className="text-base leading-8 text-slate-700">
                  {t(paragraph, locale)}
                </p>
              ))}
            </div>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">
                  {locale === 'zh' ? '官方資源連結' : 'Official resources'}
                </h2>
                <ul className="space-y-3">
                  {guide.officialResources.map((resource) => (
                    <li key={resource.url}>
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-start justify-between gap-3 rounded-xl bg-white p-3 text-sm text-slate-600 hover:bg-slate-100"
                      >
                        <span>
                          <span className="block font-semibold text-slate-900">{t(resource.label, locale)}</span>
                          <span className="text-xs text-slate-500">{resource.source}</span>
                        </span>
                        <ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400 group-hover:text-brand-500" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {relatedEvents.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-3 text-lg font-semibold text-slate-900">
                    {locale === 'zh' ? '相關活動' : 'Related events'}
                  </h2>
                  <div className="space-y-3">
                    {relatedEvents.map((event) => (
                      <Link key={event.slug} href={withLocale(locale, `/community/events/${event.slug}`)} className="block rounded-xl bg-slate-50 p-3 text-sm hover:bg-slate-100">
                        <div className="font-semibold text-slate-900">{t(event.title, locale)}</div>
                        <div className="mt-1 text-slate-500">{formatDateTime(event.startDate, locale)}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </article>

      {relatedBusinesses.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">
            {locale === 'zh' ? '相關服務' : 'Related providers'}
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {relatedBusinesses.map((business) => (
              <BusinessCard key={business.id} business={business} locale={locale} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export async function CommunityPageView({ locale }: { locale: Locale }) {
  const eventList = getEvents();
  const articleList = getArticles(12);
  const boardPosts = getCommunityPosts('board');
  const classifiedPosts = getCommunityPosts('classified');
  const localizedArticleText = await resolveLocalizedTextList(
    articleList.flatMap((article) => [article.title, article.excerpt]),
    locale
  );
  const localizedArticles = articleList.map((article, index) => ({
    article,
    localizedText: {
      title: localizedArticleText[index * 2] ?? article.title.en,
      excerpt: localizedArticleText[index * 2 + 1] ?? article.excerpt.en,
    },
  }));

  return sectionContainer(
    <div className="space-y-10 py-12">
      <div className="max-w-3xl space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          {locale === 'zh' ? '社群中心' : 'Community Hub'}
        </h1>
        <p className="text-base leading-7 text-slate-600">
          {locale === 'zh'
            ? '活動、新聞、社群看板與分類資訊的同一個入口，並從第一天開始附帶檢舉與信任保護。'
            : 'One place for events, news, community board posts, and classifieds, with reporting and trust controls built in from day one.'}
        </p>
      </div>

      <CommunityPostComposer locale={locale}>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-xl font-bold text-slate-900">
            {locale === 'zh' ? '公開發佈規則' : 'Open publish safety rules'}
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>{locale === 'zh' ? '新貼文預設 noindex，直到建立信任。' : 'New posts are noindex until trust is established.'}</li>
            <li>{locale === 'zh' ? '外部連結以 ugc / nofollow 形式輸出。' : 'External links are rendered with ugc / nofollow.'}</li>
            <li>{locale === 'zh' ? '表單有基本人類驗證與速率限制。' : 'Forms include lightweight human verification and rate limiting.'}</li>
            <li>{locale === 'zh' ? '檢舉會進入管理後台佇列，並支援自動隱藏策略。' : 'Reports flow into the admin queue and support auto-hide policy.'}</li>
          </ul>
        </div>
      </CommunityPostComposer>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '活動' : 'Events'}</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {eventList.map((event) => (
            <EventCard key={event.slug} event={event} locale={locale} />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '在地新聞與內容' : 'Local news and content'}</h2>
          <Link
            href={withLocale(locale, '/community/news')}
            className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
          >
            {locale === 'zh' ? '查看全部文章' : 'Browse full archive'}
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {localizedArticles.map(({ article, localizedText }) => (
            <Link key={article.slug} href={withLocale(locale, `/community/news/${article.slug}`)} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <ArticleMetaRow article={article} locale={locale} />
              <h3 className="mt-2 text-xl font-bold text-slate-900">{localizedText.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{localizedText.excerpt}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '社群看板' : 'Community board'}</h2>
          {boardPosts.map((post) => (
            <CommunityCard key={post.slug} post={post} locale={locale} />
          ))}
        </div>
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '分類資訊' : 'Classifieds'}</h2>
          {classifiedPosts.map((post) => (
            <CommunityCard key={post.slug} post={post} locale={locale} />
          ))}
        </div>
      </div>
    </div>
  );
}

export async function NewsArchivePageView({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams?: NewsArchiveSearchParams;
}) {
  const requestedPage = parsePageNumber(searchParams?.page);
  const articlePage = getArticlePage(requestedPage, 24);
  const localizedArticleText = await resolveLocalizedTextList(
    articlePage.articles.flatMap((article) => [article.title, article.excerpt]),
    locale
  );
  const localizedArticles = articlePage.articles.map((article, index) => ({
    article,
    localizedText: {
      title: localizedArticleText[index * 2] ?? article.title.en,
      excerpt: localizedArticleText[index * 2 + 1] ?? article.excerpt.en,
    },
  }));
  const startArticleNumber = articlePage.totalCount === 0 ? 0 : (articlePage.currentPage - 1) * articlePage.pageSize + 1;
  const endArticleNumber = Math.min(
    articlePage.currentPage * articlePage.pageSize,
    articlePage.totalCount
  );
  const previousPageHref =
    articlePage.currentPage > 1 ? newsArchiveHref(locale, articlePage.currentPage - 1) : null;
  const nextPageHref =
    articlePage.currentPage < articlePage.totalPages
      ? newsArchiveHref(locale, articlePage.currentPage + 1)
      : null;
  const archiveNavigation = (
    <div className="flex flex-wrap gap-3">
      {previousPageHref ? (
        <Link
          href={previousPageHref}
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
        >
          {locale === 'zh' ? '上一頁' : 'Previous page'}
        </Link>
      ) : (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-300">
          {locale === 'zh' ? '上一頁' : 'Previous page'}
        </span>
      )}
      {nextPageHref ? (
        <Link
          href={nextPageHref}
          className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
        >
          {locale === 'zh' ? '下一頁' : 'Next page'}
        </Link>
      ) : (
        <span className="inline-flex items-center rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-300">
          {locale === 'zh' ? '下一頁' : 'Next page'}
        </span>
      )}
    </div>
  );

  return sectionContainer(
    <div className="space-y-8 py-12">
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
          {locale === 'zh' ? '新聞檔案' : 'News archive'}
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          {locale === 'zh' ? '完整文章資料庫' : 'Full article archive'}
        </h1>
        <p className="text-base leading-7 text-slate-600">
          {locale === 'zh'
            ? '這裡會列出所有原創摘要、系列觀察與授權轉載內容。社群首頁只顯示最新文章，完整歷史都在這個檔案頁。'
            : 'This page lists every original summary, recurring series piece, and permission-based republished article. The community hub shows only the latest items, while the full history lives here.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-1">
          <div className="text-sm text-slate-600">
            {locale === 'zh'
              ? `顯示第 ${startArticleNumber} 到 ${endArticleNumber} 篇，共 ${articlePage.totalCount} 篇文章`
              : `Showing articles ${startArticleNumber}-${endArticleNumber} of ${articlePage.totalCount}`}
          </div>
          <div className="text-sm font-medium text-slate-500">
            {locale === 'zh'
              ? `第 ${articlePage.currentPage} / ${articlePage.totalPages} 頁`
              : `Page ${articlePage.currentPage} of ${articlePage.totalPages}`}
          </div>
        </div>
        {archiveNavigation}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {localizedArticles.map(({ article, localizedText }) => (
          <Link
            key={article.slug}
            href={withLocale(locale, `/community/news/${article.slug}`)}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <ArticleMetaRow article={article} locale={locale} showDate />
            <h2 className="mt-3 text-2xl font-bold text-slate-900">{localizedText.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{localizedText.excerpt}</p>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-medium text-slate-500">
          {locale === 'zh'
            ? `第 ${articlePage.currentPage} / ${articlePage.totalPages} 頁`
            : `Page ${articlePage.currentPage} of ${articlePage.totalPages}`}
        </div>
        {archiveNavigation}
      </div>
    </div>
  );
}

export async function EventDetailPageView({ locale, slug }: { locale: Locale; slug: string }) {
  const event = getEventBySlug(slug);
  if (!event) {
    return null;
  }

  const relatedBusinesses = (
    await Promise.all(event.relatedBusinessSlugs.map((relatedSlug) => getDirectoryBusinessBySlug(relatedSlug)))
  ).filter((business): business is Business => Boolean(business));
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title.en,
    description: event.excerpt.en,
    startDate: event.startDate,
    endDate: event.endDate,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    image: [event.heroImage],
    location: {
      '@type': 'Place',
      name: event.venueName,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.address,
        addressLocality: event.city,
        addressRegion: 'AZ',
        addressCountry: 'US',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: event.organizer,
    },
  };

  return sectionContainer(
    <div className="space-y-10 py-12">
      <JsonLd data={jsonLd} />
      <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative h-72 w-full bg-slate-200">
          <Image
            src={event.heroImage}
            alt={descriptiveImageAlt(t(event.title, locale), 'event', locale)}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="space-y-8 p-8">
          <div className="space-y-4">
            <div className="inline-flex rounded-full bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-600">
              {event.verifiedOrganizer ? (locale === 'zh' ? '已驗證主辦單位' : 'Verified organizer') : event.organizer}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t(event.title, locale)}</h1>
            <p className="max-w-3xl text-base leading-7 text-slate-600">{t(event.excerpt, locale)}</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="space-y-5">
              {event.description.map((paragraph, index) => (
                <p key={`${event.slug}-${index}`} className="text-base leading-8 text-slate-700">
                  {t(paragraph, locale)}
                </p>
              ))}
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                {locale === 'zh' ? '活動資訊' : 'Event details'}
              </h2>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" />
                  <span>{formatDateTime(event.startDate, locale)}</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                  <span>{event.venueName}, {event.address}</span>
                </li>
                <li className="flex items-start gap-2">
                  <UserRound className="mt-0.5 h-4 w-4 text-slate-400" />
                  <span>{event.organizer}</span>
                </li>
              </ul>
              <p className="mt-4 rounded-xl bg-white p-3 text-sm leading-6 text-slate-600">{t(event.languageNote, locale)}</p>
              {event.ticketUrl ? (
                <a
                  href={event.ticketUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  {locale === 'zh' ? '查看 RSVP / 報名' : 'Open RSVP / ticket link'}
                </a>
              ) : null}
            </aside>
          </div>
        </div>
      </article>

      {relatedBusinesses.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '相關商家' : 'Related businesses'}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {relatedBusinesses.map((business) => (
              <BusinessCard key={business.id} business={business} locale={locale} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export async function ArticleDetailPageView({ locale, slug }: { locale: Locale; slug: string }) {
  const article = getArticleBySlug(slug);
  if (!article) {
    return null;
  }
  const categories = await getDirectoryCategories();
  const localizedArticle = await resolveArticleText(article, locale);
  const author = article.authorProfileSlug ? getProfileBySlug(article.authorProfileSlug) : undefined;
  const relatedBusinesses = getRelatedBusinesses(article.ctaBusinessSlugs);
  const relatedCategories = article.relatedCategorySlugs
    .map((categorySlug) => categories.find((category) => category.slug === categorySlug))
    .filter((category): category is BusinessCategory => Boolean(category));

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: localizedArticle.title,
      description: localizedArticle.excerpt,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt ?? article.publishedAt,
      image: [article.heroImage],
      author: author
        ? {
            '@type': 'Person',
            name: author.name,
          }
        : undefined,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl(withLocale(locale, '/')) },
        { '@type': 'ListItem', position: 2, name: 'Community', item: absoluteUrl(withLocale(locale, '/community')) },
        { '@type': 'ListItem', position: 3, name: localizedArticle.title, item: absoluteUrl(withLocale(locale, `/community/news/${article.slug}`)) },
      ],
    },
  ];

  return sectionContainer(
    <div className="space-y-10 py-12">
      <JsonLd data={jsonLd} />
      <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative h-72 w-full bg-slate-200">
          <Image
            src={article.heroImage}
            alt={descriptiveImageAlt(t(article.title, locale), 'article', locale)}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="space-y-6 p-8">
          <div className="space-y-3">
            <ArticleMetaRow article={article} locale={locale} showDate />
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">{localizedArticle.title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-500">
              <span>{sourcePolicyLabel(article.sourcePolicy, locale)}</span>
              {author ? (
                <>
                  <span className="text-slate-300">/</span>
                  <Link href={withLocale(locale, `/profile/${author.slug}`)} className="font-medium text-brand-700 hover:text-brand-800">
                    {author.name}
                  </Link>
                </>
              ) : null}
            </div>
            <p className="max-w-3xl text-base leading-7 text-slate-600">{localizedArticle.excerpt}</p>
            <ArticleAudienceChips article={article} locale={locale} />
          </div>
          <div className="space-y-5">
            {localizedArticle.body.map((paragraph, index) => (
              <p key={`${article.slug}-${index}`} className="text-base leading-8 text-slate-700">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-semibold text-slate-900">
                {locale === 'zh' ? '來源與使用方式' : 'Sources and usage'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {articleSourcePolicyDescription(article.sourcePolicy, locale)}
              </p>
              {article.sourceLinks.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {article.sourceLinks.map((sourceLink) => (
                    <li key={`${article.slug}-${sourceLink.url}`}>
                      <a
                        href={sourceLink.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-start justify-between gap-3 rounded-xl bg-white p-3 text-sm text-slate-600 hover:bg-slate-100"
                      >
                        <span>
                          <span className="block font-semibold text-slate-900">{t(sourceLink.label, locale)}</span>
                          <span className="text-xs text-slate-500">{sourceLink.source}</span>
                        </span>
                        <ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400 group-hover:text-brand-500" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="space-y-4">
              {relatedCategories.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {locale === 'zh' ? '延伸分類' : 'Related directory paths'}
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {relatedCategories.map((category) => (
                      <Link
                        key={`${article.slug}-${category.slug}`}
                        href={withLocale(locale, `/directory?category=${category.slug}`)}
                        className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-100"
                      >
                        {t(category.name, locale)}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  {locale === 'zh' ? '內容策略標籤' : 'Editorial tags'}
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {articleSeriesLabel(article.series, locale)}
                  </span>
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {freshnessTierLabel(article.freshnessTier, locale)}
                  </span>
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {sourcePolicyLabel(article.sourcePolicy, locale)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      {relatedBusinesses.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">
            {locale === 'zh' ? '文章中提到的可信服務' : 'Trusted providers mentioned in this story'}
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {relatedBusinesses.map((business) => (
              <BusinessCard key={business.id} business={business} locale={locale} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CommunityPostDetailPageView({
  locale,
  type,
  slug,
}: {
  locale: Locale;
  type: CommunityPostType;
  slug: string;
}) {
  const post = getCommunityPostBySlug(type, slug);
  if (!post) {
    return null;
  }

  const author = getProfileBySlug(post.authorSlug);
  const noindex = shouldNoIndexCommunityPost(post);

  return sectionContainer(
    <div className="space-y-8 py-12">
      <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {type === 'classified'
                ? locale === 'zh'
                  ? '分類資訊'
                  : 'Classified'
                : locale === 'zh'
                  ? '社群看板'
                  : 'Community Board'}
            </span>
            {noindex ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                <ShieldAlert className="h-3.5 w-3.5" />
                {locale === 'zh' ? '未建立信任，暫不收錄搜尋' : 'Untrusted content, temporarily noindex'}
              </span>
            ) : null}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t(post.title, locale)}</h1>
          <p className="max-w-3xl text-base leading-7 text-slate-600">{t(post.excerpt, locale)}</p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            <span>{formatDate(post.updatedAt, locale)}</span>
            <span>{post.city}</span>
            {post.price ? <span>{post.price}</span> : null}
          </div>
          <div className="space-y-4 pt-4">
            {post.body.map((paragraph, index) => (
              <p key={`${post.slug}-${index}`} className="text-base leading-8 text-slate-700">
                {t(paragraph, locale)}
              </p>
            ))}
            {post.linkUrl ? (
              <a
                href={post.linkUrl}
                target="_blank"
                rel="ugc nofollow noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" />
                {locale === 'zh' ? '開啟外部連結（ugc / nofollow）' : 'Open external link (ugc / nofollow)'}
              </a>
            ) : null}
          </div>
        </div>
      </article>

      <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            {locale === 'zh' ? '作者資訊' : 'Author'}
          </h2>
          {author ? (
            <div className="mt-4 space-y-3">
              <Link href={withLocale(locale, `/profile/${author.slug}`)} className="font-semibold text-brand-700 hover:text-brand-800">
                <span lang="en">{author.name}</span> · <span lang="zh">{author.nameZh}</span>
              </Link>
              <p className="text-sm text-slate-600">{t(author.bio, locale)}</p>
            </div>
          ) : null}
        </div>

        <ReportIssueForm entitySlug={post.slug} locale={locale} />
      </div>
    </div>
  );
}

export async function AddBusinessPageView({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams?: {
    businessName?: string;
    businessSlug?: string;
  };
}) {
  const businesses = await getDirectoryBusinesses({}, { limit: 200 });

  return sectionContainer(
    <div className="grid gap-8 py-12 lg:grid-cols-[1.15fr,0.85fr]">
      <BusinessClaimForm
        locale={locale}
        businesses={businesses}
        initialBusinessName={searchParams?.businessName}
        initialBusinessSlug={searchParams?.businessSlug}
      />

      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-xl font-bold text-slate-900">
            {locale === 'zh' ? '上架流程' : 'How the listing workflow works'}
          </h2>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>{locale === 'zh' ? '1. 先找是否已有商家頁面。' : '1. Search for existing listing coverage first.'}</li>
            <li>{locale === 'zh' ? '2. 若已有，送出認領並以 email 驗證。' : '2. If it exists, submit a claim and verify by email.'}</li>
            <li>{locale === 'zh' ? '3. 若沒有，送出新商家草稿，交由人工審核。' : '3. If not, submit a new draft listing for manual review.'}</li>
            <li>{locale === 'zh' ? '4. 核准後可進入商家後台更新資訊、回覆評論與提交活動。' : '4. Once approved, owners get dashboard access for edits, replies, and event submissions.'}</li>
          </ol>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            {locale === 'zh' ? '平台營運原則' : 'Platform operating principles'}
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>{locale === 'zh' ? '重視可搜尋、可維護、可驗證，而不是一次性聊天推薦。' : 'Built for searchable, maintainable, verifiable discovery instead of one-off chat recommendations.'}</li>
            <li>{locale === 'zh' ? '主推雙語可信商家，特別照顧新居民。' : 'Prioritizes bilingual, trustworthy providers with strong newcomer fit.'}</li>
            <li>{locale === 'zh' ? '精選版位由管理端控制，v1 不做自助付費廣告。' : 'Featured placements are admin-managed in v1 rather than self-serve ads.'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export async function ProfilePageView({ locale, slug }: { locale: Locale; slug: string }) {
  const profile = getProfileBySlug(slug);
  if (!profile) {
    return null;
  }

  const ownedBusinesses = (await getDirectoryBusinesses({}, { limit: 500 })).filter(
    (business) => business.ownerProfileSlug === profile.slug
  );
  const posts = getPostsByAuthor(profile.slug);

  return sectionContainer(
    <div className="space-y-10 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className={`flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold text-white ${profile.avatarColor}`}>
            {profile.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-3">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">{profile.name}</h1>
              <p className="text-lg text-slate-500" lang="zh">
                {profile.nameZh}
              </p>
            </div>
            <p className="max-w-3xl text-base leading-7 text-slate-600">{t(profile.bio, locale)}</p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              <span>{profileRoleLabel(profile.role, locale)}</span>
              <span>{profile.city}</span>
              <span>{formatLanguageList(profile.languages, locale)}</span>
            </div>
          </div>
        </div>
      </div>

      {ownedBusinesses.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '管理中的商家' : 'Managed businesses'}</h2>
          <div className="space-y-4">
            {ownedBusinesses.map((business) => (
              <BusinessCard key={business.id} business={business} locale={locale} />
            ))}
          </div>
        </div>
      ) : null}

      {posts.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '近期貼文' : 'Recent posts'}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {posts.map((post) => (
              <CommunityCard key={post.slug} post={post} locale={locale} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export async function DashboardPageView({ locale }: { locale: Locale }) {
  const ownerSlug = 'grace-lin';
  const [profile, ownerBusinesses, pendingClaims] = await Promise.all([
    Promise.resolve(getProfileBySlug(ownerSlug)),
    getDirectoryBusinesses({}, { limit: 500 }),
    getPendingBusinessClaimsSnapshot(),
  ]);
  const managedBusinesses = ownerBusinesses.filter((business) => business.ownerProfileSlug === ownerSlug);
  const recentReviews = managedBusinesses.flatMap((business) => getBusinessReviews(business.slug));

  return sectionContainer(
    <div className="space-y-10 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            {locale === 'zh' ? '商家後台' : 'Business owner dashboard'}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-slate-600">
            {locale === 'zh'
              ? '這個後台已接好內容資料層與商家視角；等 Supabase Auth 的 magic link 與 Google OAuth 環境值接上後，就能真正按角色控管。'
              : 'This dashboard is wired to the content layer and owner perspective now. Once Supabase Auth env is connected, it can be role-gated with magic link and Google OAuth.'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-900">{locale === 'zh' ? '管理中的商家' : 'Managed listings'}</h2>
          <p className="mt-2 text-4xl font-bold text-slate-900">{managedBusinesses.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-900">{locale === 'zh' ? '近期評論' : 'Recent reviews'}</h2>
          <p className="mt-2 text-4xl font-bold text-slate-900">{recentReviews.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-900">{locale === 'zh' ? '待處理認領' : 'Pending claims'}</h2>
          <p className="mt-2 text-4xl font-bold text-slate-900">{pendingClaims.length}</p>
        </div>
      </div>

      {profile ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            {locale === 'zh' ? '預設示範帳號' : 'Demo owner view'}
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{profile.name}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {locale === 'zh'
              ? '這個畫面現在只統計 live 目錄資料，不再從靜態假資料拉商家數量。'
              : 'This dashboard now counts only live directory data instead of the old static fixture inventory.'}
          </p>
        </div>
      ) : null}

      {managedBusinesses.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '你的商家' : 'Your businesses'}</h2>
          <div className="space-y-4">
            {managedBusinesses.map((business) => (
              <BusinessCard key={business.id} business={business} locale={locale} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title={locale === 'zh' ? '目前還沒有已認領的 live 商家' : 'No claimed live listings yet'}
          description={
            locale === 'zh'
              ? '當商家認領與 Supabase owner mapping 接上後，這裡會顯示真正管理中的商家。'
              : 'Once listing claims and Supabase owner mapping are connected, this area will show the real businesses under management.'
          }
        />
      )}
    </div>
  );
}

export async function AdminPageView({ locale }: { locale: Locale }) {
  const [snapshot, pendingClaims, moderationReports, monitoredSources, signalDeskQueue, signalDeskSummary] = await Promise.all([
    Promise.resolve(getAdminSnapshot()),
    getPendingBusinessClaimsSnapshot(),
    getModerationReportsSnapshot(),
    Promise.resolve(getMonitoredSources()),
    Promise.resolve(getSignalDeskQueue()),
    Promise.resolve(getSignalDeskSummary()),
  ]);

  return sectionContainer(
    <div className="space-y-10 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            {locale === 'zh' ? '管理與審核中心' : 'Admin and moderation center'}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-slate-600">
            {locale === 'zh'
              ? '整合商家認領、檢舉、UGC 風險與平台行為分析，作為信任營運的起點。'
              : 'A single place to manage claims, reports, UGC risk, and early platform analytics for trust-first operations.'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center gap-2 text-slate-500">
            <FileWarning className="h-4 w-4" />
            <span className="text-sm font-semibold">{locale === 'zh' ? '檢舉案件' : 'Reports'}</span>
          </div>
          <p className="mt-3 text-4xl font-bold text-slate-900">{moderationReports.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldAlert className="h-4 w-4" />
            <span className="text-sm font-semibold">{locale === 'zh' ? '待處理認領' : 'Pending claims'}</span>
          </div>
          <p className="mt-3 text-4xl font-bold text-slate-900">{pendingClaims.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center gap-2 text-slate-500">
            <CalendarDays className="h-4 w-4" />
            <span className="text-sm font-semibold">{locale === 'zh' ? '待處理貼文' : 'Flagged posts'}</span>
          </div>
          <p className="mt-3 text-4xl font-bold text-slate-900">{snapshot.flaggedPosts.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center gap-2 text-slate-500">
            <Clock3 className="h-4 w-4" />
            <span className="text-sm font-semibold">{locale === 'zh' ? '監看來源' : 'Monitored sources'}</span>
          </div>
          <p className="mt-3 text-4xl font-bold text-slate-900">{signalDeskSummary.monitoredSourceCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center gap-2 text-slate-500">
            <Newspaper className="h-4 w-4" />
            <span className="text-sm font-semibold">{locale === 'zh' ? '待編輯訊號' : 'Review-ready signals'}</span>
          </div>
          <p className="mt-3 text-4xl font-bold text-slate-900">{signalDeskSummary.reviewReadyCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center gap-2 text-slate-500">
            <Building2 className="h-4 w-4" />
            <span className="text-sm font-semibold">{locale === 'zh' ? '目錄跟進' : 'Directory follow-ups'}</span>
          </div>
          <p className="mt-3 text-4xl font-bold text-slate-900">{signalDeskSummary.openDirectoryFollowUpCount}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[0.9fr,1.1fr]">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '待處理認領' : 'Pending claims'}</h2>
          {pendingClaims.length === 0 ? (
            <EmptyState
              title={locale === 'zh' ? '目前沒有新的認領申請' : 'No pending claims right now'}
              description={
                locale === 'zh'
                  ? '新的認領進來後會在這裡顯示。'
                  : 'New claim requests will appear here once submitted.'
              }
            />
          ) : (
            pendingClaims.map((claim) => (
              <div key={claim.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="font-semibold text-slate-900">{claim.claimantName}</p>
                <p className="text-sm text-slate-600">{claim.email}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-brand-600">
                  {claim.businessName}
                  {claim.city ? ` · ${claim.city}` : ''}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '檢舉與內容佇列' : 'Reports and content queue'}</h2>
          {moderationReports.length === 0 && snapshot.flaggedPosts.length === 0 ? (
            <EmptyState
              title={locale === 'zh' ? '目前沒有待審核內容' : 'No moderation items at the moment'}
              description={
                locale === 'zh'
                  ? '當貼文被檢舉或達到自動隱藏門檻時，會在這裡集中。'
                  : 'When posts are reported or cross an auto-hide threshold, they will queue up here.'
              }
            />
          ) : (
            <>
              {snapshot.flaggedPosts.map((post) => (
                <div key={post.slug} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{t(post.title, locale)}</p>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      {post.reportCount} {locale === 'zh' ? '則回報' : 'reports'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{t(post.excerpt, locale)}</p>
                </div>
              ))}
              {moderationReports.map((report) => (
                <div key={report.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="font-semibold text-slate-900">{report.entitySlug}</p>
                  <p className="mt-2 text-sm text-slate-600">{reportReasonLabel(report.reason, locale)}</p>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.05fr,0.95fr]">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? 'Signal Desk 佇列' : 'Signal Desk queue'}</h2>
          {signalDeskQueue.length === 0 ? (
            <EmptyState
              title={locale === 'zh' ? '目前沒有內容訊號' : 'No signal desk items yet'}
              description={
                locale === 'zh'
                  ? '一旦內容雷達開始輸出，這裡會顯示待審、已核准與已發布的內容訊號。'
                  : 'Once the content radar starts producing output, this area will show queued, approved, and published signal-desk items.'
              }
            />
          ) : (
            signalDeskQueue.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                      <span>{articleSeriesLabel(item.series, locale)}</span>
                      <span className="text-slate-300">/</span>
                      <span>{freshnessTierLabel(item.freshnessTier, locale)}</span>
                      <span className="text-slate-300">/</span>
                      <span className="tracking-normal text-slate-500">{destinationSurfaceLabel(item.destinationSurface, locale)}</span>
                    </div>
                    <p className="mt-2 font-semibold text-slate-900">{t(item.title, locale)}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {signalDeskReviewStatusLabel(item.reviewStatus, locale)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>{item.sourceName}</span>
                  <span className="text-slate-300">/</span>
                  <span>{locale === 'zh' ? `優先分數 ${item.priorityScore}` : `Priority ${item.priorityScore}`}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.personaTargets.map((target) => (
                    <span key={`${item.id}-${target}`} className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                      {personaTargetLabel(target, locale)}
                    </span>
                  ))}
                </div>
                {item.directoryFollowUp ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                      <span>{directoryFollowUpActionLabel(item.directoryFollowUp.action, locale)}</span>
                      <span className="text-amber-300">/</span>
                      <span>{directoryFollowUpStatusLabel(item.directoryFollowUp.status, locale)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-amber-900">{t(item.directoryFollowUp.notes, locale)}</p>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '監看來源清單' : 'Monitored source manifest'}</h2>
          <div className="space-y-3">
            {monitoredSources.map((source) => (
              <div key={source.slug} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{source.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{source.url}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {sourceTypeLabel(source.sourceType, locale)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                    {sourcePolicyLabel(source.allowedUse, locale)}
                  </span>
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {destinationSurfaceLabel(source.destinationSurface, locale)}
                  </span>
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {locale === 'zh' ? `${source.cadence} 監看` : `${source.cadence} cadence`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '目前事件追蹤' : 'Current event tracking'}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(snapshot.analytics).length === 0 ? (
            <p className="text-sm text-slate-500">
              {locale === 'zh'
                ? '互動事件還沒有累積；點擊商家、指南與社群內容後，這裡會開始顯示。'
                : 'Interaction events have not accumulated yet. Clicks from business, guide, and community surfaces will begin populating this area.'}
            </p>
          ) : (
            Object.entries(snapshot.analytics).map(([key, value]) => (
              <div key={key} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">{key}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
