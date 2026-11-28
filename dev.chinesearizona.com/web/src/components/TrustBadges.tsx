import { directoryStatusLabel, t } from '@/lib/i18n';
import { listingTrustExplanation, listingTrustLabel, type ListingTrustLevel } from '@/lib/listing-trust';
import type { DirectoryStatus, Locale } from '@/lib/types';

type TrustBadgesProps = {
  locale: Locale;
  mostPopular?: boolean;
  // Pass hasChineseSpokenLanguage(business.languages), not the bilingual column.
  bilingual?: boolean;
  sponsored?: boolean;
  trustLevel?: ListingTrustLevel;
  status?: DirectoryStatus;
};

function copy(locale: Locale) {
  return {
    // Hand-picked highlight, not a popularity ranking.
    mostPopular: locale === 'zh' ? '精選' : 'Featured',
    sponsored: locale === 'zh' ? '贊助' : 'Sponsored',
    bilingual: locale === 'zh' ? '雙語服務' : 'Bilingual',
  };
}

const trustLevelClassName: Record<ListingTrustLevel, string> = {
  owner_verified: 'bg-emerald-50 text-emerald-700',
  public_sources: 'bg-stone-100 text-stone-600',
  unverified: 'bg-rose-50 text-rose-700',
};

export function TrustBadges({
  locale,
  mostPopular,
  bilingual,
  sponsored,
  trustLevel,
  status,
}: TrustBadgesProps) {
  const labels = copy(locale);

  return (
    <div className="flex flex-wrap gap-2">
      {mostPopular ? (
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
          {labels.mostPopular}
        </span>
      ) : null}
      {sponsored ? (
        <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
          {labels.sponsored}
        </span>
      ) : null}
      {trustLevel ? (
        <span
          title={t(listingTrustExplanation(trustLevel), locale)}
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${trustLevelClassName[trustLevel]}`}
        >
          {t(listingTrustLabel(trustLevel), locale)}
        </span>
      ) : null}
      {bilingual ? (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          {labels.bilingual}
        </span>
      ) : null}
      {status && status !== 'live' ? (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {directoryStatusLabel(status, locale)}
        </span>
      ) : null}
    </div>
  );
}
