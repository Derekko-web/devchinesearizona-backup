import {
  Bookmark,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  FileWarning,
  Globe2,
  ImageIcon,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Newspaper,
  Phone,
  Route,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Star,
  Store,
  Utensils,
  UserRound,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { BusinessImage } from '@/components/BusinessImage';
import { BusinessCard } from '@/components/BusinessCard';
import { CommunityCard } from '@/components/CommunityCard';
import { CommunityTrendingRail } from '@/components/CommunityTrendingRail';
import { AdSidebarRail } from '@/components/AdSidebarRail';
import { DirectoryAdCardTracker } from '@/components/DirectoryAdCardTracker';
import { DirectoryFilters } from '@/components/DirectoryFilters';
import { DiscoverArticleImage } from '@/components/DiscoverArticleImage';
import { EmptyState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import { HousingListingsSection } from '@/components/HousingListingsSection';
import { TrackedLink } from '@/components/TrackedLink';
import { DashboardAccessNotice } from '@/components/auth/DashboardAccessNotice';
import { BusinessClaimApprovalCard } from '@/components/admin/BusinessClaimApprovalCard';
import { DiscoverArizonaAdminPanel } from '@/components/admin/DiscoverArizonaAdminPanel';
import { RadarAdminPanel } from '@/components/admin/RadarAdminPanel';
import { BusinessPhotoEditor } from '@/components/directory/BusinessPhotoEditor';
import { DirectoryAdCampaignPanel } from '@/components/directory/DirectoryAdCampaignPanel';
import { OwnedBusinessDeleteButton } from '@/components/directory/OwnedBusinessDeleteButton';
import { BusinessClaimForm } from '@/components/forms/BusinessClaimForm';
import { CommunityPostComposer } from '@/components/forms/CommunityPostComposer';
import { ReportIssueForm } from '@/components/forms/ReportIssueForm';
import { resolveArticleText, resolveLocalizedTextList } from '@/lib/article-localization';
import {
  getBusinessDirectionsUrl,
  getBusinessHoursPreview,
  getBusinessMenuUrl,
  getBusinessServiceHighlights,
} from '@/lib/business-display';
import {
  getAdminSnapshot,
  getArticleArchivePageAsync,
  getArticleBySlugAsync,
  getCurrentArticlesAsync,
  isLegacyArticle,
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
  getCommunityTrendingArticlesAsync,
  shouldNoIndexCommunityPost,
} from '@/lib/content';
import { getDiscoverAdminQueue } from '@/lib/discover-arizona';
import {
  getRadarAdminSnapshotAsync,
  getRadarArticlesAsync,
  radarArticleToArticle,
} from '@/lib/radar';
import { isSupabaseServiceConfigured } from '@/lib/supabase';
import { shouldRenderAdSensePlacement } from '@/lib/adsense';
import {
  countActiveDirectoryFilters,
  getDirectoryPage,
  getDirectoryBusinesses,
  getDirectoryBusinessBySlug,
  getDirectoryCategories,
  getDirectoryFilterOptions,
} from '@/lib/directory';
import { isMostPopularDirectoryBusiness } from '@/lib/directory-highlights';
import {
  getDirectoryAdCampaignsForOwnerBusinesses,
  getDirectoryAdsAvailability,
  type DirectoryAdsRuntimeMode,
  type DirectoryAdsUnavailableReason,
} from '@/lib/directory-ads';
import {
  getModerationReportsSnapshot,
  getPendingBusinessClaimsSnapshot,
} from '@/lib/directory-moderation';
import { getHousingRegionSnapshots } from '@/lib/housing';
import {
  articleCategoryLabel,
  articleSeriesLabel,
  businessHoursLabel,
  businessHoursValue,
  descriptiveImageAlt,
  destinationSurfaceLabel,
  directoryStatusLabel,
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
  radarLaneLabel,
  reportReasonLabel,
  signalDeskReviewStatusLabel,
  sourcePolicyLabel,
  sourceTypeLabel,
  t,
  verificationStateLabel,
} from '@/lib/i18n';
import { isShopPublicLaunchEnabled } from '@/lib/shop-launch';
import {
  getLocalizedNewsArchivePath,
  getLocalizedNewsArticlePath,
  getLocalizedNewsPath,
} from '@/lib/arizona-news';
import { phoneHref } from '@/lib/phone';
import { ensureProfileForAuthUser } from '@/lib/profile-auth';
import { absoluteUrl, resolveAbsoluteAssetUrl } from '@/lib/seo';
import { JsonLd } from '@/lib/schema';
import { withLocale } from '@/lib/routing';
import { getServerUserFromCookies } from '@/lib/server-auth';
import { defaultSiteProfile, hasLiveDirectoryData, hasLiveNewsData, type SiteProfile } from '@/lib/site-config';
import { getMonitoredSources, getSignalDeskQueue, getSignalDeskSummary } from '@/lib/signal-desk';
import type {
  Article,
  ArticleArchiveBucket,
  ArticleSeries,
  Business,
  BusinessCategory,
  CommunityPostType,
  DirectoryAdCampaign,
  Guide,
  Locale,
  RadarLane,
  SourcePolicy,
  SortOption,
} from '@/lib/types';

export { HiddenArizonaDetailPageView, HiddenArizonaHubPageView } from '@/views/hidden-arizona';
export {
  DiscoverArizonaCategoryPageView,
  DiscoverArizonaDetailPageView,
  DiscoverArizonaHubPageView,
} from '@/views/discover-arizona';

type DirectorySearchParams = {
  q?: string;
  city?: string;
  category?: string;
  minRating?: string;
  sort?: string;
  page?: string;
};

type NewsArchiveSearchParams = {
  bucket?: string;
  series?: string;
  sourcePolicy?: string;
  year?: string;
  month?: string;
  page?: string;
};

type RadarSearchParams = {
  lane?: string;
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
const RADAR_FEED_PAGE_SIZE = 12;
const directoryQuickCategorySlugs = ['dining', 'real-estate', 'medical', 'education', 'local-services'] as const;
const radarLaneOptions: RadarLane[] = ['housing', 'openings', 'community', 'official', 'social'];
const articleSeriesOptions: ArticleSeries[] = [
  'housing-watch',
  'tsmc-corridor-watch',
  'route-watch',
  'restaurant-opening-radar',
  'trend-radar',
  'arizona-radar',
  'austin-radar',
  'community-wire',
];
const articleSourcePolicyOptions: SourcePolicy[] = [
  'summary_link',
  'signal_only',
  'republish_with_permission',
];

function articleSeriesOptionsForSite(site: SiteProfile): ArticleSeries[] {
  if (site.key === 'austin') {
    return ['austin-radar'];
  }

  return articleSeriesOptions.filter((series) => series !== 'austin-radar');
}

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

function CityDataUnavailable({
  locale,
  title,
  description,
}: {
  locale: Locale;
  title?: string;
  description?: string;
}) {
  return sectionContainer(
    <div className="py-12">
      <EmptyState
        title={
          title ??
          (locale === 'zh'
            ? '此城市站点需要本地内容来源'
            : 'This city site needs local content sources')
        }
        description={
          description ??
          (locale === 'zh'
            ? '平台不会回退显示 ChineseArizona 的商家、新闻或生成内容。'
            : 'The platform will not fall back to ChineseArizona listings, news, or generated content.')
        }
      />
    </div>
  );
}

function DirectorySponsoredDisclosure({ locale }: { locale: Locale }) {
  return (
    <p className="text-xs leading-5 text-slate-500">
      {locale === 'zh'
        ? '贊助排序只會影響目錄列表中的顯示順序，不會改變商家的驗證、編輯或審核狀態。'
        : 'Sponsored placement only affects browse-page ordering and does not change verification, editorial, or review status.'}
    </p>
  );
}

function DirectoryListingCard({
  business,
  category,
  locale,
  pagePath,
}: {
  business: Business;
  category?: BusinessCategory;
  locale: Locale;
  pagePath: string;
}) {
  const content = (
    <BusinessCard
      business={business}
      category={category}
      locale={locale}
      enableSponsoredClickTracking={Boolean(business.activeDirectoryAdCampaign)}
    />
  );

  if (!business.activeDirectoryAdCampaign) {
    return content;
  }

  return (
    <DirectoryAdCardTracker
      businessId={business.id}
      campaignId={business.activeDirectoryAdCampaign.id}
      pagePath={pagePath}
    >
      {content}
    </DirectoryAdCardTracker>
  );
}

function parsePageNumber(value?: string): number {
  if (!value) {
    return 1;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

function parseRadarLane(value?: string): RadarLane | undefined {
  return value && radarLaneOptions.includes(value as RadarLane)
    ? (value as RadarLane)
    : undefined;
}

function buildRadarHref(
  locale: Locale,
  site: SiteProfile,
  lane?: RadarLane,
  page?: number
): string {
  const params = new URLSearchParams();

  if (lane) {
    params.set('lane', lane);
  }

  if (page && page > 1) {
    params.set('page', String(page));
  }

  return getLocalizedNewsPath(locale, site, params.toString());
}

function newsArchiveHref(
  locale: Locale,
  site: SiteProfile,
  values: {
    bucket: ArticleArchiveBucket;
    series?: ArticleSeries;
    sourcePolicy?: SourcePolicy;
    year?: number;
    month?: number;
    page?: number;
  }
): string {
  const params = new URLSearchParams();

  if (values.bucket === 'legacy') {
    params.set('bucket', 'legacy');
  }
  if (values.series) {
    params.set('series', values.series);
  }
  if (values.sourcePolicy) {
    params.set('sourcePolicy', values.sourcePolicy);
  }
  if (values.year) {
    params.set('year', String(values.year));
  }
  if (values.month) {
    params.set('month', String(values.month));
  }
  if (values.page && values.page > 1) {
    params.set('page', String(values.page));
  }

  const search = params.toString();
  return getLocalizedNewsArchivePath(locale, site, search);
}

function monthLabel(month: number, locale: Locale): string {
  const formatted = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-Hant' : 'en-US', {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2026, month - 1, 1)));

  return locale === 'zh' ? `${month} 月` : formatted;
}

function buildDirectoryHref(
  locale: Locale,
  values: {
    q?: string;
    city?: string;
    category?: string;
    minRating?: number;
    sort?: SortOption;
    page?: number;
  }
) {
  const params = new URLSearchParams();
  const query = values.q?.trim();

  if (query) {
    params.set('q', query);
  }
  if (values.city) {
    params.set('city', values.city);
  }
  if (values.category) {
    params.set('category', values.category);
  }
  if (values.minRating) {
    params.set('minRating', String(values.minRating));
  }
  if (values.sort && values.sort !== 'featured') {
    params.set('sort', values.sort);
  }
  if (values.page && values.page > 1) {
    params.set('page', String(values.page));
  }

  const search = params.toString();
  return `${withLocale(locale, '/business')}${search ? `?${search}` : ''}`;
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

async function localizeArticleSummaries(articles: Article[], locale: Locale) {
  if (articles.length === 0) {
    return [];
  }

  const localizedText = await resolveLocalizedTextList(
    articles.flatMap((article) => [article.title, article.excerpt]),
    locale
  );

  return articles.map((article, index) => ({
    article,
    localizedText: {
      title: localizedText[index * 2] ?? article.title.en,
      excerpt: localizedText[index * 2 + 1] ?? article.excerpt.en,
    },
  }));
}

function cleanArizonaNewsCopy(value: string): string {
  return value
    .replace(/\bSignals\b/g, 'Indicators')
    .replace(/\bsignals\b/g, 'indicators')
    .replace(/\bSignal\b/g, 'Indicator')
    .replace(/\bsignal\b/g, 'indicator')
    .replace(/訊號/g, '資訊');
}

function isRadarArticle(article: Article): boolean {
  return article.series === 'arizona-radar' || article.series === 'austin-radar';
}

function cleanLocalizedArticleSummary<T extends { localizedText: { title: string; excerpt: string } }>(
  item: T
): T {
  return {
    ...item,
    localizedText: {
      title: cleanArizonaNewsCopy(item.localizedText.title),
      excerpt: cleanArizonaNewsCopy(item.localizedText.excerpt),
    },
  };
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
              ? '此城市設定必須先接入自己的商家來源；平台不会回退顯示 ChineseArizona 商家。'
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
    minRating: parseDirectoryMinRating(searchParams.minRating),
    sort: parseDirectorySortOption(searchParams.sort),
  };
  const directoryPagePath = withLocale(locale, '/business');
  const [{ categories, cities }, directoryPage] = await Promise.all([
    getDirectoryFilterOptions(),
    getDirectoryPage(filters, requestedPage, DIRECTORY_PAGE_SIZE, { usePaidPromotion: true }),
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
  const pageUrl = absoluteUrl(withLocale(locale, '/'));
  const directoryUrl = absoluteUrl(withLocale(locale, '/business'));
  const homepageJsonLd = isHomepage
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'ChineseArizona',
          alternateName: ['Chinese Arizona', '亞利桑那華人平台'],
          url: pageUrl,
          description:
            locale === 'zh'
              ? '服務亞利桑那華人與新移民的雙語平台，整合商家目錄、在地新聞、搬遷指南與社群資源。'
              : 'A bilingual Arizona platform with trusted local businesses, local news, relocation guides, and community resources.',
        },
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'ChineseArizona',
          alternateName: 'Chinese Arizona',
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
    ? 'ChineseArizona'
    : locale === 'zh'
      ? '華人商家'
      : 'Chinese Businesses';
  const headingDescription = isHomepage
    ? locale === 'zh'
      ? '亞利桑那雙語平台，整合可信商家目錄、在地新聞、搬遷指南與社群資源。'
      : 'A bilingual Arizona platform for trusted local businesses, local news, newcomer resources, and community discovery.'
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
                href={buildDirectoryHref(locale, { category: category.slug })}
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

export async function BusinessDetailPageView({
  locale,
  slug,
  site = defaultSiteProfile,
}: {
  locale: Locale;
  slug: string;
  site?: SiteProfile;
}) {
  if (!hasLiveDirectoryData(site)) {
    return null;
  }

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
  const imageSet = [business.heroImage, ...business.gallery]
    .map((value) => resolveAbsoluteAssetUrl(value))
    .filter((value): value is string => Boolean(value));
  const claimHref = withLocale(
    locale,
    `/add-business?businessSlug=${encodeURIComponent(business.slug)}&businessName=${encodeURIComponent(business.name.en)}`
  );
  const menuHref = getBusinessMenuUrl(business);
  const websiteHref = business.website && business.website !== menuHref ? business.website : undefined;
  const emailHref = business.email ? `mailto:${business.email}` : undefined;
  const phoneLink = phoneHref(business.phone);
  const directionsHref = getBusinessDirectionsUrl(business);
  const serviceHighlights = getBusinessServiceHighlights(business, locale);
  const hoursPreview = getBusinessHoursPreview(business.hours, locale);
  const localBusinessJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name.en,
    alternateName: business.name.zh,
    description: business.description.en,
    url: absoluteUrl(withLocale(locale, `/business/${business.slug}`)),
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

  const displayName = t(business.name, locale);
  const alternateName =
    business.name.zh && business.name.zh !== business.name.en
      ? business.name.zh
      : locale === 'zh' && business.name.en !== displayName
        ? business.name.en
        : undefined;
  const categoryLabel = category ? t(category.name, locale) : locale === 'zh' ? '本地商家' : 'Local business';
  const addressLabel = business.address ?? business.serviceAreaText ?? `${business.city}, AZ`;
  const ratingLabel =
    business.reviewCount > 0
      ? business.rating > 0
        ? `${business.rating.toFixed(1)}`
        : `${business.reviewCount}`
      : locale === 'zh'
        ? '新收錄'
        : 'New';
  const reviewCountLabel =
    business.reviewCount > 0
      ? locale === 'zh'
        ? `${business.reviewCount} 則評價`
        : `${business.reviewCount} reviews`
      : locale === 'zh'
        ? '尚無公開評價'
        : 'No public reviews yet';
  const firstHoursLabel =
    hoursPreview.items[0] ?? (locale === 'zh' ? '營業時間待補充' : 'Hours not listed yet');
  const contactEmail = business.email ?? (locale === 'zh' ? '電子郵件待補充' : 'Email not listed');
  const contactWebsite = websiteHref ?? business.website;
  const contactWebsiteLabel = contactWebsite
    ? contactWebsite.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : locale === 'zh'
      ? '網站待補充'
      : 'Website not listed';
  const businessImageCandidates = [business.heroImage, ...business.gallery].filter(
    (value): value is string => Boolean(value)
  );
  const photoSlots = Array.from({ length: 4 }, (_, index) => businessImageCandidates[index]);
  const aboutImage = business.gallery[0] ?? business.heroImage;
  const primaryActionLabel = locale === 'zh' ? '撥打電話' : 'Call';
  const languageSummary =
    business.languages.length > 0
      ? formatLanguageList(business.languages, locale)
      : locale === 'zh'
        ? '語言資訊待補充'
        : 'Language details pending';
  const popularityBadge = isMostPopularDirectoryBusiness(business);
  const menuOrWebsiteHref = menuHref ?? websiteHref;
  const menuShowcase =
    business.categorySlug === 'dining'
      ? [
          {
            title: locale === 'zh' ? '招牌飲品' : 'Signature drink',
            subtitle: locale === 'zh' ? '暫用圖像' : 'Temporary image',
            price: '$5.75',
            imageUrl: business.gallery[0] ?? business.heroImage,
          },
          {
            title: locale === 'zh' ? '手作點心' : 'House dessert',
            subtitle: locale === 'zh' ? '暫用圖像' : 'Temporary image',
            price: '$3.95',
            imageUrl: business.gallery[1],
          },
          {
            title: locale === 'zh' ? '人氣主食' : 'Popular entree',
            subtitle: locale === 'zh' ? '暫用圖像' : 'Temporary image',
            price: '$10.95',
            imageUrl: business.gallery[2],
          },
          {
            title: locale === 'zh' ? '季節推薦' : 'Seasonal pick',
            subtitle: locale === 'zh' ? '暫用圖像' : 'Temporary image',
            price: '$8.50',
            imageUrl: business.gallery[3],
          },
        ]
      : [
          {
            title: locale === 'zh' ? '核心服務' : 'Primary service',
            subtitle: locale === 'zh' ? '暫用圖像' : 'Temporary image',
            price: locale === 'zh' ? '洽詢' : 'Ask',
            imageUrl: business.gallery[0] ?? business.heroImage,
          },
          {
            title: locale === 'zh' ? '雙語協助' : 'Bilingual help',
            subtitle: locale === 'zh' ? '暫用圖像' : 'Temporary image',
            price: locale === 'zh' ? '洽詢' : 'Ask',
            imageUrl: business.gallery[1],
          },
          {
            title: locale === 'zh' ? '在地經驗' : 'Local guidance',
            subtitle: locale === 'zh' ? '暫用圖像' : 'Temporary image',
            price: locale === 'zh' ? '洽詢' : 'Ask',
            imageUrl: business.gallery[2],
          },
          {
            title: locale === 'zh' ? '預約諮詢' : 'Consultation',
            subtitle: locale === 'zh' ? '暫用圖像' : 'Temporary image',
            price: locale === 'zh' ? '預約' : 'Book',
            imageUrl: business.gallery[3],
          },
        ];

  return (
    <div className="bg-[#f7f1e8] text-[#2c2722]">
      <JsonLd data={localBusinessJsonLd} />

      <section className="relative overflow-hidden border-b border-[#ded5c9] bg-[#f7f1e8]">
        <div className="absolute right-0 top-20 hidden h-72 w-[28rem] rounded-l-[9rem] bg-[#f1bf97] opacity-80 lg:block" />
        <div className="mx-auto max-w-[96rem] px-4 py-6 sm:px-6 lg:px-8">
          <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs font-medium text-[#776d62]" aria-label={locale === 'zh' ? '麵包屑' : 'Breadcrumb'}>
            <Link href={withLocale(locale, '/')} className="transition-colors hover:text-[#b7282e]">
              {locale === 'zh' ? '首頁' : 'Home'}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <Link href={withLocale(locale, '/business')} className="transition-colors hover:text-[#b7282e]">
              {locale === 'zh' ? '華人商家' : 'Chinese Businesses'}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            {category ? (
              <>
                <Link
                  href={withLocale(locale, `/business?category=${category.slug}`)}
                  className="transition-colors hover:text-[#b7282e]"
                >
                  {categoryLabel}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </>
            ) : null}
            <span className="text-[#2c2722]">{displayName}</span>
          </nav>

          <div className="relative grid min-h-[25rem] overflow-hidden rounded-lg border border-[#dfd4c8] bg-[#fbf7f0] shadow-[0_24px_70px_rgba(85,58,28,0.12)] lg:grid-cols-[0.72fr_1.28fr]">
            <div className="relative z-10 flex flex-col justify-center px-6 py-8 sm:px-9 lg:py-10">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {business.verified ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-[#4d744b] px-2.5 py-1 text-xs font-semibold text-white">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {locale === 'zh' ? '認證商家' : 'Verified'}
                  </span>
                ) : null}
                {popularityBadge ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-[#d99633]/15 px-2.5 py-1 text-xs font-semibold text-[#8b5b19]">
                    <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    {locale === 'zh' ? '熱門商家' : 'Popular'}
                  </span>
                ) : null}
                <span className="rounded-md bg-[#efe7dc] px-2.5 py-1 text-xs font-semibold text-[#5b5047]">
                  {categoryLabel}
                </span>
              </div>

              <h1 className="font-serif text-5xl leading-[0.95] text-[#2f2923] sm:text-6xl lg:text-7xl">
                {displayName}
              </h1>
              {alternateName ? <p className="mt-3 text-2xl font-semibold text-[#4b4038]">{alternateName}</p> : null}

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#5f554c]">
                <span className="inline-flex items-center gap-1.5 text-lg font-semibold text-[#2f2923]">
                  {business.rating > 0 ? (
                    <Star className="h-5 w-5 fill-[#d79526] text-[#d79526]" aria-hidden="true" />
                  ) : (
                    <Store className="h-5 w-5 text-[#b7282e]" aria-hidden="true" />
                  )}
                  {ratingLabel}
                </span>
                <span>{reviewCountLabel}</span>
                <span className="h-1 w-1 rounded-full bg-[#b9aa99]" aria-hidden="true" />
                <span>{business.city}, AZ</span>
              </div>

              <p className="mt-5 max-w-xl text-base leading-7 text-[#5f554c]">{t(business.shortDescription, locale)}</p>
              <p className="mt-1 max-w-xl text-sm leading-6 text-[#766b61]">{t(business.description, locale)}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {serviceHighlights.slice(0, 4).map((highlight) => (
                  <span key={highlight} className="rounded-md border border-[#e0d4c7] bg-white/65 px-3 py-1.5 text-xs font-semibold text-[#51483f]">
                    {highlight}
                  </span>
                ))}
                {serviceHighlights.length === 0 ? (
                  <>
                    <span className="rounded-md border border-[#e0d4c7] bg-white/65 px-3 py-1.5 text-xs font-semibold text-[#51483f]">
                      {categoryLabel}
                    </span>
                    <span className="rounded-md border border-[#e0d4c7] bg-white/65 px-3 py-1.5 text-xs font-semibold text-[#51483f]">
                      {languageSummary}
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="relative min-h-[19rem] overflow-hidden bg-[#d8c7b5] lg:min-h-[25rem]">
              <BusinessImage
                imageUrl={business.heroImage}
                label={descriptiveImageAlt(displayName, 'business', locale)}
                locale={locale}
                category={category}
                priority
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#2a1e16]/20 via-transparent to-transparent" />
              <div className="absolute bottom-0 right-0 h-36 w-72 rounded-tl-[7rem] bg-[#f4c29c]/95">
                <div className="absolute bottom-0 right-0 h-full w-full bg-[radial-gradient(circle_at_65%_70%,rgba(74,52,33,0.36)_0_2px,transparent_3px),linear-gradient(135deg,transparent_0_45%,rgba(128,78,36,0.22)_45%_47%,transparent_47%)] opacity-70" />
                <div className="absolute bottom-8 right-10 h-16 w-28 rounded-t-full border-t-4 border-[#8b5b33]/45" />
                <div className="absolute bottom-10 right-28 h-20 w-px bg-[#8b5b33]/45" />
                <div className="absolute bottom-7 right-7 h-24 w-px bg-[#8b5b33]/55" />
              </div>
              <div className="absolute bottom-6 left-6 flex items-center gap-3 rounded-lg border border-white/55 bg-[#fbf7f0]/90 px-4 py-3 shadow-[0_16px_40px_rgba(42,30,22,0.16)] backdrop-blur">
                <Navigation className="h-5 w-5 text-[#d9972d]" aria-hidden="true" />
                <div>
                  <p className="text-xs font-bold text-[#5c5148]">{business.city.toUpperCase()}, ARIZONA</p>
                  <p className="text-sm font-semibold text-[#3b332d]">{locale === 'zh' ? '在地商家檔案' : 'Local business profile'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#e2d8cb] bg-[#fbf7f0]">
        <div className="mx-auto max-w-[96rem] px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              {business.phone && phoneLink ? (
                <a
                  href={phoneLink}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#bd2730] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(189,39,48,0.24)] transition hover:bg-[#a91f27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd2730]/35"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {primaryActionLabel}
                  <span className="text-white/80">{business.phone}</span>
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#d9cfc2] px-5 text-sm font-semibold text-[#766b61]"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {locale === 'zh' ? '電話待補充' : 'Phone pending'}
                </button>
              )}

              {directionsHref ? (
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d7cabe] bg-white px-4 text-sm font-semibold text-[#3d342e] transition hover:border-[#bd2730] hover:text-[#bd2730] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd2730]/25"
                >
                  <Route className="h-4 w-4" aria-hidden="true" />
                  {locale === 'zh' ? '查看路線' : 'Directions'}
                </a>
              ) : null}

              {menuOrWebsiteHref ? (
                <a
                  href={menuOrWebsiteHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d7cabe] bg-white px-4 text-sm font-semibold text-[#3d342e] transition hover:border-[#bd2730] hover:text-[#bd2730] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd2730]/25"
                >
                  <Utensils className="h-4 w-4" aria-hidden="true" />
                  {menuHref ? (locale === 'zh' ? '菜單／下單' : 'Menu / order') : locale === 'zh' ? '官方網站' : 'Website'}
                </a>
              ) : null}

              <button
                type="button"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d7cabe] bg-white px-4 text-sm font-semibold text-[#3d342e] transition hover:border-[#bd2730] hover:text-[#bd2730] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd2730]/25"
              >
                <Bookmark className="h-4 w-4" aria-hidden="true" />
                {locale === 'zh' ? '收藏' : 'Save'}
              </button>
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d7cabe] bg-white px-4 text-sm font-semibold text-[#3d342e] transition hover:border-[#bd2730] hover:text-[#bd2730] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd2730]/25"
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
                {locale === 'zh' ? '分享' : 'Share'}
              </button>
              <a
                href="#reviews"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d7cabe] bg-white px-4 text-sm font-semibold text-[#3d342e] transition hover:border-[#bd2730] hover:text-[#bd2730] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd2730]/25"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                {locale === 'zh' ? '寫評價' : 'Write a review'}
              </a>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
              <div className="flex min-h-14 items-center gap-3 rounded-lg border border-[#e2d8cb] bg-[#f7f1e8] px-4">
                <MapPin className="h-5 w-5 text-[#bd2730]" aria-hidden="true" />
                <span className="line-clamp-2">{addressLabel}</span>
              </div>
              <div className="flex min-h-14 items-center gap-3 rounded-lg border border-[#e2d8cb] bg-[#f7f1e8] px-4">
                <Clock3 className="h-5 w-5 text-[#4d744b]" aria-hidden="true" />
                <span className="line-clamp-2">{firstHoursLabel}</span>
              </div>
              <div className="flex min-h-14 items-center gap-3 rounded-lg border border-[#e2d8cb] bg-[#f7f1e8] px-4">
                <MessageCircle className="h-5 w-5 text-[#8b5b19]" aria-hidden="true" />
                <span>{business.bilingual ? (locale === 'zh' ? '雙語服務' : 'Bilingual support') : languageSummary}</span>
              </div>
              <div className="flex min-h-14 items-center gap-3 rounded-lg border border-[#e2d8cb] bg-[#f7f1e8] px-4">
                <CircleDollarSign className="h-5 w-5 text-[#5b5047]" aria-hidden="true" />
                <span>{business.priceRange ?? (locale === 'zh' ? '價位待補充' : 'Price pending')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[96rem] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_25rem] xl:grid-cols-[minmax(0,1fr)_28rem]">
          <div className="min-w-0">
            <div className="sticky top-16 z-20 mb-7 flex gap-1 overflow-x-auto border-b border-[#ddd1c4] bg-[#f7f1e8]/95 py-2 backdrop-blur">
              {[
                { id: '#overview', en: 'Overview', zh: '概覽' },
                { id: '#menu', en: business.categorySlug === 'dining' ? 'Menu' : 'Services', zh: business.categorySlug === 'dining' ? '菜單' : '服務' },
                { id: '#reviews', en: 'Reviews', zh: '評價' },
                { id: '#photos', en: 'Photos', zh: '照片' },
                { id: '#community', en: 'Community', zh: '社區' },
              ].map((item, index) => (
                <a
                  key={item.id}
                  href={item.id}
                  className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                    index === 0
                      ? 'border-[#bd2730] text-[#bd2730]'
                      : 'border-transparent text-[#6d6258] hover:border-[#bd2730]/35 hover:text-[#bd2730]'
                  }`}
                >
                  {locale === 'zh' ? item.zh : item.en}
                  <span className="ml-2 text-xs text-[#9a8d80]">{locale === 'zh' ? item.en : item.zh}</span>
                </a>
              ))}
            </div>

            <section id="overview" className="grid gap-6 border-b border-[#e2d8cb] pb-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#bd2730]">
                  <Store className="h-4 w-4" aria-hidden="true" />
                  {locale === 'zh' ? '商家介紹' : 'Business profile'}
                </div>
                <h2 className="text-3xl font-semibold text-[#2c2722]">
                  {locale === 'zh' ? `關於 ${displayName}` : `About ${displayName}`}
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-8 text-[#5f554c]">{t(business.description, locale)}</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-[#e2d8cb] bg-[#fbf7f0] p-4">
                    <p className="text-xs font-semibold text-[#8b8176]">{locale === 'zh' ? '城市' : 'City'}</p>
                    <p className="mt-1 text-lg font-semibold text-[#2c2722]">{business.city}</p>
                  </div>
                  <div className="rounded-lg border border-[#e2d8cb] bg-[#fbf7f0] p-4">
                    <p className="text-xs font-semibold text-[#8b8176]">{locale === 'zh' ? '分類' : 'Category'}</p>
                    <p className="mt-1 text-lg font-semibold text-[#2c2722]">{categoryLabel}</p>
                  </div>
                  <div className="rounded-lg border border-[#e2d8cb] bg-[#fbf7f0] p-4">
                    <p className="text-xs font-semibold text-[#8b8176]">{locale === 'zh' ? '語言' : 'Languages'}</p>
                    <p className="mt-1 text-lg font-semibold text-[#2c2722]">{languageSummary}</p>
                  </div>
                </div>
              </div>

              <div className="relative min-h-60 overflow-hidden rounded-lg border border-[#dfd4c8] bg-[#eadfce]">
                <BusinessImage
                  imageUrl={aboutImage}
                  label={descriptiveImageAlt(displayName, 'business', locale)}
                  locale={locale}
                  category={category}
                  className="object-cover"
                />
              </div>
            </section>

            <section id="menu" className="border-b border-[#e2d8cb] py-8">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-semibold text-[#2c2722]">
                    {business.categorySlug === 'dining'
                      ? locale === 'zh'
                        ? '熱門推薦'
                        : 'Popular items'
                      : locale === 'zh'
                        ? '精選服務'
                        : 'Featured services'}
                  </h2>
                  <p className="mt-2 text-sm text-[#6d6258]">
                    {locale === 'zh'
                      ? '暫用實際資料與示意圖，之後可接入商家照片與菜單。'
                      : 'Uses available listing data with temporary placeholders until menu photos are connected.'}
                  </p>
                </div>
                {menuOrWebsiteHref ? (
                  <a
                    href={menuOrWebsiteHref}
                    target="_blank"
                    rel="noreferrer"
                    className="hidden text-sm font-semibold text-[#bd2730] hover:text-[#8f1c22] sm:inline-flex"
                  >
                    {locale === 'zh' ? '查看官方資訊' : 'View official info'}
                  </a>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {menuShowcase.map((item) => (
                  <article key={item.title} className="overflow-hidden rounded-lg border border-[#e2d8cb] bg-[#fbf7f0]">
                    <div className="relative h-36 bg-[#eadfce]">
                      {item.imageUrl ? (
                        <BusinessImage
                          imageUrl={item.imageUrl}
                          label={item.title}
                          locale={locale}
                          category={category}
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(135deg,#eadfce,#f7f1e8)] text-[#8b8176]">
                          <ImageIcon className="h-7 w-7" aria-hidden="true" />
                          <span className="mt-2 text-xs font-semibold">{item.subtitle}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-end justify-between gap-3 p-4">
                      <div>
                        <h3 className="font-semibold text-[#2c2722]">{item.title}</h3>
                        <p className="mt-1 text-sm text-[#766b61]">{item.subtitle}</p>
                      </div>
                      <p className="font-semibold text-[#bd2730]">{item.price}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section id="reviews" className="grid gap-5 border-b border-[#e2d8cb] py-8 xl:grid-cols-[24rem_minmax(0,1fr)]">
              <div className="rounded-lg border border-[#e2d8cb] bg-[#fbf7f0] p-6">
                <p className="text-sm font-semibold text-[#8b8176]">{locale === 'zh' ? '顧客評價' : 'Customer reviews'}</p>
                <div className="mt-3 flex items-end gap-3">
                  <span className="text-5xl font-semibold text-[#2c2722]">{ratingLabel}</span>
                  {business.rating > 0 ? <Star className="mb-2 h-8 w-8 fill-[#d79526] text-[#d79526]" aria-hidden="true" /> : null}
                </div>
                <p className="mt-2 text-sm text-[#6d6258]">{reviewCountLabel}</p>
                <div className="mt-5 space-y-2">
                  {[5, 4, 3].map((score) => {
                    const width = business.rating > 0 ? `${Math.max(8, Math.min(100, (business.rating / 5) * 100 - (5 - score) * 16))}%` : '12%';
                    return (
                      <div key={score} className="flex items-center gap-3 text-xs text-[#766b61]">
                        <span className="w-6">{score}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-md bg-[#eadfce]">
                          <div className="h-full rounded-md bg-[#d79526]" style={{ width }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                {businessReviews.length > 0 ? (
                  businessReviews.map((review) => (
                    <article key={review.id} className="rounded-lg border border-[#e2d8cb] bg-[#fbf7f0] p-5">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-semibold text-[#2c2722]">{t(review.title, locale)}</h3>
                        <span className="text-sm text-[#d79526]">{'★'.repeat(review.rating)}</span>
                      </div>
                      <p className="text-sm leading-6 text-[#62584f]">{t(review.content, locale)}</p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-[#d5c8b9] bg-[#fbf7f0] p-6">
                    <p className="font-semibold text-[#2c2722]">{locale === 'zh' ? '還沒有站內評論' : 'No local reviews yet'}</p>
                    <p className="mt-2 text-sm leading-6 text-[#6d6258]">
                      {locale === 'zh'
                        ? '這裡會顯示經過整理的社區評論。'
                        : 'Community reviews will appear here once they are collected and reviewed.'}
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section id="photos" className="border-b border-[#e2d8cb] py-8">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-semibold text-[#2c2722]">{locale === 'zh' ? '照片' : 'Photos'}</h2>
                  <p className="mt-2 text-sm text-[#6d6258]">
                    {locale === 'zh' ? '缺少照片的位置先使用臨時佔位。' : 'Missing photo slots use temporary placeholders for now.'}
                  </p>
                </div>
                <Camera className="h-6 w-6 text-[#bd2730]" aria-hidden="true" />
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                {photoSlots.map((imageUrl, index) => (
                  <div key={`${imageUrl ?? 'placeholder'}-${index}`} className="relative h-36 overflow-hidden rounded-lg border border-[#e2d8cb] bg-[#eadfce]">
                    {imageUrl ? (
                      <BusinessImage
                        imageUrl={imageUrl}
                        label={`${displayName} ${locale === 'zh' ? '照片' : 'photo'} ${index + 1}`}
                        locale={locale}
                        category={category}
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(135deg,#eadfce,#f8efe2)] text-[#8b8176]">
                        <ImageIcon className="h-7 w-7" aria-hidden="true" />
                        <span className="mt-2 text-xs font-semibold">{locale === 'zh' ? '暫用圖像' : 'Temporary image'}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section id="community" className="py-8">
              <div className="rounded-lg border border-[#e2d8cb] bg-[#fbf7f0] p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#bd2730]/10 text-[#bd2730]">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-[#2c2722]">{locale === 'zh' ? '社區資料修正' : 'Community corrections'}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d6258]">
                      {business.verificationState === 'unverified'
                        ? locale === 'zh'
                          ? '如果這是你的商家，請認領它；如果資訊有誤，請送出回報。'
                          : 'If this is your business, claim it. If anything is wrong, send a correction for review.'
                        : locale === 'zh'
                          ? '若資料有誤，請回報給管理端；商家擁有者也可透過認領流程要求更新。'
                          : 'If any detail is wrong, send a correction. Business owners can still use the claim flow to request updates.'}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      {business.verificationState === 'unverified' ? (
                        <Link
                          href={claimHref}
                          className="inline-flex h-10 items-center justify-center rounded-md bg-[#bd2730] px-4 text-sm font-semibold text-white transition hover:bg-[#a91f27]"
                        >
                          {locale === 'zh' ? '認領這筆商家' : 'Claim this listing'}
                        </Link>
                      ) : null}
                      {websiteHref ? (
                        <a
                          href={websiteHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center justify-center rounded-md border border-[#d7cabe] bg-white px-4 text-sm font-semibold text-[#3d342e] transition hover:border-[#bd2730] hover:text-[#bd2730]"
                        >
                          {locale === 'zh' ? '查看網站' : 'Visit website'}
                        </a>
                      ) : null}
                    </div>
                    <div className="mt-5 max-w-2xl">
                      <ReportIssueForm entitySlug={business.slug} entityType="business" locale={locale} />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <section className="overflow-hidden rounded-lg border border-[#dfd4c8] bg-[#fbf7f0] shadow-[0_18px_45px_rgba(84,58,32,0.08)]">
              <div className="relative h-48 overflow-hidden bg-[#e8efe5]">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(92,111,91,0.14)_1px,transparent_1px),linear-gradient(0deg,rgba(92,111,91,0.14)_1px,transparent_1px)] bg-[size:46px_46px]" />
                <div className="absolute inset-x-0 top-1/2 h-5 -translate-y-1/2 bg-[#d9cdbb]/70" />
                <div className="absolute left-1/2 top-0 h-full w-5 -translate-x-1/2 bg-[#d9cdbb]/70" />
                <div className="absolute left-[52%] top-[38%] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#bd2730]/15">
                  <MapPin className="h-9 w-9 fill-[#bd2730] text-[#bd2730]" aria-hidden="true" />
                </div>
                <span className="absolute left-4 top-4 rounded-md bg-white/80 px-2.5 py-1 text-xs font-semibold text-[#5f554c]">
                  {business.city}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 h-5 w-5 shrink-0 text-[#5f554c]" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-[#2c2722]">{addressLabel}</p>
                    <p className="text-sm text-[#766b61]">{business.region}</p>
                  </div>
                </div>
                {directionsHref ? (
                  <a
                    href={directionsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#bd2730] bg-white text-sm font-semibold text-[#bd2730] transition hover:bg-[#bd2730] hover:text-white"
                  >
                    <Route className="h-4 w-4" aria-hidden="true" />
                    {locale === 'zh' ? '查看路線' : 'Directions'}
                  </a>
                ) : null}
              </div>
            </section>

            <section className="rounded-lg border border-[#dfd4c8] bg-[#fbf7f0] p-5 shadow-[0_18px_45px_rgba(84,58,32,0.08)]">
              <h2 className="mb-4 text-lg font-semibold text-[#2c2722]">{locale === 'zh' ? '聯絡資訊' : 'Contact'}</h2>
              <div className="space-y-3 text-sm text-[#5f554c]">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-[#bd2730]" aria-hidden="true" />
                  {business.phone && phoneLink ? (
                    <a href={phoneLink} className="font-semibold text-[#bd2730] hover:text-[#8f1c22]">
                      {business.phone}
                    </a>
                  ) : (
                    <span>{locale === 'zh' ? '電話待補充' : 'Phone not listed'}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-[#5f554c]" aria-hidden="true" />
                  {business.email && emailHref ? (
                    <a href={emailHref} className="transition hover:text-[#bd2730]">
                      {contactEmail}
                    </a>
                  ) : (
                    <span>{contactEmail}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Globe2 className="h-4 w-4 text-[#5f554c]" aria-hidden="true" />
                  {contactWebsite ? (
                    <a href={contactWebsite} target="_blank" rel="noreferrer" className="transition hover:text-[#bd2730]">
                      {contactWebsiteLabel}
                    </a>
                  ) : (
                    <span>{contactWebsiteLabel}</span>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[#dfd4c8] bg-[#fbf7f0] p-5 shadow-[0_18px_45px_rgba(84,58,32,0.08)]">
              <h2 className="mb-4 text-lg font-semibold text-[#2c2722]">{locale === 'zh' ? '營業時間' : 'Business hours'}</h2>
              {business.hours.length > 0 ? (
                <div className="space-y-2">
                  {business.hours.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4 rounded-md bg-[#f7f1e8] px-3 py-2 text-sm">
                      <span className="font-semibold text-[#3b332d]">{businessHoursLabel(row.label, locale)}</span>
                      <span className="text-right text-[#6d6258]">{businessHoursValue(row.value, locale)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[#6d6258]">
                  {locale === 'zh' ? '商家尚未提供結構化營業時間。' : 'Structured hours have not been added yet.'}
                </p>
              )}
            </section>

            {owner ? (
              <section className="rounded-lg border border-[#dfd4c8] bg-[#fbf7f0] p-5 shadow-[0_18px_45px_rgba(84,58,32,0.08)]">
                <h2 className="mb-4 text-lg font-semibold text-[#2c2722]">{locale === 'zh' ? '商家擁有者' : 'Business owner'}</h2>
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg text-sm font-bold text-white ${owner.avatarColor}`}>
                    {owner.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-[#2c2722]">
                      <span lang="en">{owner.name}</span> · <span lang="zh">{owner.nameZh}</span>
                    </p>
                    <p className="text-sm text-[#766b61]">{owner.city}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#6d6258]">{t(owner.bio, locale)}</p>
              </section>
            ) : null}

            <section className="rounded-lg border border-[#dfd4c8] bg-[#f4efe5] p-5 shadow-[0_18px_45px_rgba(84,58,32,0.08)]">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#4d744b] text-white">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#2c2722]">{locale === 'zh' ? 'ChineseArizona 認證' : 'Verified by ChineseArizona'}</h2>
                  <p className="mt-1 text-sm leading-6 text-[#6d6258]">
                    {locale === 'zh'
                      ? '此頁使用商家來源、社區線索與人工審核資料整理。'
                      : 'This profile is assembled from business sources, community signals, and editorial review.'}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-[#bd2730]">
                    {business.verificationState
                      ? verificationStateLabel(business.verificationState, locale)
                      : business.verified
                        ? locale === 'zh'
                          ? '已驗證'
                          : 'Verified'
                        : locale === 'zh'
                          ? '待驗證'
                          : 'Pending verification'}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        {relatedCategoryBusinesses.length > 0 ? (
          <section className="mt-8 space-y-4 border-t border-[#e2d8cb] pt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-semibold text-[#2c2722]">
                {locale === 'zh' ? '同城市／分類的其他選擇' : 'More options in the same city and category'}
              </h2>
              {category ? (
                <Link
                  href={withLocale(locale, `/business/${business.city.toLowerCase()}/${category.slug}`)}
                  className="text-sm font-semibold text-[#bd2730] hover:text-[#8f1c22]"
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
          </section>
        ) : null}
      </main>
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

  const cityCategoryPath = withLocale(locale, `/business/${city}/${category}`);
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
        usePaidPromotion: true,
      }
    ),
  ]);
  const categoryRecord = categories.find((item) => item.slug === category);
  if (!categoryRecord) {
    return null;
  }
  const cityLabel = listings[0]?.city ?? city;

  return sectionContainer(
    <div className="space-y-8 py-12">
      <div className="max-w-3xl space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          {t(categoryRecord.name, locale)} {locale === 'zh' ? '在' : 'in'} {cityLabel}
        </h1>
        <p className="text-base leading-7 text-slate-600">{t(categoryRecord.description, locale)}</p>
      </div>

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
              pagePath={cityCategoryPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export async function RelocationGuidePageView({ locale }: { locale: Locale }) {
  const guideList = getGuides();
  const articleList = await getCurrentArticlesAsync(6);
  const [localizedArticleText, housingRegions] = await Promise.all([
    resolveLocalizedTextList(
      articleList.flatMap((article) => [article.title, article.excerpt]),
      locale
    ),
    getHousingRegionSnapshots(),
  ]);
  const localizedArticles = articleList.map((article, index) => ({
    article,
    localizedText: {
      title: localizedArticleText[index * 2] ?? article.title.en,
      excerpt: localizedArticleText[index * 2 + 1] ?? article.excerpt.en,
    },
  }));
  const featuredGuide =
    guideList.find((guide) => guide.slug === 'where-tsmc-families-look-first') ?? guideList[0];
  const movingGuide = guideList.find((guide) => guide.slug === 'az-moving-checklist') ?? featuredGuide;
  const guideRows = featuredGuide
    ? guideList.filter((guide) => guide.slug !== featuredGuide.slug)
    : guideList;
  const primaryGuideRows = guideRows.slice(0, 3);
  const settlementSteps = [
    {
      label: locale === 'zh' ? '先落腳' : 'Soft landing',
      title: locale === 'zh' ? '住處、通勤、買菜先穩住' : 'Stabilize housing, commute, and groceries',
      description:
        locale === 'zh'
          ? '先比較 Phoenix、Chandler、Gilbert、Peoria 等生活圈，再決定短租、長租或買房節奏。'
          : 'Compare Phoenix, Chandler, Gilbert, Peoria, and nearby routines before choosing short-term, rental, or purchase timing.',
    },
    {
      label: locale === 'zh' ? '辦手續' : 'Legal setup',
      title: locale === 'zh' ? 'MVD、公用事業與文件' : 'MVD, utilities, and documents',
      description:
        locale === 'zh'
          ? '需要即時準確的資訊時，從官方入口確認，再用指南整理下一步。'
          : 'Use official sources for time-sensitive requirements, then use the guides to sequence the next steps.',
    },
    {
      label: locale === 'zh' ? '建立生活' : 'Local rhythm',
      title: locale === 'zh' ? '學校、醫療與華人社群' : 'Schools, healthcare, and Chinese community',
      description:
        locale === 'zh'
          ? '把中文學校、週末活動、醫療與可信服務者串成可持續的一週。'
          : 'Turn Chinese schools, weekend activities, healthcare, and trusted providers into a sustainable weekly rhythm.',
    },
  ];
  const guideIcon = (section: Guide['section']) => {
    if (section === 'housing') {
      return <Building2 className="h-5 w-5" aria-hidden="true" />;
    }
    if (section === 'transportation') {
      return <Route className="h-5 w-5" aria-hidden="true" />;
    }
    if (section === 'schools') {
      return <Bookmark className="h-5 w-5" aria-hidden="true" />;
    }
    if (section === 'utilities') {
      return <CheckCircle2 className="h-5 w-5" aria-hidden="true" />;
    }
    if (section === 'healthcare') {
      return <ShieldCheck className="h-5 w-5" aria-hidden="true" />;
    }
    if (section === 'community') {
      return <MessageCircle className="h-5 w-5" aria-hidden="true" />;
    }
    if (section === 'safety') {
      return <ShieldAlert className="h-5 w-5" aria-hidden="true" />;
    }

    return <Navigation className="h-5 w-5" aria-hidden="true" />;
  };

  return (
    <div className="overflow-x-hidden bg-[#fcf8f1] text-[#261b15]">
      <section className="relative border-b border-[#e3d4c5] bg-[#fcf8f1]">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              'radial-gradient(circle at 8% 18%, rgba(206, 84, 53, 0.11), transparent 24%), radial-gradient(circle at 82% 4%, rgba(209, 154, 82, 0.18), transparent 27%), linear-gradient(180deg, rgba(255,255,255,0.64), rgba(252,248,241,0))',
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-9 px-4 py-9 sm:px-6 sm:py-12 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-14">
          <div className="homepage-rise flex flex-col justify-center">
            <div className="mb-6 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
              <span>{locale === 'zh' ? '搬家指南' : 'Relocation guide'}</span>
              <span className="h-px w-12 bg-brand-300" aria-hidden="true" />
              <span>{locale === 'zh' ? 'Greater Phoenix' : 'Greater Phoenix'}</span>
            </div>
            <h1 className="max-w-4xl text-[3.35rem] font-semibold leading-[0.93] text-[#2a1c14] sm:text-[4.4rem] lg:text-[5.35rem] [font-family:var(--font-display)]">
              {locale === 'zh' ? (
                <>
                  搬遷與新手
                  <span className="block text-brand-700">資源中心</span>
                </>
              ) : (
                <>
                  Relocation and Newcomer
                  <span className="block text-brand-700">Resource Center</span>
                </>
              )}
            </h1>
            <div className="mt-9 flex flex-wrap gap-3">
              {movingGuide ? (
                <TrackedLink
                  href={withLocale(locale, `/relocation-guide/${movingGuide.slug}`)}
                  eventType="guide_click"
                  entitySlug={movingGuide.slug}
                  className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_22px_42px_-28px_rgba(187,61,41,0.9)] transition-colors hover:bg-brand-700"
                >
                  {locale === 'zh' ? '先看 30 天清單' : 'Start with the 30-day checklist'}
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </TrackedLink>
              ) : null}
              <a
                href="#relocation-guides"
                className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-[#d9c7b6] bg-white/72 px-5 py-3 text-sm font-semibold text-[#5b4739] transition-colors hover:border-brand-200 hover:text-brand-700"
              >
                {locale === 'zh' ? '瀏覽全部指南' : 'Browse all guides'}
                <Route className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="homepage-rise homepage-rise-delay-1 relative min-h-[410px] overflow-hidden rounded-[28px] border border-[#decdbb] bg-[#efe1d0] shadow-[0_34px_90px_-58px_rgba(80,48,24,0.55)] sm:min-h-[510px]">
            <Image
              src="/home-neighborhood/relocation-cactus.webp"
              alt={locale === 'zh' ? '亞利桑那沙漠社區道路' : 'Arizona desert neighborhood road'}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover object-[58%_center]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(252,248,241,0.96)_0%,rgba(252,248,241,0.68)_36%,rgba(252,248,241,0.08)_70%)]" />
            <div className="absolute left-5 top-5 max-w-[16rem] rounded-[20px] border border-white/72 bg-white/78 p-4 shadow-[0_24px_54px_-38px_rgba(68,42,25,0.55)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                {locale === 'zh' ? '安家路線' : 'Landing route'}
              </p>
              <div className="mt-4 space-y-3 text-sm font-medium text-[#453329]">
                {['Phoenix', 'Chandler', 'Gilbert'].map((city) => (
                  <div key={city} className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />
                    <span>{city}</span>
                    <span className="h-px flex-1 bg-[#d9c4b1]" />
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute right-5 top-6 hidden w-[17rem] rotate-2 rounded-[18px] border border-[#e8d8c7] bg-[#fffaf3] p-5 shadow-[0_26px_60px_-36px_rgba(65,41,25,0.55)] sm:block">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#4b3528]">
                {locale === 'zh' ? '搬家清單' : 'Moving checklist'}
              </p>
              <div className="mt-4 space-y-2.5 text-sm text-[#5d4a3e]">
                {[
                  locale === 'zh' ? '住房與租約' : 'Housing',
                  'MVD',
                  locale === 'zh' ? '公用事業' : 'Utilities',
                  locale === 'zh' ? '學校' : 'Schools',
                  locale === 'zh' ? '醫療' : 'Healthcare',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 border-b border-[#eadfd4] pb-2 last:border-b-0 last:pb-0">
                    <CheckCircle2 className="h-4 w-4 text-brand-700" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute bottom-5 right-5 max-w-[18rem] rounded-[18px] border border-[#e1c4aa] bg-[#f5d59d] px-5 py-4 shadow-[0_26px_58px_-38px_rgba(75,47,24,0.58)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#75452f]">
                {locale === 'zh' ? '預約提醒' : 'Appointment note'}
              </p>
              <p className="mt-2 text-xl font-semibold text-[#3b2a21] [font-family:var(--font-display)]">
                AZMVDNOW.gov
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="relocation-guides" className="border-b border-[#e3d4c5] bg-[#fffaf3]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.92fr] lg:px-8 lg:py-12">
          {featuredGuide ? (
            <article className="homepage-rise space-y-4">
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                <span className="h-px w-10 bg-brand-400" aria-hidden="true" />
                {locale === 'zh' ? '精選指南' : 'Featured guide'}
              </div>
              <TrackedLink
                href={withLocale(locale, `/relocation-guide/${featuredGuide.slug}`)}
                eventType="guide_click"
                entitySlug={featuredGuide.slug}
                className="group block overflow-hidden rounded-[22px] border border-[#dfcdbb] bg-white shadow-[0_26px_62px_-48px_rgba(74,48,28,0.55)]"
              >
                <div className="relative h-64 bg-[#e6d7c7]">
                  <Image
                    src={featuredGuide.heroImage}
                    alt={descriptiveImageAlt(t(featuredGuide.title, locale), 'guide', locale)}
                    fill
                    sizes="(max-width: 1024px) 100vw, 52vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                  />
                  <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-brand-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                    {guideIcon(featuredGuide.section)}
                    {guideSectionLabel(featuredGuide.section, locale)}
                  </div>
                </div>
                <div className="p-6 sm:p-7">
                  <h2 className="max-w-3xl text-[2rem] font-semibold leading-tight text-[#261b15] sm:text-[2.45rem] [font-family:var(--font-display)]">
                    {t(featuredGuide.title, locale)}
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6a5547]">
                    {t(featuredGuide.excerpt, locale)}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#7b6658]">
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4" aria-hidden="true" />
                      {formatReadTime(featuredGuide.readTime, locale)}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      {formatDate(featuredGuide.updatedAt, locale)}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      {featuredGuide.officialResources.length}
                      {locale === 'zh' ? ' 個官方連結' : ' official links'}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 font-semibold text-brand-700">
                      {locale === 'zh' ? '閱讀指南' : 'Read guide'}
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </TrackedLink>
            </article>
          ) : null}

          <div className="homepage-rise homepage-rise-delay-1">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                  {locale === 'zh' ? '指南庫' : 'Guide library'}
                </p>
              </div>
              <span className="text-sm font-medium text-[#8a7566]">
                {locale === 'zh' ? `${guideList.length} 份指南` : `${guideList.length} guides`}
              </span>
            </div>

            <div className="divide-y divide-[#e2d2c2] border-t border-[#e2d2c2]">
              {primaryGuideRows.map((guide) => (
                <TrackedLink
                  key={guide.slug}
                  href={withLocale(locale, `/relocation-guide/${guide.slug}`)}
                  eventType="guide_click"
                  entitySlug={guide.slug}
                  className="group grid gap-3 py-4 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:items-center"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1e5d7] text-[#744836] transition-colors group-hover:bg-brand-600 group-hover:text-white">
                    {guideIcon(guide.section)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                      {guideSectionLabel(guide.section, locale)}
                    </span>
                    <span className="mt-1 block text-lg font-semibold leading-snug text-[#2c2019] group-hover:text-brand-700">
                      {t(guide.title, locale)}
                    </span>
                    <span className="mt-1 line-clamp-1 block text-sm leading-6 text-[#6f5c4f]">
                      {t(guide.excerpt, locale)}
                    </span>
                  </span>
                  <span className="flex items-center gap-4 text-sm text-[#7f6a5c]">
                    <span>{formatReadTime(guide.readTime, locale)}</span>
                    <ChevronRight className="h-4 w-4 text-brand-700 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </TrackedLink>
              ))}

              {guideRows.length > primaryGuideRows.length ? (
                <div className="py-4">
                  <a
                    href="#all-relocation-guides"
                    className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#d9c7b6] bg-white/76 px-4 py-2.5 text-sm font-semibold text-[#5b4739] transition-colors hover:border-brand-300 hover:text-brand-700"
                  >
                    {locale === 'zh' ? '查看更多指南' : 'See more guides'}
                    <ChevronRight className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#e3d4c5] bg-[#fcf8f1]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <div className="grid gap-6 md:grid-cols-3">
            {settlementSteps.map((step, index) => (
              <div key={step.label} className="border-l border-[#d9c7b6] pl-5 first:border-l-brand-600">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                  {String(index + 1).padStart(2, '0')} · {step.label}
                </p>
                <h2 className="mt-3 text-2xl font-semibold leading-tight text-[#2b1f18] [font-family:var(--font-display)]">
                  {step.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#6a5547]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="all-relocation-guides" className="border-b border-[#e3d4c5] bg-[#fffaf3]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                {locale === 'zh' ? '全部指南' : 'All guides'}
              </p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#2b1f18] [font-family:var(--font-display)]">
                {locale === 'zh' ? '按需求選下一步' : 'Choose the next step'}
              </h2>
            </div>
            <span className="text-sm font-medium text-[#8a7566]">
              {locale === 'zh' ? `${guideList.length} 份指南` : `${guideList.length} guides`}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {guideList.map((guide) => (
              <TrackedLink
                key={guide.slug}
                href={withLocale(locale, `/relocation-guide/${guide.slug}`)}
                eventType="guide_click"
                entitySlug={guide.slug}
                className="group flex min-h-[190px] flex-col justify-between border-y border-[#dfcdbb] py-5 text-[#2c2019] hover:text-brand-700 md:border-r md:px-5 md:first:pl-0 xl:[&:nth-child(3n)]:border-r-0"
              >
                <span>
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#f1e5d7] text-[#744836] transition-colors group-hover:bg-brand-600 group-hover:text-white">
                    {guideIcon(guide.section)}
                  </span>
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                    {guideSectionLabel(guide.section, locale)}
                  </span>
                  <span className="mt-2 block text-xl font-semibold leading-snug">{t(guide.title, locale)}</span>
                  <span className="mt-2 line-clamp-2 block text-sm leading-6 text-[#6f5c4f]">
                    {t(guide.excerpt, locale)}
                  </span>
                </span>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-700">
                  {locale === 'zh' ? '閱讀指南' : 'Read guide'}
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </TrackedLink>
            ))}
          </div>
        </div>
      </section>

      {housingRegions.length > 0 ? (
        <section className="border-b border-[#e3d4c5] bg-[#fffaf3]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
            <HousingListingsSection locale={locale} regions={housingRegions} />
          </div>
        </section>
      ) : null}

      <section className="bg-[#fcf8f1]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                {locale === 'zh' ? '延伸閱讀' : 'Related editorial'}
              </p>
              <h2 className="mt-2 text-4xl font-semibold leading-tight text-[#2b1f18] [font-family:var(--font-display)]">
                {locale === 'zh' ? '正在影響亞利桑那生活的事' : "What's happening in Arizona"}
              </h2>
            </div>
            <Link
              href={getLocalizedNewsPath(locale, defaultSiteProfile)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              {locale === 'zh' ? '查看全部新聞' : 'View all news'}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid border-y border-[#e2d2c2] md:grid-cols-2 xl:grid-cols-3">
            {localizedArticles.map(({ article, localizedText }, index) => (
              <Link
                key={article.slug}
                href={getLocalizedNewsArticlePath(locale, defaultSiteProfile, article.slug)}
                className="group flex min-h-[260px] flex-col justify-between border-b border-[#e2d2c2] py-6 md:odd:border-r md:odd:pr-6 md:even:pl-6 xl:border-r xl:px-6 xl:first:pl-0 xl:[&:nth-child(3n)]:border-r-0 xl:[&:nth-child(3n)]:pr-0"
              >
                <span>
                  <span className="mb-4 block text-3xl font-semibold text-[#8b6e5d] [font-family:var(--font-display)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <ArticleMetaRow article={article} locale={locale} showDate />
                  <h3 className="mt-3 text-xl font-semibold leading-snug text-[#2b1f18] group-hover:text-brand-700">
                    {localizedText.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#6a5547]">{localizedText.excerpt}</p>
                </span>
                <span className="mt-6 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d9c7b6] text-brand-700 transition-colors group-hover:border-brand-600 group-hover:bg-brand-600 group-hover:text-white">
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>

          <div className="grid gap-6 border-b border-[#e3d4c5] py-9 lg:grid-cols-[1.1fr_0.9fr_0.9fr] lg:items-center">
            <div className="flex items-center gap-5">
              <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-[0_24px_46px_-28px_rgba(187,61,41,0.9)]">
                <MessageCircle className="h-7 w-7" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-3xl font-semibold leading-tight text-[#2b1f18] [font-family:var(--font-display)]">
                  {locale === 'zh' ? '在地雙語專家，讓安家更安心' : 'Settle in with trusted local people'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6a5547]">
                  {locale === 'zh'
                    ? '從房仲、醫師、公用事業協助到中文學校，把需要的人脈接起來。'
                    : 'Find realtors, doctors, utility help, Chinese schools, and practical support from the local directory.'}
                </p>
              </div>
            </div>
            <Link
              href={withLocale(locale, '/business')}
              className="group flex items-center justify-between gap-4 border-l border-[#dcc8b6] pl-5 text-[#2b1f18] hover:text-brand-700"
            >
              <span>
                <span className="block text-sm font-semibold">
                  {locale === 'zh' ? '尋找可信商家' : 'Find trusted local businesses'}
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#7b6658]">
                  {locale === 'zh' ? '房產、醫療、學校、保險與更多服務。' : 'Housing, healthcare, schools, insurance, and more.'}
                </span>
              </span>
              <Store className="h-5 w-5 flex-shrink-0 text-brand-700 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link
              href={withLocale(locale, '/community')}
              className="group flex items-center justify-between gap-4 border-l border-[#dcc8b6] pl-5 text-[#2b1f18] hover:text-brand-700"
            >
              <span>
                <span className="block text-sm font-semibold">
                  {locale === 'zh' ? '加入社群資源' : 'Join the community'}
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#7b6658]">
                  {locale === 'zh' ? '活動、教會、中文學校與家庭支援。' : 'Events, churches, Chinese schools, and family support.'}
                </span>
              </span>
              <Newspaper className="h-5 w-5 flex-shrink-0 text-brand-700 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
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
  const housingRegions = guide.section === 'housing' ? await getHousingRegionSnapshots() : [];

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

  const quickChecklist = guide.quickChecklist ?? [];
  const detailSections = guide.detailSections ?? [];
  const practicalNotes = guide.practicalNotes ?? [];

  return (
    <div className="overflow-x-hidden bg-[#fcf8f1] text-[#261b15]">
      <JsonLd data={jsonLd} />

      <section className="border-b border-[#e3d4c5] bg-[#fcf8f1]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-9 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:px-8 lg:py-12">
          <div className="flex flex-col justify-center">
            <div className="mb-5 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
              <Link href={withLocale(locale, '/relocation-guide')} className="hover:text-brand-800">
                {locale === 'zh' ? '搬家指南' : 'Relocation guide'}
              </Link>
              <span className="h-px w-10 bg-brand-300" aria-hidden="true" />
              <span>{guideSectionLabel(guide.section, locale)}</span>
            </div>
            <h1 className="max-w-4xl text-[2.9rem] font-semibold leading-[0.98] text-[#2a1c14] sm:text-[4.15rem] [font-family:var(--font-display)]">
              {t(guide.title, locale)}
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-[#6a5547]">{t(guide.excerpt, locale)}</p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm font-medium text-[#7b6658]">
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-brand-700" aria-hidden="true" />
                {formatReadTime(guide.readTime, locale)}
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-brand-700" aria-hidden="true" />
                {formatDate(guide.updatedAt, locale)}
              </span>
            </div>
          </div>

          <div className="relative min-h-[320px] overflow-hidden rounded-[26px] border border-[#decdbb] bg-[#efe1d0] shadow-[0_34px_90px_-58px_rgba(80,48,24,0.55)] sm:min-h-[430px]">
            <Image
              src={guide.heroImage}
              alt={descriptiveImageAlt(t(guide.title, locale), 'guide', locale)}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 54vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(42,28,20,0.08),rgba(42,28,20,0.32))]" />
            <div className="absolute bottom-5 left-5 max-w-[18rem] rounded-[18px] border border-white/70 bg-white/82 px-5 py-4 shadow-[0_24px_52px_-36px_rgba(55,35,20,0.58)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                {locale === 'zh' ? '下一步' : 'Next step'}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#4d3a30]">
                {locale === 'zh'
                  ? '先用本頁整理流程，再打開右側官方連結確認最新要求。'
                  : 'Use this page to plan the workflow, then verify current requirements through the official links.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#e3d4c5] bg-[#fffaf3]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:px-8 lg:py-12">
          <article className="min-w-0">
            <div className="space-y-5 border-b border-[#dfcdbb] pb-8">
              {guide.body.map((paragraph, index) => (
                <p key={`${guide.slug}-intro-${index}`} className="text-base leading-8 text-[#5f4c3f]">
                  {t(paragraph, locale)}
                </p>
              ))}
            </div>

            {quickChecklist.length > 0 ? (
              <section className="border-b border-[#dfcdbb] py-8">
                <div className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {locale === 'zh' ? '快速清單' : 'Quick checklist'}
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {quickChecklist.map((item, index) => (
                    <li key={`${guide.slug}-check-${index}`} className="flex gap-3 border-t border-[#eadccd] pt-3 text-sm leading-6 text-[#5b4739]">
                      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <span>{t(item, locale)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {detailSections.length > 0 ? (
              <div className="divide-y divide-[#dfcdbb]">
                {detailSections.map((section, sectionIndex) => (
                  <section key={`${guide.slug}-section-${sectionIndex}`} className="py-8">
                    <h2 className="text-3xl font-semibold leading-tight text-[#2b1f18] [font-family:var(--font-display)]">
                      {t(section.title, locale)}
                    </h2>
                    {section.intro ? (
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-[#6a5547]">{t(section.intro, locale)}</p>
                    ) : null}
                    <ul className="mt-5 space-y-3">
                      {section.bullets.map((bullet, bulletIndex) => (
                        <li key={`${guide.slug}-section-${sectionIndex}-bullet-${bulletIndex}`} className="flex gap-3 text-base leading-8 text-[#584538]">
                          <CheckCircle2 className="mt-1.5 h-4 w-4 flex-shrink-0 text-brand-700" aria-hidden="true" />
                          <span>{t(bullet, locale)}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ) : null}

            {practicalNotes.length > 0 ? (
              <section className="border-y border-[#dfcdbb] py-8">
                <h2 className="text-2xl font-semibold text-[#2b1f18] [font-family:var(--font-display)]">
                  {locale === 'zh' ? '容易踩雷的地方' : 'Common mistakes to avoid'}
                </h2>
                <ul className="mt-5 space-y-3">
                  {practicalNotes.map((note, index) => (
                    <li key={`${guide.slug}-note-${index}`} className="flex gap-3 text-sm leading-7 text-[#5f4c3f]">
                      <FileWarning className="mt-1 h-4 w-4 flex-shrink-0 text-brand-700" aria-hidden="true" />
                      <span>{t(note, locale)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </article>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="border-y border-[#dfcdbb] py-6">
              <h2 className="text-lg font-semibold text-[#2b1f18]">
                {locale === 'zh' ? '官方與高品質連結' : 'Official and high-quality links'}
              </h2>
              <ul className="mt-4 divide-y divide-[#eadccd]">
                {guide.officialResources.map((resource) => (
                  <li key={resource.url}>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-start justify-between gap-3 py-3 text-sm text-[#5f4c3f] hover:text-brand-700"
                    >
                      <span>
                        <span className="block font-semibold text-[#2b1f18] group-hover:text-brand-700">{t(resource.label, locale)}</span>
                        <span className="text-xs text-[#887264]">{resource.source}</span>
                      </span>
                      <ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-700" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {relatedEvents.length > 0 ? (
              <div className="mt-6 border-b border-[#dfcdbb] pb-6">
                <h2 className="text-lg font-semibold text-[#2b1f18]">
                  {locale === 'zh' ? '相關活動' : 'Related events'}
                </h2>
                <div className="mt-4 divide-y divide-[#eadccd]">
                  {relatedEvents.map((event) => (
                    <Link key={event.slug} href={withLocale(locale, `/community/events/${event.slug}`)} className="block py-3 text-sm hover:text-brand-700">
                      <div className="font-semibold text-[#2b1f18]">{t(event.title, locale)}</div>
                      <div className="mt-1 text-[#887264]">{formatDateTime(event.startDate, locale)}</div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      {housingRegions.length > 0 ? (
        <section className="border-b border-[#e3d4c5] bg-[#fcf8f1]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
            <HousingListingsSection locale={locale} regions={housingRegions} />
          </div>
        </section>
      ) : null}

      {relatedBusinesses.length > 0 ? (
        <section className="bg-[#fcf8f1]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                {locale === 'zh' ? '在地服務' : 'Local providers'}
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-[#2b1f18] [font-family:var(--font-display)]">
                {locale === 'zh' ? '相關服務' : 'Related providers'}
              </h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {relatedBusinesses.map((business) => (
                <BusinessCard key={business.id} business={business} locale={locale} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export async function CommunityPageView({
  locale,
  site = defaultSiteProfile,
}: {
  locale: Locale;
  site?: SiteProfile;
}) {
  if (site.key !== defaultSiteProfile.key) {
    return (
      <CityDataUnavailable
        locale={locale}
        title={
          locale === 'zh'
            ? `${site.brandName} 社群內容尚未接入`
            : `${site.brandName} community content is not connected yet`
        }
        description={
          locale === 'zh'
            ? '此城市設定必須先接入自己的活動、貼文與內容來源；平台不会回退顯示 ChineseArizona 社群內容。'
            : 'This city config must connect its own events, posts, and content sources first; the platform will not fall back to ChineseArizona community content.'
        }
      />
    );
  }

  const eventList = getEvents();
  const articleList = await getCommunityTrendingArticlesAsync(4);
  const trendingArticles = articleList;
  const boardPosts = getCommunityPosts('board');
  const classifiedPosts = getCommunityPosts('classified');
  const shopEnabled = isShopPublicLaunchEnabled();
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
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          {locale === 'zh' ? '社群中心' : 'Community Hub'}
        </h1>
      </div>

      <CommunityTrendingRail articles={trendingArticles} locale={locale} />

      <CommunityPostComposer locale={locale} />

      <div className="space-y-4">
        <div className="max-w-3xl space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">
            {locale === 'zh' ? '亞利桑那華人社群活動' : 'Arizona Chinese Community Events'}
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            {locale === 'zh'
              ? '這裡只放 2026 年有官方活動頁或主辦單位頁面的真實活動，不再放虛構示意內容。'
              : 'This section only shows confirmed 2026 events with an official organizer or venue page. The placeholder mock events are gone.'}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {eventList.map((event) => (
            <EventCard key={event.slug} event={event} locale={locale} />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '在地新聞與內容' : 'Local news and content'}</h2>
          <Link
            href={getLocalizedNewsArchivePath(locale, defaultSiteProfile)}
            className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
          >
            {locale === 'zh' ? '查看全部文章' : 'Browse full archive'}
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {localizedArticles.map(({ article, localizedText }) => (
            <Link key={article.slug} href={getLocalizedNewsArticlePath(locale, defaultSiteProfile, article.slug)} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '分類資訊' : 'Classifieds'}</h2>
            {shopEnabled ? (
              <div className="flex flex-wrap gap-3">
                <Link
                  href={withLocale(locale, '/shop')}
                  className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                >
                  {locale === 'zh' ? '改逛市集' : 'Browse Shop'}
                </Link>
              </div>
            ) : null}
          </div>
          <p className="text-sm leading-6 text-slate-600">
            {shopEnabled
              ? locale === 'zh'
                ? '社群分類資訊會繼續保留輕量發文；若你需要購物車、議價、訂單與退貨流程，請改用在地市集。'
                : 'Community classifieds stay lightweight for neighborhood posts. If you need carts, offers, orders, and returns, move over to Shop.'
              : locale === 'zh'
                ? '社群分類資訊維持輕量發文與鄰里交流，適合快速發布在地需求。'
                : 'Community classifieds stay lightweight for neighborhood posts and quick local requests.'}
          </p>
          {classifiedPosts.map((post) => (
            <CommunityCard key={post.slug} post={post} locale={locale} />
          ))}
        </div>
      </div>
    </div>
  );
}

export async function CommunityRadarPageView({
  locale,
  searchParams,
  site = defaultSiteProfile,
}: {
  locale: Locale;
  searchParams?: RadarSearchParams;
  site?: SiteProfile;
}) {
  if (!hasLiveNewsData(site)) {
    return (
      <CityDataUnavailable
        locale={locale}
        title={
          locale === 'zh'
            ? `${site.brandName} 新聞來源尚未接入`
            : `${site.brandName} news sources are not connected yet`
        }
        description={
          locale === 'zh'
            ? '此城市設定必須先接入自己的新聞來源與生成文章資料；平台不会回退顯示 Arizona News。'
            : 'This city config must connect its own news feeds and generated article data first; the platform will not fall back to Arizona News.'
        }
      />
    );
  }

  const activeLane = parseRadarLane(searchParams?.lane);
  const requestedPage = parsePageNumber(searchParams?.page);
  const allRadarArticles = await getRadarArticlesAsync({ site });
  const allFeedArticles = allRadarArticles
    .filter((article) => (activeLane ? article.lane === activeLane : true))
    .map((article) => radarArticleToArticle(article, { site }));
  const totalFeedArticles = allFeedArticles.length;
  const totalFeedPages = Math.max(1, Math.ceil(totalFeedArticles / RADAR_FEED_PAGE_SIZE));
  const currentFeedPage = Math.min(requestedPage, totalFeedPages);
  const startFeedIndex = (currentFeedPage - 1) * RADAR_FEED_PAGE_SIZE;
  const endFeedIndex = Math.min(startFeedIndex + RADAR_FEED_PAGE_SIZE, totalFeedArticles);
  const feedArticles = allFeedArticles.slice(startFeedIndex, endFeedIndex);
  const localizedFeedArticles = await localizeArticleSummaries(feedArticles, locale);
  const displayFeedArticles = localizedFeedArticles.map(cleanLocalizedArticleSummary);
  const showSidebarAd = shouldRenderAdSensePlacement('community_radar_sidebar');
  const previousFeedHref =
    currentFeedPage > 1 ? buildRadarHref(locale, site, activeLane, currentFeedPage - 1) : null;
  const nextFeedHref =
    currentFeedPage < totalFeedPages ? buildRadarHref(locale, site, activeLane, currentFeedPage + 1) : null;
  const feedNavigation = (
    <div className="flex flex-wrap items-center gap-2">
      {previousFeedHref ? (
        <Link
          href={previousFeedHref}
          className="inline-flex h-9 items-center rounded-xl border border-[#d9c7b6] bg-white/80 px-3 text-sm font-semibold text-[#5b4739] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700 active:translate-y-0"
        >
          {locale === 'zh' ? '上一頁' : 'Previous page'}
        </Link>
      ) : (
        <span className="inline-flex h-9 items-center rounded-xl border border-[#e4d6c8] bg-white/50 px-3 text-sm font-semibold text-[#b5a391]">
          {locale === 'zh' ? '上一頁' : 'Previous page'}
        </span>
      )}
      {nextFeedHref ? (
        <Link
          href={nextFeedHref}
          className="inline-flex h-9 items-center rounded-xl bg-brand-600 px-3 text-sm font-semibold text-white shadow-[0_16px_34px_-26px_rgba(187,61,41,0.95)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-brand-700 active:translate-y-0"
        >
          {locale === 'zh' ? '下一頁' : 'Next page'}
        </Link>
      ) : (
        <span className="inline-flex h-9 items-center rounded-xl border border-[#e4d6c8] bg-[#efe3d5]/70 px-3 text-sm font-semibold text-[#b5a391]">
          {locale === 'zh' ? '下一頁' : 'Next page'}
        </span>
      )}
    </div>
  );
  const topicFilters = [
    {
      key: 'all',
      href: buildRadarHref(locale, site),
      label: locale === 'zh' ? '全部新聞' : 'All news',
      active: !activeLane,
    },
    ...radarLaneOptions.map((lane) => ({
      key: lane,
      href: buildRadarHref(locale, site, lane),
      label: radarLaneLabel(lane, locale),
      active: activeLane === lane,
    })),
  ];

  return sectionContainer(
    <div className="py-10 md:py-14">
      <div className={showSidebarAd ? 'grid gap-8 xl:grid-cols-[minmax(0,1fr),320px] xl:items-start' : ''}>
        <div className="space-y-10">
          <nav
            aria-label={locale === 'zh' ? '新聞分類' : 'News topics'}
            className="border-y border-[#d9c7b6] py-3"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <Newspaper className="hidden h-4 w-4 flex-shrink-0 text-brand-700 lg:block" />
              <div className="flex gap-1 overflow-x-auto pb-1 lg:pb-0">
                {topicFilters.map((topic) => (
                  <Link
                    key={topic.key}
                    href={topic.href}
                    aria-current={topic.active ? 'page' : undefined}
                    className={`inline-flex min-w-max items-center border-b-2 px-3 py-2 text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-brand-700 ${
                      topic.active
                        ? 'border-brand-600 text-brand-700'
                        : 'border-transparent text-[#6f5a4a]'
                    }`}
                  >
                    {topic.label}
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          <div id="radar-feed" className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-semibold leading-tight text-[#2b1f18] [font-family:var(--font-display)]">
                  {activeLane
                    ? locale === 'zh'
                      ? `${radarLaneLabel(activeLane, locale)}新聞`
                      : `${radarLaneLabel(activeLane, locale)} news`
                    : locale === 'zh'
                      ? `完整${site.regionNameZh}新聞`
                      : `All ${site.regionName} News`}
                </h2>
              </div>
            </div>

            {feedArticles.length === 0 ? (
              <EmptyState
                title={
                  locale === 'zh'
                    ? '這個篩選目前還沒有公開內容'
                    : 'There are no public items for this filter yet'
                }
                description={
                  locale === 'zh'
                    ? '可以切回全部新聞，或稍後再查看新的可用內容。'
                    : 'Switch back to all news, or check back after the next update.'
                }
              />
            ) : (
              <div className="space-y-5">
                <div className="divide-y divide-[#e0d0bf]">
                  {displayFeedArticles.map(({ article, localizedText }) => (
                    <Link
                      key={`radar-feed-${article.slug}`}
                      href={getLocalizedNewsArticlePath(locale, site, article.slug)}
                      className="group grid gap-4 py-5 transition-colors hover:bg-white/45 md:grid-cols-[112px_minmax(0,1fr)_auto] md:items-center"
                    >
                      <div className="relative h-24 overflow-hidden rounded-2xl bg-[#eaded0] md:h-20">
                        <DiscoverArticleImage
                          src={article.heroImage}
                          alt={localizedText.title}
                          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.04]"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b6e5d]">
                          <span>{article.radarLane ? radarLaneLabel(article.radarLane, locale) : locale === 'zh' ? '新聞' : 'News'}</span>
                          {article.sourceName ? (
                            <>
                              <span className="text-[#cbb8a6]">/</span>
                              <span className="tracking-normal">{article.sourceName}</span>
                            </>
                          ) : null}
                          <span className="text-[#cbb8a6]">/</span>
                          <span className="tracking-normal">{formatDate(article.publishedAt, locale)}</span>
                        </div>
                        <h3 className="mt-2 text-lg font-bold leading-snug tracking-tight text-[#2b1f18] transition-colors group-hover:text-brand-700">
                          {localizedText.title}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6b5a4e]">
                          {localizedText.excerpt}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 md:justify-self-end">
                        {locale === 'zh' ? '閱讀全文' : 'Read article'}
                        <ChevronRight className="h-4 w-4 text-brand-600 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:text-brand-800" />
                      </span>
                    </Link>
                  ))}
                </div>

                {totalFeedPages > 1 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[#d9c7b6] py-3">
                    <div className="text-sm font-medium text-[#8b6e5d]">
                      {locale === 'zh'
                        ? `${currentFeedPage} / ${totalFeedPages}`
                        : `${currentFeedPage} / ${totalFeedPages}`}
                    </div>
                    {feedNavigation}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {showSidebarAd ? (
          <AdSidebarRail placement="community_radar_sidebar" locale={locale} />
        ) : null}
      </div>
    </div>
  );
}

export async function NewsArchivePageView({
  locale,
  searchParams,
  site = defaultSiteProfile,
}: {
  locale: Locale;
  searchParams?: NewsArchiveSearchParams;
  site?: SiteProfile;
}) {
  if (!hasLiveNewsData(site)) {
    return (
      <CityDataUnavailable
        locale={locale}
        title={
          locale === 'zh'
            ? `${site.brandName} 新聞檔案尚未接入`
            : `${site.brandName} news archive is not connected yet`
        }
        description={
          locale === 'zh'
            ? '此城市設定必須先產生自己的文章資料；平台不会回退顯示 Arizona News 檔案。'
            : 'This city config must generate its own article data first; the platform will not fall back to the Arizona News archive.'
        }
      />
    );
  }

  const allowLegacyArchive = site.key === defaultSiteProfile.key;
  const articlePage = await getArticleArchivePageAsync(
    {
      bucket: allowLegacyArchive ? searchParams?.bucket : 'current',
      series: searchParams?.series,
      sourcePolicy: searchParams?.sourcePolicy,
      year: searchParams?.year,
      month: searchParams?.month,
      page: searchParams?.page,
    },
    24,
    site
  );
  const isLegacyBucket = articlePage.filters.bucket === 'legacy';
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
    articlePage.currentPage > 1
      ? newsArchiveHref(locale, site, {
          ...articlePage.filters,
          page: articlePage.currentPage - 1,
        })
      : null;
  const nextPageHref =
    articlePage.currentPage < articlePage.totalPages
      ? newsArchiveHref(locale, site, {
          ...articlePage.filters,
          page: articlePage.currentPage + 1,
        })
      : null;
  const showSidebarAd = shouldRenderAdSensePlacement('news_archive_sidebar');
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
          {isLegacyBucket
            ? locale === 'zh'
              ? '舊聞檔案'
              : 'Legacy archive'
            : locale === 'zh'
              ? '新聞檔案'
              : 'News archive'}
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          {isLegacyBucket
            ? locale === 'zh'
              ? '歷史社群轉載與舊聞'
              : 'Historical community-wire archive'
            : locale === 'zh'
              ? '目前編輯內容與系列報導'
              : 'Current editorial archive'}
        </h1>
        <p className="text-base leading-7 text-slate-600">
          {isLegacyBucket
            ? locale === 'zh'
              ? '這裡保留歷史社群轉載與舊聞，方便查找來源脈絡與過往資料。這些頁面仍可存取，但不再作為搜尋收錄主入口。'
              : 'This archive keeps historical community-wire imports reachable for reference and source tracing. These pages remain available, but they are no longer primary indexed entry points.'
            : locale === 'zh'
              ? `${site.regionNameZh}新聞首頁只顯示少量最新內容；這裡集中目前主打的來源摘要、系列觀察與編輯內容。`
              : `The ${site.regionName} News homepage shows only a small top layer. This archive keeps the current source summaries, recurring series, and current published work together.`}
        </p>
      </div>

      <div className={showSidebarAd ? 'grid gap-8 xl:grid-cols-[minmax(0,1fr),320px] xl:items-start' : ''}>
        <div className="space-y-8">
          <div className="flex flex-wrap gap-2">
            <Link
              href={newsArchiveHref(locale, site, { bucket: 'current' })}
              className={
                isLegacyBucket
                  ? 'inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'
                  : 'inline-flex rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700'
              }
            >
              {locale === 'zh' ? '目前編輯內容' : 'Current editorial'}
            </Link>
            {allowLegacyArchive ? (
              <Link
                href={newsArchiveHref(locale, site, { bucket: 'legacy' })}
                className={
                  isLegacyBucket
                    ? 'inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800'
                    : 'inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'
                }
              >
                {locale === 'zh' ? '舊聞檔案' : 'Legacy archive'}
              </Link>
            ) : null}
          </div>

          <form
            action={getLocalizedNewsArchivePath(locale, site)}
            method="get"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <input type="hidden" name="bucket" value={articlePage.filters.bucket} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label htmlFor="series" className="mb-2 block text-sm font-semibold text-slate-800">
                  {locale === 'zh' ? '系列' : 'Series'}
                </label>
                <select
                  id="series"
                  name="series"
                  defaultValue={articlePage.filters.series ?? ''}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
                >
                  <option value="">{locale === 'zh' ? '全部系列' : 'All series'}</option>
                  {articleSeriesOptionsForSite(site).map((series) => (
                    <option key={series} value={series}>
                      {articleSeriesLabel(series, locale)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="sourcePolicy" className="mb-2 block text-sm font-semibold text-slate-800">
                  {locale === 'zh' ? '來源策略' : 'Source policy'}
                </label>
                <select
                  id="sourcePolicy"
                  name="sourcePolicy"
                  defaultValue={articlePage.filters.sourcePolicy ?? ''}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
                >
                  <option value="">{locale === 'zh' ? '全部策略' : 'All policies'}</option>
                  {articleSourcePolicyOptions.map((policy) => (
                    <option key={policy} value={policy}>
                      {sourcePolicyLabel(policy, locale)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="year" className="mb-2 block text-sm font-semibold text-slate-800">
                  {locale === 'zh' ? '年份' : 'Year'}
                </label>
                <select
                  id="year"
                  name="year"
                  defaultValue={articlePage.filters.year ? String(articlePage.filters.year) : ''}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
                >
                  <option value="">{locale === 'zh' ? '全部年份' : 'All years'}</option>
                  {articlePage.availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="month" className="mb-2 block text-sm font-semibold text-slate-800">
                  {locale === 'zh' ? '月份' : 'Month'}
                </label>
                <select
                  id="month"
                  name="month"
                  defaultValue={articlePage.filters.month ? String(articlePage.filters.month) : ''}
                  disabled={!articlePage.filters.year}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">{locale === 'zh' ? '全部月份' : 'All months'}</option>
                  {articlePage.availableMonths.map((month) => (
                    <option key={month} value={month}>
                      {monthLabel(month, locale)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                className="inline-flex items-center rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
              >
                {locale === 'zh' ? '套用篩選' : 'Apply filters'}
              </button>
              <Link
                href={newsArchiveHref(locale, site, { bucket: articlePage.filters.bucket })}
                className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                {locale === 'zh' ? '清除篩選' : 'Clear filters'}
              </Link>
            </div>
          </form>

          {isLegacyBucket ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {locale === 'zh'
                ? '舊聞檔案仍可查閱與分享，但不再作為搜尋收錄主入口。若要看目前主推的內容，請切回「目前編輯內容」。'
                : 'The legacy archive remains available to browse and share, but it is no longer treated as a primary indexed entry point. Switch back to current editorial for the main published surface.'}
            </div>
          ) : null}

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

          {localizedArticles.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {localizedArticles.map(({ article, localizedText }) => (
                <Link
                  key={article.slug}
                  href={getLocalizedNewsArticlePath(locale, site, article.slug)}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <ArticleMetaRow article={article} locale={locale} showDate />
                  <h2 className="mt-3 text-2xl font-bold text-slate-900">{localizedText.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{localizedText.excerpt}</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title={locale === 'zh' ? '這組篩選目前沒有文章' : 'No articles match these filters yet'}
              description={
                locale === 'zh'
                  ? '請調整系列、來源策略或日期條件，或切換到另一個檔案分頁。'
                  : 'Adjust the series, source policy, or date filters, or switch to the other archive bucket.'
              }
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-medium text-slate-500">
              {locale === 'zh'
                ? `第 ${articlePage.currentPage} / ${articlePage.totalPages} 頁`
                : `Page ${articlePage.currentPage} of ${articlePage.totalPages}`}
            </div>
            {archiveNavigation}
          </div>
        </div>

        {showSidebarAd ? (
          <AdSidebarRail placement="news_archive_sidebar" locale={locale} />
        ) : null}
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
    ...(event.endDate ? { endDate: event.endDate } : {}),
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
                  {locale === 'zh' ? '查看官方活動頁' : 'Open official event page'}
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

export async function ArticleDetailPageView({
  locale,
  slug,
  site = defaultSiteProfile,
}: {
  locale: Locale;
  slug: string;
  site?: SiteProfile;
}) {
  if (!hasLiveNewsData(site)) {
    return null;
  }

  const article = await getArticleBySlugAsync(slug, site);
  if (!article) {
    return null;
  }
  const legacyArticle = isLegacyArticle(article);
  const categories = await getDirectoryCategories();
  const localizedArticle = await resolveArticleText(article, locale);
  const displayArticle =
    isRadarArticle(article)
      ? {
          ...localizedArticle,
          title: cleanArizonaNewsCopy(localizedArticle.title),
          excerpt: cleanArizonaNewsCopy(localizedArticle.excerpt),
          body: localizedArticle.body.map(cleanArizonaNewsCopy),
        }
      : localizedArticle;
  const author = article.authorProfileSlug ? getProfileBySlug(article.authorProfileSlug) : undefined;
  const relatedBusinesses = getRelatedBusinesses(article.ctaBusinessSlugs);
  const relatedCategories = article.relatedCategorySlugs
    .map((categorySlug) => categories.find((category) => category.slug === categorySlug))
    .filter((category): category is BusinessCategory => Boolean(category));
  const localizedSourceLinkLabels = await resolveLocalizedTextList(
    article.sourceLinks.map((sourceLink) => sourceLink.label),
    locale
  );
  const sourceLinks =
    article.sourceLinks.length > 0
      ? article.sourceLinks
      : article.sourceUrl
        ? [
            {
              label: {
                en: article.sourceName ?? 'Original source',
                zh: article.sourceName ?? '原始來源',
              },
              url: article.sourceUrl,
              source: article.sourceName ?? article.sourceUrl,
            },
          ]
        : [];
  const showSidebarAd = shouldRenderAdSensePlacement('article_detail_sidebar');

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: displayArticle.title,
      description: displayArticle.excerpt,
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
        {
          '@type': 'ListItem',
          position: 1,
          name: locale === 'zh' ? '首頁' : 'Home',
          item: absoluteUrl(withLocale(locale, '/')),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: locale === 'zh' ? `${site.regionNameZh}新聞` : `${site.regionName} News`,
          item: absoluteUrl(getLocalizedNewsPath(locale, site)),
        },
        { '@type': 'ListItem', position: 3, name: displayArticle.title, item: absoluteUrl(getLocalizedNewsArticlePath(locale, site, article.slug)) },
      ],
    },
  ];

  return sectionContainer(
    <div className="py-8 md:py-12">
      <JsonLd data={jsonLd} />
      <article className="mx-auto max-w-6xl">
        <div className="mb-8 border-y border-[#d9c7b6] py-3">
          <Link
            href={getLocalizedNewsPath(locale, site)}
            className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-[#6f5a4a] transition-colors hover:text-brand-700"
          >
            <ChevronRight className="h-4 w-4 rotate-180 text-brand-600" />
            {locale === 'zh' ? `返回${site.regionNameZh}新聞` : `Back to ${site.regionName} News`}
          </Link>
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="min-w-0">
            <header className="max-w-4xl space-y-5">
              <div className="space-y-3">
                <ArticleMetaRow article={article} locale={locale} showDate />
                {legacyArticle ? (
                  <div className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                    {locale === 'zh' ? '舊聞檔案／不收錄搜尋' : 'Legacy archive / noindex'}
                  </div>
                ) : null}
              </div>
              <h1 className="text-[2.25rem] font-semibold leading-[1.02] tracking-tight text-[#2b1f18] [font-family:var(--font-display)] [overflow-wrap:anywhere] sm:text-[3.25rem] sm:leading-[0.98] lg:text-[4.15rem]">
                {displayArticle.title}
              </h1>
              {author ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#6f5a4a]">
                  <span className="font-semibold text-brand-700">{author.name}</span>
                </div>
              ) : null}
              <p className="max-w-3xl text-xl leading-8 text-[#5f4d40]">
                {displayArticle.excerpt}
              </p>
              {isRadarArticle(article) ? null : (
                <ArticleAudienceChips article={article} locale={locale} />
              )}
            </header>

            <figure className="mt-8 max-w-3xl">
              <div className="relative aspect-[16/9] overflow-hidden rounded-[1.25rem] border border-[#dfcfbf] bg-[#eaded0] shadow-[0_24px_70px_-54px_rgba(78,47,20,0.42)]">
                <DiscoverArticleImage
                  src={article.heroImage}
                  alt={descriptiveImageAlt(displayArticle.title, 'article', locale)}
                  className="object-cover"
                  priority
                />
              </div>
            </figure>

            <div className="mt-10 max-w-3xl space-y-6 border-t border-[#d9c7b6] pt-8">
              {displayArticle.body.map((paragraph, index) => (
                <p
                  key={`${article.slug}-${index}`}
                  className="text-[1.06rem] leading-8 text-[#3f332c] [font-variant-numeric:oldstyle-nums] sm:text-[1.11rem] sm:leading-9"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-[1.25rem] border border-[#d9c7b6] bg-[#fffaf2]/85 p-5 shadow-[0_20px_60px_-52px_rgba(78,47,20,0.5)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2d3c4] pb-3">
                <h2 className="text-lg font-semibold text-[#2b1f18] [font-family:var(--font-display)]">
                  {locale === 'zh' ? '來源' : 'Sources'}
                </h2>
                <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
                  {sourcePolicyLabel(article.sourcePolicy, locale)}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#6f5a4a]">
                {article.sourcePolicy === 'republish_with_permission'
                  ? locale === 'zh'
                    ? '此頁依授權轉載；來源連結保留原始脈絡。'
                    : 'This page is republished with permission; source links preserve the original context.'
                  : locale === 'zh'
                    ? '此頁是編輯摘要；原始報導與公告仍屬於下列來源。'
                    : 'This page is an editorial summary; original reporting and notices remain with the sources below.'}
              </p>
              {sourceLinks.length > 0 ? (
                <ul className="mt-4 divide-y divide-[#eadccc] border-y border-[#eadccc]">
                  {sourceLinks.map((sourceLink, index) => (
                    <li key={`${article.slug}-${sourceLink.url}`}>
                      <a
                        href={sourceLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start justify-between gap-3 py-3 text-sm text-[#5f4d40] transition-colors duration-200 hover:text-brand-700"
                      >
                        <span className="min-w-0">
                          <span className="block font-semibold text-[#2b1f18]">
                            {localizedSourceLinkLabels[index] ?? t(sourceLink.label, locale)}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-[#7c6657]">{sourceLink.source}</span>
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold text-brand-700">
                          {locale === 'zh' ? '打開' : 'Open'}
                          <ExternalLink className="h-3.5 w-3.5 text-brand-600 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm leading-6 text-[#6f5a4a]">
                  {locale === 'zh'
                    ? '這篇文章目前沒有列出的外部來源連結。'
                    : 'No external source links are listed for this article.'}
                </p>
              )}
            </div>

              {relatedCategories.length > 0 ? (
                <div className="rounded-[1.25rem] border border-[#d9c7b6] bg-white/75 p-5">
                  <h2 className="text-lg font-semibold text-[#2b1f18] [font-family:var(--font-display)]">
                    {locale === 'zh' ? '延伸分類' : 'Related directory paths'}
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {relatedCategories.map((category) => (
                      <Link
                        key={`${article.slug}-${category.slug}`}
                        href={withLocale(locale, `/business?category=${category.slug}`)}
                        className="inline-flex whitespace-nowrap rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                      >
                        {t(category.name, locale)}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {showSidebarAd ? (
                <AdSidebarRail placement="article_detail_sidebar" locale={locale} sticky={false} />
              ) : null}
          </aside>
        </div>
      </article>

      {relatedBusinesses.length > 0 ? (
        <div className="mt-12 space-y-4">
          <h2 className="text-2xl font-semibold text-[#2b1f18] [font-family:var(--font-display)]">
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
              <p className="font-semibold text-brand-700">
                <span lang="en">{author.name}</span> · <span lang="zh">{author.nameZh}</span>
              </p>
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
  site = defaultSiteProfile,
}: {
  locale: Locale;
  searchParams?: {
    businessName?: string;
    businessSlug?: string;
  };
  site?: SiteProfile;
}) {
  const businesses = hasLiveDirectoryData(site) ? await getDirectoryBusinesses({}, { limit: 200 }) : [];
  const trustFacts = [
    {
      icon: ShieldCheck,
      title: locale === 'zh' ? '人工審核' : 'Manual review',
      description:
        locale === 'zh'
          ? '認領與新增申請都會由團隊確認。'
          : 'Every claim and new listing is checked before it goes live.',
    },
    {
      icon: Search,
      title: locale === 'zh' ? '先查重複' : 'Duplicate check',
      description:
        locale === 'zh'
          ? '先搜尋既有商家，避免目錄重複。'
          : 'Search existing coverage before creating a second profile.',
    },
    {
      icon: UserRound,
      title: locale === 'zh' ? '綁定主理人' : 'Owner access',
      description:
        locale === 'zh'
          ? '核准後可進入後台維護商家資料。'
          : 'Approved owners can maintain the listing from the dashboard.',
    },
  ];
  const workflowSteps = [
    {
      label: '01',
      title: locale === 'zh' ? '登入商家主理人帳號' : 'Log in with an owner account',
      description:
        locale === 'zh'
          ? '先用商家主理人帳號登入，再找是否已有商家頁面。'
          : 'Use an owner account first, then search for existing listing coverage.',
    },
    {
      label: '02',
      title: locale === 'zh' ? '認領既有商家' : 'Claim existing coverage',
      description:
        locale === 'zh'
          ? '若已有資料，可送出認領並等待人工驗證。'
          : 'If the listing exists, submit a claim and wait for manual verification.',
    },
    {
      label: '03',
      title: locale === 'zh' ? '提交新商家' : 'Submit a new business',
      description:
        locale === 'zh'
          ? '若沒有，送出新商家申請，交由人工審核。'
          : 'If it is not listed, send a new business request for manual review.',
    },
    {
      label: '04',
      title: locale === 'zh' ? '上架與後台管理' : 'Publish and manage',
      description:
        locale === 'zh'
          ? '核准後商家會上架到目錄，主理人可更新資訊、追蹤認領與管理後續內容。'
          : 'Once approved, the business goes live and the owner gets dashboard access for edits, claim tracking, and ongoing management.',
    },
  ];
  const operatingPrinciples = [
    locale === 'zh'
      ? '重視可搜尋、可維護、可驗證，而不是一次性聊天推薦。'
      : 'Built for searchable, maintainable, verifiable discovery instead of one-off chat recommendations.',
    locale === 'zh'
      ? '主推雙語可信商家，特別照顧新居民。'
      : 'Prioritizes bilingual, trustworthy providers with strong newcomer fit.',
    locale === 'zh'
      ? '自助贊助只提升目錄列表排序，不會改變商家的驗證或編輯狀態。'
      : 'Self-serve sponsorship only affects directory browse ranking and does not change verification or editorial status.',
  ];

  return (
    <div className="flex-grow overflow-x-hidden bg-[#f7f1e8] text-[#2c2722]">
      <section className="overflow-hidden border-b border-[#ded5c9] bg-[#f7f1e8]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="grid items-stretch gap-8 lg:grid-cols-[0.96fr_1.04fr]">
            <div className="homepage-rise flex flex-col justify-center py-3">
              <Link
                href={withLocale(locale, '/business')}
                className="inline-flex w-fit items-center gap-2 rounded-md bg-[#efe7dc] px-3.5 py-2 text-xs font-semibold text-[#5b5047] transition-colors hover:bg-[#e7d9ca] hover:text-[#bd2730]"
              >
                <Store className="h-4 w-4" aria-hidden="true" />
                {locale === 'zh' ? '華人商家目錄' : 'ChineseArizona business directory'}
              </Link>

              <h1
                className="mt-5 max-w-[11ch] text-[3.5rem] font-black leading-[0.9] tracking-tight text-[#2c2019] sm:text-[4.5rem] lg:text-[5.35rem] [font-family:var(--font-display)]"
                style={{
                  WebkitTextStroke: '0.35px rgba(44, 32, 25, 0.42)',
                }}
              >
                {locale === 'zh' ? '認領或新增商家' : 'Claim or add a business'}
              </h1>

              <p className="mt-5 max-w-2xl text-lg font-semibold leading-7 text-[#bd2730]">
                {locale === 'zh'
                  ? '讓可信的亞利桑那華人商家被找到、被維護、被驗證。'
                  : 'Help trusted Arizona Chinese businesses get found, maintained, and verified.'}
              </p>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#6d6258]">
                {locale === 'zh'
                  ? '先搜尋是否已有商家頁面，再送出認領或新增申請。核准後，商家會進入目錄，主理人也能進入後台管理資料與照片。'
                  : 'Search existing coverage first, then submit a claim or a new listing request. After approval, the business enters the directory and the owner can manage details and photos from the dashboard.'}
              </p>

              <div className="mt-7 hidden gap-3 sm:grid sm:grid-cols-3">
                {trustFacts.map((fact) => {
                  const Icon = fact.icon;

                  return (
                    <div key={fact.title} className="border-l border-[#ddcdbb] pl-4">
                      <Icon className="h-5 w-5 text-[#bd2730]" aria-hidden="true" />
                      <p className="mt-3 text-sm font-semibold text-[#2c2019]">{fact.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[#6d6258]">{fact.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="homepage-rise homepage-rise-delay-1 relative min-h-[330px] overflow-hidden rounded-lg border border-[#dfd4c8] bg-[#d8c7b5] shadow-[0_24px_70px_rgba(85,58,28,0.12)] sm:min-h-[420px]">
              <Image
                src="/directory-ai-replacements/lee-lee-oriental-supermarket-chandler.webp"
                alt={locale === 'zh' ? '亞利桑那華人商家店面' : 'Arizona Chinese business storefront'}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(42,30,22,0),rgba(42,30,22,0.26))]" />

              <div className="absolute left-5 top-5 max-w-[17rem] border-l-4 border-[#bd2730] bg-[#fbf7f0]/92 px-4 py-3 shadow-[0_16px_40px_rgba(42,30,22,0.16)] backdrop-blur">
                <p className="text-xs font-semibold tracking-[0.18em] text-[#8b8176]">
                  {locale === 'zh' ? '審核佇列' : 'REVIEW QUEUE'}
                </p>
                <p className="mt-2 text-lg font-semibold leading-tight text-[#2c2722]">
                  {locale === 'zh' ? '認領、新增、照片，一次送審。' : 'Claims, new listings, and photos in one request.'}
                </p>
              </div>

              <div className="absolute bottom-5 right-5 w-[min(22rem,calc(100%-2.5rem))] border border-[#dfd4c8] bg-[#fbf7f0] p-4 shadow-[0_16px_40px_rgba(42,30,22,0.16)]">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-[#bd2730] text-white">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#2c2722]">
                      {locale === 'zh' ? '商家資料通過審核後上架' : 'Approved profiles go live in the directory'}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#6d6258]">
                      {locale === 'zh'
                        ? '雙語搜尋、分類、城市、照片與後台管理會一起啟用。'
                        : 'Bilingual search, category, city, photos, and owner tools activate together.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="homepage-rise homepage-rise-delay-2 grid gap-3 sm:hidden">
              {trustFacts.map((fact) => {
                const Icon = fact.icon;

                return (
                  <div key={fact.title} className="border-l border-[#ddcdbb] pl-4">
                    <Icon className="h-5 w-5 text-[#bd2730]" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold text-[#2c2019]">{fact.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[#6d6258]">{fact.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#ded5c9] bg-[#fbf7f0]">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:grid-cols-[minmax(0,1fr)_400px]">
            <BusinessClaimForm
              locale={locale}
              businesses={businesses}
              initialBusinessName={searchParams?.businessName}
              initialBusinessSlug={searchParams?.businessSlug}
            />

            <aside className="homepage-rise homepage-rise-delay-2 lg:sticky lg:top-24 lg:self-start">
              <div className="border-y border-[#d9cbbd] bg-[#f7f1e8]">
                <div className="border-b border-[#ded2c5] p-5">
                  <p className="text-xs font-semibold tracking-[0.16em] text-[#8b8176]">
                    {locale === 'zh' ? '上架流程' : 'LISTING WORKFLOW'}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-[#2c2722] [font-family:var(--font-display)]">
                    {locale === 'zh' ? '從提交到上架的節奏' : 'From request to live profile'}
                  </h2>
                </div>

                <ol className="divide-y divide-[#ded2c5]">
                  {workflowSteps.map((step) => (
                    <li key={step.label} className="grid grid-cols-[3.25rem_1fr] gap-4 p-5">
                      <span className="text-sm font-black text-[#bd2730] [font-variant-numeric:tabular-nums]">
                        {step.label}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-[#3d342e]">{step.title}</span>
                        <span className="mt-1 block text-sm leading-6 text-[#6d6258]">{step.description}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-5 border-l-4 border-[#bd2730] bg-[#f7f1e8]">
                <div className="p-5">
                  <h2 className="text-xl font-semibold leading-tight text-[#2c2722] [font-family:var(--font-display)]">
                    {locale === 'zh' ? '平台營運原則' : 'Platform operating principles'}
                  </h2>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-[#6d6258]">
                    {operatingPrinciples.map((principle) => (
                      <li key={principle} className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#bd2730]" aria-hidden="true" />
                        <span>{principle}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
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
            <p className="max-w-3xl text-sm leading-6 text-slate-500">
              {locale === 'zh'
                ? '這個頁面主要作為商家擁有權、供稿記錄與平台透明度的公開識別，不是一般瀏覽流程的核心入口。'
                : 'This page mainly exists as a public identity record for ownership, contribution history, and platform transparency rather than as a primary browse destination.'}
            </p>
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

function DashboardMetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  detail: string;
}) {
  return (
    <div className="group rounded-[1.35rem] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_45px_rgba(74,49,27,0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:bg-white active:translate-y-px">
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl bg-[#f6eee5] p-2.5 text-brand-800 transition duration-300 group-hover:bg-brand-900 group-hover:text-white">
          {icon}
        </div>
        <span className="h-px flex-1 bg-[linear-gradient(90deg,rgba(102,33,22,0.22),transparent)]" />
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 font-mono text-4xl font-semibold leading-none tracking-tight text-slate-950">{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

function DashboardQuickAction({
  href,
  icon,
  title,
  description,
  cta,
  primary = false,
  className = '',
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
  primary?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex h-full flex-col justify-between rounded-[1.35rem] border p-5 transition duration-300 hover:-translate-y-0.5 active:translate-y-px ${
        primary
          ? 'border-brand-900 bg-brand-900 text-white shadow-[0_24px_60px_rgba(102,33,22,0.2)]'
          : 'border-slate-200/80 bg-white/80 text-slate-950 shadow-[0_18px_45px_rgba(74,49,27,0.06)] hover:border-brand-200 hover:bg-white'
      } ${className}`}
    >
      <div className="space-y-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
            primary ? 'bg-white/[0.12] text-white' : 'bg-[#f6eee5] text-brand-800'
          }`}
        >
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          <p className={`mt-2 text-sm leading-6 ${primary ? 'text-white/75' : 'text-slate-600'}`}>{description}</p>
        </div>
      </div>
      <span
        className={`mt-6 inline-flex items-center gap-2 text-sm font-semibold ${
          primary ? 'text-white' : 'text-brand-700'
        }`}
      >
        {cta}
        <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

function DashboardChecklistItem({
  icon,
  title,
  description,
  active = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <li className="flex gap-3 border-t border-slate-200/80 py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
          active ? 'bg-brand-900 text-white' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {icon}
      </div>
      <div>
        <p className="font-semibold text-slate-950">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </li>
  );
}

function dashboardCampaignStatusLabel(status: DirectoryAdCampaign['status'], locale: Locale) {
  const labels: Record<DirectoryAdCampaign['status'], { en: string; zh: string }> = {
    pending_payment: { en: 'Pending payment', zh: '待付款' },
    active: { en: 'Sponsored', zh: '贊助中' },
    paused: { en: 'Paused', zh: '已暫停' },
    cancelled: { en: 'Cancelled', zh: '已取消' },
    exhausted: { en: 'Budget spent', zh: '預算用盡' },
    expired: { en: 'Expired', zh: '已到期' },
  };

  return locale === 'zh' ? labels[status].zh : labels[status].en;
}

function ManagedBusinessWorkspaceRow({
  business,
  locale,
  adsAvailable,
  adsMode,
  campaign,
  readOnlyReason,
}: {
  business: Business;
  locale: Locale;
  adsAvailable: boolean;
  adsMode: DirectoryAdsRuntimeMode;
  campaign?: DirectoryAdCampaign;
  readOnlyReason?: DirectoryAdsUnavailableReason;
}) {
  const detailHref = withLocale(locale, `/business/${business.slug}`);
  const photoCount = (business.heroImage ? 1 : 0) + business.gallery.length;
  const statusLabel = business.status
    ? directoryStatusLabel(business.status, locale)
    : locale === 'zh'
      ? '已收錄'
      : 'Listed';
  const verificationLabel = business.verificationState
    ? verificationStateLabel(business.verificationState, locale)
    : locale === 'zh'
      ? '未驗證'
      : 'Unverified';
  const placementLabel = campaign
    ? dashboardCampaignStatusLabel(campaign.status, locale)
    : business.sponsored || business.legacySponsored
      ? locale === 'zh'
        ? '人工精選'
        : 'Manual placement'
      : locale === 'zh'
        ? '未啟用'
        : 'Not active';

  return (
    <details className="group overflow-hidden rounded-[1.2rem] border border-slate-200/80 bg-white/80 shadow-[0_18px_45px_rgba(74,49,27,0.055)] transition duration-300 open:bg-white open:shadow-[0_24px_60px_rgba(74,49,27,0.08)]">
      <summary className="grid cursor-pointer list-none gap-4 px-4 py-4 outline-none transition duration-300 hover:bg-[#fff8ef] focus-visible:ring-2 focus-visible:ring-brand-200 sm:grid-cols-[minmax(0,1.45fr)_0.65fr_0.65fr_0.65fr_auto] sm:items-center [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#eadccb]">
            <BusinessImage
              imageUrl={business.heroImage}
              label={descriptiveImageAlt(t(business.name, locale), 'business', locale)}
              locale={locale}
              sizes="56px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold tracking-tight text-slate-950">
              {t(business.name, locale)}
            </h3>
            <p className="mt-1 truncate text-sm text-slate-500">
              {business.address ?? business.serviceAreaText ?? `${business.city}, AZ`}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {locale === 'zh' ? '狀態' : 'Status'}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{statusLabel}</p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {locale === 'zh' ? '驗證' : 'Verification'}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{verificationLabel}</p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {locale === 'zh' ? '推廣' : 'Placement'}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{placementLabel}</p>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            {locale === 'zh' ? `${photoCount} 張照片` : `${photoCount} photos`}
          </span>
          <ChevronRight className="h-5 w-5 text-slate-400 transition-transform duration-300 group-open:rotate-90" />
        </div>
      </summary>

      <div className="border-t border-slate-200/80 bg-[#fffdfa] px-4 py-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm leading-6 text-slate-600">
            {locale === 'zh'
              ? '展開後只顯示這筆商家的管理工具，避免整個頁面變成長卡片列表。'
              : 'Expanded rows show only this listing’s management tools, keeping the workspace compact.'}
          </p>
          <Link
            href={detailHref}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-800 active:translate-y-px"
          >
            {locale === 'zh' ? '查看公開頁面' : 'View public page'}
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        <div className="space-y-4">
          <BusinessPhotoEditor business={business} locale={locale} />
          <DirectoryAdCampaignPanel
            adsAvailable={adsAvailable}
            adsMode={adsMode}
            business={business}
            initialCampaign={campaign}
            locale={locale}
            readOnlyReason={readOnlyReason}
          />
          <OwnedBusinessDeleteButton business={business} locale={locale} />
        </div>
      </div>
    </details>
  );
}

export async function DashboardPageView({ locale }: { locale: Locale }) {
  const user = await getServerUserFromCookies();
  const normalizedUserEmail = user?.email?.trim().toLowerCase() ?? '';
  const [profile, ownerBusinesses] = await Promise.all([
    user ? ensureProfileForAuthUser(user) : Promise.resolve(null),
    getDirectoryBusinesses({}, { includeNonPublic: true, limit: 500 }),
  ]);
  const managedBusinesses = profile
    ? ownerBusinesses.filter((business) => business.ownerProfileSlug === profile.slug)
    : [];
  const claimableBusinesses = normalizedUserEmail
    ? ownerBusinesses.filter((business) => {
        if (managedBusinesses.some((managedBusiness) => managedBusiness.id === business.id)) {
          return false;
        }

        if (business.ownerProfileSlug) {
          return false;
        }

        return (business.email?.trim().toLowerCase() ?? '') === normalizedUserEmail;
      })
    : [];
  const adCampaignsByBusinessId: Map<string, DirectoryAdCampaign> = profile
    ? await getDirectoryAdCampaignsForOwnerBusinesses(profile.id, managedBusinesses)
    : new Map<string, DirectoryAdCampaign>();
  const directoryAdsAvailability = await getDirectoryAdsAvailability();
  const directoryAdsMode = directoryAdsAvailability.mode;
  const adsAvailable = directoryAdsMode !== 'read_only';
  const recentReviews = managedBusinesses.flatMap((business) => getBusinessReviews(business.slug));
  const claimBusinessHref = withLocale(locale, '/add-business');
  const editProfileHref = withLocale(locale, '/dashboard/profile');
  const directoryHref = withLocale(locale, '/directory');
  const accountName = profile?.name ?? user?.email ?? (locale === 'zh' ? '主理人' : 'Owner');
  const accountRoleLabel = profileRoleLabel(profile?.role ?? 'member', locale);
  const firstName = accountName.split(/\s+/)[0] || accountName;
  const adsReadinessLabel = adsAvailable
    ? locale === 'zh'
      ? '廣告可用'
      : 'Ads ready'
    : locale === 'zh'
      ? '廣告設定中'
      : 'Ads read-only';

  return sectionContainer(
    <div className="space-y-8 py-10 sm:py-12 lg:py-14">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#e5d7c8] bg-[#fffdfa] shadow-[0_30px_80px_rgba(74,49,27,0.09)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#662116,#b87f3d,#f7e8d0)]" />
        <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[minmax(0,1.16fr)_minmax(320px,0.84fr)] xl:p-10">
          <div className="flex min-h-[21rem] flex-col justify-between gap-10">
            <div className="space-y-5">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                {locale === 'zh' ? '主理人工作台' : 'Owner workspace'}
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  {locale === 'zh' ? `${firstName}，今天從這裡開始` : `Start here, ${firstName}`}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  {locale === 'zh'
                    ? user
                      ? '把認領、已連結商家、近期互動與帳號設定放在同一個清楚的工作區，少一點翻找，多一點掌控。'
                      : '登入後即可在這裡管理商家、追蹤認領與查看帳號相關活動。'
                    : user
                      ? 'Claims, connected listings, recent activity, and account settings now live in one clearer owner workspace.'
                      : 'Sign in to manage listings, follow claims, and view account activity in one place.'}
                </p>
              </div>
            </div>

            {user ? (
              <div className="flex flex-wrap gap-3">
                <Link
                  href={claimBusinessHref}
                  className="inline-flex items-center justify-center rounded-xl bg-brand-900 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_35px_rgba(102,33,22,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-brand-800 active:translate-y-px"
                >
                  {locale === 'zh' ? '認領商家' : 'Claim business'}
                </Link>
                <Link
                  href={editProfileHref}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-800 active:translate-y-px"
                >
                  {locale === 'zh' ? '編輯帳號' : 'Edit profile'}
                </Link>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <DashboardAccessNotice locale={locale} email={user?.email ?? ''} role={profile?.role ?? 'member'} />
            <div className="rounded-[1.25rem] border border-slate-200/80 bg-white/70 p-5 shadow-[0_18px_45px_rgba(74,49,27,0.06)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {locale === 'zh' ? '目前概況' : 'Current snapshot'}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="font-mono text-3xl font-semibold text-slate-950">{managedBusinesses.length}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {locale === 'zh' ? '已連結商家' : 'connected listings'}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-3xl font-semibold text-slate-950">{claimableBusinesses.length}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {locale === 'zh' ? '待認領符合項' : 'claim matches'}
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-slate-950 px-4 py-3 text-sm leading-6 text-white">
                {locale === 'zh' ? `帳號角色：${accountRoleLabel}` : `Account role: ${accountRoleLabel}`}
              </div>
            </div>
          </div>
        </div>
      </section>

      {user ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.9fr_0.9fr_1fr]">
            <DashboardMetricCard
              icon={<Store className="h-5 w-5" />}
              label={locale === 'zh' ? '管理中的商家' : 'Managed listings'}
              value={managedBusinesses.length}
              detail={
                locale === 'zh'
                  ? '已經連結到這個帳號、可以維護資料與圖片的商家。'
                  : 'Listings connected to this account for details, photos, and owner tools.'
              }
            />
            <DashboardMetricCard
              icon={<MessageCircle className="h-5 w-5" />}
              label={locale === 'zh' ? '近期評論' : 'Recent reviews'}
              value={recentReviews.length}
              detail={
                locale === 'zh'
                  ? '來自你已管理商家的新近互動。'
                  : 'Fresh interaction across the listings you manage.'
              }
            />
            <DashboardMetricCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label={locale === 'zh' ? '待認領符合項' : 'Claim matches'}
              value={claimableBusinesses.length}
              detail={
                locale === 'zh'
                  ? '聯絡 Email 與這個帳號相符的未綁定商家。'
                  : 'Unassigned listings with contact email matching this account.'
              }
            />
            <DashboardMetricCard
              icon={<UserRound className="h-5 w-5" />}
              label={locale === 'zh' ? '帳號角色' : 'Account role'}
              value={<span className="text-2xl">{accountRoleLabel}</span>}
              detail={
                locale === 'zh'
                  ? '角色會決定可用的管理與審核工具。'
                  : 'Role controls the owner and review tools available here.'
              }
            />
          </div>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
              <DashboardQuickAction
                href={claimBusinessHref}
                icon={<Building2 className="h-5 w-5" />}
                title={locale === 'zh' ? '認領或新增商家' : 'Claim or add a listing'}
                description={
                  locale === 'zh'
                    ? '搜尋現有資料、送出主理人認領，或建立目前還沒有收錄的新商家。'
                    : 'Search the directory, submit an owner claim, or add a business that is not listed yet.'
                }
                cta={locale === 'zh' ? '開始認領' : 'Start claim'}
                primary
                className="md:row-span-2"
              />
              <DashboardQuickAction
                href={editProfileHref}
                icon={<UserRound className="h-5 w-5" />}
                title={locale === 'zh' ? '整理帳號資料' : 'Tune account details'}
                description={
                  locale === 'zh'
                    ? '更新你的帳號資料，讓後續認領與管理流程更容易核對。'
                    : 'Keep profile details current so claims and management work stay easy to verify.'
                }
                cta={locale === 'zh' ? '開啟設定' : 'Open settings'}
              />
              <DashboardQuickAction
                href={directoryHref}
                icon={<Search className="h-5 w-5" />}
                title={locale === 'zh' ? '查看公開目錄' : 'Review the public directory'}
                description={
                  locale === 'zh'
                    ? '從瀏覽者角度檢查商家頁面、分類與搜尋結果。'
                    : 'Check listings, categories, and search results from a visitor point of view.'
                }
                cta={locale === 'zh' ? '前往目錄' : 'Go to directory'}
              />
            </div>

            <aside className="rounded-[1.35rem] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_45px_rgba(74,49,27,0.06)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {locale === 'zh' ? '下一步' : 'Next checks'}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                    {locale === 'zh' ? '保持商家頁面可用' : 'Keep listings ready'}
                  </h2>
                </div>
                <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
                  {adsReadinessLabel}
                </span>
              </div>
              <ul className="mt-5">
                <DashboardChecklistItem
                  icon={<Store className="h-4 w-4" />}
                  title={locale === 'zh' ? '連結商家' : 'Connect listings'}
                  description={
                    managedBusinesses.length > 0
                      ? locale === 'zh'
                        ? '你已經有可管理的商家。'
                        : 'You have at least one listing connected.'
                      : locale === 'zh'
                        ? '完成認領後，管理工具會在這裡出現。'
                        : 'Approved claims will unlock owner tools here.'
                  }
                  active={managedBusinesses.length > 0}
                />
                <DashboardChecklistItem
                  icon={<Camera className="h-4 w-4" />}
                  title={locale === 'zh' ? '維護圖片與資料' : 'Maintain photos and details'}
                  description={
                    managedBusinesses.length > 0
                      ? locale === 'zh'
                        ? '在下方商家區塊補充圖片、資料與廣告設定。'
                        : 'Use the business workspace below for photos, details, and ads.'
                      : locale === 'zh'
                        ? '等第一筆商家連結後再補充圖片與資料。'
                        : 'Add richer details once the first listing is connected.'
                  }
                  active={managedBusinesses.length > 0}
                />
                <DashboardChecklistItem
                  icon={<CircleDollarSign className="h-4 w-4" />}
                  title={locale === 'zh' ? '確認推廣狀態' : 'Check promotion status'}
                  description={
                    adsAvailable
                      ? locale === 'zh'
                        ? '目錄廣告工具已可使用。'
                        : 'Directory ad tools are available for eligible listings.'
                      : locale === 'zh'
                        ? '廣告工具目前以唯讀模式顯示。'
                        : 'Ad tools are currently shown in read-only mode.'
                  }
                  active={adsAvailable}
                />
              </ul>
            </aside>
          </section>

          {claimableBusinesses.length > 0 ? (
            <section className="space-y-5 rounded-[1.6rem] border border-brand-100 bg-brand-50/50 p-5 shadow-[0_20px_50px_rgba(102,33,22,0.06)] sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                    {locale === 'zh' ? '待處理' : 'Needs attention'}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    {locale === 'zh' ? '待你認領的商家' : 'Listings ready to claim'}
                  </h2>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                    {locale === 'zh'
                      ? '我們找到聯絡 Email 與目前帳號相符、但尚未綁定主理人的商家。送出認領後，我們會沿用這筆資料繼續處理。'
                      : 'We found listings whose contact email matches this account but are not yet connected to an owner profile. Use the claim flow to confirm ownership and keep the existing listing data.'}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                {claimableBusinesses.map((business) => {
                  const businessClaimHref = withLocale(
                    locale,
                    `/add-business?businessSlug=${encodeURIComponent(business.slug)}&businessName=${encodeURIComponent(business.name.en)}`
                  );

                  return (
                    <div key={business.id} className="space-y-4 border-t border-brand-100 pt-4 first:border-t-0 first:pt-0">
                      <BusinessCard business={business} locale={locale} />
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={businessClaimHref}
                          className="inline-flex items-center rounded-xl bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-800 active:translate-y-px"
                        >
                          {locale === 'zh' ? '認領這筆商家' : 'Claim this listing'}
                        </Link>
                        <Link
                          href={withLocale(locale, `/business/${business.slug}`)}
                          className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-800 active:translate-y-px"
                        >
                          {locale === 'zh' ? '查看商家頁面' : 'View listing'}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {managedBusinesses.length > 0 ? (
            <section id="your-businesses" className="space-y-5 rounded-[1.6rem] border border-slate-200/80 bg-white/75 p-5 shadow-[0_22px_55px_rgba(74,49,27,0.07)] sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {locale === 'zh' ? '管理工作區' : 'Management workspace'}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    {locale === 'zh' ? '你的商家' : 'Your businesses'}
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-right">
                  {locale === 'zh'
                    ? '逐一檢查公開頁面、圖片、推廣設定與必要的帳號操作。'
                    : 'Review public pages, photos, promotion settings, and account actions from each listing block.'}
                </p>
              </div>
              <div className="space-y-3">
                {managedBusinesses.map((business) => (
                  <ManagedBusinessWorkspaceRow
                    key={business.id}
                    adsAvailable={adsAvailable}
                    adsMode={directoryAdsMode}
                    business={business}
                    campaign={adCampaignsByBusinessId.get(business.id)}
                    locale={locale}
                    readOnlyReason={directoryAdsAvailability.unavailableReason}
                  />
                ))}
              </div>
            </section>
          ) : (
            <section className="rounded-[1.6rem] border border-slate-200/80 bg-white/75 p-5 shadow-[0_22px_55px_rgba(74,49,27,0.07)] sm:p-6">
              <EmptyState
                title={locale === 'zh' ? '目前還沒有可管理的商家' : 'No managed listings yet'}
                description={
                  locale === 'zh'
                    ? '當商家認領完成，或有商家連結到這個帳號後，這裡就會顯示可管理的項目。'
                    : 'Listings connected to this account will appear here once a claim is approved or a business is assigned to you.'
                }
                actionLabel={locale === 'zh' ? '認領商家' : 'Claim business'}
                actionHref={claimBusinessHref}
              />
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}

export async function AdminPageView({ locale }: { locale: Locale }) {
  const [
    snapshot,
    pendingClaims,
    directoryCategories,
    moderationReports,
    monitoredSources,
    signalDeskQueue,
    signalDeskSummary,
    discoverAdminQueue,
    radarAdminSnapshot,
  ] = await Promise.all([
    Promise.resolve(getAdminSnapshot()),
    getPendingBusinessClaimsSnapshot(),
    getDirectoryCategories(),
    getModerationReportsSnapshot(),
    Promise.resolve(getMonitoredSources()),
    Promise.resolve(getSignalDeskQueue()),
    Promise.resolve(getSignalDeskSummary()),
    getDiscoverAdminQueue(),
    getRadarAdminSnapshotAsync(),
  ]);
  const discoverWriteEnabled = isSupabaseServiceConfigured();
  const moderationQueueCount = moderationReports.length + snapshot.flaggedPosts.length;
  const totalTrustItems = pendingClaims.length + moderationQueueCount;
  const editorialQueueCount = signalDeskQueue.length;
  const radarControlCount =
    radarAdminSnapshot.candidates.length + radarAdminSnapshot.articles.length + radarAdminSnapshot.sources.length;

  return sectionContainer(
    <div className="space-y-10 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid gap-8 xl:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
              {locale === 'zh' ? '營運首頁' : 'Operations home'}
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                {locale === 'zh' ? '管理與審核中心' : 'Admin and moderation center'}
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-600">
                {locale === 'zh'
                  ? '把商家審核、內容風控、編輯流程與自動化工作台分成清楚區塊，讓日常營運先看重點，再深入處理。'
                  : 'The admin home now separates claims, moderation, editorial workflow, and automation desks so daily operations start with priorities instead of a long mixed queue.'}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href="#admin-trust"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-brand-300 hover:bg-white"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {locale === 'zh' ? '信任與審核' : 'Trust and moderation'}
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{totalTrustItems}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {locale === 'zh'
                  ? '認領、檢舉與待處理內容'
                  : 'Claims, reports, and flagged content'}
              </p>
            </a>
            <a
              href="#admin-editorial"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-brand-300 hover:bg-white"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {locale === 'zh' ? '編輯流程' : 'Editorial workflow'}
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{editorialQueueCount}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {locale === 'zh'
                  ? 'Signal Desk 與監看來源'
                  : 'Signal Desk queue and monitored sources'}
              </p>
            </a>
            <a
              href="#admin-automation"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-brand-300 hover:bg-white"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {locale === 'zh' ? '自動化工作台' : 'Automation desks'}
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{radarControlCount}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {locale === 'zh'
                  ? 'Radar 與 Discover Arizona'
                  : 'Radar and Discover Arizona controls'}
              </p>
            </a>
            <a
              href="#admin-analytics"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-brand-300 hover:bg-white"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {locale === 'zh' ? '平台訊號' : 'Platform signals'}
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {Object.keys(snapshot.analytics).length}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {locale === 'zh'
                  ? '近期事件追蹤與互動統計'
                  : 'Recent event tracking and interaction stats'}
              </p>
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldAlert className="h-4 w-4" />
            <span className="text-sm font-semibold uppercase tracking-[0.18em]">
              {locale === 'zh' ? '信任與審核' : 'Trust and moderation'}
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-bold text-slate-900">
            {locale === 'zh' ? '先處理需要人工判斷的項目' : 'Start with human-review items'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {locale === 'zh'
              ? '把商家認領、檢舉與被標記內容放在同一個工作區塊，先做最影響平台信任的決策。'
              : 'Keep claims, reports, and flagged content together so the highest-trust decisions are handled first.'}
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <FileWarning className="h-4 w-4" />
                <span className="text-sm font-semibold">{locale === 'zh' ? '檢舉案件' : 'Reports'}</span>
              </div>
              <p className="mt-3 text-4xl font-bold text-slate-900">{moderationReports.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <ShieldAlert className="h-4 w-4" />
                <span className="text-sm font-semibold">{locale === 'zh' ? '待處理認領' : 'Pending claims'}</span>
              </div>
              <p className="mt-3 text-4xl font-bold text-slate-900">{pendingClaims.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <CalendarDays className="h-4 w-4" />
                <span className="text-sm font-semibold">{locale === 'zh' ? '待處理貼文' : 'Flagged posts'}</span>
              </div>
              <p className="mt-3 text-4xl font-bold text-slate-900">{snapshot.flaggedPosts.length}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Newspaper className="h-4 w-4" />
            <span className="text-sm font-semibold uppercase tracking-[0.18em]">
              {locale === 'zh' ? '編輯與發佈流程' : 'Editorial and publishing'}
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-bold text-slate-900">
            {locale === 'zh' ? '把內容流程和來源監看分開看' : 'Separate queue work from source watching'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {locale === 'zh'
              ? '用摘要卡先看內容隊列、來源規模與目錄跟進，真正需要深入時再進到下方工作區。'
              : 'Use the overview to spot queue pressure, source coverage, and directory follow-ups before diving into the detailed desks below.'}
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Clock3 className="h-4 w-4" />
                <span className="text-sm font-semibold">{locale === 'zh' ? '監看來源' : 'Monitored sources'}</span>
              </div>
              <p className="mt-3 text-4xl font-bold text-slate-900">{signalDeskSummary.monitoredSourceCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Newspaper className="h-4 w-4" />
                <span className="text-sm font-semibold">{locale === 'zh' ? '待編輯訊號' : 'Review-ready signals'}</span>
              </div>
              <p className="mt-3 text-4xl font-bold text-slate-900">{signalDeskSummary.reviewReadyCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Building2 className="h-4 w-4" />
                <span className="text-sm font-semibold">{locale === 'zh' ? '目錄跟進' : 'Directory follow-ups'}</span>
              </div>
              <p className="mt-3 text-4xl font-bold text-slate-900">{signalDeskSummary.openDirectoryFollowUpCount}</p>
            </div>
          </div>
        </section>
      </div>

      <section id="admin-trust" className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">
            {locale === 'zh' ? '信任與審核工作區' : 'Trust and moderation workspace'}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            {locale === 'zh'
              ? '左邊集中處理商家認領，右邊看檢舉與被標記內容，讓決策路徑更清楚。'
              : 'Claims stay on the left and moderation reports stay on the right so review work follows one clear path.'}
          </p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[0.9fr,1.1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-slate-900">
                {locale === 'zh' ? '待處理認領' : 'Pending claims'}
              </h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {pendingClaims.length}
              </span>
            </div>
            <div className="mt-5">
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
                <div className="max-h-[48rem] space-y-4 overflow-y-auto pr-1">
                  {pendingClaims.map((claim) => (
                    <div key={claim.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="font-semibold text-slate-900">{claim.claimantName}</p>
                      <p className="text-sm text-slate-600">{claim.email}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-brand-600">
                        {claim.businessName}
                        {claim.city ? ` · ${claim.city}` : ''}
                      </p>
                      {claim.category ? (
                        <p className="mt-2 text-sm text-slate-500">
                          {locale === 'zh' ? '分類' : 'Category'}: {claim.category}
                        </p>
                      ) : null}
                      <BusinessClaimApprovalCard
                        categories={directoryCategories}
                        claim={claim}
                        locale={locale}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-slate-900">
                {locale === 'zh' ? '檢舉與內容佇列' : 'Reports and content queue'}
              </h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {moderationQueueCount}
              </span>
            </div>
            <div className="mt-5">
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
                <div className="max-h-[48rem] space-y-4 overflow-y-auto pr-1">
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
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="admin-editorial" className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">
            {locale === 'zh' ? '編輯流程工作區' : 'Editorial workflow workspace'}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            {locale === 'zh'
              ? '把 Signal Desk 的待辦內容和來源名單分欄顯示，方便一邊處理文章，一邊檢查來源策略。'
              : 'Signal Desk tasks and source manifests live side by side so article handling and source strategy stay visually separate.'}
          </p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.05fr,0.95fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-slate-900">
                {locale === 'zh' ? 'Signal Desk 佇列' : 'Signal Desk queue'}
              </h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {signalDeskQueue.length}
              </span>
            </div>
            <div className="mt-5">
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
                <div className="max-h-[48rem] space-y-4 overflow-y-auto pr-1">
                  {signalDeskQueue.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                            <span>{articleSeriesLabel(item.series, locale)}</span>
                            <span className="text-slate-300">/</span>
                            <span>{freshnessTierLabel(item.freshnessTier, locale)}</span>
                            <span className="text-slate-300">/</span>
                            <span className="tracking-normal text-slate-500">
                              {destinationSurfaceLabel(item.destinationSurface, locale)}
                            </span>
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
                          <span
                            key={`${item.id}-${target}`}
                            className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
                          >
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
                          <p className="mt-2 text-sm leading-6 text-amber-900">
                            {t(item.directoryFollowUp.notes, locale)}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-slate-900">
                {locale === 'zh' ? '監看來源清單' : 'Monitored source manifest'}
              </h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {monitoredSources.length}
              </span>
            </div>
            <div className="mt-5 max-h-[48rem] space-y-3 overflow-y-auto pr-1">
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
      </section>

      <section id="admin-automation" className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">
            {locale === 'zh' ? '自動化工作台' : 'Automation desks'}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            {locale === 'zh'
              ? '把高密度操作面板收進可展開區塊，平常先看摘要，需要時再深入處理。'
              : 'The densest control surfaces now live inside collapsible desks so you can scan the summaries first and only open the heavy tools when needed.'}
          </p>
        </div>

        <details
          open
          className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="list-none cursor-pointer p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                  Arizona News
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {locale === 'zh' ? '即時 Radar 控制台' : 'Live Radar control desk'}
                  </h3>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                    {locale === 'zh'
                      ? '看摘要、來源、候選內容與已上線內容，再決定要不要打開完整操作面板。'
                      : 'Review summary counts for sources, candidates, and live stories before opening the full operations desk.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {locale === 'zh'
                    ? `${radarAdminSnapshot.overview.publishedCount} 已發佈`
                    : `${radarAdminSnapshot.overview.publishedCount} published`}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {locale === 'zh'
                    ? `${radarAdminSnapshot.candidates.length} 候選內容`
                    : `${radarAdminSnapshot.candidates.length} candidates`}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {radarAdminSnapshot.overview.jobControl.paused
                    ? locale === 'zh'
                      ? '排程已暫停'
                      : 'Job paused'
                    : locale === 'zh'
                      ? '排程執行中'
                      : 'Job running'}
                </span>
              </div>
            </div>
          </summary>
          <div className="border-t border-slate-200 bg-slate-50 p-6">
            <RadarAdminPanel
              locale={locale}
              overview={radarAdminSnapshot.overview}
              sources={radarAdminSnapshot.sources}
              candidates={radarAdminSnapshot.candidates}
              articles={radarAdminSnapshot.articles}
              runs={radarAdminSnapshot.runs}
            />
          </div>
        </details>

        <details className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm [&_summary::-webkit-details-marker]:hidden">
          <summary className="list-none cursor-pointer p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                  Discover Arizona
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {locale === 'zh' ? '短影音轉文章工作台' : 'Short-form discovery desk'}
                  </h3>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                    {locale === 'zh'
                      ? '把候選影片、文章草稿與寫入能力放在可展開面板，減少主頁干擾。'
                      : 'Candidate videos, article drafting, and write controls now stay tucked into an expandable desk to keep the admin home calmer.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {locale === 'zh'
                    ? `${discoverAdminQueue.length} 筆佇列`
                    : `${discoverAdminQueue.length} queued`}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {discoverWriteEnabled
                    ? locale === 'zh'
                      ? '可寫入'
                      : 'Write enabled'
                    : locale === 'zh'
                      ? '唯讀'
                      : 'Read only'}
                </span>
              </div>
            </div>
          </summary>
          <div className="border-t border-slate-200 bg-slate-50 p-6">
            <DiscoverArizonaAdminPanel
              locale={locale}
              initialQueue={discoverAdminQueue}
              writeEnabled={discoverWriteEnabled}
            />
          </div>
        </details>
      </section>

      <section id="admin-analytics" className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">
            {locale === 'zh' ? '平台訊號' : 'Platform signals'}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            {locale === 'zh'
              ? '把較低頻的事件追蹤放在最後，保留可見性，但不搶前面的營運注意力。'
              : 'Lower-frequency analytics stay visible at the end of the page without competing with the higher-priority operational work above.'}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">
            {locale === 'zh' ? '目前事件追蹤' : 'Current event tracking'}
          </h3>
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
      </section>
    </div>
  );
}
