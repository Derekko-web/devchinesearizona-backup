'use client';

import { useState } from 'react';

import type {
  DirectoryAdsRuntimeMode,
  DirectoryAdsUnavailableReason,
} from '@/lib/directory-ads';
import { t } from '@/lib/i18n';
import type { Business, DirectoryAdCampaign, Locale } from '@/lib/types';

type DirectoryAdCampaignPanelProps = {
  adsAvailable: boolean;
  adsMode: DirectoryAdsRuntimeMode;
  business: Pick<Business, 'legacySponsored' | 'name' | 'slug' | 'status' | 'verificationState'>;
  initialCampaign?: DirectoryAdCampaign;
  locale: Locale;
  readOnlyReason?: DirectoryAdsUnavailableReason;
};

type StatusState = {
  message: string;
  tone: 'error' | 'info' | 'success';
};

function currency(valueCents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(valueCents / 100);
}

function compactPercent(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

function statusClasses(tone: StatusState['tone']) {
  if (tone === 'error') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border-sky-200 bg-sky-50 text-sky-700';
}

function campaignStatusLabel(status: DirectoryAdCampaign['status'], locale: Locale) {
  const labels: Record<DirectoryAdCampaign['status'], { en: string; zh: string }> = {
    pending_payment: { en: 'Pending payment', zh: '待付款' },
    active: { en: 'Active', zh: '進行中' },
    paused: { en: 'Paused', zh: '已暫停' },
    cancelled: { en: 'Cancelled', zh: '已取消' },
    exhausted: { en: 'Budget exhausted', zh: '預算用盡' },
    expired: { en: 'Expired', zh: '已到期' },
  };

  return locale === 'zh' ? labels[status].zh : labels[status].en;
}

function statusTone(status: DirectoryAdCampaign['status']): StatusState['tone'] {
  if (status === 'cancelled' || status === 'expired' || status === 'exhausted') {
    return 'info';
  }

  return status === 'active' ? 'success' : 'info';
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-Hant' : 'en-US', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function listingEligibilityMessage(
  business: Pick<Business, 'status' | 'verificationState'>,
  locale: Locale
) {
  if (business.verificationState === 'unverified') {
    return locale === 'zh'
      ? '這筆商家需要先完成認領或驗證，之後才能啟用自助贊助。'
      : 'This listing must be claimed or verified before self-serve sponsorship can start.';
  }

  if (business.status && business.status !== 'live') {
    return locale === 'zh'
      ? `這筆商家目前狀態是「${business.status}」，需要先切換到 live 才能啟用自助贊助。`
      : `This listing is currently in ${business.status} status and must be moved to live before sponsorship can start.`;
  }

  return locale === 'zh'
    ? '只有已認領且處於 live 狀態的商家才能啟用自助贊助。'
    : 'Only claimed listings in live status can start self-serve sponsorship.';
}

export function DirectoryAdCampaignPanel({
  adsAvailable,
  adsMode,
  business,
  initialCampaign,
  locale,
  readOnlyReason,
}: DirectoryAdCampaignPanelProps) {
  const [campaign, setCampaign] = useState(initialCampaign);
  const [budgetDollars, setBudgetDollars] = useState(
    initialCampaign ? '250' : '100'
  );
  const [busyAction, setBusyAction] = useState<'checkout' | 'pause' | 'resume' | 'cancel' | null>(null);
  const [status, setStatus] = useState<StatusState | null>(null);

  const isEligibleForAds =
    business.status === 'live' && business.verificationState !== 'unverified';
  const sponsorshipReadOnly = !adsAvailable;
  const budgetCents = Math.round(Number(budgetDollars) * 100);

  async function createCheckout() {
    if (sponsorshipReadOnly || !isEligibleForAds) {
      return;
    }

    setBusyAction('checkout');
    setStatus(null);

    try {
      const response = await fetch('/api/directory/ads/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-locale': locale,
        },
        body: JSON.stringify({
          businessSlug: business.slug,
          budgetCents,
        }),
      });
      const data = (await response.json()) as {
        message: string;
        mode?: 'redirect';
        url?: string;
      };

      if (!response.ok) {
        setStatus({
          message: data.message,
          tone: 'error',
        });
        return;
      }

      setStatus({
        message: data.message,
        tone: 'success',
      });
      if (data.mode === 'redirect' && data.url) {
        window.location.assign(data.url);
      }
    } catch {
      setStatus({
        message:
          locale === 'zh'
            ? '目前無法建立結帳頁。'
            : 'Unable to create the checkout page right now.',
        tone: 'error',
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function updateCampaignStatus(action: 'pause' | 'resume' | 'cancel') {
    if (!campaign || sponsorshipReadOnly) {
      return;
    }

    setBusyAction(action);
    setStatus(null);

    try {
      const response = await fetch(`/api/directory/ads/campaigns/${campaign.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-locale': locale,
        },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as {
        campaign?: DirectoryAdCampaign;
        message: string;
      };

      if (!response.ok || !data.campaign) {
        setStatus({
          message: data.message,
          tone: 'error',
        });
        return;
      }

      setCampaign(data.campaign);
      setStatus({
        message: data.message,
        tone: 'success',
      });
    } catch {
      setStatus({
        message:
          locale === 'zh'
            ? '目前無法更新活動狀態。'
            : 'Unable to update the campaign status right now.',
        tone: 'error',
      });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
            {locale === 'zh' ? 'Sponsored placement' : 'Sponsored placement'}
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            {t(business.name, locale)}
          </h3>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            {locale === 'zh'
              ? '在目錄列表頁提升排序，按點擊收費，預算以 30 天為一個週期。贊助不會改變商家的驗證或編輯狀態。'
              : 'Boost ranking on directory browse pages with prepaid click-based billing over a 30-day window. Sponsorship does not change verification or editorial status.'}
          </p>
        </div>
        {campaign ? (
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(statusTone(campaign.status))}`}
          >
            {campaignStatusLabel(campaign.status, locale)}
          </span>
        ) : null}
      </div>

      {business.legacySponsored ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          {locale === 'zh'
            ? '這筆商家目前也有既有的人工精選／贊助標記；新的自助贊助活動會另外追蹤預算、點擊與曝光。'
            : 'This listing also has a legacy manual sponsored/featured flag. New self-serve campaigns are tracked separately for budget, clicks, and impressions.'}
        </p>
      ) : null}

      {!adsAvailable ? (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
          {readOnlyReason === 'schema'
            ? initialCampaign
              ? locale === 'zh'
                ? '新的贊助付款目前已暫停，因為 Supabase 尚未部署目錄贊助資料表；不過你已付款的贊助仍會依照 Stripe 結帳資料持續生效。'
                : 'New sponsorship payments are paused because the Supabase directory sponsorship tables are not deployed yet, but your paid placement is still being honored from Stripe checkout data.'
              : locale === 'zh'
                ? 'Stripe 已經設定完成，但 Supabase 還沒部署目錄贊助所需的資料表。請先套用 directory ads migration，之後才能開始收款。'
                : 'Stripe is configured, but the Supabase directory sponsorship tables are not deployed yet. Apply the directory ads migration before taking payments.'
            : locale === 'zh'
              ? '目前這個環境尚未完成 Stripe、Stripe webhook signing secret 或 Supabase service role 設定，因此贊助投放會保持唯讀。'
              : 'Stripe, the Stripe webhook signing secret, or the Supabase service role is not configured in this environment yet, so sponsorship stays read-only for now.'}
        </p>
      ) : null}

      {adsAvailable && adsMode === 'mock' ? (
        <p className="mt-4 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm leading-6 text-brand-800">
          {locale === 'zh'
            ? '本機測試模式已啟用。開始或加值贊助時會直接啟用活動，不會建立真正的 Stripe 付款。'
            : 'Local test mode is enabled. Starting or topping up sponsorship activates the campaign immediately and does not create a real Stripe charge.'}
        </p>
      ) : null}

      {adsAvailable && !isEligibleForAds ? (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
          {listingEligibilityMessage(business, locale)}
        </p>
      ) : null}

      {campaign ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {locale === 'zh' ? '剩餘預算' : 'Remaining budget'}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {currency(campaign.remainingBudgetCents)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {locale === 'zh' ? '總預算 / CPC' : 'Budget / CPC'}
            </p>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {currency(campaign.budgetCents)} / {currency(campaign.costPerClickCents)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {locale === 'zh' ? '曝光 / 點擊' : 'Impressions / clicks'}
            </p>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {campaign.metrics?.impressions ?? 0} / {campaign.metrics?.clicks ?? 0}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {locale === 'zh' ? 'CTR / 已花費' : 'CTR / spend'}
            </p>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {compactPercent(campaign.metrics?.ctr ?? 0)} / {currency(campaign.metrics?.spendCents ?? 0)}
            </p>
          </div>
        </div>
      ) : null}

      {campaign ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {locale === 'zh'
            ? `活動期間：${formatDate(campaign.startsAt, locale)} 到 ${formatDate(campaign.endsAt, locale)}`
            : `Campaign window: ${formatDate(campaign.startsAt, locale)} to ${formatDate(campaign.endsAt, locale)}`}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <div>
          <label htmlFor={`directory-ad-budget-${business.slug}`} className="mb-2 block text-sm font-semibold text-slate-800">
            {campaign
              ? locale === 'zh'
                ? '加值預算'
                : 'Top-up budget'
              : locale === 'zh'
                ? '預算'
                : 'Budget'}
          </label>
          <input
            id={`directory-ad-budget-${business.slug}`}
            type="number"
            min={100}
            max={2000}
            step={25}
            value={budgetDollars}
            onChange={(event) => setBudgetDollars(event.target.value)}
            disabled={sponsorshipReadOnly}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <p className="mt-2 text-xs text-slate-500">
            {locale === 'zh'
              ? '最低 $100，最高 $2,000，每次以 $25 為級距。'
              : 'Minimum $100, maximum $2,000, in $25 increments.'}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <button
            type="button"
            disabled={sponsorshipReadOnly || !isEligibleForAds || busyAction !== null}
            onClick={createCheckout}
            className="inline-flex items-center justify-center rounded-lg bg-brand-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyAction === 'checkout'
              ? adsMode === 'mock'
                ? locale === 'zh'
                  ? '啟用中...'
                  : 'Activating...'
                : locale === 'zh'
                  ? '建立中...'
                  : 'Creating...'
              : adsMode === 'mock'
                ? campaign
                  ? locale === 'zh'
                    ? '加值測試預算'
                    : 'Add test budget'
                  : locale === 'zh'
                    ? '開始測試贊助'
                    : 'Start test sponsorship'
                : campaign
                  ? locale === 'zh'
                    ? '加值並前往結帳'
                    : 'Top up and checkout'
                  : locale === 'zh'
                    ? '開始 30 天贊助'
                    : 'Start 30-day sponsorship'}
          </button>

          {campaign?.status === 'active' ? (
            <button
              type="button"
              disabled={sponsorshipReadOnly || busyAction !== null}
              onClick={() => updateCampaignStatus('pause')}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === 'pause'
                ? locale === 'zh'
                  ? '暫停中...'
                  : 'Pausing...'
                : locale === 'zh'
                  ? '暫停'
                  : 'Pause'}
            </button>
          ) : null}

          {campaign?.status === 'paused' ? (
            <button
              type="button"
              disabled={sponsorshipReadOnly || busyAction !== null}
              onClick={() => updateCampaignStatus('resume')}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === 'resume'
                ? locale === 'zh'
                  ? '恢復中...'
                  : 'Resuming...'
                : locale === 'zh'
                  ? '恢復'
                  : 'Resume'}
            </button>
          ) : null}

          {campaign && !['cancelled', 'expired'].includes(campaign.status) ? (
            <button
              type="button"
              disabled={sponsorshipReadOnly || busyAction !== null}
              onClick={() => updateCampaignStatus('cancel')}
              className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === 'cancel'
                ? locale === 'zh'
                  ? '取消中...'
                  : 'Cancelling...'
                : locale === 'zh'
                  ? '取消活動'
                  : 'Cancel campaign'}
            </button>
          ) : null}
        </div>
      </div>

      {status ? (
        <p className={`mt-4 rounded-xl border px-3 py-2 text-sm ${statusClasses(status.tone)}`}>
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
