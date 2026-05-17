import type { Metadata } from 'next';

import { buildMetadata } from '@/lib/seo';
import { t } from '@/lib/i18n';
import { appendSearch } from '@/lib/routing';
import type { Locale, ShopBrowseSearchParams, ShopListing, ShopSeller } from '@/lib/types';

function parsePageNumber(value?: string): number {
  if (!value) {
    return 1;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 1 ? Math.floor(parsed) : 1;
}

export function shopMetadata(locale: Locale, searchParams?: ShopBrowseSearchParams): Metadata {
  const currentPage = parsePageNumber(searchParams?.page);
  const hasFilters = Boolean(
    searchParams?.q?.trim() ||
      searchParams?.category ||
      searchParams?.condition ||
      searchParams?.offer ||
      searchParams?.pickup ||
      searchParams?.priceMin ||
      searchParams?.priceMax ||
      searchParams?.seller ||
      (searchParams?.sort && searchParams.sort !== 'best_match')
  );
  const baseTitle = locale === 'zh' ? '在地市集 | ChineseArizona' : 'Shop | ChineseArizona';
  const title =
    currentPage > 1 && !hasFilters
      ? locale === 'zh'
        ? `在地市集第 ${currentPage} 頁 | ChineseArizona`
        : `Shop Page ${currentPage} | ChineseArizona`
      : baseTitle;
  const path =
    currentPage > 1 && !hasFilters ? appendSearch('/shop', `page=${currentPage}`) : '/shop';

  return buildMetadata({
    title,
    description:
      locale === 'zh'
        ? '固定價格、議價、追蹤、收藏賣家與買家保護流程整合在同一個雙語在地市集。'
        : 'A bilingual marketplace for fixed-price listings, offers, watchlists, seller storefronts, and buyer-protection workflows.',
    path,
    locale,
  });
}

export function buildShopItemMetadata(locale: Locale, listing: ShopListing): Metadata {
  return buildMetadata({
    title: `${t(listing.title, locale)} | ${locale === 'zh' ? 'ChineseArizona 市集' : 'ChineseArizona Shop'}`,
    description: t(listing.excerpt, locale),
    path: `/shop/item/${listing.slug}`,
    locale,
    image: listing.images[0]?.url,
  });
}

export function buildShopSellerMetadata(locale: Locale, seller: ShopSeller): Metadata {
  return buildMetadata({
    title: `${t(seller.displayName, locale)} | ${locale === 'zh' ? 'ChineseArizona 市集' : 'ChineseArizona Shop'}`,
    description: t(seller.headline, locale),
    path: `/shop/seller/${seller.slug}`,
    locale,
  });
}

function privateMetadata(
  locale: Locale,
  path: string,
  titles: { en: string; zh: string },
  descriptions: { en: string; zh: string }
) {
  return buildMetadata({
    title: locale === 'zh' ? titles.zh : titles.en,
    description: locale === 'zh' ? descriptions.zh : descriptions.en,
    path,
    locale,
    noIndex: true,
  });
}

export function shopWatchlistMetadata(locale: Locale) {
  return privateMetadata(
    locale,
    '/shop/watchlist',
    { en: 'Watchlist | ChineseArizona Shop', zh: '追蹤清單 | ChineseArizona 市集' },
    {
      en: 'Saved items, accepted offers, and quick actions for Shop.',
      zh: '查看追蹤商品、已接受的議價與快速操作。',
    }
  );
}

export function shopSavedSearchesMetadata(locale: Locale) {
  return privateMetadata(
    locale,
    '/shop/saved-searches',
    { en: 'Saved Searches | ChineseArizona Shop', zh: '已存搜尋 | ChineseArizona 市集' },
    {
      en: 'Saved search filters and followed sellers for Shop.',
      zh: '管理 Shop 的已存搜尋與收藏賣家。',
    }
  );
}

export function shopCartMetadata(locale: Locale) {
  return privateMetadata(
    locale,
    '/shop/cart',
    { en: 'Cart | ChineseArizona Shop', zh: '購物車 | ChineseArizona 市集' },
    {
      en: 'Cart review and seller-split marketplace checkout.',
      zh: '檢查購物車並進入拆單結帳流程。',
    }
  );
}

export function shopCheckoutMetadata(locale: Locale) {
  return privateMetadata(
    locale,
    '/shop/checkout',
    { en: 'Checkout | ChineseArizona Shop', zh: '結帳 | ChineseArizona 市集' },
    {
      en: 'Secure marketplace checkout with order splitting and pickup support.',
      zh: '支援拆單與面交的 Shop 結帳流程。',
    }
  );
}

export function shopOrdersMetadata(locale: Locale) {
  return privateMetadata(
    locale,
    '/shop/orders',
    { en: 'Orders | ChineseArizona Shop', zh: '訂單 | ChineseArizona 市集' },
    {
      en: 'Order history, returns, and buyer-protection cases.',
      zh: '查看訂單紀錄、退貨與買家保護案件。',
    }
  );
}

export function shopOrderMetadata(locale: Locale, orderId: string) {
  return privateMetadata(
    locale,
    `/shop/orders/${orderId}`,
    { en: 'Order Detail | ChineseArizona Shop', zh: '訂單詳情 | ChineseArizona 市集' },
    {
      en: 'Order tracking, return requests, messages, and feedback.',
      zh: '訂單追蹤、退貨申請、訊息與評價。',
    }
  );
}

export function shopSellMetadata(locale: Locale) {
  return privateMetadata(
    locale,
    '/shop/sell',
    { en: 'Sell on Shop | ChineseArizona', zh: '在市集賣東西 | ChineseArizona' },
    {
      en: 'Seller onboarding, Stripe Connect setup, and listing submission.',
      zh: '賣家註冊、Stripe Connect 設定與商品送審。',
    }
  );
}

export function shopDashboardSectionMetadata(
  locale: Locale,
  section: 'listings' | 'orders' | 'offers' | 'payouts'
) {
  const titles = {
    listings: { en: 'Shop Listings Dashboard | ChineseArizona', zh: '市集商品管理 | ChineseArizona' },
    orders: { en: 'Shop Orders Dashboard | ChineseArizona', zh: '市集訂單管理 | ChineseArizona' },
    offers: { en: 'Shop Offers Dashboard | ChineseArizona', zh: '市集議價管理 | ChineseArizona' },
    payouts: { en: 'Shop Payouts Dashboard | ChineseArizona', zh: '市集收款管理 | ChineseArizona' },
  } as const;

  const descriptions = {
    listings: {
      en: 'Manage listing states, drafts, and pending review inventory.',
      zh: '管理商品狀態、草稿與待審核庫存。',
    },
    orders: {
      en: 'Manage seller orders, shipping, pickup, returns, and conversations.',
      zh: '管理賣家訂單、出貨、面交、退貨與對話。',
    },
    offers: {
      en: 'Review and respond to incoming buyer offers.',
      zh: '查看並回覆買家的出價。',
    },
    payouts: {
      en: 'Review seller payout timing and Stripe Connect status.',
      zh: '查看收款時程與 Stripe Connect 狀態。',
    },
  } as const;

  return privateMetadata(
    locale,
    `/dashboard/shop/${section}`,
    titles[section],
    descriptions[section]
  );
}

export function shopAdminMetadata(locale: Locale) {
  return privateMetadata(
    locale,
    '/admin/shop',
    { en: 'Shop Admin | ChineseArizona', zh: '市集管理中心 | ChineseArizona' },
    {
      en: 'Seller approvals, flagged messages, open cases, and marketplace audit history.',
      zh: '賣家審核、被標記訊息、開啟中的案件與 Marketplace 稽核紀錄。',
    }
  );
}
