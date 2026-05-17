import { getProfileBySlug } from '@/lib/content';
import { t } from '@/lib/i18n';
import {
  expireStaleShopOffers,
  getShopAuditEntriesState,
  getShopCartsState,
  getShopCasesState,
  getShopCategoriesState,
  getShopConversationsState,
  getShopFeedbackState,
  getShopListingsState,
  getShopMessagesState,
  getShopOffersState,
  getShopOrdersState,
  getShopPayoutsState,
  getShopReturnsState,
  getShopSavedSearchesState,
  getShopSavedSellersState,
  getShopSellersState,
  getShopWatchlistItemsState,
} from '@/lib/shop-runtime-store';
import type {
  Locale,
  ShopBrowseSearchParams,
  ShopBrowseSort,
  ShopCase,
  ShopCondition,
  ShopFeedbackSentiment,
  ShopListing,
  ShopOffer,
  ShopOrder,
  ShopSeller,
  ShopShippingMethod,
} from '@/lib/types';

export const defaultShopBuyerProfileSlug = 'newcomer-derek';
export const defaultShopSellerProfileSlug = 'grace-lin';
export const defaultShopDashboardSellerSlug = 'east-valley-tech';
export const SHOP_PAGE_SIZE = 12;

type ParsedShopFilters = {
  q?: string;
  category?: string;
  condition?: ShopCondition;
  offerOnly: boolean;
  pickupOnly: boolean;
  priceMin?: number;
  priceMax?: number;
  seller?: string;
  sort: ShopBrowseSort;
  page: number;
};

export type ShopBrowsePageData = {
  listings: ShopListing[];
  categories: ReturnType<typeof getShopCategories>;
  sellers: ShopSeller[];
  filters: ParsedShopFilters;
  currentPage: number;
  totalPages: number;
  totalCount: number;
};

export function formatShopMoney(amountCents: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'zh' ? 'zh-Hant-US' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

export function shopConditionLabel(condition: ShopCondition, locale: Locale): string {
  const labels: Record<ShopCondition, { en: string; zh: string }> = {
    new: { en: 'New', zh: '全新' },
    open_box: { en: 'Open box', zh: '拆封未用' },
    excellent: { en: 'Excellent', zh: '近新' },
    good: { en: 'Good', zh: '良好' },
    fair: { en: 'Fair', zh: '普通' },
    for_parts: { en: 'For parts', zh: '零件機' },
  };

  return locale === 'zh' ? labels[condition].zh : labels[condition].en;
}

export function shopShippingLabel(method: ShopShippingMethod, locale: Locale): string {
  const labels: Record<ShopShippingMethod, { en: string; zh: string }> = {
    standard: { en: 'Standard shipping', zh: '標準寄送' },
    expedited: { en: 'Expedited shipping', zh: '快速寄送' },
    local_pickup: { en: 'Local pickup', zh: '面交取貨' },
  };

  return locale === 'zh' ? labels[method].zh : labels[method].en;
}

export function shopOfferStatusLabel(status: ShopOffer['status'], locale: Locale): string {
  const labels: Record<ShopOffer['status'], { en: string; zh: string }> = {
    pending: { en: 'Pending', zh: '待回覆' },
    accepted: { en: 'Accepted', zh: '已接受' },
    declined: { en: 'Declined', zh: '已拒絕' },
    countered: { en: 'Countered', zh: '已還價' },
    expired: { en: 'Expired', zh: '已過期' },
    withdrawn: { en: 'Withdrawn', zh: '已撤回' },
  };

  return locale === 'zh' ? labels[status].zh : labels[status].en;
}

export function shopOrderStatusLabel(status: ShopOrder['status'], locale: Locale): string {
  const labels: Record<ShopOrder['status'], { en: string; zh: string }> = {
    pending_payment: { en: 'Pending payment', zh: '待付款' },
    paid: { en: 'Paid', zh: '已付款' },
    processing: { en: 'Processing', zh: '處理中' },
    shipped: { en: 'Shipped', zh: '已寄出' },
    delivered: { en: 'Delivered', zh: '已送達' },
    completed: { en: 'Completed', zh: '已完成' },
    cancelled: { en: 'Cancelled', zh: '已取消' },
    refunded: { en: 'Refunded', zh: '已退款' },
    partially_refunded: { en: 'Partially refunded', zh: '部分退款' },
  };

  return locale === 'zh' ? labels[status].zh : labels[status].en;
}

export function shopListingStatusLabel(status: ShopListing['status'], locale: Locale): string {
  const labels: Record<ShopListing['status'], { en: string; zh: string }> = {
    draft: { en: 'Draft', zh: '草稿' },
    pending_review: { en: 'Pending review', zh: '待審核' },
    active: { en: 'Active', zh: '上架中' },
    paused: { en: 'Paused', zh: '已暫停' },
    sold_out: { en: 'Sold out', zh: '已售完' },
    ended: { en: 'Ended', zh: '已結束' },
    removed: { en: 'Removed', zh: '已移除' },
  };

  return locale === 'zh' ? labels[status].zh : labels[status].en;
}

export function shopCaseStatusLabel(status: ShopCase['status'], locale: Locale): string {
  const labels: Record<ShopCase['status'], { en: string; zh: string }> = {
    open: { en: 'Open', zh: '開啟中' },
    seller_action_required: { en: 'Seller action required', zh: '等待賣家處理' },
    buyer_action_required: { en: 'Buyer action required', zh: '等待買家處理' },
    escalated: { en: 'Escalated', zh: '已升級' },
    resolved: { en: 'Resolved', zh: '已解決' },
    closed: { en: 'Closed', zh: '已關閉' },
  };

  return locale === 'zh' ? labels[status].zh : labels[status].en;
}

export function shopFeedbackSentimentLabel(sentiment: ShopFeedbackSentiment, locale: Locale): string {
  const labels: Record<ShopFeedbackSentiment, { en: string; zh: string }> = {
    positive: { en: 'Positive', zh: '正面' },
    neutral: { en: 'Neutral', zh: '中立' },
    negative: { en: 'Negative', zh: '負面' },
  };

  return locale === 'zh' ? labels[sentiment].zh : labels[sentiment].en;
}

export function shopSortLabel(sort: ShopBrowseSort, locale: Locale): string {
  const labels: Record<ShopBrowseSort, { en: string; zh: string }> = {
    best_match: { en: 'Best match', zh: '最佳匹配' },
    newest: { en: 'Newest', zh: '最新' },
    price_low: { en: 'Price: low to high', zh: '價格：低到高' },
    price_high: { en: 'Price: high to low', zh: '價格：高到低' },
  };

  return locale === 'zh' ? labels[sort].zh : labels[sort].en;
}

function parseNumber(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/[^\d.]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseShopFilters(searchParams?: ShopBrowseSearchParams): ParsedShopFilters {
  const pageNumber = Number(searchParams?.page);
  const page =
    Number.isFinite(pageNumber) && pageNumber >= 1 ? Math.floor(pageNumber) : 1;
  const validSorts: ShopBrowseSort[] = ['best_match', 'newest', 'price_low', 'price_high'];
  const sort = validSorts.includes(searchParams?.sort as ShopBrowseSort)
    ? (searchParams?.sort as ShopBrowseSort)
    : 'best_match';

  return {
    q: searchParams?.q?.trim() || undefined,
    category: searchParams?.category || undefined,
    condition: searchParams?.condition || undefined,
    offerOnly: searchParams?.offer === '1' || searchParams?.offer === 'true',
    pickupOnly: searchParams?.pickup === '1' || searchParams?.pickup === 'true',
    priceMin: parseNumber(searchParams?.priceMin),
    priceMax: parseNumber(searchParams?.priceMax),
    seller: searchParams?.seller || undefined,
    sort,
    page,
  };
}

function baseListings() {
  expireStaleShopOffers();
  return getShopListingsState();
}

function baseSellers() {
  return getShopSellersState();
}

export function listingSearchText(listing: ShopListing, seller: ShopSeller, locale: Locale): string {
  return [
    t(listing.title, locale),
    t(listing.excerpt, locale),
    ...listing.description.map((paragraph) => t(paragraph, locale)),
    ...Object.entries(listing.itemSpecifics).flatMap(([key, value]) => [key, value]),
    ...listing.tags,
    t(seller.displayName, locale),
    seller.city,
  ]
    .join(' ')
    .toLowerCase();
}

export function sortListings(listings: ShopListing[], sort: ShopBrowseSort): ShopListing[] {
  if (sort === 'newest') {
    return listings.sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  }

  if (sort === 'price_low') {
    return listings.sort((left, right) => left.priceCents - right.priceCents);
  }

  if (sort === 'price_high') {
    return listings.sort((left, right) => right.priceCents - left.priceCents);
  }

  return listings.sort((left, right) => {
    const featuredDelta = Number(right.featured) - Number(left.featured);
    if (featuredDelta !== 0) {
      return featuredDelta;
    }

    const watchDelta = right.watcherCount - left.watcherCount;
    if (watchDelta !== 0) {
      return watchDelta;
    }

    return right.viewCount - left.viewCount;
  });
}

export function getShopCategories() {
  return getShopCategoriesState();
}

export function getShopSellers() {
  return baseSellers();
}

export function getShopListings() {
  return baseListings();
}

export function getShopListingBySlug(slug: string) {
  return baseListings().find((listing) => listing.slug === slug);
}

export function getShopSellerBySlug(slug: string) {
  return baseSellers().find((seller) => seller.slug === slug);
}

export function getShopSellerListings(sellerSlug: string, includePrivate = false) {
  return baseListings()
    .filter((listing) =>
      listing.sellerSlug === sellerSlug &&
      (includePrivate || listing.status === 'active' || listing.status === 'sold_out')
    )
    .slice()
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export function getShopBrowsePage(locale: Locale, searchParams?: ShopBrowseSearchParams) {
  return buildShopBrowsePageFromData({
    locale,
    searchParams,
    listings: baseListings(),
    categories: getShopCategories(),
    sellers: getShopSellers(),
  });
}

export function buildShopBrowsePageFromData({
  locale,
  searchParams,
  listings,
  categories,
  sellers,
}: {
  locale: Locale;
  searchParams?: ShopBrowseSearchParams;
  listings: ShopListing[];
  categories: ReturnType<typeof getShopCategories>;
  sellers: ShopSeller[];
}): ShopBrowsePageData {
  const filters = parseShopFilters(searchParams);
  const sellerBySlug = new Map(sellers.map((seller) => [seller.slug, seller]));
  const filtered = listings.filter((listing) => {
    if (!(listing.status === 'active' || listing.status === 'sold_out')) {
      return false;
    }

    const seller = sellerBySlug.get(listing.sellerSlug);
    if (!seller) {
      return false;
    }

    if (filters.category && listing.categorySlug !== filters.category) {
      return false;
    }

    if (filters.condition && listing.condition !== filters.condition) {
      return false;
    }

    if (filters.offerOnly && !listing.allowOffers) {
      return false;
    }

    if (filters.pickupOnly && !listing.allowLocalPickup) {
      return false;
    }

    if (filters.seller && listing.sellerSlug !== filters.seller) {
      return false;
    }

    if (typeof filters.priceMin === 'number' && listing.priceCents / 100 < filters.priceMin) {
      return false;
    }

    if (typeof filters.priceMax === 'number' && listing.priceCents / 100 > filters.priceMax) {
      return false;
    }

    if (filters.q) {
      const haystack = listingSearchText(listing, seller, locale);
      if (!haystack.includes(filters.q.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  const sorted = sortListings([...filtered], filters.sort);
  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / SHOP_PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const startIndex = (currentPage - 1) * SHOP_PAGE_SIZE;

  return {
    listings: sorted.slice(startIndex, startIndex + SHOP_PAGE_SIZE),
    categories,
    sellers,
    filters,
    currentPage,
    totalPages,
    totalCount,
  };
}

export function getShopListingPrimaryImage(listing: ShopListing) {
  return listing.images.find((image) => image.isPrimary) ?? listing.images[0];
}

export function getShopListingByWatchlist(profileSlug: string) {
  const watchlistBySlug = new Set(
    getShopWatchlistItemsState()
      .filter((item) => item.profileSlug === profileSlug)
      .map((item) => item.listingSlug)
  );

  return baseListings().filter((listing) => watchlistBySlug.has(listing.slug));
}

export function getShopSavedSearches(profileSlug: string) {
  return getShopSavedSearchesState()
    .filter((item) => item.profileSlug === profileSlug)
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function getShopSavedSellers(profileSlug: string) {
  return getShopSavedSellersState()
    .filter((item) => item.profileSlug === profileSlug)
    .map((item) => getShopSellerBySlug(item.sellerSlug))
    .filter((seller): seller is ShopSeller => Boolean(seller));
}

export function getShopCart(profileSlug: string) {
  return getShopCartsState().find((cart) => cart.profileSlug === profileSlug) ?? {
    profileSlug,
    items: [],
    updatedAt: new Date(0).toISOString(),
  };
}

export function getShopCartDetailedItems(profileSlug: string) {
  return getShopCart(profileSlug).items
    .map((item) => {
      const listing = getShopListingBySlug(item.listingSlug);
      if (!listing) {
        return null;
      }

      const variant = item.variantId
        ? listing.variants.find((candidate) => candidate.id === item.variantId)
        : undefined;

      return {
        item,
        listing,
        variant,
        seller: getShopSellerBySlug(listing.sellerSlug),
        unitPriceCents: variant?.priceCents ?? listing.priceCents,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
}

export function getShopOffersForBuyer(profileSlug: string) {
  expireStaleShopOffers();
  return getShopOffersState()
    .filter((offer) => offer.buyerProfileSlug === profileSlug)
    .slice()
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export function getShopOffersForSeller(sellerSlug: string) {
  expireStaleShopOffers();
  return getShopOffersState()
    .filter((offer) => offer.sellerSlug === sellerSlug)
    .slice()
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export function getAcceptedShopOffersForBuyer(profileSlug: string) {
  return getShopOffersForBuyer(profileSlug).filter((offer) => offer.status === 'accepted');
}

export function getShopOrdersForBuyer(profileSlug: string) {
  return getShopOrdersState()
    .filter((order) => order.buyerProfileSlug === profileSlug)
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function getShopOrdersForSeller(sellerSlug: string) {
  return getShopOrdersState()
    .filter((order) => order.sellerSlug === sellerSlug)
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function getShopOrderById(orderId: string) {
  return getShopOrdersState().find((order) => order.id === orderId);
}

export function getShopReturnByOrderId(orderId: string) {
  return getShopReturnsState().find((item) => item.orderId === orderId);
}

export function getShopCaseByOrderId(orderId: string) {
  return getShopCasesState().find((item) => item.orderId === orderId);
}

export function getShopConversationMessages(conversationId: string) {
  return getShopMessagesState()
    .filter((message) => message.conversationId === conversationId)
    .slice()
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
}

export function getShopConversationsForSeller(sellerSlug: string) {
  return getShopConversationsState()
    .filter((conversation) => conversation.sellerSlug === sellerSlug)
    .slice()
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export function getShopFeedbackForSeller(sellerSlug: string) {
  return getShopFeedbackState()
    .filter((item) => item.sellerSlug === sellerSlug)
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function getShopSellerTrustSummary(sellerSlug: string) {
  const seller = getShopSellerBySlug(sellerSlug);
  if (!seller) {
    return null;
  }

  const addedFeedback = getShopFeedbackForSeller(sellerSlug);
  const baseFeedbackCount = seller.feedbackCount;
  const totalCount = baseFeedbackCount + addedFeedback.length;
  const basePositiveCount = Math.round((seller.positiveFeedbackRate / 100) * baseFeedbackCount);
  const addedPositiveCount = addedFeedback.filter((item) => item.sentiment === 'positive').length;
  const positiveFeedbackRate =
    totalCount === 0 ? 0 : Math.round(((basePositiveCount + addedPositiveCount) / totalCount) * 1000) / 10;

  return {
    totalCount,
    positiveFeedbackRate,
    memberSince: seller.memberSince,
    responseRate: seller.responseRate,
    handlingTimeDays: seller.handlingTimeDays,
    acceptsReturns: seller.acceptsReturns,
    returnWindowDays: seller.returnWindowDays,
    topRated: seller.topRated,
  };
}

export function getPrimaryShopSellerForProfile(profileSlug = defaultShopSellerProfileSlug) {
  return getShopSellers().find((seller) => seller.profileSlug === profileSlug);
}

export function getShopSellerDashboardSnapshot(sellerSlug = defaultShopDashboardSellerSlug) {
  const seller = getShopSellerBySlug(sellerSlug);
  const listings = getShopSellerListings(sellerSlug, true);
  const orders = getShopOrdersForSeller(sellerSlug);
  const offers = getShopOffersForSeller(sellerSlug);
  const payouts = getShopPayoutsState().filter((payout) => payout.sellerSlug === sellerSlug);
  const conversations = getShopConversationsForSeller(sellerSlug);
  const flaggedMessages = getShopMessagesState().filter((message) =>
    conversations.some((conversation) => conversation.id === message.conversationId) && message.flagged
  );

  return {
    seller,
    listings,
    orders,
    offers,
    payouts,
    conversations,
    flaggedMessages,
    stats: {
      activeListings: listings.filter((listing) => listing.status === 'active').length,
      pendingListings: listings.filter((listing) => listing.status === 'pending_review').length,
      grossSalesCents: orders.reduce((sum, order) => sum + order.totalCents, 0),
      openOffers: offers.filter((offer) => offer.status === 'pending' || offer.status === 'countered').length,
      conversionRate:
        listings.length === 0
          ? 0
          : Math.round(
              (orders.length /
                Math.max(
                  1,
                  listings.reduce((sum, listing) => sum + Math.max(1, listing.viewCount), 0) / 100
                )) *
                10
            ) / 10,
      totalWatchers: listings.reduce((sum, listing) => sum + listing.watcherCount, 0),
    },
  };
}

export function getShopAdminSnapshot() {
  const sellers = getShopSellers();
  const listings = getShopListings();
  const conversations = getShopConversationsState();
  const messages = getShopMessagesState();
  const flaggedMessages = messages.filter((message) => message.flagged);

  return {
    pendingSellers: sellers.filter(
      (seller) => !seller.approved || seller.stripeAccountStatus !== 'active'
    ),
    pendingListings: listings.filter((listing) => listing.status === 'pending_review'),
    flaggedMessages: flaggedMessages.map((message) => ({
      message,
      conversation: conversations.find((conversation) => conversation.id === message.conversationId),
    })),
    openCases: getShopCasesState().filter((item) => item.status !== 'resolved' && item.status !== 'closed'),
    openReturns: getShopReturnsState().filter((item) => item.status === 'requested'),
    auditEntries: getShopAuditEntriesState().slice(0, 20),
  };
}

export function getShopAuditEntries() {
  return getShopAuditEntriesState();
}

export function getShopWatchlistItems(profileSlug: string) {
  return getShopWatchlistItemsState().filter((item) => item.profileSlug === profileSlug);
}

export function getShopSavedSellerItems(profileSlug: string) {
  return getShopSavedSellersState().filter((item) => item.profileSlug === profileSlug);
}

export function getShopBuyerProfile(profileSlug = defaultShopBuyerProfileSlug) {
  return getProfileBySlug(profileSlug);
}

export function getShopSellerProfile(sellerSlug: string) {
  const seller = getShopSellerBySlug(sellerSlug);
  return seller ? getProfileBySlug(seller.profileSlug) : undefined;
}

export function getShopLinkedReports() {
  return [] as Array<never>;
}
