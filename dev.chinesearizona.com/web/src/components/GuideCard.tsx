import { ArrowRight, ExternalLink } from 'lucide-react';
import Image from 'next/image';

import { descriptiveImageAlt, formatDate, formatReadTime, guideSectionLabel, t } from '@/lib/i18n';
import { withLocale } from '@/lib/routing';
import type { Guide, Locale } from '@/lib/types';
import { TrackedLink } from '@/components/TrackedLink';

type GuideCardProps = {
  guide: Guide;
  locale: Locale;
};

export function GuideCard({ guide, locale }: GuideCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative h-44 w-full bg-slate-200">
        <Image
          src={guide.heroImage}
          alt={descriptiveImageAlt(t(guide.title, locale), 'guide', locale)}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
      <div className="space-y-4 p-6">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
            {guideSectionLabel(guide.section, locale)}
          </div>
          <h3 className="text-xl font-bold text-slate-900">{t(guide.title, locale)}</h3>
          <p className="text-sm leading-6 text-slate-600">{t(guide.excerpt, locale)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <span>{formatReadTime(guide.readTime, locale)}</span>
          <span>{formatDate(guide.updatedAt, locale)}</span>
          <span className="inline-flex items-center gap-1">
            <ExternalLink className="h-4 w-4" />
            {guide.officialResources.length}
            {locale === 'zh' ? ' 個官方連結' : ' official links'}
          </span>
        </div>

        <TrackedLink
          href={withLocale(locale, `/relocation-guide/${guide.slug}`)}
          eventType="guide_click"
          entitySlug={guide.slug}
          className="inline-flex items-center text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          {locale === 'zh' ? '閱讀指南' : 'Read guide'}
          <ArrowRight className="ml-1 h-4 w-4" />
        </TrackedLink>
      </div>
    </article>
  );
}
