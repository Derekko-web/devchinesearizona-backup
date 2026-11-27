import { ChevronRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

import { BusinessCard } from '@/components/BusinessCard';
import { AdSidebarRail } from '@/components/AdSidebarRail';
import { DiscoverArticleImage } from '@/components/DiscoverArticleImage';
import { EmptyState } from '@/components/EmptyState';
import { resolveArticleText, resolveLocalizedTextList } from '@/lib/article-localization';
import {
  getArticleArchivePageAsync,
  getArticleBySlugAsync,
  isLegacyArticle,
  getProfileBySlug,
  getRelatedBusinesses,
} from '@/lib/content';
import { getRadarHeroImageFallback } from '@/lib/radar';
import { shouldRenderAdSensePlacement } from '@/lib/adsense';
import { getDirectoryCategories } from '@/lib/directory';
import {
  articleSeriesLabel,
  descriptiveImageAlt,
  personaTargetLabel,
  sourcePolicyLabel,
  t,
} from '@/lib/i18n';
import {
  getLocalizedNewsArchivePath,
  getLocalizedNewsArticlePath,
  getLocalizedNewsPath,
} from '@/lib/arizona-news';
import { absoluteUrl } from '@/lib/seo';
import { JsonLd } from '@/lib/schema';
import { withLocale } from '@/lib/routing';
import { defaultSiteProfile, hasLiveNewsData, type SiteProfile } from '@/lib/site-config';
import type {
  Article,
  ArticleArchiveBucket,
  ArticleSeries,
  BusinessCategory,
  Locale,
  SourcePolicy,
} from '@/lib/types';
import {
  ArticleMetaRow,
  CityDataUnavailable,
  cleanArizonaNewsCopy,
  sectionContainer,
  siteNewsLabel,
} from '@/views/site-page-shared';

type NewsArchiveSearchParams = {
  bucket?: string;
  series?: string;
  sourcePolicy?: string;
  year?: string;
  month?: string;
  page?: string;
};

const articleSeriesOptions: ArticleSeries[] = [
  'housing-watch',
  'tsmc-corridor-watch',
  'route-watch',
  'restaurant-opening-radar',
  'trend-radar',
  'arizona-radar',
  'local-radar',
  'austin-radar',
  'sf-bay-radar',
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
  if (site.key === 'los-angeles') {
    return ['local-radar'];
  }
  if (site.key === 'sf-bay') {
    return ['sf-bay-radar'];
  }

  return articleSeriesOptions.filter(
    (series) => series !== 'austin-radar' && series !== 'local-radar' && series !== 'sf-bay-radar'
  );
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

function isRadarArticle(article: Article): boolean {
  return (
    article.series === 'arizona-radar' ||
    article.series === 'austin-radar' ||
    article.series === 'local-radar' ||
    article.series === 'sf-bay-radar'
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
            ? '此城市設定必須先產生自己的文章資料；平台不會回退顯示 Arizona News 檔案。'
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
              ? `${siteNewsLabel(site, locale)}首頁只顯示少量最新內容；這裡集中目前主打的原創摘要、系列觀察與編輯內容。`
              : `The ${siteNewsLabel(site, locale)} homepage shows only a small top layer. This archive keeps the current editorial summaries, recurring series, and current published work together.`}
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
  const legacyArticle = isLegacyArticle(article, site);
  const categories = await getDirectoryCategories(site);
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
  const relatedBusinesses = getRelatedBusinesses(article.ctaBusinessSlugs, site);
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
          item: absoluteUrl(withLocale(locale, '/'), site),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: siteNewsLabel(site, locale),
          item: absoluteUrl(getLocalizedNewsPath(locale, site), site),
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: displayArticle.title,
          item: absoluteUrl(getLocalizedNewsArticlePath(locale, site, article.slug), site),
        },
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
            {locale === 'zh'
              ? `返回${siteNewsLabel(site, locale)}`
              : `Back to ${siteNewsLabel(site, locale)}`}
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
                  fallbackSrc={article.radarLane ? getRadarHeroImageFallback(article.radarLane, site) : undefined}
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
              <BusinessCard
                key={business.id}
                business={business}
                locale={locale}
                localizedLocationLabel={business.address ?? business.serviceAreaText ?? `${business.city}, ${site.stateCode}`}
                stateLabel={site.stateCode || site.stateRegion}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
