import Link from 'next/link';

import { t } from '@/lib/i18n';
import { getHiddenArizonaEntryPath, getHiddenArizonaMapPoints } from '@/lib/hidden-arizona';
import { withLocale } from '@/lib/routing';
import type { HiddenArizonaPlace, Locale } from '@/lib/types';

type HiddenArizonaMapProps = {
  entries: HiddenArizonaPlace[];
  locale: Locale;
  localizedTitleBySlug?: Record<string, string>;
};

export function HiddenArizonaMap({ entries, locale, localizedTitleBySlug }: HiddenArizonaMapProps) {
  const { points, hiddenCount } = getHiddenArizonaMapPoints(entries);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-900">
          {locale === 'zh' ? 'Arizona 發現地圖' : 'Arizona discovery map'}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {locale === 'zh'
            ? '用已知座標快速掃過目前收錄的 Atlas Obscura 地點。'
            : 'A quick spatial view of the Arizona places currently in the Atlas set.'}
        </p>
      </div>

      <div className="p-5">
        <div className="relative h-[28rem] overflow-hidden rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_35%),linear-gradient(180deg,_#eff6ff_0%,_#f8fafc_100%)]">
          <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(148,163,184,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.22)_1px,transparent_1px)] [background-size:4rem_4rem]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(249,115,22,0.2),transparent_14%),radial-gradient(circle_at_76%_34%,rgba(14,165,233,0.18),transparent_12%),radial-gradient(circle_at_44%_78%,rgba(34,197,94,0.15),transparent_12%)]" />

          {points.map((entry) => (
            <Link
              key={entry.slug}
              href={withLocale(locale, getHiddenArizonaEntryPath(entry))}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${entry.x}%`, top: `${entry.y}%` }}
            >
              <span className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/20 blur-md transition-transform duration-300 group-hover:scale-125" />
              <span className="relative flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-brand-600 shadow-md" />
              <span className="absolute left-1/2 top-6 hidden min-w-44 -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg group-hover:block">
                {localizedTitleBySlug?.[entry.slug] ?? t(entry.title, locale)}
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <span>
            {locale === 'zh'
              ? `已定位 ${points.length} 個地點`
              : `${points.length} mapped places`}
          </span>
          {hiddenCount > 0 ? (
            <span>
              {locale === 'zh'
                ? `${hiddenCount} 個地點暫時沒有公開座標`
                : `${hiddenCount} places do not have public coordinates yet`}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
