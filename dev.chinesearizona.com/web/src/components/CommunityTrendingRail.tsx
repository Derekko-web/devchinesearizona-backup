import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import {
  getLocalizedArizonaNewsArchivePath,
  getLocalizedArizonaNewsArticlePath,
} from '@/lib/arizona-news';
import { articleSeriesLabel, descriptiveImageAlt, formatDate, t } from '@/lib/i18n';
import type { Article, Locale, LocalizedText } from '@/lib/types';

const trendEyebrowBySlug: Record<string, LocalizedText> = {
  'tsmc-corridor-watch-supplier-growth-and-neighborhood-pressure': {
    en: 'TSMC',
    zh: 'TSMC',
  },
  'phoenix-route-watch-asia-connector-playbook': {
    en: 'Air Service',
    zh: '航線更新',
  },
  'restaurant-opening-radar-east-valley-plaza-shifts': {
    en: 'Chandler Dining',
    zh: 'Chandler 餐飲',
  },
  'trend-radar-what-phoenix-food-posts-keep-highlighting': {
    en: 'Scottsdale Dining',
    zh: 'Scottsdale 餐飲',
  },
};

function trendingEyebrow(article: Article) {
  return trendEyebrowBySlug[article.slug] ?? { en: 'Trending', zh: '熱門' };
}

export function CommunityTrendingRail({
  articles,
  locale,
}: {
  articles: Article[];
  locale: Locale;
}) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_45%,#ecfeff_100%)] p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex rounded-full border border-amber-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            {locale === 'zh' ? '熱門話題' : "What's trending"}
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {locale === 'zh' ? '大家最近都在追的亞省話題' : 'What Arizona readers are tracking right now'}
          </h2>
        </div>
        <Link
          href={getLocalizedArizonaNewsArchivePath(locale)}
          className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
        >
          {locale === 'zh' ? '全部文章' : 'All articles'}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="-mx-6 overflow-x-auto px-6 pb-2">
        <div className="flex min-w-max snap-x snap-mandatory gap-4">
          {articles.map((article) => {
            const eyebrow = trendingEyebrow(article);

            return (
              <Link
                key={article.slug}
                href={getLocalizedArizonaNewsArticlePath(locale, article.slug)}
                className="group flex w-[310px] shrink-0 snap-start flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:w-[340px]"
              >
                <div className="relative h-44 w-full overflow-hidden bg-slate-200">
                  <Image
                    src={article.heroImage}
                    alt={descriptiveImageAlt(t(article.title, locale), 'article', locale)}
                    fill
                    sizes="340px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/10 to-transparent" />
                  <div className="absolute left-4 top-4 inline-flex rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-900 backdrop-blur">
                    {t(eyebrow, locale)}
                  </div>
                  <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 text-xs font-medium text-white/90">
                    <span>{articleSeriesLabel(article.series, locale)}</span>
                    <span>{formatDate(article.publishedAt, locale)}</span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="text-xl font-bold leading-tight text-slate-900">{t(article.title, locale)}</h3>
                  <p className="text-sm leading-6 text-slate-600">{t(article.excerpt, locale)}</p>
                  <div className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-brand-700">
                    {locale === 'zh' ? '查看話題' : 'Open story'}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
