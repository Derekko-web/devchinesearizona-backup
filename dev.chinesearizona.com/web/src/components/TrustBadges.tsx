import { directoryStatusLabel, verificationStateLabel } from '@/lib/i18n';
import type { DirectoryStatus, Locale, VerificationState } from '@/lib/types';

type TrustBadgesProps = {
  locale: Locale;
  verified?: boolean;
  bilingual?: boolean;
  sponsored?: boolean;
  verificationState?: VerificationState;
  status?: DirectoryStatus;
};

function copy(locale: Locale) {
  return {
    sponsored: locale === 'zh' ? '精選推薦' : 'Featured',
    verified: locale === 'zh' ? '已驗證' : 'Verified',
    bilingual: locale === 'zh' ? '雙語服務' : 'Bilingual',
  };
}

export function TrustBadges({
  locale,
  verified,
  bilingual,
  sponsored,
  verificationState,
  status,
}: TrustBadgesProps) {
  const labels = copy(locale);

  return (
    <div className="flex flex-wrap gap-2">
      {sponsored ? (
        <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
          {labels.sponsored}
        </span>
      ) : null}
      {verificationState ? (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            verificationState === 'unverified'
              ? 'bg-rose-50 text-rose-700'
              : verificationState === 'claimed'
                ? 'bg-sky-50 text-sky-700'
                : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {verificationStateLabel(verificationState, locale)}
        </span>
      ) : verified ? (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          {labels.verified}
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
