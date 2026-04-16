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
};

export function HiddenArizonaCard({ entry, locale }: HiddenArizonaCardProps) {
  const href = withLocale(locale, getHiddenArizonaEntryPath(entry));

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link href={href} className="block">
        <div className="relative h-52 w-full overflow-hidden bg-slate-200">
          {entry.heroImage ? (
            <Image
              src={entry.heroImage}
              alt={`${t(entry.title, locale)} ${locale === 'zh' ? '封面圖' : 'cover image'}`}
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

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
          <span className="rounded-full bg-brand-50 px-2.5 py-1">{hiddenArizonaKindLabel(entry.kind, locale)}</span>
          {entry.kind === 'place' && entry.city ? (
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              {entry.city}
            </span>
          ) : null}
        </div>

        <div className="space-y-2">
          <Link href={href} className="block text-2xl font-bold tracking-tight text-slate-900 hover:text-brand-700">
            {t(entry.title, locale)}
          </Link>
          <p className="text-sm leading-6 text-slate-600">{t(entry.excerpt, locale)}</p>
        </div>

        {entry.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {entry.tags.slice(0, 4).map((tag) => (
              <span key={`${entry.slug}-${tag}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <Link href={href} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800">
            <Compass className="h-4 w-4" />
            {locale === 'zh' ? '查看完整頁面' : 'Open entry'}
          </Link>
          <a
            href={entry.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {entry.sourceName}
          </a>
        </div>
      </div>
    </article>
  );
}
