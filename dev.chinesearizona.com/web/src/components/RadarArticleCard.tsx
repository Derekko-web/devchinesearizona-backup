import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

import { getLocalizedArizonaNewsArticlePath } from '@/lib/arizona-news';
import { DiscoverArticleImage } from '@/components/DiscoverArticleImage';
import { LocalDateTime } from '@/components/LocalDateTime';
import { radarLaneLabel, sourceTypeLabel, t } from '@/lib/i18n';
import type { Article, Locale } from '@/lib/types';

export function RadarArticleCard({
  article,
  locale,
  compact = false,
  localizedTitle,
  localizedExcerpt,
}: {
  article: Article;
  locale: Locale;
  compact?: boolean;
  localizedTitle?: string;
  localizedExcerpt?: string;
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
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            {article.radarLane
              ? radarLaneLabel(article.radarLane, locale)
              : locale === 'zh'
                ? '新聞'
                : 'News'}
          </span>
          {article.sourceType ? (
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {sourceTypeLabel(article.sourceType, locale)}
            </span>
          ) : null}
        </div>

        <div className="space-y-2">
          <h3 className={`font-bold tracking-tight text-slate-900 ${titleClass}`}>
            {displayTitle}
          </h3>
          <p className={bodyClass + ' text-slate-600'}>{displayExcerpt}</p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
          {article.sourceType ? <span>{sourceTypeLabel(article.sourceType, locale)}</span> : null}
          {article.sourceName ? (
            <>
              {article.sourceType ? <span className="text-slate-300">/</span> : null}
              <span>{article.sourceName}</span>
            </>
          ) : null}
          {article.sourceType || article.sourceName ? <span className="text-slate-300">/</span> : null}
          <LocalDateTime
            date={article.lastCheckedAt ?? article.updatedAt ?? article.publishedAt}
            locale={locale}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={getLocalizedArizonaNewsArticlePath(locale, article.slug)}
            className="inline-flex items-center rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            {locale === 'zh' ? '閱讀全文' : 'Read article'}
          </Link>
          {article.sourceUrl ? (
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {locale === 'zh' ? '原始來源' : 'Original source'}
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
