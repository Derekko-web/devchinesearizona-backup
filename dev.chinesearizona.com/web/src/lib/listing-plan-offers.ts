// Yearly and monthly listing plans sold with Stripe Checkout (issue #408).
// This module has no server dependencies so the dashboard panel can use it.
//
// Plans are prepaid terms: one payment buys one month or one year, and the plan
// turns itself off when the term ends. Buying again while a plan is running adds
// the new term after the current one. Nothing renews automatically, so there is
// nothing to cancel, which matches the published refund terms.

import type { Locale } from '@/lib/types';

export const listingPlanIds = ['enhanced-listing', 'sponsored-category'] as const;
export type ListingPlanId = (typeof listingPlanIds)[number];

export const listingPlanIntervals = ['month', 'year'] as const;
export type ListingPlanInterval = (typeof listingPlanIntervals)[number];

// Founding prices go to the first 10 businesses on each plan, and a founding
// business keeps its founding price when it renews.
export const LISTING_PLAN_FOUNDING_LIMIT = 10;

// A category page has three labeled sponsored spots, so no more than three
// businesses can hold the sponsored category plan in one category at a time.
export const SPONSORED_CATEGORY_PLAN_LIMIT = 3;

export type ListingPlanOffer = {
  planId: ListingPlanId;
  interval: ListingPlanInterval;
  priceCents: number;
  foundingPriceCents: number;
};

// Launch prices approved by Derek on Nov 25, 2026. They must match
// getAdvertisePlans() in advertise.ts (a test checks this).
export const listingPlanOffers: readonly ListingPlanOffer[] = [
  { planId: 'enhanced-listing', interval: 'year', priceCents: 19_900, foundingPriceCents: 9_900 },
  { planId: 'sponsored-category', interval: 'month', priceCents: 5_900, foundingPriceCents: 2_950 },
  { planId: 'sponsored-category', interval: 'year', priceCents: 59_000, foundingPriceCents: 29_500 },
];

export const listingPlanNames: Record<ListingPlanId, { en: string; zh: string }> = {
  'enhanced-listing': { en: 'Enhanced listing', zh: '進階商家頁' },
  'sponsored-category': { en: 'Sponsored category spot', zh: '分類贊助版位' },
};

export function isListingPlanId(value: unknown): value is ListingPlanId {
  return typeof value === 'string' && listingPlanIds.includes(value as ListingPlanId);
}

export function isListingPlanInterval(value: unknown): value is ListingPlanInterval {
  return typeof value === 'string' && listingPlanIntervals.includes(value as ListingPlanInterval);
}

export function findListingPlanOffer(
  planId: ListingPlanId,
  interval: ListingPlanInterval
): ListingPlanOffer | undefined {
  return listingPlanOffers.find((offer) => offer.planId === planId && offer.interval === interval);
}

export function getListingPlanOffers(planId: ListingPlanId): ListingPlanOffer[] {
  return listingPlanOffers.filter((offer) => offer.planId === planId);
}

export function listingPlanPriceCents(offer: ListingPlanOffer, founding: boolean): number {
  return founding ? offer.foundingPriceCents : offer.priceCents;
}

// Adds one calendar month or year in UTC. A start on the 31st that lands in a
// shorter month ends on that month's last day instead of rolling into the next.
export function addListingPlanTerm(start: Date, interval: ListingPlanInterval): Date {
  const year = start.getUTCFullYear() + (interval === 'year' ? 1 : 0);
  const month = start.getUTCMonth() + (interval === 'month' ? 1 : 0);
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const end = new Date(start.getTime());
  end.setUTCFullYear(year, month, Math.min(start.getUTCDate(), lastDay));
  return end;
}

export function qualifiesForFoundingPrice(input: {
  businessAlreadyFounding: boolean;
  foundingBusinessCount: number;
}): boolean {
  return input.businessAlreadyFounding || input.foundingBusinessCount < LISTING_PLAN_FOUNDING_LIMIT;
}

export function formatListingPlanUsd(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function listingPlanTermLabel(interval: ListingPlanInterval, locale: Locale): string {
  if (locale === 'zh') {
    return interval === 'year' ? '1 年' : '1 個月';
  }

  return interval === 'year' ? '1 year' : '1 month';
}

// What happened to a checkout reported by the webhook or by the owner's
// return from Stripe: the plan was saved now, was already saved, waits for a
// delayed payment, or the session was not a usable plan purchase (#449).
export type ListingPlanCheckoutOutcome = 'saved' | 'duplicate' | 'pending' | 'ignored';

// The note an owner sees on the dashboard after Stripe Checkout sends them
// back. `outcome` is unknown when the return could not be checked.
export function listingPlanReturnMessage(
  returned: 'success' | 'cancelled',
  outcome: ListingPlanCheckoutOutcome | undefined,
  locale: Locale
): { message: string; tone: 'error' | 'success' } {
  const zh = locale === 'zh';
  if (returned === 'cancelled') {
    return {
      tone: 'error',
      message: zh ? '已取消結帳，沒有收取任何費用。' : 'Checkout was cancelled. You were not charged.',
    };
  }

  if (outcome === 'saved' || outcome === 'duplicate') {
    return {
      tone: 'success',
      message: zh ? '已收到付款，謝謝！你的方案已經啟用。' : 'Payment received, thank you! Your plan is now on.',
    };
  }

  if (outcome === 'pending') {
    return {
      tone: 'success',
      message: zh
        ? '謝謝！你的銀行付款仍在處理中，款項確認後方案會自動啟用。'
        : 'Thank you! Your bank payment is still processing. The plan turns on by itself once the payment clears.',
    };
  }

  return {
    tone: 'success',
    message: zh
      ? '已收到付款，謝謝！方案會在一分鐘內啟用，重新整理頁面即可看到。'
      : 'Payment received, thank you! Your plan turns on within a minute. Refresh this page to see it.',
  };
}

// What the owner dashboard needs to show one plan for one listing.
export type ListingPlanOwnerState = {
  planId: ListingPlanId;
  // End of the last paid term, when one is running or queued.
  activeUntil?: string;
  // Whether a new purchase gets the founding price.
  foundingPrice: boolean;
  // Sponsored category only: all spots in this listing's category are taken.
  soldOut: boolean;
};
