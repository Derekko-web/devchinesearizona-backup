import { Compass, ExternalLink, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { hiddenArizonaKindLabel, t } from '@/lib/i18n';
import { getHiddenArizonaEntryPath } from '@/lib/hidden-arizona';
import { withLocale } from '@/lib/routing';
import type { HiddenArizonaEntry, Locale } from '@/lib/types';

type HiddenArizonaCardProps = {
  entry: HiddenArizonaEntry;
  locale: Locale;
  localizedTitle?: string;
  localizedExcerpt?: string;
  localizedCityLabel?: string;
  localizedTags?: string[];
};

export function HiddenArizonaCard({
  entry,
  locale,
  localizedTitle,
  localizedExcerpt,
  localizedCityLabel,
  localizedTags,
}: HiddenArizonaCardProps) {
  const href = withLocale(locale, getHiddenArizonaEntryPath(entry));
  const displayTitle = localizedTitle ?? t(entry.title, locale);
  const displayExcerpt = localizedExcerpt ?? t(entry.excerpt, locale);
  const displayCityLabel = localizedCityLabel ?? entry.city;
  const displayTags = localizedTags ?? entry.tags;

  return (
    <article className="flex h-full min-h-[34rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link href={href} className="block">
        <div className="relative h-52 w-full overflow-hidden bg-slate-200">
          {entry.heroImage ? (
            <Image
              src={entry.heroImage}
              alt={`${displayTitle} ${locale === 'zh' ? '封面圖' : 'cover image'}`}
              fill
              sizes="(max-width: 1024px) 100vw, 33vw"
              unoptimized
              className="object-cover transition-transform duration-500 hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.12),_transparent_45%),linear-gradient(135deg,_#e2e8f0,_#f8fafc)]" />
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex min-h-[1.75rem] flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
          <span className="rounded-full bg-brand-50 px-2.5 py-1">{hiddenArizonaKindLabel(entry.kind, locale)}</span>
          {entry.kind === 'place' && displayCityLabel ? (
            <span className="inline-flex max-w-full items-center gap-1.5 text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{displayCityLabel}</span>
            </span>
          ) : null}
        </div>

        <div className="min-h-[8.5rem] space-y-2">
          <Link href={href} className="block text-xl font-bold tracking-tight text-slate-900 transition-colors hover:text-brand-700">
            <span className="line-clamp-2">{displayTitle}</span>
          </Link>
          <p className="line-clamp-4 text-sm leading-6 text-slate-600">{displayExcerpt}</p>
        </div>

        <div className="min-h-[3.5rem]">
          {displayTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {displayTags.slice(0, 3).map((tag) => (
                <span key={`${entry.slug}-${tag}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <Link
            href={href}
            className="inline-flex items-center gap-2 rounded-full bg-brand-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            <Compass className="h-4 w-4" />
            {locale === 'zh' ? '閱讀更多' : 'Read more'}
          </Link>
          <a
            href={entry.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-[10rem] items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="truncate">{entry.sourceName}</span>
          </a>
        </div>
      </div>
    </article>
  );
}
