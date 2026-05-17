import { ExternalLink, MapPin, Mountain, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { BusinessCard } from '@/components/BusinessCard';
import { DiscoverArticleImage } from '@/components/DiscoverArticleImage';
import { EmptyState } from '@/components/EmptyState';
import { HiddenArizonaCard } from '@/components/HiddenArizonaCard';
import { resolveLocalizedBusinessCardTextList } from '@/lib/business-localization';
import {
  buildTikTokEmbedUrl,
  discoveryCategories,
  getDiscoverArticleBySlug,
  getFeaturedDiscoverArticles,
  getPublishedDiscoverArticles,
  getDiscoveryCategory,
} from '@/lib/discover-arizona';
import { getRelatedBusinesses } from '@/lib/content';
import { getHiddenArizonaEntries, getHiddenArizonaEntryPath, getHiddenArizonaFeaturedEntries } from '@/lib/hidden-arizona';
import {
  descriptiveImageAlt,
  discoveryArticleByline,
  discoveryCategoryLabel,
  formatDate,
  t,
} from '@/lib/i18n';
import { absoluteUrl } from '@/lib/seo';
import { JsonLd } from '@/lib/schema';
import { withLocale } from '@/lib/routing';
import type { DiscoverArticle, DiscoveryCategory, Locale } from '@/lib/types';

function sectionContainer(children: React.ReactNode) {
  return <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>;
}

function categoryHref(locale: Locale, category: DiscoveryCategory) {
  return withLocale(locale, `/discover-arizona/${category}`);
}

function articleHref(locale: Locale, article: DiscoverArticle) {
  return withLocale(locale, `/discover-arizona/${article.primaryCategory}/${article.slug}`);
}

function buildCategorySummaries(articles: DiscoverArticle[]) {
  return discoveryCategories.map((category) => {
    const categoryArticles = articles.filter((article) => article.primaryCategory === category.slug);
    return {
      ...category,
      articleCount: categoryArticles.length,
      featuredArticle: categoryArticles[0],
    };
  });
}

function DiscoverArticleCard({ article, locale }: { article: DiscoverArticle; locale: Locale }) {
  return (
    <Link
      href={articleHref(locale, article)}
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {article.heroImageUrl ? (
        <div className="relative h-56 w-full bg-slate-200">
          <DiscoverArticleImage
            src={article.heroImageUrl}
            alt={descriptiveImageAlt(t(article.title, locale), 'article', locale)}
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="space-y-3 p-6">
        <div className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
          {discoveryCategoryLabel(article.primaryCategory, locale)}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t(article.title, locale)}</h2>
        <p className="text-sm leading-6 text-slate-600">{t(article.excerpt, locale)}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
          <span>{formatDate(article.publishedAt ?? article.updatedAt, locale)}</span>
          {article.city ? (
            <>
              <span className="text-slate-300">/</span>
              <span>{article.city}</span>
            </>
          ) : null}
          {article.creatorHandle ? (
            <>
              <span className="text-slate-300">/</span>
              <span>@{article.creatorHandle}</span>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export async function DiscoverArizonaHubPageView({ locale }: { locale: Locale }) {
  const [featuredArticles, allArticles] = await Promise.all([
    getFeaturedDiscoverArticles(3),
    getPublishedDiscoverArticles(),
  ]);
  const hiddenArizonaEntries = getHiddenArizonaFeaturedEntries(3);
  const categorySummaries = buildCategorySummaries(allArticles);
  const latestArticles = allArticles.slice(0, 6);

  return sectionContainer(
    <div className="space-y-12 py-12">
      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
              {locale === 'zh' ? '分類入口' : 'Category lanes'}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {locale === 'zh' ? '從旅遊靈感走進真正可用的 Arizona 規劃' : 'Move from travel inspiration to usable Arizona planning'}
            </h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categorySummaries.map((category) => (
            <Link
              key={category.slug}
              href={categoryHref(locale, category.slug)}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{t(category.title, locale)}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{t(category.description, locale)}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {locale === 'zh' ? `${category.articleCount} 篇` : `${category.articleCount} stories`}
                </span>
              </div>
              {category.featuredArticle ? (
                <p className="mt-4 text-sm font-medium text-brand-700">
                  {locale === 'zh' ? '最新：' : 'Latest: '}
                  {t(category.featuredArticle.title, locale)}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      </section>

      {featuredArticles.length > 0 ? (
        <section className="space-y-5">
          <div className="flex items-center gap-2 text-brand-700">
            <Sparkles className="h-5 w-5" />
            <p className="text-sm font-semibold uppercase tracking-[0.18em]">
              {locale === 'zh' ? '精選內容' : 'Featured stories'}
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {featuredArticles.map((article) => (
              <DiscoverArticleCard key={article.id} article={article} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}

      {hiddenArizonaEntries.length > 0 ? (
        <section className="space-y-5">
          <div className="flex items-center gap-2 text-amber-700">
            <Mountain className="h-5 w-5" />
            <p className="text-sm font-semibold uppercase tracking-[0.18em]">
              {locale === 'zh' ? '美麗亞利桑那' : 'Beautiful Arizona'}
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {hiddenArizonaEntries.map((entry) => (
              <HiddenArizonaCard key={entry.slug} entry={entry} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}

      {latestArticles.length > 0 ? (
        <section className="space-y-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              {locale === 'zh' ? '最新發佈' : 'Latest published'}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {locale === 'zh' ? '最新 Arizona 旅遊文章' : 'Latest Arizona travel stories'}
            </h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {latestArticles.map((article) => (
              <DiscoverArticleCard key={article.id} article={article} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export async function DiscoverArizonaCategoryPageView({
  locale,
  category,
}: {
  locale: Locale;
  category: DiscoveryCategory;
}) {
  const categoryMeta = getDiscoveryCategory(category);
  if (!categoryMeta) {
    return null;
  }

  const articles = await getPublishedDiscoverArticles({ category });
  const hiddenArizonaEntries =
    category === 'beautiful_arizona' ? getHiddenArizonaEntries({ kind: 'place' }, { limit: 6 }) : [];

  return sectionContainer(
    <div className="space-y-10 py-12">
      <div className="max-w-3xl space-y-4">
        <div className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
          {locale === 'zh' ? 'Discover Arizona' : 'Discover Arizona'}
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          {discoveryCategoryLabel(category, locale)}
        </h1>
        <p className="text-base leading-7 text-slate-600">{t(categoryMeta.description, locale)}</p>
      </div>

      {articles.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {articles.map((article) => (
            <DiscoverArticleCard key={article.id} article={article} locale={locale} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            locale === 'zh'
              ? '這個分類還沒有已發佈內容'
              : 'There are no published stories in this lane yet'
          }
          description={
            locale === 'zh'
              ? '新的旅遊候選內容經過編輯後，會出現在這裡。'
              : 'Once the next reviewed travel stories are published, they will appear here.'
          }
        />
      )}

      {category === 'beautiful_arizona' && hiddenArizonaEntries.length > 0 ? (
        <section className="space-y-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
              {locale === 'zh' ? 'Hidden Arizona 搭配閱讀' : 'Hidden Arizona companion layer'}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {locale === 'zh' ? '把景色從短影音延伸到更完整的地點探索' : 'Pair scenic clips with deeper place exploration'}
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {hiddenArizonaEntries.map((entry) => (
              <HiddenArizonaCard key={entry.slug} entry={entry} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export async function DiscoverArizonaDetailPageView({
  locale,
  category,
  slug,
}: {
  locale: Locale;
  category: DiscoveryCategory;
  slug: string;
}) {
  const article = await getDiscoverArticleBySlug(slug);
  if (!article || article.primaryCategory !== category || !article.embedEnabled || article.queueStatus !== 'published') {
    return null;
  }

  const relatedBusinesses = getRelatedBusinesses(article.relatedBusinessSlugs);
  const localizedRelatedBusinesses = await resolveLocalizedBusinessCardTextList(relatedBusinesses, locale);
  const relatedHiddenArizona = getHiddenArizonaEntries().filter((entry) =>
    article.relatedHiddenArizonaSlugs.includes(entry.slug)
  );
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title.en,
      description: article.excerpt.en,
      datePublished: article.publishedAt ?? article.updatedAt,
      dateModified: article.updatedAt,
      image: article.heroImageUrl ? [article.heroImageUrl] : undefined,
      author: article.creatorHandle
        ? {
            '@type': 'Person',
            name: `@${article.creatorHandle}`,
            url: article.creatorProfileUrl,
          }
        : undefined,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl(withLocale(locale, '/')) },
        { '@type': 'ListItem', position: 2, name: 'Discover Arizona', item: absoluteUrl(withLocale(locale, '/discover-arizona')) },
        {
          '@type': 'ListItem',
          position: 3,
          name: discoveryCategoryLabel(article.primaryCategory, locale),
          item: absoluteUrl(categoryHref(locale, article.primaryCategory)),
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: t(article.title, locale),
          item: absoluteUrl(articleHref(locale, article)),
        },
      ],
    },
  ];

  return sectionContainer(
    <div className="space-y-10 py-12">
      <JsonLd data={jsonLd} />
      <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {article.heroImageUrl ? (
          <div className="relative h-72 w-full bg-slate-200">
            <DiscoverArticleImage
              src={article.heroImageUrl}
              alt={descriptiveImageAlt(t(article.title, locale), 'article', locale)}
              className="object-cover"
              priority
            />
          </div>
        ) : null}

        <div className="space-y-8 p-8">
          <div className="space-y-4">
            <div className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
              {discoveryCategoryLabel(article.primaryCategory, locale)}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t(article.title, locale)}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-500">
              <span>{formatDate(article.publishedAt ?? article.updatedAt, locale)}</span>
              {article.city ? (
                <>
                  <span className="text-slate-300">/</span>
                  <span>{article.city}</span>
                </>
              ) : null}
              <span className="text-slate-300">/</span>
              <span>{discoveryArticleByline(article, locale)}</span>
            </div>
            <p className="max-w-3xl text-base leading-7 text-slate-600">{t(article.excerpt, locale)}</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-5">
              {article.body.map((paragraph, index) => (
                <p key={`${article.slug}-${index}`} className="text-base leading-8 text-slate-700">
                  {t(paragraph, locale)}
                </p>
              ))}
            </div>

            <aside className="space-y-4">
              <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm">
                <iframe
                  title={t(article.title, locale)}
                  src={buildTikTokEmbedUrl(article.postId)}
                  loading="lazy"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  className="aspect-[9/16] w-full border-0"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-lg font-semibold text-slate-900">
                  {locale === 'zh' ? '來源與地點脈絡' : 'Source and location context'}
                </h2>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  {article.city || article.region ? (
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                      <span>{[article.city, article.region].filter(Boolean).join(', ')}</span>
                    </div>
                  ) : null}
                  <a
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 font-semibold text-brand-700 hover:text-brand-900"
                  >
                    {locale === 'zh' ? '打開原始來源' : 'Open original source'}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                {article.tags.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {article.tags.map((tag) => (
                      <span
                        key={`${article.id}-${tag}`}
                        className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </article>

      {relatedBusinesses.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">
            {locale === 'zh' ? '延伸商家與服務' : 'Related businesses and services'}
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {localizedRelatedBusinesses.map(({ business, localizedText }) => (
              <BusinessCard
                key={business.id}
                business={business}
                locale={locale}
                localizedShortDescription={localizedText.shortDescription}
                localizedLocationLabel={localizedText.locationLabel}
                localizedServiceHighlights={localizedText.serviceHighlights}
              />
            ))}
          </div>
        </section>
      ) : null}

      {relatedHiddenArizona.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">
            {locale === 'zh' ? '延伸閱讀：Hidden Arizona' : 'Continue with Hidden Arizona'}
          </h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {relatedHiddenArizona.map((entry) => (
              <Link
                key={entry.slug}
                href={withLocale(locale, getHiddenArizonaEntryPath(entry))}
                className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <h3 className="font-semibold text-slate-900 group-hover:text-brand-700">
                  {t(entry.title, locale)}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{t(entry.excerpt, locale)}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
