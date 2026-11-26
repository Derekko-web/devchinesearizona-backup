// No route renders this page; the live community page is '@/views/community-page'.
// It is kept because tests/radar-ui.test.tsx still covers it.
import Link from 'next/link';

import { CommunityCard } from '@/components/CommunityCard';
import { CommunityTrendingRail } from '@/components/CommunityTrendingRail';
import { EventCard } from '@/components/EventCard';
import { CommunityPostComposer } from '@/components/forms/CommunityPostComposer';
import { resolveLocalizedTextList } from '@/lib/article-localization';
import { getEvents, getCommunityPosts, getCommunityTrendingArticlesAsync } from '@/lib/content';
import { getLocalizedNewsArchivePath, getLocalizedNewsArticlePath } from '@/lib/arizona-news';
import { defaultSiteProfile, type SiteProfile } from '@/lib/site-config';
import type { Locale } from '@/lib/types';
import { ArticleMetaRow, CityDataUnavailable, sectionContainer } from '@/views/site-page-shared';

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
            ? '此城市設定必須先接入自己的活動、貼文與內容來源；平台不會回退顯示 ChineseArizona 社群內容。'
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
          </div>
          <p className="text-sm leading-6 text-slate-600">
            {locale === 'zh'
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
