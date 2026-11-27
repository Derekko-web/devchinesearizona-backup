import { CheckCircle2, Clock3, Sparkles } from 'lucide-react';
import Link from 'next/link';

import {
  findListingPlanOffer,
  formatListingPlanUsd,
  listingPlanPriceCents,
  type ListingPlanOwnerState,
} from '@/lib/listing-plan-offers';
import type { Business, Locale } from '@/lib/types';

// The owner's next step, shown at the top of the dashboard (#451): the result
// of a checkout they just came back from, claims still under review, and an
// upgrade offer for live listings that have no paid plan yet.

export type OwnerPendingClaimSummary = {
  id: string;
  businessName: string;
  createdAt: string;
};

export type OwnerUpgradeTarget = {
  slug: string;
  name: string;
  enhancedPriceCents: number;
  // Missing when every sponsored spot in the listing's category is taken.
  sponsoredMonthPriceCents?: number;
  founding: boolean;
};

export function buildOwnerUpgradeTarget(
  business: Pick<Business, 'slug' | 'name' | 'status' | 'verificationState'>,
  states: ListingPlanOwnerState[],
  locale: Locale
): OwnerUpgradeTarget | null {
  const eligible = business.status === 'live' && business.verificationState !== 'unverified';
  if (!eligible || states.length === 0 || states.some((state) => state.activeUntil)) {
    return null;
  }

  const enhancedOffer = findListingPlanOffer('enhanced-listing', 'year');
  const sponsoredOffer = findListingPlanOffer('sponsored-category', 'month');
  const enhanced = states.find((state) => state.planId === 'enhanced-listing');
  const sponsored = states.find((state) => state.planId === 'sponsored-category');
  if (!enhancedOffer || !enhanced) {
    return null;
  }

  return {
    slug: business.slug,
    name: locale === 'zh' ? business.name.zh || business.name.en : business.name.en,
    enhancedPriceCents: listingPlanPriceCents(enhancedOffer, enhanced.foundingPrice),
    sponsoredMonthPriceCents:
      sponsoredOffer && sponsored && !sponsored.soldOut
        ? listingPlanPriceCents(sponsoredOffer, sponsored.foundingPrice)
        : undefined,
    founding: enhanced.foundingPrice,
  };
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-Hant' : 'en-US', {
    dateStyle: 'medium',
    timeZone: 'America/Phoenix',
  }).format(new Date(value));
}

export function OwnerNextSteps({
  dashboardPath,
  locale,
  pendingClaims,
  returnNotice,
  upgradeTargets,
}: {
  dashboardPath: string;
  locale: Locale;
  pendingClaims: OwnerPendingClaimSummary[];
  returnNotice?: { message: string; tone: 'error' | 'success' };
  upgradeTargets: OwnerUpgradeTarget[];
}) {
  const zh = locale === 'zh';
  if (!returnNotice && pendingClaims.length === 0 && upgradeTargets.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4" data-testid="owner-next-steps" aria-label={zh ? '下一步' : 'Next steps'}>
      {returnNotice ? (
        <p
          role="status"
          className={`rounded-[1.25rem] border px-5 py-4 text-sm font-semibold leading-6 ${
            returnNotice.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {returnNotice.message}
        </p>
      ) : null}

      {pendingClaims.length > 0 ? (
        <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50/70 p-5">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-slate-950">
                {zh ? '你的認領正在審核中' : 'Your claim is under review'}
              </h2>
              <ul className="space-y-1 text-sm leading-6 text-slate-700">
                {pendingClaims.map((claim) => (
                  <li key={claim.id}>
                    <span className="font-semibold">{claim.businessName}</span>
                    {zh
                      ? `，${formatDate(claim.createdAt, locale)} 送出`
                      : ` · sent ${formatDate(claim.createdAt, locale)}`}
                  </li>
                ))}
              </ul>
              <p className="text-sm leading-6 text-slate-600">
                {zh
                  ? '我們會人工審核每一筆認領。核准後，商家會出現在下方，你就可以更新資料、加入照片並查看客人聯絡次數。'
                  : 'We review every claim by hand. Once it is approved, the listing appears below so you can update details, add photos and see how customers reach you.'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {upgradeTargets.map((target) => (
        <div
          key={target.slug}
          className="flex flex-col gap-4 rounded-[1.25rem] border border-brand-100 bg-brand-50/60 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
            <div className="space-y-1.5">
              <h2 className="text-base font-semibold text-slate-950">
                {zh ? `下一步：讓更多客人找到${target.name}` : `Next step: bring more customers to ${target.name}`}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-700">
                {zh
                  ? `你的商家頁已上線。進階商家頁（${formatListingPlanUsd(target.enhancedPriceCents)}／年）可顯示全部照片`
                  : `Your listing is live. An Enhanced listing (${formatListingPlanUsd(target.enhancedPriceCents)}/year) shows all your photos`}
                {target.sponsoredMonthPriceCents !== undefined
                  ? zh
                    ? `；分類贊助版位（${formatListingPlanUsd(target.sponsoredMonthPriceCents)}／月起）讓你出現在分類頁最上方，並清楚標示「贊助」。`
                    : `, and a Sponsored category spot (from ${formatListingPlanUsd(target.sponsoredMonthPriceCents)}/month) puts you at the top of your category page, clearly labeled "Sponsored".`
                  : zh
                    ? '。'
                    : '.'}
              </p>
              {target.founding ? (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[#8a5a1f]">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {zh ? '創始商家價格，限前 10 家' : 'Founding price for the first 10 businesses'}
                </p>
              ) : null}
            </div>
          </div>
          <Link
            href={`${dashboardPath}?business=${encodeURIComponent(target.slug)}#plans-${target.slug}`}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-800 active:translate-y-px"
          >
            {zh ? '查看方案' : 'See plans'}
          </Link>
        </div>
      ))}
    </section>
  );
}
