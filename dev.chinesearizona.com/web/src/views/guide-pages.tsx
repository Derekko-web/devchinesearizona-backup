import {
  Bookmark,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileWarning,
  MessageCircle,
  Navigation,
  Newspaper,
  Route,
  ShieldAlert,
  ShieldCheck,
  Store,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { BusinessCard } from '@/components/BusinessCard';
import { HousingListingsSection } from '@/components/HousingListingsSection';
import { TrackedLink } from '@/components/TrackedLink';
import { resolveLocalizedTextList } from '@/lib/article-localization';
import {
  getBusinessCategories,
  getCurrentArticlesAsync,
  getGuideBySlug,
  getGuides,
  getRelatedEvents,
} from '@/lib/content';
import { getDirectoryBusinessBySlug } from '@/lib/directory';
import { getHousingRegionSnapshots } from '@/lib/housing';
import {
  descriptiveImageAlt,
  formatDate,
  formatDateTime,
  formatReadTime,
  guideSectionLabel,
  t,
} from '@/lib/i18n';
import { getLocalizedNewsArticlePath, getLocalizedNewsPath } from '@/lib/arizona-news';
import { getMetroCategoryHeading, metroCategoryPath } from '@/lib/metro-categories';
import { absoluteUrl } from '@/lib/seo';
import { JsonLd } from '@/lib/schema';
import { withLocale } from '@/lib/routing';
import { defaultSiteProfile } from '@/lib/site-config';
import type { Business, BusinessCategory, Guide, Locale } from '@/lib/types';
import { ArticleMetaRow } from '@/views/site-page-shared';

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
  const directoryPrompt = guide.directoryPrompt;
  const directoryCategories = (directoryPrompt?.categorySlugs ?? [])
    .map((categorySlug) => getBusinessCategories().find((category) => category.slug === categorySlug))
    .filter((category): category is BusinessCategory => Boolean(category));

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

            {directoryPrompt ? (
              <section className="border-b border-[#dfcdbb] py-8" data-testid="guide-directory-prompt">
                <h2 className="text-2xl font-semibold text-[#2b1f18] [font-family:var(--font-display)]">
                  {locale === 'zh' ? '找專業人士協助' : 'Find a professional'}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[#6a5547]">{t(directoryPrompt.note, locale)}</p>
                {directoryCategories.length > 0 ? (
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                    {directoryCategories.map((category) => (
                      <li key={`${guide.slug}-directory-${category.slug}`} className="border-t border-[#eadccd] pt-3">
                        <Link
                          href={withLocale(locale, metroCategoryPath(category.slug))}
                          className="group inline-flex items-center gap-2 text-base font-semibold text-[#2b1f18] hover:text-brand-700"
                        >
                          {getMetroCategoryHeading(category, locale)}
                          <ChevronRight className="h-4 w-4 text-brand-700" aria-hidden="true" />
                        </Link>
                        <Link
                          href={withLocale(locale, `/business?category=${category.slug}`)}
                          className="mt-1 block text-sm text-[#7b6658] hover:text-brand-700"
                        >
                          {locale === 'zh'
                            ? `在商家名錄搜尋「${t(category.name, locale)}」`
                            : `Search ${category.name.en} in the directory`}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
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
