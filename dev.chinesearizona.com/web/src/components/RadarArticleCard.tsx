import Link from 'next/link';

import { getLocalizedSiteNewsArticlePath } from '@/lib/arizona-news';
import { defaultSiteProfile, type SiteProfile } from '@/lib/site-config';
import { DiscoverArticleImage } from '@/components/DiscoverArticleImage';
import { LocalDateTime } from '@/components/LocalDateTime';
import { radarLaneLabel, t } from '@/lib/i18n';
import type { Article, Locale } from '@/lib/types';

export function RadarArticleCard({
  article,
  locale,
  compact = false,
  localizedTitle,
  localizedExcerpt,
  site = defaultSiteProfile,
}: {
  article: Article;
  locale: Locale;
  compact?: boolean;
  localizedTitle?: string;
  localizedExcerpt?: string;
  site?: SiteProfile;
}) {
  const cardPadding = compact ? 'p-5' : 'p-6';
  const titleClass = compact ? 'text-xl' : 'text-2xl';
  const bodyClass = compact ? 'text-sm leading-6' : 'text-sm leading-6';
  const displayTitle = localizedTitle ?? t(article.title, locale);
  const displayExcerpt = localizedExcerpt ?? t(article.excerpt, locale);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="relative h-48 w-full bg-slate-200">
        <DiscoverArticleImage
          src={article.heroImage}
          alt={displayTitle}
          className="object-cover"
        />
      </div>
      <div className={`space-y-4 ${cardPadding}`}>
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            {article.radarLane
              ? radarLaneLabel(article.radarLane, locale)
              : locale === 'zh'
                ? '新聞'
                : 'News'}
          </div>
          <h3 className={`font-bold tracking-tight text-slate-900 ${titleClass}`}>
            {displayTitle}
          </h3>
          <p className={bodyClass + ' text-slate-600'}>{displayExcerpt}</p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
          {article.sourceName ? (
            <span>{article.sourceName}</span>
          ) : null}
          {article.sourceName ? <span className="text-slate-300">/</span> : null}
          <LocalDateTime
            date={article.lastCheckedAt ?? article.updatedAt ?? article.publishedAt}
            locale={locale}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={getLocalizedSiteNewsArticlePath(locale, site, article.slug)}
            className="inline-flex items-center rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            {locale === 'zh' ? '閱讀全文' : 'Read article'}
          </Link>
        </div>
      </div>
    </article>
  );
}
