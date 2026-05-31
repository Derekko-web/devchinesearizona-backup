/* eslint-disable @next/next/no-img-element */
import {
  ArrowRight,
  ChevronRight,
  MapPin,
  Search,
  Star,
  SunMedium,
} from 'lucide-react';
import Link from 'next/link';

import { CategoryIcon } from '@/components/CategoryIcon';
import { getLocalizedNewsArticlePath, getLocalizedNewsPath } from '@/lib/arizona-news';
import { canServeArizonaOnlyContent } from '@/lib/arizona-only-routes';
import { getBusinessCategories, getBusinessesForSite, getCurrentArticlesForSite } from '@/lib/content';
import { t } from '@/lib/i18n';
import { withLocale } from '@/lib/routing';
import {
  defaultSiteProfile,
  hasLiveDirectoryData,
  hasLiveNewsData,
  type SiteFeaturedShowcaseCard,
  type SiteNeighborhoodSpot,
  type SiteProfile,
} from '@/lib/site-config';
import type { BusinessCategory, Locale } from '@/lib/types';

type HomePageViewProps = {
  locale: Locale;
  site?: SiteProfile;
};

type HomeStoryCard = {
  href: string;
  title: string;
  bodyText: string;
  date: string;
  image?: string | null;
};

type NeighborhoodSpot = SiteNeighborhoodSpot;
type FeaturedShowcaseCard = SiteFeaturedShowcaseCard;

type TrustedServiceTile = {
  slug?: string;
  labelEn: string;
  labelZh: string;
  icon: BusinessCategory['icon'];
};

function hasLatinCharacters(value: string): boolean {
  return /[A-Za-z]/.test(value);
}

function hasCjkCharacters(value: string): boolean {
  return /[\u3400-\u9FFF\uF900-\uFAFF]/.test(value);
}

const popularSearchSlugs = ['dining', 'real-estate', 'local-services', 'education', 'medical'] as const;

function CactusIcon({ className }: { className?: string }) {
  return (
    <img
      src="/hero-icons/arizona-cactus.png"
      alt=""
      aria-hidden="true"
      className={`${className ?? ''} object-contain`}
      loading="eager"
      decoding="async"
    />
  );
}

function LocalFocusIcon({ site, className }: { site: SiteProfile; className?: string }) {
  if (site.key === 'arizona') {
    return <CactusIcon className={className} />;
  }

  return (
    <span
      aria-hidden="true"
      className={`${className ?? ''} flex items-center justify-center rounded-full bg-[#fff0dd] text-[#d28a35]`}
    >
      <MapPin className="h-7 w-7" />
    </span>
  );
}

function VerifiedBusinessIcon({ className }: { className?: string }) {
  return (
    <img
      src="/hero-icons/verified-shield.png"
      alt=""
      aria-hidden="true"
      className={`${className ?? ''} object-contain`}
      loading="eager"
      decoding="async"
    />
  );
}

function BilingualSupportIcon({ className }: { className?: string }) {
  return (
    <img
      src="/hero-icons/bilingual-chat.png"
      alt=""
      aria-hidden="true"
      className={`${className ?? ''} object-contain`}
      loading="eager"
      decoding="async"
    />
  );
}

function copy(locale: Locale, en: string, zh: string) {
  return locale === 'zh' ? zh : en;
}

function oppositeCopy(locale: Locale, en: string, zh: string) {
  return locale === 'zh' ? en : zh;
}

function badgeText(locale: Locale, badge: string) {
  const badgeZh: Record<string, string> = {
    Verified: '认证',
    Claimed: '已认领',
  };

  return copy(locale, badge, badgeZh[badge] ?? badge);
}

function formatCompactCount(value: number, locale: Locale) {
  const formatter = new Intl.NumberFormat(locale === 'zh' ? 'zh-TW' : 'en-US');
  return value >= 100 ? `${formatter.format(value)}+` : formatter.format(value);
}

function formatCardDate(date: string, locale: Locale) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-TW' : 'en-US', {
    month: locale === 'zh' ? 'numeric' : 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

function stripStoryCardLeadIn(value: string) {
  const normalized = value.trim();
  const separatorIndex = normalized.search(/[:：]/);

  if (separatorIndex === -1) {
    return normalized;
  }

  const stripped = normalized.slice(separatorIndex + 1).trim();
  return stripped || normalized;
}

function buildDirectoryHref(
  locale: Locale,
  options: {
    category?: string;
    city?: string;
    q?: string;
  }
) {
  const params = new URLSearchParams();

  if (options.q) {
    params.set('q', options.q);
  }

  if (options.city) {
    params.set('city', options.city);
  }

  if (options.category) {
    params.set('category', options.category);
  }

  params.set('sort', 'featured');

  const search = params.toString();
  return `${withLocale(locale, '/business')}${search ? `?${search}` : ''}`;
}

function HomeSectionHeading({
  title,
  subtitle,
  href,
  hrefLabel,
}: {
  title: string;
  subtitle: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-baseline gap-3">
        <h2 className="text-[1.72rem] font-semibold tracking-tight text-[#261b15] sm:text-[1.85rem]">{title}</h2>
        <span className="text-[13px] leading-none text-[#8d7768]">{subtitle}</span>
      </div>

      {href && hrefLabel ? (
        <Link
          href={href}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700"
        >
          {hrefLabel}
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function FeaturedBusinessCard({
  card,
  locale,
}: {
  card: FeaturedShowcaseCard;
  locale: Locale;
}) {
  const href = card.href ?? `/business/${card.slug}`;
  const hasReviewSignal = card.reviewCount > 0 && /^\d/.test(card.rating);

  return (
    <Link
      href={withLocale(locale, href)}
      className="homepage-card group flex h-full flex-col overflow-hidden rounded-[18px] border border-[#e7d8ca] bg-[#fffdfa] shadow-[0_20px_44px_-40px_rgba(80,54,29,0.5)]"
    >
      <div className="relative h-[112px] overflow-hidden bg-[#efe3d4] sm:h-[118px]">
        <img
          src={card.imageUrl}
          alt={copy(locale, card.nameEn, card.nameZh)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
        <div className="absolute left-3 top-3 rounded-full bg-[#5f8640] px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
          {badgeText(locale, card.badge)}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-3.5 py-3">
        <div>
          <p className="text-[13px] text-[#7b685c]">{copy(locale, card.categoryEn, card.categoryZh)}</p>
          <h3 className="mt-1 text-[1.05rem] font-semibold leading-tight tracking-tight text-[#261b15]">
            {copy(locale, card.nameEn, card.nameZh)}
          </h3>
        </div>

        {hasReviewSignal ? (
          <div className="flex items-center gap-2 text-sm text-[#6f5b50]">
            <Star className="h-4 w-4 fill-[#f2af4b] text-[#f2af4b]" />
            <span className="font-semibold text-[#372922]">{card.rating}</span>
            <span>({card.reviewCount})</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm font-semibold text-[#6f5b50]">
            <MapPin className="h-4 w-4 text-brand-600" />
            <span>{copy(locale, 'Local source', '本地来源')}</span>
          </div>
        )}

        <div className="mt-auto text-[13px] leading-5 text-[#726055]">
          <p>{copy(locale, card.line1En, card.line1Zh)}</p>
          {copy(locale, card.line2En, card.line2Zh) ? (
            <p>{copy(locale, card.line2En, card.line2Zh)}</p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function NeighborhoodCard({
  spot,
  locale,
}: {
  spot: NeighborhoodSpot;
  locale: Locale;
}) {
  return (
    <Link
      href={buildDirectoryHref(locale, { city: spot.city })}
      className="homepage-card group relative overflow-hidden rounded-[16px] border border-[#decdbb] bg-[#d3bca7] shadow-[0_18px_44px_-38px_rgba(71,47,25,0.45)]"
      aria-label={copy(locale, `${spot.city} neighborhood`, `${spot.cityZh} 社区`)}
    >
      <div className="relative h-[108px] overflow-hidden sm:h-[116px]">
        <img
          src={spot.imageUrl}
          alt={spot.city}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(38,27,21,0)_0%,rgba(38,27,21,0.78)_42%,rgba(38,27,21,0.94)_100%)] px-3 pb-2.5 pt-10 text-white">
          <p className="text-[1rem] font-semibold leading-none drop-shadow-sm">
            {copy(locale, spot.city, spot.cityZh)}
          </p>
          <p className="mt-1 text-[11px] font-medium leading-none text-white/85 drop-shadow-sm">
            {oppositeCopy(locale, spot.city, spot.cityZh)}
          </p>
        </div>
      </div>
      <span className="sr-only">{copy(locale, `${spot.city} neighborhood`, `${spot.cityZh} 社区`)}</span>
    </Link>
  );
}

function StoryCard({ story }: { story: HomeStoryCard }) {
  return (
    <Link
      href={story.href}
      className="homepage-card group relative flex min-h-[178px] flex-col overflow-hidden rounded-[20px] border border-[#e2d3c2] bg-[#fffdfa] px-4 py-4 shadow-[0_20px_40px_-38px_rgba(81,56,31,0.48)]"
    >
      <div className="relative">
        <h3 className="max-w-[18ch] text-[1.2rem] font-semibold leading-tight tracking-tight text-[#261b15]">
          {story.title}
        </h3>

        <p className="mt-2 max-w-[22ch] text-sm leading-6 text-[#6e5a4e]">{story.bodyText}</p>
      </div>

      <p className="relative mt-auto pt-5 text-xs text-[#918072]">{story.date}</p>
    </Link>
  );
}

export function HomePageView({ locale, site = defaultSiteProfile }: HomePageViewProps) {
  const home = site.home;
  const directoryIsLive = hasLiveDirectoryData(site);
  const newsIsLive = hasLiveNewsData(site);
  const canShowArizonaOnlyLinks = canServeArizonaOnlyContent(site);
  const allBusinesses = directoryIsLive ? getBusinessesForSite(locale, site, { sort: 'featured' }) : [];
  const categories = getBusinessCategories().filter((category) =>
    site.directory.categorySlugs.includes(category.slug)
  );
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const storyCards: HomeStoryCard[] = newsIsLive
    ? getCurrentArticlesForSite(site)
        .filter((article, index, articles) => articles.findIndex((candidate) => candidate.slug === article.slug) === index)
        .filter(
          (article) =>
            hasLatinCharacters(article.title.en) &&
            !hasCjkCharacters(article.title.en) &&
            Boolean(article.title.zh) &&
            article.title.zh !== article.title.en
        )
        .sort((left, right) => {
          const titleLengthDifference = left.title.en.trim().length - right.title.en.trim().length;
          if (titleLengthDifference !== 0) {
            return titleLengthDifference;
          }

          return left.title.en.localeCompare(right.title.en);
        })
        .slice(0, 3)
        .map((article) => ({
          href: getLocalizedNewsArticlePath(locale, site, article.slug),
          title: stripStoryCardLeadIn(copy(locale, article.title.en, article.title.zh ?? article.title.en)),
          bodyText: stripStoryCardLeadIn(oppositeCopy(locale, article.title.en, article.title.zh ?? article.title.en)),
          date: formatCardDate(article.publishedAt, locale),
          image: article.heroImage,
        }))
    : [];
  const popularCategories = popularSearchSlugs
    .map((slug) => categoryBySlug.get(slug))
    .filter((category): category is BusinessCategory => Boolean(category));
  const verifiedCount =
    site.key === defaultSiteProfile.key
      ? allBusinesses.filter((business) => business.verified).length
      : home.featuredCards.length;
  const trustedServiceTiles: TrustedServiceTile[] = [
    {
      slug: 'real-estate',
      labelEn: 'Real Estate',
      labelZh: '地产服务',
      icon: categoryBySlug.get('real-estate')?.icon ?? 'briefcase',
    },
    {
      slug: 'legal-finance',
      labelEn: 'Legal',
      labelZh: '法律服务',
      icon: categoryBySlug.get('legal-finance')?.icon ?? 'briefcase',
    },
    {
      slug: 'legal-finance',
      labelEn: 'Finance',
      labelZh: '金融保险',
      icon: categoryBySlug.get('legal-finance')?.icon ?? 'briefcase',
    },
    {
      slug: 'medical',
      labelEn: 'Healthcare',
      labelZh: '医疗健康',
      icon: categoryBySlug.get('medical')?.icon ?? 'briefcase',
    },
    {
      slug: 'education',
      labelEn: 'Education',
      labelZh: '教育培训',
      icon: categoryBySlug.get('education')?.icon ?? 'briefcase',
    },
    {
      slug: 'home-services',
      labelEn: 'Home Services',
      labelZh: '家居服务',
      icon: categoryBySlug.get('home-services')?.icon ?? 'briefcase',
    },
    {
      slug: 'local-services',
      labelEn: 'Auto',
      labelZh: '汽车服务',
      icon: categoryBySlug.get('local-services')?.icon ?? 'briefcase',
    },
    {
      labelEn: 'More',
      labelZh: '更多分类',
      icon: categoryBySlug.get('shopping')?.icon ?? 'briefcase',
    },
  ];

  return (
    <div className="flex-1 overflow-x-hidden bg-transparent pb-0 text-[#261b15]">
      <div className="px-0 pt-0">
        <section className="overflow-hidden border-b border-[#dccbbb] bg-[#fcf8f1]">
          <div className="grid xl:grid-cols-[0.90fr_1.10fr]">
            <div className="relative z-20 flex flex-col justify-center px-6 py-6 sm:px-8 sm:py-7 xl:px-10 xl:py-7">
              <h1
                className="homepage-rise homepage-rise-delay-1 max-w-[20.4ch] text-[3.1rem] leading-[0.91] tracking-[-0.05em] text-[#2c2019] sm:text-[3.38rem] xl:text-[3.76rem] [font-family:var(--font-display)] [font-weight:900]"
                style={{
                  WebkitTextStroke: '0.56px rgba(44, 32, 25, 0.58)',
                  textShadow: '0.015em 0 0 rgba(44, 32, 25, 0.3)',
                }}
              >
                {copy(locale, home.headline.en, home.headline.zh)}
              </h1>

              <p className="homepage-rise homepage-rise-delay-2 mt-2.5 text-[1.45rem] font-semibold text-brand-600 sm:text-[1.55rem]">
                {oppositeCopy(locale, home.kicker.en, home.kicker.zh)}
              </p>

              <p className="homepage-rise homepage-rise-delay-2 mt-2 text-[0.95rem] leading-7 text-[#6c584d] lg:whitespace-nowrap">
                {copy(locale, home.intro.en, home.intro.zh)}
              </p>

              <form
                action={withLocale(locale, '/business')}
                className="homepage-rise homepage-rise-delay-2 relative z-30 mt-5 overflow-hidden rounded-[22px] border border-[#e6d7ca] bg-white shadow-[0_28px_55px_-40px_rgba(84,58,31,0.32)] xl:w-[calc(100%+6.25rem)]"
              >
                <input type="hidden" name="sort" value="featured" />
                <div className="grid gap-px bg-[#ebddce] md:grid-cols-[minmax(0,1fr)_minmax(204px,224px)_118px]">
                  <label className="flex items-center gap-3 bg-white px-5 py-3.5">
                    <Search className="h-5 w-5 text-[#978272]" />
                    <span className="min-w-0 flex-1">
                      <input
                        type="text"
                        name="q"
                        placeholder={copy(locale, 'Search businesses or services', '搜索商家、服务或关键词')}
                        className="w-full bg-transparent text-[13px] font-medium text-[#3a2b23] outline-none placeholder:text-[#8f7a6d]"
                      />
                      <span className="mt-1 block text-[11px] leading-none text-[#ab978a]">
                        {oppositeCopy(locale, 'Search businesses, services, and keywords', '搜索商家、服务与关键词')}
                      </span>
                    </span>
                  </label>

                  <label className="flex items-center gap-3 bg-white px-5 py-3.5">
                    <MapPin className="h-5 w-5 text-[#978272]" />
                    <select
                      name="city"
                      className="w-full bg-transparent pr-7 text-sm font-medium text-[#3a2b23] outline-none"
                      defaultValue={home.defaultSearchCity}
                    >
                      {home.launchCities.map((city) => (
                        <option key={city} value={city}>
                          {copy(
                            locale,
                            `${city}, ${home.citySelectSuffix.en}`,
                            `${home.cityNamesZh[city] ?? city}, ${home.citySelectSuffix.zh}`
                          )}
                        </option>
                      ))}
                      <option value="">{copy(locale, 'All cities', '全部城市')}</option>
                    </select>
                  </label>

                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 bg-brand-600 px-4 py-3.5 text-white transition-colors hover:bg-brand-700"
                  >
                    <Search className="h-4.5 w-4.5" />
                    <span className="flex flex-col items-start leading-none">
                      <span className="text-base font-semibold">{copy(locale, 'Search', '搜索')}</span>
                      <span className="mt-1 text-[10px] font-medium tracking-[0.08em] text-white/80">
                        {oppositeCopy(locale, 'Search', '搜索')}
                      </span>
                    </span>
                  </button>
                </div>
              </form>

              <div className="homepage-rise homepage-rise-delay-3 mt-3.5">
                <p className="text-[13px] text-[#816f62]">
                  {copy(locale, 'Popular searches', '热门搜索')}
                  <span className="mx-2 text-[#c7ae9a]">/</span>
                  {oppositeCopy(locale, 'Popular discovery', '热门发现')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {popularCategories.map((category) => (
                    <Link
                      key={category.slug}
                      href={buildDirectoryHref(locale, { category: category.slug })}
                      className="rounded-full bg-[#f3e8dc] px-3.5 py-1.5 text-[13px] font-medium text-[#5d4a3f] transition-colors hover:bg-[#efdfcd] hover:text-brand-600"
                    >
                      {t(category.name, locale)}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="homepage-rise homepage-rise-delay-3 mt-5 grid gap-3 sm:grid-cols-3 sm:divide-x sm:divide-[#e7d8ca]">
                <div className="flex items-start gap-3 sm:pr-3">
                  <VerifiedBusinessIcon className="h-14 w-14 flex-shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-[#271c16]">
                      {formatCompactCount(verifiedCount, locale)}
                    </p>
                    <p className="text-[13px] font-medium text-[#3a2b23]">{copy(locale, 'Verified Businesses', '认证商家')}</p>
                    <p className="text-xs text-[#8b786c]">{copy(locale, 'Trusted local directory', '可信本地目录')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:px-3">
                  <BilingualSupportIcon className="mt-1 h-14 w-14 flex-shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-[#3a2b23]">{copy(locale, 'Bilingual Support', '双语支持')}</p>
                    <p className="text-[13px] text-[#6f5c50]">{copy(locale, 'English + Chinese service', '中英双语服务')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:pl-3">
                  <LocalFocusIcon site={site} className="-mt-2 h-[4.375rem] w-[4.375rem] flex-shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-[#3a2b23]">{copy(locale, home.focusTitle.en, home.focusTitle.zh)}</p>
                    <p className="text-[13px] text-[#6f5c50]">{copy(locale, home.focusBody.en, home.focusBody.zh)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="homepage-rise homepage-rise-delay-2 relative min-h-[320px] overflow-hidden rounded-tl-[104px] bg-[#b06a35] xl:min-h-[438px]">
              <img
                src={home.heroImageUrl}
                alt={copy(locale, home.heroImageAlt.en, home.heroImageAlt.zh)}
                className="absolute inset-0 h-full w-full object-cover object-[58%_50%]"
                loading="eager"
                decoding="async"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(55,28,14,0.02),rgba(55,28,14,0.1))]" />

              <div className="absolute -bottom-3 -right-4 z-20 w-[22.8rem] max-w-[52%] sm:w-[23.5rem] xl:w-[24.2rem]">
                <img
                  src={home.heroForegroundImageUrl}
                  alt={copy(locale, home.heroForegroundAlt.en, home.heroForegroundAlt.zh)}
                  className={
                    home.heroForegroundTransparent
                      ? 'block w-full'
                      : 'block aspect-[1.42] w-full rounded-[28px] border border-[#e8d7c6] object-cover shadow-[0_18px_42px_-26px_rgba(74,48,29,0.42)]'
                  }
                  loading="eager"
                  decoding="async"
                />

                <div className="absolute bottom-[12%] left-[9%] inline-flex items-center gap-2.5 rounded-[22px] border border-[#e8d7c6] bg-[#fff9f0] px-3.5 py-2 shadow-[0_16px_30px_-20px_rgba(74,48,29,0.34)]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff0dd] text-[#d28a35]">
                    <SunMedium className="h-4 w-4" />
                  </span>
                    <span className="flex flex-col leading-none">
                    <span className="text-[10px] font-semibold tracking-[0.18em] text-[#6c4d39]">
                      {copy(locale, home.heroBadge.en, home.heroBadge.zh)}
                    </span>
                    <span className="mt-1 text-[11px] font-medium text-[#846653]">
                      {oppositeCopy(locale, home.heroBadgeSubcopy.en, home.heroBadgeSubcopy.zh)}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden border-b border-[#dccbbb] bg-[#fcf8f1]">
          <div className="grid xl:grid-cols-[1.24fr_0.86fr]">
            <div className="p-6 sm:p-7 xl:border-r xl:border-[#e3d4c5]">
              <HomeSectionHeading
                title={copy(locale, 'Featured Businesses', '精选商家')}
                subtitle={oppositeCopy(locale, 'Featured Businesses', '精选商家')}
              />

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {home.featuredCards.map((card) => (
                  <FeaturedBusinessCard
                    key={card.slug}
                    card={card}
                    locale={locale}
                  />
                ))}
              </div>
            </div>

            <div className="flex h-full flex-col p-6 sm:p-7">
              <HomeSectionHeading
                title={copy(locale, 'Explore by Neighborhood', '按社区探索')}
                subtitle={oppositeCopy(locale, 'Explore by Neighborhood', '按社区探索')}
                href={withLocale(locale, '/business')}
                hrefLabel={copy(locale, 'View map', '查看地图')}
              />

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {home.neighborhoods.map((spot) => (
                  <NeighborhoodCard key={spot.city} spot={spot} locale={locale} />
                ))}
              </div>

              <div className="homepage-card relative mt-4 overflow-hidden rounded-[22px] border border-[#e2d2c1] bg-[#f5eee4] shadow-[0_22px_48px_-42px_rgba(72,49,27,0.45)] xl:mt-auto">
                <img
                  src={home.mapImageUrl}
                  alt={copy(locale, home.mapImageAlt.en, home.mapImageAlt.zh)}
                  className="h-[142px] w-full scale-[1.18] object-cover object-center"
                  loading="lazy"
                  decoding="async"
                />

                <div className="absolute bottom-3 right-3">
                  <Link
                    href={withLocale(locale, '/business')}
                    className="inline-flex items-center gap-3 rounded-[16px] border border-[#e0d2c1] bg-white/96 px-4 py-2.5 text-[#32251d] shadow-[0_14px_30px_-18px_rgba(70,47,26,0.35)] transition-colors hover:border-brand-200 hover:text-brand-600"
                  >
                    <span className="flex flex-col leading-none">
                      <span className="text-[13px] font-semibold">{copy(locale, 'Explore all areas', '探索所有区域')}</span>
                      <span className="mt-1 text-[11px] text-[#8d7768]">
                        {oppositeCopy(locale, 'Explore all areas', '探索所有区域')}
                      </span>
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#dfcebd] text-[#655043]">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden border-b border-[#dccbbb] bg-[#fcf8f1]">
          <div className="grid xl:grid-cols-[1.14fr_0.92fr_0.88fr]">
            <div className="p-6 sm:p-7 xl:border-r xl:border-[#e3d4c5]">
              <HomeSectionHeading
                title={copy(locale, 'News & Community', '新闻与社区')}
                subtitle={oppositeCopy(locale, 'News & Community', '新闻与社区')}
                href={newsIsLive ? getLocalizedNewsPath(locale, site) : undefined}
                hrefLabel={newsIsLive ? copy(locale, 'View all', '查看全部') : undefined}
              />

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {storyCards.map((story) => (
                  <StoryCard key={story.href} story={story} />
                ))}
              </div>
            </div>

            <div className="p-6 sm:p-7 xl:border-r xl:border-[#e3d4c5]">
              <HomeSectionHeading
                title={copy(locale, 'Trusted Services', '优选服务')}
                subtitle={oppositeCopy(locale, 'Trusted Services', '优选服务')}
                href={withLocale(locale, '/business')}
                hrefLabel={copy(locale, 'View all', '查看全部')}
              />

              <div className="mt-5 grid grid-cols-4 gap-x-2 gap-y-5">
                {trustedServiceTiles.map((tile, index) => {
                  const circleStyles = [
                    'bg-[#f7ebe1] text-brand-600',
                    'bg-[#f7eedc] text-[#c58b3f]',
                    'bg-[#eee8fb] text-[#7161d8]',
                    'bg-[#fde7e6] text-[#cb5d58]',
                    'bg-[#e8f1fe] text-[#4e7fc8]',
                    'bg-[#fff0e3] text-[#d67c33]',
                    'bg-[#edf2f6] text-[#58708d]',
                    'bg-[#f3f0ea] text-[#6a6158]',
                  ];

                  return (
                    <Link
                      key={`${tile.labelEn}-${index}`}
                      href={tile.slug ? buildDirectoryHref(locale, { category: tile.slug }) : withLocale(locale, '/business')}
                      className="homepage-card flex min-h-[94px] flex-col items-center justify-start gap-2 rounded-[18px] px-2 py-1.5 text-center transition-colors hover:text-brand-600"
                    >
                      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${circleStyles[index % circleStyles.length]}`}>
                        <CategoryIcon icon={tile.icon} className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold leading-tight text-[#30241d]">{copy(locale, tile.labelEn, tile.labelZh)}</p>
                        <p className="mt-1 text-[11px] leading-tight text-[#8a776a]">{oppositeCopy(locale, tile.labelEn, tile.labelZh)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="relative overflow-hidden bg-[#f2dfc8] p-6 sm:p-7">
              <img
                src={home.relocationImageUrl}
                alt={copy(locale, home.relocationImageAlt.en, home.relocationImageAlt.zh)}
                className="absolute inset-0 h-full w-full object-cover object-[58%_center]"
                loading="lazy"
                decoding="async"
              />

              <div className="absolute inset-y-0 left-0 w-[78%] rounded-r-[999px] bg-[#fbf7f1] sm:w-[76%] xl:w-[74%]" />

              <div className="relative max-w-[18rem]">
                <h2 className="max-w-[10ch] text-[2.35rem] leading-[0.95] font-black tracking-tight text-[#2c2019] [font-family:var(--font-display)]">
                  {copy(locale, home.newcomerTitle.en, home.newcomerTitle.zh)}
                </h2>
                <p className="mt-2 text-[1.1rem] font-semibold text-[#8d5737]">
                  {oppositeCopy(locale, home.newcomerTitle.en, home.newcomerTitle.zh)}
                </p>
                <p className="mt-4 text-sm leading-7 text-[#6d584c]">
                  {copy(locale, home.newcomerBody.en, home.newcomerBody.zh)}
                </p>

                {canShowArizonaOnlyLinks ? (
                  <Link
                    href={withLocale(locale, '/relocation-guide')}
                    className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                  >
                    <span className="flex flex-col items-start leading-none">
                      <span>{copy(locale, 'Explore Relocation Guide', '查看搬家指南')}</span>
                      <span className="mt-1 text-[10px] font-medium tracking-[0.06em] text-white/80">
                        {oppositeCopy(locale, 'Explore Relocation Guide', '查看搬家指南')}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 flex-shrink-0" />
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
