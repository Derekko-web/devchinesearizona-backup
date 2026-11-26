import Link from 'next/link';

import type { AdminListingPlan } from '@/lib/listing-plans';
import { formatListingPlanUsd, listingPlanNames, listingPlanTermLabel } from '@/lib/listing-plan-offers';
import { withLocale } from '@/lib/routing';
import type { Locale } from '@/lib/types';

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-Hant' : 'en-US', {
    dateStyle: 'medium',
    timeZone: 'America/Phoenix',
  }).format(new Date(value));
}

// Paid listing plans that have not ended yet (issue #408), so the admin can
// confirm details for the verified badge and send founding write-ups.
export function AdminListingPlansPanel({ plans, locale }: { plans: AdminListingPlan[]; locale: Locale }) {
  const zh = locale === 'zh';

  return (
    <section id="admin-listing-plans" className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">{zh ? '付費商家方案' : 'Paid listing plans'}</h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          {zh
            ? '尚未到期的進階商家頁與分類贊助方案。創始年度方案需安排免費雙語介紹代寫；退款後請在 Supabase 將該筆方案的 status 改為 cancelled。'
            : 'Enhanced listing and sponsored category plans that have not ended. Founding-year buyers get a free bilingual write-up. After a refund in Stripe, set that plan’s status to cancelled in Supabase.'}
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {plans.length === 0 ? (
          <p className="text-sm text-slate-500">{zh ? '目前沒有付費方案。' : 'No paid plans yet.'}</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-semibold">{zh ? '商家' : 'Listing'}</th>
                  <th className="px-2 py-2 font-semibold">{zh ? '方案' : 'Plan'}</th>
                  <th className="px-2 py-2 text-right font-semibold">{zh ? '金額' : 'Paid'}</th>
                  <th className="px-2 py-2 font-semibold">{zh ? '期間' : 'Term'}</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-t border-slate-100 align-top">
                    <td className="py-2 pr-3">
                      {plan.businessSlug ? (
                        <Link
                          href={withLocale(locale, `/business/${plan.businessSlug}`)}
                          className="font-semibold text-slate-900 hover:text-brand-800 hover:underline"
                        >
                          {plan.businessName}
                        </Link>
                      ) : (
                        <span className="font-semibold text-slate-900">{plan.businessName}</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {zh ? listingPlanNames[plan.planId].zh : listingPlanNames[plan.planId].en}
                      <span className="text-slate-500"> · {listingPlanTermLabel(plan.interval, locale)}</span>
                      {plan.scopeCategory ? <span className="text-slate-500"> · {plan.scopeCategory}</span> : null}
                      {plan.founding ? (
                        <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          {zh ? '創始' : 'Founding'}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 text-right font-mono">{formatListingPlanUsd(plan.amountCents)}</td>
                    <td className="px-2 py-2 text-slate-600">
                      {formatDate(plan.startsAt, locale)} – {formatDate(plan.endsAt, locale)}
                      {!plan.live ? (
                        <span className="ml-2 text-xs font-semibold text-slate-500">{zh ? '（排程中）' : '(queued)'}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
