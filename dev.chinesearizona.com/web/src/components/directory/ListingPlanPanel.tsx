'use client';

import { useEffect, useState } from 'react';

import {
  SPONSORED_CATEGORY_PLAN_LIMIT,
  formatListingPlanUsd,
  getListingPlanOffers,
  listingPlanIds,
  listingPlanNames,
  listingPlanPriceCents,
  listingPlanTermLabel,
  type ListingPlanId,
  type ListingPlanInterval,
  type ListingPlanOwnerState,
} from '@/lib/listing-plan-offers';
import type { Business, Locale } from '@/lib/types';

type ListingPlanPanelProps = {
  available: boolean;
  business: Pick<Business, 'slug' | 'status' | 'verificationState'>;
  locale: Locale;
  mockMode?: boolean;
  states: ListingPlanOwnerState[];
};

type StatusMessage = { message: string; tone: 'error' | 'success' };

const planDescriptions: Record<ListingPlanId, { en: string; zh: string }> = {
  'enhanced-listing': {
    en: 'Shows all your photos (up to 12) on your page instead of 4. A bilingual write-up is free with a founding year.',
    zh: '商家頁可顯示全部照片（最多 12 張，原本為 4 張）。創始年度方案免費贈送雙語商家介紹代寫。',
  },
  'sponsored-category': {
    en: `One of the ${SPONSORED_CATEGORY_PLAN_LIMIT} labeled "Sponsored / 贊助" spots at the top of your category page. It never changes reviews, ratings or verification.`,
    zh: `出現在分類頁最上方的 ${SPONSORED_CATEGORY_PLAN_LIMIT} 個「Sponsored / 贊助」版位之一，不會影響評論、評分或驗證狀態。`,
  },
};

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-Hant' : 'en-US', {
    dateStyle: 'medium',
    timeZone: 'America/Phoenix',
  }).format(new Date(value));
}

export function ListingPlanPanel({ available, business, locale, mockMode, states }: ListingPlanPanelProps) {
  const zh = locale === 'zh';
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const eligible = business.status === 'live' && business.verificationState !== 'unverified';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('business') !== business.slug) {
      return;
    }

    const outcome = params.get('listingPlan');
    if (outcome === 'success') {
      setStatus({
        tone: 'success',
        message: zh
          ? '已收到付款，謝謝！方案會在一分鐘內啟用，重新整理頁面即可看到。'
          : 'Payment received, thank you! Your plan turns on within a minute. Refresh this page to see it.',
      });
    } else if (outcome === 'cancelled') {
      setStatus({
        tone: 'error',
        message: zh ? '已取消結帳，沒有收取任何費用。' : 'Checkout was cancelled. You were not charged.',
      });
    }
  }, [business.slug, zh]);

  async function buy(planId: ListingPlanId, interval: ListingPlanInterval) {
    setBusy(`${planId}:${interval}`);
    setStatus(null);

    try {
      const response = await fetch('/api/directory/listing-plans/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-locale': locale },
        body: JSON.stringify({ businessSlug: business.slug, interval, planId }),
      });
      const data = (await response.json()) as { message?: string; url?: string };

      if (!response.ok || !data.url) {
        setStatus({
          tone: 'error',
          message:
            data.message ?? (zh ? '目前無法建立結帳頁。' : 'Unable to start checkout right now.'),
        });
        return;
      }

      window.location.assign(data.url);
    } catch {
      setStatus({
        tone: 'error',
        message: zh ? '目前無法建立結帳頁。' : 'Unable to start checkout right now.',
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="listing-plan-panel">
      <div className="space-y-2">
        <div className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
          {zh ? '商家方案' : 'Listing plans'}
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          {zh
            ? '一次付款購買 1 個月或 1 年，到期自動結束，不會自動續約。方案期間內再次購買，會接在目前期間之後。'
            : 'Pay once for a month or a year. The plan ends on its own and never renews automatically. Buying again while a plan is running adds the new term after the current one.'}
        </p>
      </div>

      {!available ? (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
          {zh
            ? '線上購買方案尚未在此環境開放。如需方案，請透過廣告合作頁聯絡我們。'
            : 'Online plan checkout is not open in this environment yet. Contact us from the Advertise page to set up a plan.'}
        </p>
      ) : null}

      {available && mockMode ? (
        <p className="mt-4 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm leading-6 text-brand-800">
          {zh
            ? '本機測試模式：購買會直接啟用方案，不會建立真正的 Stripe 付款。'
            : 'Local test mode: buying turns the plan on right away without a real Stripe charge.'}
        </p>
      ) : null}

      {available && !eligible ? (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
          {zh
            ? '只有已認領且已上線的商家可以購買方案。'
            : 'Only claimed listings that are live can buy a plan.'}
        </p>
      ) : null}

      {status ? (
        <p
          role="status"
          className={`mt-4 rounded-xl border px-3 py-2 text-sm leading-6 ${
            status.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {status.message}
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {listingPlanIds.map((planId) => {
          const state = states.find((item) => item.planId === planId) ?? {
            planId,
            foundingPrice: false,
            soldOut: false,
          };
          const offers = getListingPlanOffers(planId);
          const canBuy = available && eligible && !state.soldOut;

          return (
            <section key={planId} className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="text-base font-semibold text-slate-900">
                  {zh ? listingPlanNames[planId].zh : listingPlanNames[planId].en}
                </h4>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    state.activeUntil
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {state.activeUntil
                    ? zh
                      ? `有效至 ${formatDate(state.activeUntil, locale)}`
                      : `Active until ${formatDate(state.activeUntil, locale)}`
                    : zh
                      ? '未啟用'
                      : 'Not active'}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {zh ? planDescriptions[planId].zh : planDescriptions[planId].en}
              </p>
              {state.foundingPrice ? (
                <p className="mt-2 text-xs font-semibold text-[#8a5a1f]">
                  {zh ? '創始商家價格（前 10 家，續約沿用）' : 'Founding price (first 10 businesses, kept on renewal)'}
                </p>
              ) : null}
              {state.soldOut ? (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                  {zh
                    ? '此分類的 3 個贊助版位目前都已售出。'
                    : 'All 3 sponsored spots in this category are taken right now.'}
                </p>
              ) : null}

              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                {offers.map((offer) => {
                  const key = `${planId}:${offer.interval}`;
                  const price = listingPlanPriceCents(offer, state.foundingPrice);
                  const term = listingPlanTermLabel(offer.interval, locale);
                  const verb = state.activeUntil ? (zh ? '續購' : 'Renew') : zh ? '購買' : 'Buy';

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!canBuy || busy !== null}
                      onClick={() => buy(planId, offer.interval)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {busy === key
                        ? zh
                          ? '前往結帳…'
                          : 'Opening checkout…'
                        : `${verb} ${term} · ${formatListingPlanUsd(price)}`}
                      {state.foundingPrice && busy !== key ? (
                        <span className="text-xs font-medium text-white/70 line-through">
                          {formatListingPlanUsd(offer.priceCents)}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
