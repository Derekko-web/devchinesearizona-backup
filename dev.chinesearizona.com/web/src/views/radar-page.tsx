import { ChevronRight, Newspaper } from 'lucide-react';
import Link from 'next/link';

import { AdSidebarRail } from '@/components/AdSidebarRail';
import { DiscoverArticleImage } from '@/components/DiscoverArticleImage';
import { EmptyState } from '@/components/EmptyState';
import { resolveLocalizedTextList } from '@/lib/article-localization';
import { getCurrentArticlesAsync } from '@/lib/content';
import { getRadarHeroImageFallback } from '@/lib/radar';
import { shouldRenderAdSensePlacement } from '@/lib/adsense';
import { formatDate, radarLaneLabel } from '@/lib/i18n';
import { getLocalizedNewsArticlePath, getLocalizedNewsPath } from '@/lib/arizona-news';
import { defaultSiteProfile, hasLiveNewsData, type SiteProfile } from '@/lib/site-config';
import type { Article, Locale, RadarLane } from '@/lib/types';
import {
  CityDataUnavailable,
  cleanArizonaNewsCopy,
  parsePageNumber,
  sectionContainer,
  siteNewsLabel,
} from '@/views/site-page-shared';

type RadarSearchParams = {
  lane?: string;
  page?: string;
};

const RADAR_FEED_PAGE_SIZE = 12;

const radarLaneOptions: RadarLane[] = ['chinese', 'openings', 'community'];

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
            ? '此城市設定必須先接入自己的新聞來源與生成文章資料；平台不會回退顯示 Arizona News。'
            : 'This city config must connect its own news feeds and generated article data first; the platform will not fall back to Arizona News.'
        }
      />
    );
  }

  const activeLane = parseRadarLane(searchParams?.lane);
  const requestedPage = parsePageNumber(searchParams?.page);
  const allCurrentArticles = await getCurrentArticlesAsync(undefined, site);
  const allFeedArticles = allCurrentArticles.filter((article) =>
    activeLane ? article.radarLane === activeLane : true
  );
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
      {/* Page-level heading for search engines and screen readers; the visible layout starts with the topic bar. */}
      <h1 className="sr-only">{siteNewsLabel(site, locale)}</h1>
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
                      ? `完整${siteNewsLabel(site, locale)}`
                      : `All ${siteNewsLabel(site, locale)}`}
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
                          fallbackSrc={article.radarLane ? getRadarHeroImageFallback(article.radarLane, site) : undefined}
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
