import type { User } from '@supabase/supabase-js';

import { getModerationReportsSnapshot } from '@/lib/directory-moderation';
import { t } from '@/lib/i18n';
import { isShopRuntimeFallbackAllowed } from '@/lib/shop-launch';
import { ensureProfileForAuthUser, getProfileByAuthUserId, type AppProfileRow } from '@/lib/profile-auth';
import {
  buildShopBrowsePageFromData,
  getAcceptedShopOffersForBuyer,
  getPrimaryShopSellerForProfile,
  getShopAdminSnapshot,
  getShopBrowsePage,
  getShopCartDetailedItems,
  getShopCaseByOrderId,
  getShopCategories,
  getShopConversationMessages,
  getShopConversationsForSeller,
  getShopFeedbackForSeller,
  getShopListingBySlug,
  getShopListings,
  getShopListingByWatchlist,
  getShopOrderById,
  getShopOrdersForBuyer,
  getShopReturnByOrderId,
  getShopSavedSearches,
  getShopSavedSellers,
  getShopSellerBySlug,
  getShopSellerDashboardSnapshot,
  getShopSellerListings,
  getShopSellerProfile,
  getShopSellerTrustSummary,
  getShopSellers,
} from '@/lib/shop';
import {
  addShopCartItem,
  checkoutAcceptedShopOffer,
  checkoutShopCart,
  clearShopCart,
  confirmShopOrderPickup,
  createShopListing,
  createShopOffer,
  createShopSavedSearch,
  deleteShopSavedSearch,
  leaveShopFeedback,
  markShopOrderShipped,
  openShopCase,
  removeShopCartItem,
  requestShopReturn,
  resolveShopCase,
  respondToShopOffer,
  sendShopMessage,
  toggleShopSavedSeller,
  toggleShopWatchlist,
  updateShopListingStatus,
} from '@/lib/shop-runtime-store';
import { getSupabaseClient, getSupabaseServiceClient } from '@/lib/supabase';
import type {
  Locale,
  LocalizedText,
  ProfileRole,
  ShopBrowseSearchParams,
  ShopBrowseSort,
  ShopCaseStatus,
  ShopCategory,
  ShopCondition,
  ShopFeedback,
  ShopFeedbackSentiment,
  ShopListing,
  ShopOffer,
  ShopOrder,
  ShopPayout,
  ShopSavedSearch,
  ShopSeller,
  ShopShippingMethod,
} from '@/lib/types';

export type ShopContext = {
  profile: AppProfileRow;
  role: ProfileRole;
  authUserId?: string;
};

type PublicShopBrowseDataCandidate = {
  categories: ShopCategory[] | null;
  sellers: ShopSeller[] | null;
  listings: ShopListing[] | null;
};

type ShopCategoryRow = {
  id: string;
  slug: string;
  name_en: string;
  name_zh_tw?: string | null;
  description_en: string;
  description_zh_tw?: string | null;
  icon: ShopCategory['icon'];
};

type ProfileRow = {
  id: string;
  slug: string;
  name: string;
  name_zh_tw: string;
  role: ProfileRole;
  city: string;
  languages?: string[] | null;
  bio_en: string;
  bio_zh_tw: string;
  auth_user_id?: string | null;
};

type ShopSellerRow = {
  id: string;
  slug: string;
  profile_id: string;
  display_name_en: string;
  display_name_zh_tw?: string | null;
  headline_en: string;
  headline_zh_tw?: string | null;
  description_en: string;
  description_zh_tw?: string | null;
  city: string;
  member_since: string;
  response_rate: number;
  handling_time_days: number;
  positive_feedback_rate: number;
  feedback_count: number;
  return_window_days: number;
  accepts_returns: boolean;
  top_rated: boolean;
  approved: boolean;
  stripe_account_status: ShopSeller['stripeAccountStatus'];
  stripe_account_id?: string | null;
  followers: number;
  sale_count: number;
  languages?: string[] | null;
  profile?: ProfileRow | null;
};

type ShopListingVariantRow = {
  id: string;
  label_en: string;
  label_zh_tw?: string | null;
  sku: string;
  price_cents: number;
  quantity_available: number;
  attributes_json?: Record<string, string> | null;
};

type ShopListingImageRow = {
  id: string;
  url: string;
  alt_en: string;
  alt_zh_tw?: string | null;
  variant_id?: string | null;
  is_primary: boolean;
  sort_order?: number | null;
};

type ShopListingRow = {
  id: string;
  slug: string;
  seller_id: string;
  category_id: string;
  title_en: string;
  title_zh_tw?: string | null;
  excerpt_en: string;
  excerpt_zh_tw?: string | null;
  description_en?: string[] | null;
  description_zh_tw?: string[] | null;
  condition: ShopCondition;
  status: ShopListing['status'];
  price_cents: number;
  currency: 'USD';
  quantity_available: number;
  sold_count: number;
  allow_offers: boolean;
  allow_local_pickup: boolean;
  featured: boolean;
  pickup_city?: string | null;
  shipping_methods?: ShopShippingMethod[] | null;
  return_policy_en: string;
  return_policy_zh_tw?: string | null;
  item_specifics_json?: Record<string, string> | null;
  tags?: string[] | null;
  view_count: number;
  watcher_count: number;
  created_at: string;
  updated_at: string;
  seller?: ShopSellerRow | null;
  category?: ShopCategoryRow | null;
  images?: ShopListingImageRow[] | null;
  variants?: ShopListingVariantRow[] | null;
};

type ShopOfferRow = {
  id: string;
  listing_id: string;
  variant_id?: string | null;
  buyer_profile_id: string;
  seller_id: string;
  amount_cents: number;
  status: ShopOffer['status'];
  message?: string | null;
  counter_amount_cents?: number | null;
  reserved_until?: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
  used_at?: string | null;
  used_order_id?: string | null;
  listing?: ShopListingRow | null;
  seller?: ShopSellerRow | null;
  buyer_profile?: ProfileRow | null;
};

type ShopOrderItemRow = {
  id: string;
  listing_id?: string | null;
  seller_id: string;
  title_en: string;
  title_zh_tw?: string | null;
  unit_price_cents: number;
  quantity: number;
  variant_label_en?: string | null;
  variant_label_zh_tw?: string | null;
  snapshot_condition: ShopCondition;
  listing?: ShopListingRow | null;
  seller?: ShopSellerRow | null;
};

type ShopShipmentRow = {
  id: string;
  order_id: string;
  method: ShopShippingMethod;
  carrier?: string | null;
  tracking_number?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  pickup_code?: string | null;
  picked_up_at?: string | null;
};

type ShopOrderRow = {
  id: string;
  buyer_profile_id: string;
  seller_id: string;
  status: ShopOrder['status'];
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  payment_method: string;
  shipping_address?: string | null;
  offer_id?: string | null;
  created_at: string;
  updated_at: string;
  stripe_checkout_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_transfer_group?: string | null;
  checkout_expires_at?: string | null;
  seller?: ShopSellerRow | null;
  buyer_profile?: ProfileRow | null;
  items?: ShopOrderItemRow[] | null;
  shipment?: ShopShipmentRow | null;
};

type ShopPayoutRow = {
  id: string;
  seller_id: string;
  order_id: string;
  amount_cents: number;
  status: ShopOrder['status'] | string;
  available_at: string;
  paid_at?: string | null;
  stripe_transfer_id?: string | null;
  stripe_transfer_group?: string | null;
};

const PROFILE_SELECT =
  'id, slug, name, name_zh_tw, role, city, languages, bio_en, bio_zh_tw, auth_user_id';
const CATEGORY_SELECT =
  'id, slug, name_en, name_zh_tw, description_en, description_zh_tw, icon';
const SELLER_SELECT = `
  id,
  slug,
  profile_id,
  display_name_en,
  display_name_zh_tw,
  headline_en,
  headline_zh_tw,
  description_en,
  description_zh_tw,
  city,
  member_since,
  response_rate,
  handling_time_days,
  positive_feedback_rate,
  feedback_count,
  return_window_days,
  accepts_returns,
  top_rated,
  approved,
  stripe_account_status,
  stripe_account_id,
  followers,
  sale_count,
  languages,
  profile:profiles (${PROFILE_SELECT})
`;
const LISTING_SELECT = `
  id,
  slug,
  seller_id,
  category_id,
  title_en,
  title_zh_tw,
  excerpt_en,
  excerpt_zh_tw,
  description_en,
  description_zh_tw,
  condition,
  status,
  price_cents,
  currency,
  quantity_available,
  sold_count,
  allow_offers,
  allow_local_pickup,
  featured,
  pickup_city,
  shipping_methods,
  return_policy_en,
  return_policy_zh_tw,
  item_specifics_json,
  tags,
  view_count,
  watcher_count,
  created_at,
  updated_at,
  seller:shop_sellers (${SELLER_SELECT}),
  category:shop_categories (${CATEGORY_SELECT}),
  images:shop_listing_images (id, url, alt_en, alt_zh_tw, variant_id, is_primary, sort_order),
  variants:shop_listing_variants (id, label_en, label_zh_tw, sku, price_cents, quantity_available, attributes_json)
`;
const ORDER_SELECT = `
  id,
  buyer_profile_id,
  seller_id,
  status,
  subtotal_cents,
  shipping_cents,
  total_cents,
  payment_method,
  shipping_address,
  offer_id,
  created_at,
  updated_at,
  stripe_checkout_session_id,
  stripe_payment_intent_id,
  stripe_transfer_group,
  checkout_expires_at,
  seller:shop_sellers (${SELLER_SELECT}),
  buyer_profile:profiles (${PROFILE_SELECT}),
  items:shop_order_items (
    id,
    listing_id,
    seller_id,
    title_en,
    title_zh_tw,
    unit_price_cents,
    quantity,
    variant_label_en,
    variant_label_zh_tw,
    snapshot_condition
  ),
  shipment:shop_shipments (
    id,
    order_id,
    method,
    carrier,
    tracking_number,
    shipped_at,
    delivered_at,
    pickup_code,
    picked_up_at
  )
`;

function readClient() {
  return getSupabaseServiceClient() ?? getSupabaseClient();
}

function serviceClient() {
  return getSupabaseServiceClient();
}

function privateReadClient() {
  return serviceClient() ?? readClient();
}

function localizedText(en: string, zh?: string | null): LocalizedText {
  return {
    en,
    zh: zh ?? undefined,
  };
}

function ensureArray<T>(value?: T[] | null): T[] {
  return Array.isArray(value) ? value : [];
}

function unwrapRelation<T>(value?: T | T[] | null): T | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value ?? undefined;
}

function toLocalizedParagraphs(english?: string[] | null, chinese?: string[] | null): LocalizedText[] {
  const enValues = ensureArray(english);
  const zhValues = ensureArray(chinese);
  const length = Math.max(enValues.length, zhValues.length);
  return Array.from({ length }).map((_, index) => ({
    en: enValues[index] ?? '',
    zh: zhValues[index] ?? undefined,
  }));
}

function mapCategory(row: ShopCategoryRow): ShopCategory {
  return {
    slug: row.slug,
    name: localizedText(row.name_en, row.name_zh_tw),
    description: localizedText(row.description_en, row.description_zh_tw),
    icon: row.icon,
  };
}

function mapSeller(row: ShopSellerRow): ShopSeller {
  const profile = unwrapRelation(row.profile);
  return {
    slug: row.slug,
    profileSlug: profile?.slug ?? '',
    displayName: localizedText(row.display_name_en, row.display_name_zh_tw),
    headline: localizedText(row.headline_en, row.headline_zh_tw),
    description: localizedText(row.description_en, row.description_zh_tw),
    city: row.city,
    memberSince: row.member_since,
    responseRate: row.response_rate,
    handlingTimeDays: row.handling_time_days,
    positiveFeedbackRate: Number(row.positive_feedback_rate ?? 0),
    feedbackCount: row.feedback_count,
    returnWindowDays: row.return_window_days,
    acceptsReturns: row.accepts_returns,
    topRated: row.top_rated,
    approved: row.approved,
    stripeAccountStatus: row.stripe_account_status,
    followers: row.followers,
    saleCount: row.sale_count,
    languages: (row.languages ?? []) as ShopSeller['languages'],
  };
}

function mapListing(row: ShopListingRow): ShopListing {
  const seller = unwrapRelation(row.seller);
  const category = unwrapRelation(row.category);
  return {
    slug: row.slug,
    sellerSlug: seller?.slug ?? '',
    categorySlug: category?.slug ?? '',
    title: localizedText(row.title_en, row.title_zh_tw),
    excerpt: localizedText(row.excerpt_en, row.excerpt_zh_tw),
    description: toLocalizedParagraphs(row.description_en, row.description_zh_tw),
    condition: row.condition,
    status: row.status,
    priceCents: row.price_cents,
    currency: 'USD',
    quantityAvailable: row.quantity_available,
    soldCount: row.sold_count,
    allowOffers: row.allow_offers,
    allowLocalPickup: row.allow_local_pickup,
    featured: row.featured,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pickupCity: row.pickup_city ?? '',
    shippingMethods: ensureArray(row.shipping_methods) as ShopShippingMethod[],
    returnPolicy: localizedText(row.return_policy_en, row.return_policy_zh_tw),
    itemSpecifics: row.item_specifics_json ?? {},
    tags: ensureArray(row.tags),
    viewCount: row.view_count,
    watcherCount: row.watcher_count,
    images: ensureArray(row.images)
      .slice()
      .sort((left, right) => Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0))
      .map((image) => ({
        id: image.id,
        url: image.url,
        alt: localizedText(image.alt_en, image.alt_zh_tw),
        variantId: image.variant_id ?? undefined,
        isPrimary: image.is_primary,
      })),
    variants: ensureArray(row.variants).map((variant) => ({
      id: variant.id,
      label: localizedText(variant.label_en, variant.label_zh_tw),
      sku: variant.sku,
      priceCents: variant.price_cents,
      quantityAvailable: variant.quantity_available,
      attributes: variant.attributes_json ?? {},
    })),
  };
}

function mapOffer(row: ShopOfferRow): ShopOffer {
  const listing = unwrapRelation(row.listing);
  const seller = unwrapRelation(row.seller);
  const buyerProfile = unwrapRelation(row.buyer_profile);
  return {
    id: row.id,
    listingSlug: listing?.slug ?? '',
    variantId: row.variant_id ?? undefined,
    buyerProfileSlug: buyerProfile?.slug ?? '',
    sellerSlug: seller?.slug ?? '',
    amountCents: row.amount_cents,
    status: row.status,
    message: row.message ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    counterAmountCents: row.counter_amount_cents ?? undefined,
    reservedUntil: row.reserved_until ?? undefined,
  };
}

function mapOrder(row: ShopOrderRow): ShopOrder {
  const seller = unwrapRelation(row.seller);
  const buyerProfile = unwrapRelation(row.buyer_profile);
  const shipment = unwrapRelation(row.shipment);
  return {
    id: row.id,
    buyerProfileSlug: buyerProfile?.slug ?? '',
    sellerSlug: seller?.slug ?? '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    totalCents: row.total_cents,
    paymentMethod: row.payment_method,
    shippingAddress: row.shipping_address ?? undefined,
    offerId: row.offer_id ?? undefined,
    items: ensureArray(row.items).map((item) => ({
      id: item.id,
      listingSlug: item.listing?.slug ?? '',
      sellerSlug: seller?.slug ?? '',
      title: localizedText(item.title_en, item.title_zh_tw),
      unitPriceCents: item.unit_price_cents,
      quantity: item.quantity,
      variantLabel: item.variant_label_en
        ? localizedText(item.variant_label_en, item.variant_label_zh_tw)
        : undefined,
      snapshotCondition: item.snapshot_condition,
    })),
    shipment: shipment
      ? {
          id: shipment.id,
          orderId: shipment.order_id,
          method: shipment.method,
          carrier: shipment.carrier ?? undefined,
          trackingNumber: shipment.tracking_number ?? undefined,
          shippedAt: shipment.shipped_at ?? undefined,
          deliveredAt: shipment.delivered_at ?? undefined,
          pickupCode: shipment.pickup_code ?? undefined,
          pickedUpAt: shipment.picked_up_at ?? undefined,
        }
      : undefined,
  };
}

function createRuntimeContext(profileSlug: string): ShopContext | null {
  const seller = getPrimaryShopSellerForProfile(profileSlug);
  const mappedProfile = seller ? getShopSellerProfile(seller.slug) : undefined;
  if (!mappedProfile) {
    return null;
  }

  return {
    profile: {
      id: mappedProfile.slug,
      slug: mappedProfile.slug,
      name: mappedProfile.name,
      name_zh_tw: mappedProfile.nameZh,
      role: mappedProfile.role,
      city: mappedProfile.city,
      languages: mappedProfile.languages,
      bio_en: mappedProfile.bio.en,
      bio_zh_tw: mappedProfile.bio.zh ?? mappedProfile.bio.en,
    },
    role: mappedProfile.role,
  };
}

export async function getShopContextForAuthUserId(authUserId: string): Promise<ShopContext | null> {
  const profile = await getProfileByAuthUserId(authUserId);
  if (!profile) {
    return null;
  }

  return {
    profile,
    role: profile.role,
    authUserId,
  };
}

export async function getOrCreateShopContextForUser(user: User): Promise<ShopContext | null> {
  const profile = await ensureProfileForAuthUser(user);
  if (!profile) {
    return null;
  }

  return {
    profile,
    role: profile.role,
    authUserId: user.id,
  };
}

async function fetchShopCategoriesFromDb() {
  const client = readClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from('shop_categories')
    .select(CATEGORY_SELECT)
    .order('name_en', { ascending: true });

  if (error || !data) {
    return null;
  }

  return (data as ShopCategoryRow[]).map(mapCategory);
}

async function fetchShopListingsFromDb(filters?: { slug?: string; sellerSlug?: string; includePrivate?: boolean }) {
  const client = readClient();
  if (!client) {
    return null;
  }

  let query = client.from('shop_listings').select(LISTING_SELECT);

  if (!filters?.includePrivate) {
    query = query.in('status', ['active', 'sold_out']);
  }

  if (filters?.slug) {
    query = query.eq('slug', filters.slug);
  }

  if (filters?.sellerSlug) {
    const { data: sellerRow, error: sellerError } = await client
      .from('shop_sellers')
      .select('id')
      .eq('slug', filters.sellerSlug)
      .maybeSingle();

    if (sellerError) {
      return null;
    }

    if (!sellerRow?.id) {
      return [];
    }

    query = query.eq('seller_id', sellerRow.id);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error || !data) {
    return null;
  }

  return (data as unknown as ShopListingRow[]).map(mapListing);
}

function resolveSellerListings(
  sellerSlug: string,
  fetchedListings: ShopListing[] | null,
  includePrivate = false
) {
  const runtimeListings = getShopSellerListings(sellerSlug, includePrivate);

  if (!fetchedListings) {
    return runtimeListings;
  }

  if (fetchedListings.length === 0 && runtimeListings.length > 0) {
    return runtimeListings;
  }

  return fetchedListings;
}

function buildSellerTrustSummary(seller: ShopSeller) {
  return {
    totalCount: seller.feedbackCount,
    positiveFeedbackRate: seller.positiveFeedbackRate,
    memberSince: seller.memberSince,
    responseRate: seller.responseRate,
    handlingTimeDays: seller.handlingTimeDays,
    acceptsReturns: seller.acceptsReturns,
    returnWindowDays: seller.returnWindowDays,
    topRated: seller.topRated,
  };
}

async function fetchShopSellersFromDb(filters?: { slug?: string; includePrivate?: boolean }) {
  const client = readClient();
  if (!client) {
    return null;
  }

  let query = client.from('shop_sellers').select(SELLER_SELECT);
  if (!filters?.includePrivate) {
    query = query.eq('approved', true);
  }
  if (filters?.slug) {
    query = query.eq('slug', filters.slug);
  }

  const { data, error } = await query.order('display_name_en', { ascending: true });
  if (error || !data) {
    return null;
  }

  return (data as unknown as ShopSellerRow[]).map(mapSeller);
}

async function fetchOffersForBuyerProfile(profileId: string) {
  const client = readClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from('shop_offers')
    .select(`
      id,
      listing_id,
      variant_id,
      buyer_profile_id,
      seller_id,
      amount_cents,
      status,
      message,
      counter_amount_cents,
      reserved_until,
      created_at,
      updated_at,
      expires_at,
      used_at,
      used_order_id,
      listing:shop_listings (${LISTING_SELECT}),
      seller:shop_sellers (${SELLER_SELECT}),
      buyer_profile:profiles (${PROFILE_SELECT})
    `)
    .eq('buyer_profile_id', profileId)
    .order('updated_at', { ascending: false });

  if (error || !data) {
    return null;
  }

  return (data as unknown as ShopOfferRow[]).map(mapOffer);
}

async function fetchOrdersForBuyerProfile(profileId: string) {
  const client = readClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from('shop_orders')
    .select(ORDER_SELECT)
    .eq('buyer_profile_id', profileId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return null;
  }

  return (data as unknown as ShopOrderRow[]).map(mapOrder);
}

async function fetchSavedSearchesForProfile(profileId: string) {
  const client = privateReadClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from('shop_saved_searches')
    .select('id, label, query, category_slug, condition, offer_only, pickup_only, price_min, price_max, sort, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return null;
  }

  return data.map((row) => ({
    id: row.id,
    profileSlug: '',
    label: row.label,
    query: row.query,
    category: row.category_slug ?? undefined,
    condition: row.condition ?? undefined,
    offerOnly: row.offer_only ?? false,
    pickupOnly: row.pickup_only ?? false,
    priceMin: row.price_min ?? undefined,
    priceMax: row.price_max ?? undefined,
    sort: (row.sort ?? 'best_match') as ShopBrowseSort,
    createdAt: row.created_at,
  })) as ShopSavedSearch[];
}

async function fetchSavedSellersForProfile(profileId: string) {
  const client = privateReadClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from('shop_saved_sellers')
    .select(`id, created_at, seller:shop_sellers (${SELLER_SELECT})`)
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return null;
  }

  return data
    .map((row) => unwrapRelation((row as unknown as { seller?: ShopSellerRow | ShopSellerRow[] | null }).seller))
    .filter((seller): seller is ShopSellerRow => Boolean(seller))
    .map(mapSeller);
}

async function fetchWatchlistForProfile(profileId: string) {
  const client = privateReadClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from('shop_watchlist_items')
    .select(`id, created_at, listing:shop_listings (${LISTING_SELECT})`)
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return null;
  }

  return data
    .map((row) => unwrapRelation((row as unknown as { listing?: ShopListingRow | ShopListingRow[] | null }).listing))
    .filter((listing): listing is ShopListingRow => Boolean(listing))
    .map(mapListing);
}

async function fetchCartDetailedItemsForProfile(profileId: string) {
  const client = privateReadClient();
  if (!client) {
    return null;
  }

  const { data: cart } = await client
    .from('shop_carts')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (!cart?.id) {
    return [];
  }

  const { data, error } = await client
    .from('shop_cart_items')
    .select(`
      id,
      quantity,
      variant_id,
      listing:shop_listings (${LISTING_SELECT})
    `)
    .eq('cart_id', cart.id)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return null;
  }

  return data
    .map((row) => {
      const listingRow = unwrapRelation((row as unknown as { listing?: ShopListingRow | ShopListingRow[] | null }).listing);
      if (!listingRow) {
        return null;
      }

      const listing = mapListing(listingRow);
      const variantId = (row as { variant_id?: string | null }).variant_id ?? undefined;
      const variant = variantId ? listing.variants.find((candidate) => candidate.id === variantId) : undefined;
      const seller = unwrapRelation(listingRow.seller) ? mapSeller(unwrapRelation(listingRow.seller) as ShopSellerRow) : undefined;

      return {
        item: {
          id: (row as { id: string }).id,
          listingSlug: listing.slug,
          variantId,
          quantity: (row as { quantity: number }).quantity,
        },
        listing,
        variant,
        seller,
        unitPriceCents: variant?.priceCents ?? listing.priceCents,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
}

async function fetchReturnsByOrderIds(orderIds: string[]) {
  const client = privateReadClient();
  if (!client || orderIds.length === 0) {
    return new Map<string, ReturnType<typeof getShopReturnByOrderId>>();
  }

  const { data } = await client
    .from('shop_returns')
    .select('id, order_id, status, reason, requested_at, seller_respond_by, resolution_notes')
    .in('order_id', orderIds);

  return new Map(
    (data ?? []).map((row) => [
      row.order_id,
      {
        id: row.id,
        orderId: row.order_id,
        status: row.status,
        reason: row.reason,
        requestedAt: row.requested_at,
        sellerRespondBy: row.seller_respond_by,
        resolutionNotes: row.resolution_notes ?? undefined,
      },
    ])
  );
}

async function fetchCasesByOrderIds(orderIds: string[], sellerSlugById = new Map<string, string>()) {
  const client = privateReadClient();
  if (!client || orderIds.length === 0) {
    return new Map<string, ReturnType<typeof getShopCaseByOrderId>>();
  }

  const { data } = await client
    .from('shop_cases')
    .select('id, order_id, opened_by_profile_id, seller_id, status, reason, opened_at, seller_respond_by, escalated_at, resolution_notes')
    .in('order_id', orderIds);

  return new Map(
    (data ?? []).map((row) => [
      row.order_id,
      {
        id: row.id,
        orderId: row.order_id,
        openedByProfileSlug: '',
        sellerSlug: sellerSlugById.get(row.seller_id) ?? '',
        status: row.status,
        reason: row.reason,
        openedAt: row.opened_at,
        sellerRespondBy: row.seller_respond_by,
        escalatedAt: row.escalated_at ?? undefined,
        resolutionNotes: row.resolution_notes ?? undefined,
      },
    ])
  );
}

async function fetchFeedbackByOrderId(orderId: string) {
  const client = privateReadClient();
  if (!client) {
    return null;
  }

  const { data } = await client
    .from('shop_feedback')
    .select('id, order_id, seller_id, buyer_profile_id, sentiment, title_en, title_zh_tw, comment_en, comment_zh_tw, created_at')
    .eq('order_id', orderId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    orderId: data.order_id,
    sellerSlug: '',
    buyerProfileSlug: '',
    sentiment: data.sentiment,
    title: localizedText(data.title_en, data.title_zh_tw),
    comment: localizedText(data.comment_en, data.comment_zh_tw),
    createdAt: data.created_at,
  } as ShopFeedback;
}

async function fetchConversationMessagesForOrder(profileId: string, orderId: string) {
  const client = privateReadClient();
  if (!client) {
    return [];
  }

  const { data: conversation } = await client
    .from('shop_conversations')
    .select('id')
    .eq('buyer_profile_id', profileId)
    .eq('order_id', orderId)
    .order('updated_at', { ascending: false })
    .maybeSingle();

  if (!conversation?.id) {
    return [];
  }

  const { data: messages } = await client
    .from('shop_messages')
    .select(`id, conversation_id, sender_profile_id, body, flagged, created_at, sender_profile:profiles (${PROFILE_SELECT})`)
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: true });

  return (messages ?? []).map((message) => {
    const senderProfile = unwrapRelation((message as { sender_profile?: ProfileRow | ProfileRow[] | null }).sender_profile);
    return {
      id: message.id,
      conversationId: message.conversation_id,
      senderProfileSlug: senderProfile?.slug ?? '',
      body: message.body,
      createdAt: message.created_at,
      flagged: message.flagged,
    };
  });
}

async function fetchPrimarySellerForProfile(profileId: string) {
  const client = privateReadClient();
  if (!client) {
    return null;
  }

  const { data } = await client
    .from('shop_sellers')
    .select(SELLER_SELECT)
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return mapSeller(data as unknown as ShopSellerRow);
}

async function fetchOrdersForSellerId(sellerId: string) {
  const client = privateReadClient();
  if (!client) {
    return null;
  }

  const { data } = await client
    .from('shop_orders')
    .select(ORDER_SELECT)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });

  return ((data as unknown as ShopOrderRow[] | null) ?? []).map(mapOrder);
}

async function fetchOffersForSellerId(sellerId: string) {
  const client = privateReadClient();
  if (!client) {
    return null;
  }

  const { data } = await client
    .from('shop_offers')
    .select(`
      id,
      listing_id,
      variant_id,
      buyer_profile_id,
      seller_id,
      amount_cents,
      status,
      message,
      counter_amount_cents,
      reserved_until,
      created_at,
      updated_at,
      expires_at,
      used_at,
      used_order_id,
      listing:shop_listings (${LISTING_SELECT}),
      seller:shop_sellers (${SELLER_SELECT}),
      buyer_profile:profiles (${PROFILE_SELECT})
    `)
    .eq('seller_id', sellerId)
    .order('updated_at', { ascending: false });

  return ((data as unknown as ShopOfferRow[] | null) ?? []).map(mapOffer);
}

async function fetchPayoutsForSellerId(sellerId: string, sellerSlug: string) {
  const client = privateReadClient();
  if (!client) {
    return null;
  }

  const { data } = await client
    .from('shop_payouts')
    .select('id, seller_id, order_id, amount_cents, status, available_at, paid_at, stripe_transfer_id, stripe_transfer_group')
    .eq('seller_id', sellerId)
    .order('available_at', { ascending: false });

  return ((data as ShopPayoutRow[] | null) ?? []).map((row) => ({
    id: row.id,
    sellerSlug,
    orderId: row.order_id,
    amountCents: row.amount_cents,
    status: row.status as ShopPayout['status'],
    availableAt: row.available_at,
    paidAt: row.paid_at ?? undefined,
  }));
}

export async function getShopBrowsePageData(locale: Locale, searchParams?: ShopBrowseSearchParams) {
  const [categories, sellers, listings] = await Promise.all([
    fetchShopCategoriesFromDb(),
    fetchShopSellersFromDb(),
    fetchShopListingsFromDb(),
  ]);

  if (
    isShopRuntimeFallbackAllowed() &&
    shouldUseRuntimeShopBrowseData({ categories, sellers, listings })
  ) {
    return getShopBrowsePage(locale, searchParams);
  }

  return buildShopBrowsePageFromData({
    locale,
    searchParams,
    categories: categories ?? [],
    sellers: sellers ?? [],
    listings: listings ?? [],
  });
}

export function shouldUseRuntimeShopBrowseData({
  categories,
  sellers,
  listings,
}: PublicShopBrowseDataCandidate): boolean {
  if (!categories?.length || !sellers?.length || !listings?.length) {
    return true;
  }

  const publicSellerSlugs = new Set(sellers.map((seller) => seller.slug));
  const publicListings = listings.filter(
    (listing) =>
      (listing.status === 'active' || listing.status === 'sold_out') &&
      publicSellerSlugs.has(listing.sellerSlug)
  );

  return publicListings.length === 0;
}

export async function getPublicShopSitemapData() {
  if (isShopRuntimeFallbackAllowed()) {
    const publicListings = getShopListings().filter(
      (listing) => listing.status === 'active' || listing.status === 'sold_out'
    );
    const publicSellers = getShopSellers().filter((seller) =>
      publicListings.some((listing) => listing.sellerSlug === seller.slug)
    );

    return {
      listings: publicListings,
      sellers: publicSellers,
    };
  }

  const [sellers, listings] = await Promise.all([
    fetchShopSellersFromDb(),
    fetchShopListingsFromDb(),
  ]);
  const publicSellers = sellers ?? [];
  const publicListings = (listings ?? []).filter(
    (listing) =>
      (listing.status === 'active' || listing.status === 'sold_out') &&
      publicSellers.some((seller) => seller.slug === listing.sellerSlug)
  );

  return {
    listings: publicListings,
    sellers: publicSellers.filter((seller) =>
      publicListings.some((listing) => listing.sellerSlug === seller.slug)
    ),
  };
}

export async function getShopListingPageData(listingSlug: string, viewerProfileId?: string) {
  const listings = await fetchShopListingsFromDb({ slug: listingSlug, includePrivate: Boolean(viewerProfileId) });
  const listing =
    listings?.[0] ??
    (isShopRuntimeFallbackAllowed() ? getShopListingBySlug(listingSlug) : undefined);
  if (!listing) {
    return null;
  }

  const seller = (await fetchShopSellersFromDb({ slug: listing.sellerSlug, includePrivate: true }))?.[0]
    ?? (isShopRuntimeFallbackAllowed() ? getShopSellerBySlug(listing.sellerSlug) : undefined);
  if (!seller) {
    return null;
  }

  const acceptedOffers = viewerProfileId ? await fetchOffersForBuyerProfile(viewerProfileId) : null;

  return {
    listing,
    seller,
    acceptedOffer:
      acceptedOffers?.find((offer) => offer.listingSlug === listing.slug && offer.status === 'accepted') ??
      (viewerProfileId && isShopRuntimeFallbackAllowed()
        ? getAcceptedShopOffersForBuyer(viewerProfileId).find((offer) => offer.listingSlug === listing.slug)
        : undefined),
  };
}

export async function getShopSellerPageData(sellerSlug: string) {
  const seller = (await fetchShopSellersFromDb({ slug: sellerSlug, includePrivate: true }))?.[0]
    ?? (isShopRuntimeFallbackAllowed() ? getShopSellerBySlug(sellerSlug) : undefined);
  if (!seller) {
    return null;
  }

  const listingsFromDb = await fetchShopListingsFromDb({ sellerSlug, includePrivate: false });
  const listings = isShopRuntimeFallbackAllowed()
    ? resolveSellerListings(sellerSlug, listingsFromDb)
    : listingsFromDb ?? [];

  return {
    seller,
    sellerProfile: isShopRuntimeFallbackAllowed() ? getShopSellerProfile(sellerSlug) : undefined,
    listings,
    feedback: isShopRuntimeFallbackAllowed() ? getShopFeedbackForSeller(sellerSlug) : [],
    trust: isShopRuntimeFallbackAllowed()
      ? getShopSellerTrustSummary(sellerSlug)
      : buildSellerTrustSummary(seller),
  };
}

export async function getShopWatchlistPageData(profileSlugOrId: string) {
  return {
    watchlist: getShopListingByWatchlist(profileSlugOrId),
    acceptedOffers: getAcceptedShopOffersForBuyer(profileSlugOrId),
    savedSellers: getShopSavedSellers(profileSlugOrId),
  };
}

export async function getShopSavedSearchesPageData(profileSlugOrId: string) {
  return {
    savedSearches: getShopSavedSearches(profileSlugOrId),
    savedSellers: getShopSavedSellers(profileSlugOrId),
  };
}

export async function getShopCartPageData(profileSlugOrId: string) {
  return {
    items: getShopCartDetailedItems(profileSlugOrId),
  };
}

export async function getShopOrdersPageData(profileSlugOrId: string) {
  return {
    orders: (await fetchOrdersForBuyerProfile(profileSlugOrId)) ?? getShopOrdersForBuyer(profileSlugOrId),
  };
}

export async function getShopOrderDetailPageData(profileSlugOrId: string, orderId: string) {
  const orders = (await fetchOrdersForBuyerProfile(profileSlugOrId)) ?? getShopOrdersForBuyer(profileSlugOrId);
  const order = orders.find((candidate) => candidate.id === orderId) ?? getShopOrderById(orderId);
  if (!order) {
    return null;
  }

  return {
    order,
    returnRequest: getShopReturnByOrderId(orderId),
    caseRecord: getShopCaseByOrderId(orderId),
    conversationMessages: getShopConversationMessages(orderId),
  };
}

export async function getShopSellPageData(profileSlugOrId: string) {
  const runtimeContext = createRuntimeContext(profileSlugOrId);
  return {
    seller: getPrimaryShopSellerForProfile(profileSlugOrId),
    categories: getShopCategories(),
    runtimeContext,
  };
}

export async function getShopDashboardData(profileSlugOrId: string) {
  const seller = getPrimaryShopSellerForProfile(profileSlugOrId);
  if (!seller) {
    return null;
  }

  return getShopSellerDashboardSnapshot(seller.slug);
}

export async function getShopAdminPageData() {
  const snapshot = getShopAdminSnapshot();
  const reports = (await getModerationReportsSnapshot()).filter((report) =>
    report.entityType.startsWith('shop_')
  );

  return {
    snapshot,
    reports,
  };
}

export async function getShopWatchlistPageDataForContext(context: ShopContext) {
  return {
    watchlist: (await fetchWatchlistForProfile(context.profile.id)) ?? getShopListingByWatchlist(context.profile.slug),
    acceptedOffers:
      (await fetchOffersForBuyerProfile(context.profile.id))?.filter((offer) => offer.status === 'accepted') ??
      getAcceptedShopOffersForBuyer(context.profile.slug),
    savedSellers: (await fetchSavedSellersForProfile(context.profile.id)) ?? getShopSavedSellers(context.profile.slug),
  };
}

export async function getShopSavedSearchesPageDataForContext(context: ShopContext) {
  const savedSearches = (await fetchSavedSearchesForProfile(context.profile.id)) ?? getShopSavedSearches(context.profile.slug);

  return {
    savedSearches: savedSearches.map((search) => ({
      ...search,
      profileSlug: context.profile.slug,
    })),
    savedSellers: (await fetchSavedSellersForProfile(context.profile.id)) ?? getShopSavedSellers(context.profile.slug),
  };
}

export async function getShopCartPageDataForContext(context: ShopContext) {
  return {
    items: (await fetchCartDetailedItemsForProfile(context.profile.id)) ?? getShopCartDetailedItems(context.profile.slug),
  };
}

export async function getShopCheckoutPageDataForContext(context: ShopContext, offerId?: string) {
  const acceptedOffers =
    (await fetchOffersForBuyerProfile(context.profile.id))?.filter((offer) => offer.status === 'accepted') ??
    getAcceptedShopOffersForBuyer(context.profile.slug);
  const acceptedOffer = offerId ? acceptedOffers.find((offer) => offer.id === offerId) : undefined;
  const offerListing = acceptedOffer ? (await getShopListingPageData(acceptedOffer.listingSlug, context.profile.id))?.listing : undefined;

  return {
    acceptedOffer,
    offerListing,
    cartItems: offerId ? [] : ((await fetchCartDetailedItemsForProfile(context.profile.id)) ?? getShopCartDetailedItems(context.profile.slug)),
  };
}

export async function getShopOrdersPageDataForContext(context: ShopContext) {
  const orders = (await fetchOrdersForBuyerProfile(context.profile.id)) ?? getShopOrdersForBuyer(context.profile.slug);
  const sellerSlugById = new Map<string, string>();

  for (const order of orders) {
    const seller = (await fetchShopSellersFromDb({ slug: order.sellerSlug, includePrivate: true }))?.[0];
    if (seller) {
      sellerSlugById.set((await privateReadClient()?.from('shop_sellers').select('id').eq('slug', seller.slug).maybeSingle())?.data?.id ?? '', seller.slug);
    }
  }

  return {
    orders,
    returnsByOrderId: await fetchReturnsByOrderIds(orders.map((order) => order.id)),
    casesByOrderId: await fetchCasesByOrderIds(orders.map((order) => order.id), sellerSlugById),
  };
}

export async function getShopOrderDetailPageDataForContext(context: ShopContext, orderId: string) {
  const orders = (await fetchOrdersForBuyerProfile(context.profile.id)) ?? getShopOrdersForBuyer(context.profile.slug);
  const order = orders.find((candidate) => candidate.id === orderId) ?? getShopOrderById(orderId);
  if (!order) {
    return null;
  }
  const seller = (await fetchShopSellersFromDb({ slug: order.sellerSlug, includePrivate: true }))?.[0]
    ?? getShopSellerBySlug(order.sellerSlug);

  return {
    order,
    seller,
    returnRequest: (await fetchReturnsByOrderIds([orderId])).get(orderId) ?? getShopReturnByOrderId(orderId),
    caseRecord: (await fetchCasesByOrderIds([orderId])).get(orderId) ?? getShopCaseByOrderId(orderId),
    feedback: (await fetchFeedbackByOrderId(orderId)) ?? getShopFeedbackForSeller(order.sellerSlug).find((entry) => entry.orderId === orderId),
    conversationMessages:
      (await fetchConversationMessagesForOrder(context.profile.id, orderId)) ?? getShopConversationMessages(orderId),
  };
}

export async function getShopSellPageDataForContext(context: ShopContext) {
  return {
    seller: (await fetchPrimarySellerForProfile(context.profile.id)) ?? getPrimaryShopSellerForProfile(context.profile.slug),
    categories: (await fetchShopCategoriesFromDb()) ?? getShopCategories(),
    runtimeContext: context,
  };
}

export async function getShopDashboardDataForContext(context: ShopContext) {
  const seller = (await fetchPrimarySellerForProfile(context.profile.id)) ?? getPrimaryShopSellerForProfile(context.profile.slug);
  if (!seller) {
    return null;
  }

  const sellerRowClient = privateReadClient();
  const { data: sellerRow } = sellerRowClient
    ? await sellerRowClient.from('shop_sellers').select('id').eq('slug', seller.slug).maybeSingle()
    : { data: null };
  const sellerId = sellerRow?.id;

  if (!sellerId) {
    const snapshot = getShopSellerDashboardSnapshot(seller.slug);
    return {
      snapshot,
      returnsByOrderId: new Map(snapshot.orders.map((order) => [order.id, getShopReturnByOrderId(order.id)])),
      casesByOrderId: new Map(snapshot.orders.map((order) => [order.id, getShopCaseByOrderId(order.id)])),
    };
  }

  const [listings, orders, offers, payouts] = await Promise.all([
    fetchShopListingsFromDb({ sellerSlug: seller.slug, includePrivate: true }),
    fetchOrdersForSellerId(sellerId),
    fetchOffersForSellerId(sellerId),
    fetchPayoutsForSellerId(sellerId, seller.slug),
  ]);

  const resolvedListings = resolveSellerListings(seller.slug, listings, true);
  const runtimeSnapshot = getShopSellerDashboardSnapshot(seller.slug);

  const snapshot = {
    seller,
    listings: resolvedListings,
    orders: orders ?? runtimeSnapshot.orders,
    offers: offers ?? runtimeSnapshot.offers,
    payouts: payouts ?? runtimeSnapshot.payouts,
    conversations: getShopConversationsForSeller(seller.slug),
    flaggedMessages: runtimeSnapshot.flaggedMessages,
    stats: {
      activeListings: resolvedListings.filter((listing) => listing.status === 'active').length,
      pendingListings: resolvedListings.filter((listing) => listing.status === 'pending_review').length,
      grossSalesCents: (orders ?? []).reduce((sum, order) => sum + order.totalCents, 0),
      openOffers: (offers ?? []).filter((offer) => offer.status === 'pending' || offer.status === 'countered').length,
      conversionRate:
        resolvedListings.length === 0
          ? 0
          : Math.round(
              (((orders ?? []).length /
                Math.max(
                  1,
                  resolvedListings.reduce((sum, listing) => sum + Math.max(1, listing.viewCount), 0) / 100
                )) *
                10)
            ) / 10,
      totalWatchers: resolvedListings.reduce((sum, listing) => sum + listing.watcherCount, 0),
    },
  };

  return {
    snapshot,
    returnsByOrderId: await fetchReturnsByOrderIds(snapshot.orders.map((order) => order.id)),
    casesByOrderId: await fetchCasesByOrderIds(snapshot.orders.map((order) => order.id)),
  };
}

export async function getShopAdminPageDataForContext() {
  const client = privateReadClient();
  if (!client) {
    return getShopAdminPageData();
  }

  const [sellerRows, listingRows, reports] = await Promise.all([
    client
      .from('shop_sellers')
      .select(SELLER_SELECT)
      .or('approved.eq.false,stripe_account_status.neq.active')
      .order('updated_at', { ascending: false }),
    client
      .from('shop_listings')
      .select(LISTING_SELECT)
      .eq('status', 'pending_review')
      .order('updated_at', { ascending: false }),
    getModerationReportsSnapshot(),
  ]);

  const snapshot = {
    pendingSellers: ((sellerRows.data as unknown as ShopSellerRow[] | null) ?? []).map(mapSeller),
    pendingListings: ((listingRows.data as unknown as ShopListingRow[] | null) ?? []).map(mapListing),
    flaggedMessages: getShopAdminSnapshot().flaggedMessages,
    openCases: getShopAdminSnapshot().openCases,
    openReturns: getShopAdminSnapshot().openReturns,
    auditEntries: getShopAdminSnapshot().auditEntries,
  };

  return {
    snapshot,
    reports: reports.filter((report) => report.entityType.startsWith('shop_')),
  };
}

export async function toggleShopWatchlistForContext(context: ShopContext, listingSlug: string) {
  const client = serviceClient();
  if (!client) {
    return toggleShopWatchlist(context.profile.slug, listingSlug);
  }

  const { data: listing } = await client
    .from('shop_listings')
    .select('id, watcher_count')
    .eq('slug', listingSlug)
    .maybeSingle();
  if (!listing) {
    throw new Error('Listing not found.');
  }

  const { data: existing } = await client
    .from('shop_watchlist_items')
    .select('id')
    .eq('profile_id', context.profile.id)
    .eq('listing_id', listing.id)
    .maybeSingle();

  if (existing) {
    await client.from('shop_watchlist_items').delete().eq('id', existing.id);
    await client
      .from('shop_listings')
      .update({ watcher_count: Math.max(0, Number(listing.watcher_count ?? 0) - 1) })
      .eq('id', listing.id);
    return { saved: false };
  }

  await client.from('shop_watchlist_items').insert({
    profile_id: context.profile.id,
    listing_id: listing.id,
  });
  await client
    .from('shop_listings')
    .update({ watcher_count: Number(listing.watcher_count ?? 0) + 1 })
    .eq('id', listing.id);
  return { saved: true };
}

export async function toggleShopSavedSellerForContext(context: ShopContext, sellerSlug: string) {
  const client = serviceClient();
  if (!client) {
    return toggleShopSavedSeller(context.profile.slug, sellerSlug);
  }

  const { data: seller } = await client
    .from('shop_sellers')
    .select('id')
    .eq('slug', sellerSlug)
    .maybeSingle();
  if (!seller) {
    throw new Error('Seller not found.');
  }

  const { data: existing } = await client
    .from('shop_saved_sellers')
    .select('id')
    .eq('profile_id', context.profile.id)
    .eq('seller_id', seller.id)
    .maybeSingle();

  if (existing) {
    await client.from('shop_saved_sellers').delete().eq('id', existing.id);
    return { saved: false };
  }

  await client.from('shop_saved_sellers').insert({
    profile_id: context.profile.id,
    seller_id: seller.id,
  });
  return { saved: true };
}

export async function createShopSavedSearchForContext(
  context: ShopContext,
  input: Omit<ShopSavedSearch, 'id' | 'profileSlug' | 'createdAt'>
) {
  const client = serviceClient();
  if (!client) {
    return createShopSavedSearch({
      profileSlug: context.profile.slug,
      ...input,
    });
  }

  const { data, error } = await client
    .from('shop_saved_searches')
    .insert({
      profile_id: context.profile.id,
      label: input.label,
      query: input.query,
      category_slug: input.category ?? null,
      condition: input.condition ?? null,
      offer_only: input.offerOnly ?? false,
      pickup_only: input.pickupOnly ?? false,
      price_min: input.priceMin ?? null,
      price_max: input.priceMax ?? null,
      sort: input.sort ?? 'best_match',
    })
    .select('id, label, query, category_slug, condition, offer_only, pickup_only, price_min, price_max, sort, created_at')
    .maybeSingle();

  if (error || !data) {
    throw new Error('Unable to save this search.');
  }

  return {
    id: data.id,
    profileSlug: context.profile.slug,
    label: data.label,
    query: data.query,
    category: data.category_slug ?? undefined,
    condition: data.condition ?? undefined,
    offerOnly: data.offer_only,
    pickupOnly: data.pickup_only,
    priceMin: data.price_min ?? undefined,
    priceMax: data.price_max ?? undefined,
    sort: (data.sort ?? 'best_match') as ShopBrowseSort,
    createdAt: data.created_at,
  } satisfies ShopSavedSearch;
}

export async function deleteShopSavedSearchForContext(context: ShopContext, id: string) {
  const client = serviceClient();
  if (!client) {
    return deleteShopSavedSearch(context.profile.slug, id);
  }

  const { error } = await client
    .from('shop_saved_searches')
    .delete()
    .eq('id', id)
    .eq('profile_id', context.profile.id);

  return !error;
}

export async function addShopCartItemForContext(
  context: ShopContext,
  listingSlug: string,
  quantity = 1,
  variantId?: string
) {
  const client = serviceClient();
  if (!client) {
    return addShopCartItem(context.profile.slug, listingSlug, quantity, variantId);
  }

  const { data: listing } = await client
    .from('shop_listings')
    .select('id, quantity_available')
    .eq('slug', listingSlug)
    .maybeSingle();
  if (!listing) {
    throw new Error('Listing not found.');
  }

  let availableQuantity = listing.quantity_available;
  if (variantId) {
    const { data: variant } = await client
      .from('shop_listing_variants')
      .select('id, quantity_available')
      .eq('id', variantId)
      .eq('listing_id', listing.id)
      .maybeSingle();
    if (!variant) {
      throw new Error('Variant not found.');
    }
    availableQuantity = variant.quantity_available;
  }

  if (availableQuantity < quantity) {
    throw new Error('Not enough inventory available.');
  }

  let cartId: string | undefined;
  const { data: cart } = await client
    .from('shop_carts')
    .select('id')
    .eq('profile_id', context.profile.id)
    .maybeSingle();

  if (cart) {
    cartId = cart.id;
  } else {
    const { data: createdCart } = await client
      .from('shop_carts')
      .insert({ profile_id: context.profile.id })
      .select('id')
      .maybeSingle();
    cartId = createdCart?.id;
  }

  if (!cartId) {
    throw new Error('Unable to create a cart.');
  }

  const { data: existing } = await client
    .from('shop_cart_items')
    .select('id, quantity')
    .eq('cart_id', cartId)
    .eq('listing_id', listing.id)
    .eq('variant_id', variantId ?? null)
    .maybeSingle();

  if (existing) {
    if (existing.quantity + quantity > availableQuantity) {
      throw new Error('Not enough inventory available.');
    }
    await client
      .from('shop_cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id);
  } else {
    await client.from('shop_cart_items').insert({
      cart_id: cartId,
      listing_id: listing.id,
      variant_id: variantId ?? null,
      quantity,
    });
  }

  await client.from('shop_carts').update({ updated_at: new Date().toISOString() }).eq('id', cartId);
}

export async function removeShopCartItemForContext(context: ShopContext, itemId: string) {
  const client = serviceClient();
  if (!client) {
    return removeShopCartItem(context.profile.slug, itemId);
  }

  const { data: cart } = await client
    .from('shop_carts')
    .select('id')
    .eq('profile_id', context.profile.id)
    .maybeSingle();

  if (!cart) {
    return;
  }

  await client.from('shop_cart_items').delete().eq('id', itemId).eq('cart_id', cart.id);
  await client.from('shop_carts').update({ updated_at: new Date().toISOString() }).eq('id', cart.id);
}

export async function clearShopCartForContext(context: ShopContext) {
  const client = serviceClient();
  if (!client) {
    return clearShopCart(context.profile.slug);
  }

  const { data: cart } = await client
    .from('shop_carts')
    .select('id')
    .eq('profile_id', context.profile.id)
    .maybeSingle();

  if (!cart) {
    return;
  }

  await client.from('shop_cart_items').delete().eq('cart_id', cart.id);
  await client.from('shop_carts').update({ updated_at: new Date().toISOString() }).eq('id', cart.id);
}

export async function createShopOfferForContext(
  context: ShopContext,
  input: {
    listingSlug: string;
    variantId?: string;
    sellerSlug: string;
    amountCents: number;
    message?: string;
  }
) {
  const client = serviceClient();
  if (!client) {
    return createShopOffer({
      listingSlug: input.listingSlug,
      variantId: input.variantId,
      buyerProfileSlug: context.profile.slug,
      sellerSlug: input.sellerSlug,
      amountCents: input.amountCents,
      message: input.message,
    });
  }

  const { data: listing } = await client
    .from('shop_listings')
    .select('id, allow_offers')
    .eq('slug', input.listingSlug)
    .maybeSingle();
  const { data: seller } = await client
    .from('shop_sellers')
    .select('id')
    .eq('slug', input.sellerSlug)
    .maybeSingle();

  if (!listing || !seller) {
    throw new Error('Listing not found.');
  }
  if (!listing.allow_offers) {
    throw new Error('Offers are not enabled for this listing.');
  }

  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const { data, error } = await client
    .from('shop_offers')
    .insert({
      listing_id: listing.id,
      variant_id: input.variantId ?? null,
      buyer_profile_id: context.profile.id,
      seller_id: seller.id,
      amount_cents: input.amountCents,
      message: input.message ?? null,
      expires_at: expiresAt,
    })
    .select(`
      id,
      listing_id,
      variant_id,
      buyer_profile_id,
      seller_id,
      amount_cents,
      status,
      message,
      counter_amount_cents,
      reserved_until,
      created_at,
      updated_at,
      expires_at,
      listing:shop_listings (${LISTING_SELECT}),
      seller:shop_sellers (${SELLER_SELECT}),
      buyer_profile:profiles (${PROFILE_SELECT})
    `)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Unable to submit this offer.');
  }

  return mapOffer(data as unknown as ShopOfferRow);
}

export async function respondToShopOfferForContext(
  context: ShopContext,
  input: {
    offerId: string;
    action: Extract<ShopOffer['status'], 'accepted' | 'declined' | 'countered'>;
    counterAmountCents?: number;
  }
) {
  const client = serviceClient();
  if (!client) {
    return respondToShopOffer({
      offerId: input.offerId,
      action: input.action,
      counterAmountCents: input.counterAmountCents,
      actorProfileSlug: context.profile.slug,
    });
  }

  const { data: offer } = await client
    .from('shop_offers')
    .select('id, seller_id, status')
    .eq('id', input.offerId)
    .maybeSingle();
  if (!offer) {
    throw new Error('Offer not found.');
  }
  if (!['pending', 'countered'].includes(offer.status)) {
    throw new Error('This offer can no longer be changed.');
  }

  const { data: seller } = await client
    .from('shop_sellers')
    .select('profile_id')
    .eq('id', offer.seller_id)
    .maybeSingle();
  if (!seller || (seller.profile_id !== context.profile.id && !['moderator', 'admin'].includes(context.role))) {
    throw new Error('You cannot manage offers for this seller.');
  }

  const patch: Record<string, unknown> = {
    status: input.action,
    updated_at: new Date().toISOString(),
    reserved_until:
      input.action === 'accepted'
        ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        : null,
  };
  if (input.action === 'countered') {
    if (!input.counterAmountCents) {
      throw new Error('Counter amount is required.');
    }
    patch.counter_amount_cents = input.counterAmountCents;
  }

  await client.from('shop_offers').update(patch).eq('id', input.offerId);
}

export async function createShopListingForContext(
  context: ShopContext,
  input: {
    sellerSlug: string;
    categorySlug: string;
    title: LocalizedText;
    excerpt: LocalizedText;
    description: LocalizedText[];
    condition: ShopCondition;
    priceCents: number;
    quantityAvailable: number;
    allowOffers: boolean;
    allowLocalPickup: boolean;
    pickupCity: string;
    shippingMethods: ShopShippingMethod[];
    returnPolicy: LocalizedText;
    itemSpecifics: Record<string, string>;
    imageUrls: string[];
  }
) {
  const client = serviceClient();
  if (!client) {
    return createShopListing({
      sellerSlug: input.sellerSlug,
      categorySlug: input.categorySlug,
      title: input.title,
      excerpt: input.excerpt,
      description: input.description,
      condition: input.condition,
      priceCents: input.priceCents,
      quantityAvailable: input.quantityAvailable,
      allowOffers: input.allowOffers,
      allowLocalPickup: input.allowLocalPickup,
      pickupCity: input.pickupCity,
      shippingMethods: input.shippingMethods,
      returnPolicy: input.returnPolicy,
      itemSpecifics: input.itemSpecifics,
      imageUrls: input.imageUrls,
    });
  }

  const { data: seller } = await client
    .from('shop_sellers')
    .select('id, profile_id')
    .eq('slug', input.sellerSlug)
    .maybeSingle();
  const { data: category } = await client
    .from('shop_categories')
    .select('id')
    .eq('slug', input.categorySlug)
    .maybeSingle();

  if (!seller || !category) {
    throw new Error('Seller or category not found.');
  }
  if (seller.profile_id !== context.profile.id && !['moderator', 'admin'].includes(context.role)) {
    throw new Error('You cannot submit listings for this seller.');
  }

  const slugBase = t(input.title, 'en')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const { data: existing } = await client
    .from('shop_listings')
    .select('id')
    .ilike('slug', `${slugBase}%`);
  const slug = existing?.length ? `${slugBase}-${existing.length + 1}` : slugBase;

  const { data: listing, error } = await client
    .from('shop_listings')
    .insert({
      slug,
      seller_id: seller.id,
      category_id: category.id,
      title_en: input.title.en,
      title_zh_tw: input.title.zh ?? null,
      excerpt_en: input.excerpt.en,
      excerpt_zh_tw: input.excerpt.zh ?? null,
      description_en: input.description.map((paragraph) => paragraph.en),
      description_zh_tw: input.description.map((paragraph) => paragraph.zh ?? null),
      condition: input.condition,
      status: 'pending_review',
      price_cents: input.priceCents,
      quantity_available: input.quantityAvailable,
      allow_offers: input.allowOffers,
      allow_local_pickup: input.allowLocalPickup,
      pickup_city: input.pickupCity,
      shipping_methods: input.shippingMethods,
      return_policy_en: input.returnPolicy.en,
      return_policy_zh_tw: input.returnPolicy.zh ?? null,
      item_specifics_json: input.itemSpecifics,
      tags: ['user-submission'],
    })
    .select('id, slug')
    .maybeSingle();

  if (error || !listing) {
    throw new Error('Unable to submit listing.');
  }

  if (input.imageUrls.length > 0) {
    await client.from('shop_listing_images').insert(
      input.imageUrls.filter(Boolean).map((url, index) => ({
        listing_id: listing.id,
        url,
        alt_en: input.title.en,
        alt_zh_tw: input.title.zh ?? null,
        is_primary: index === 0,
        sort_order: index,
      }))
    );
  }

  return { slug: listing.slug };
}

export async function updateShopListingStatusForContext(
  context: ShopContext,
  listingSlug: string,
  status: ShopListing['status']
) {
  const client = serviceClient();
  if (!client) {
    return updateShopListingStatus(listingSlug, status, context.profile.slug);
  }

  const { data: listing } = await client
    .from('shop_listings')
    .select('id, seller_id')
    .eq('slug', listingSlug)
    .maybeSingle();
  if (!listing) {
    throw new Error('Listing not found.');
  }

  const { data: seller } = await client
    .from('shop_sellers')
    .select('profile_id')
    .eq('id', listing.seller_id)
    .maybeSingle();
  if (!seller || (seller.profile_id !== context.profile.id && !['moderator', 'admin'].includes(context.role))) {
    throw new Error('You cannot update this listing.');
  }

  await client
    .from('shop_listings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', listing.id);
}

export async function sendShopMessageForContext(
  context: ShopContext,
  input: {
    sellerSlug: string;
    body: string;
    listingSlug?: string;
    orderId?: string;
    topic: 'pre_sale' | 'order_support' | 'pickup';
  }
) {
  const client = serviceClient();
  if (!client) {
    return sendShopMessage({
      buyerProfileSlug: context.profile.slug,
      sellerSlug: input.sellerSlug,
      senderProfileSlug: context.profile.slug,
      body: input.body,
      listingSlug: input.listingSlug,
      orderId: input.orderId,
      topic: input.topic,
    });
  }

  const { data: seller } = await client
    .from('shop_sellers')
    .select('id')
    .eq('slug', input.sellerSlug)
    .maybeSingle();
  if (!seller) {
    throw new Error('Seller not found.');
  }

  let listingId: string | null = null;
  if (input.listingSlug) {
    const { data: listing } = await client
      .from('shop_listings')
      .select('id')
      .eq('slug', input.listingSlug)
      .maybeSingle();
    listingId = listing?.id ?? null;
  }

  const flagged = /\bblast you|scam|threat\b/i.test(input.body);
  const { data: existingConversation } = await client
    .from('shop_conversations')
    .select('id')
    .eq('buyer_profile_id', context.profile.id)
    .eq('seller_id', seller.id)
    .eq('listing_id', listingId)
    .eq('order_id', input.orderId ?? null)
    .eq('topic', input.topic)
    .maybeSingle();

  let conversationId = existingConversation?.id;
  if (!conversationId) {
    const { data: createdConversation } = await client
      .from('shop_conversations')
      .insert({
        listing_id: listingId,
        order_id: input.orderId ?? null,
        buyer_profile_id: context.profile.id,
        seller_id: seller.id,
        topic: input.topic,
        last_message_preview: input.body.slice(0, 96),
      })
      .select('id')
      .maybeSingle();
    conversationId = createdConversation?.id;
  } else {
    await client
      .from('shop_conversations')
      .update({
        updated_at: new Date().toISOString(),
        last_message_preview: input.body.slice(0, 96),
      })
      .eq('id', conversationId);
  }

  if (!conversationId) {
    throw new Error('Unable to create a conversation.');
  }

  await client.from('shop_messages').insert({
    conversation_id: conversationId,
    sender_profile_id: context.profile.id,
    body: input.body,
    flagged,
  });
}

export async function requestShopReturnForContext(context: ShopContext, orderId: string, reason: string) {
  const client = serviceClient();
  if (!client) {
    return requestShopReturn(orderId, reason, context.profile.slug);
  }

  const { data: existing } = await client
    .from('shop_returns')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle();
  if (existing) {
    throw new Error('A return already exists for this order.');
  }

  await client.from('shop_returns').insert({
    order_id: orderId,
    status: 'requested',
    reason,
    seller_respond_by: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  });
}

export async function openShopCaseForContext(context: ShopContext, orderId: string, reason: string) {
  const client = serviceClient();
  if (!client) {
    return openShopCase(orderId, reason, context.profile.slug);
  }

  const { data: existing } = await client
    .from('shop_cases')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle();
  if (existing) {
    throw new Error('A case already exists for this order.');
  }

  const { data: order } = await client
    .from('shop_orders')
    .select('seller_id')
    .eq('id', orderId)
    .maybeSingle();
  if (!order) {
    throw new Error('Order not found.');
  }

  await client.from('shop_cases').insert({
    order_id: orderId,
    opened_by_profile_id: context.profile.id,
    seller_id: order.seller_id,
    status: 'seller_action_required',
    reason,
    seller_respond_by: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  });
}

export async function markShopOrderShippedForContext(
  context: ShopContext,
  orderId: string,
  carrier: string,
  trackingNumber: string
) {
  const client = serviceClient();
  if (!client) {
    return markShopOrderShipped(orderId, carrier, trackingNumber);
  }

  const { data: order } = await client
    .from('shop_orders')
    .select('id, seller_id')
    .eq('id', orderId)
    .maybeSingle();
  if (!order) {
    throw new Error('Order not found.');
  }
  const { data: seller } = await client
    .from('shop_sellers')
    .select('profile_id')
    .eq('id', order.seller_id)
    .maybeSingle();
  if (!seller || (seller.profile_id !== context.profile.id && !['moderator', 'admin'].includes(context.role))) {
    throw new Error('You cannot update shipping for this order.');
  }

  const shippedAt = new Date().toISOString();
  await client
    .from('shop_orders')
    .update({ status: 'shipped', updated_at: shippedAt })
    .eq('id', order.id);

  const { data: shipment } = await client
    .from('shop_shipments')
    .select('id')
    .eq('order_id', order.id)
    .maybeSingle();

  if (shipment) {
    await client
      .from('shop_shipments')
      .update({
        method: 'standard',
        carrier,
        tracking_number: trackingNumber,
        shipped_at: shippedAt,
      })
      .eq('id', shipment.id);
  } else {
    await client.from('shop_shipments').insert({
      order_id: order.id,
      method: 'standard',
      carrier,
      tracking_number: trackingNumber,
      shipped_at: shippedAt,
    });
  }
}

export async function confirmShopOrderPickupForContext(context: ShopContext, orderId: string, pickupCode?: string) {
  const client = serviceClient();
  if (!client) {
    return confirmShopOrderPickup(orderId, pickupCode);
  }

  const { data: shipment } = await client
    .from('shop_shipments')
    .select('id, pickup_code, method')
    .eq('order_id', orderId)
    .maybeSingle();
  if (!shipment || shipment.method !== 'local_pickup') {
    throw new Error('Only pickup orders can be confirmed here.');
  }
  if (pickupCode && shipment.pickup_code && pickupCode !== shipment.pickup_code) {
    throw new Error('Pickup code does not match.');
  }

  const pickedUpAt = new Date().toISOString();
  await client
    .from('shop_shipments')
    .update({ picked_up_at: pickedUpAt })
    .eq('id', shipment.id);
  await client
    .from('shop_orders')
    .update({ status: 'delivered', updated_at: pickedUpAt })
    .eq('id', orderId);
}

export async function leaveShopFeedbackForContext(
  context: ShopContext,
  input: {
    orderId: string;
    sellerSlug: string;
    sentiment: ShopFeedbackSentiment;
    title: LocalizedText;
    comment: LocalizedText;
  }
) {
  const client = serviceClient();
  if (!client) {
    return leaveShopFeedback({
      orderId: input.orderId,
      sellerSlug: input.sellerSlug,
      buyerProfileSlug: context.profile.slug,
      sentiment: input.sentiment,
      title: input.title,
      comment: input.comment,
    });
  }

  const { data: existing } = await client
    .from('shop_feedback')
    .select('id')
    .eq('order_id', input.orderId)
    .maybeSingle();
  if (existing) {
    throw new Error('Feedback has already been left for this order.');
  }
  const { data: seller } = await client
    .from('shop_sellers')
    .select('id')
    .eq('slug', input.sellerSlug)
    .maybeSingle();
  if (!seller) {
    throw new Error('Seller not found.');
  }

  await client.from('shop_feedback').insert({
    order_id: input.orderId,
    seller_id: seller.id,
    buyer_profile_id: context.profile.id,
    sentiment: input.sentiment,
    title_en: input.title.en,
    title_zh_tw: input.title.zh ?? null,
    comment_en: input.comment.en,
    comment_zh_tw: input.comment.zh ?? null,
  });
}

export async function resolveShopCaseForContext(
  context: ShopContext,
  caseId: string,
  status: Extract<ShopCaseStatus, 'resolved' | 'closed'>,
  notes: string
) {
  const client = serviceClient();
  if (!client) {
    return resolveShopCase(caseId, status, notes);
  }
  if (!['moderator', 'admin'].includes(context.role)) {
    throw new Error('Only admins can resolve marketplace cases.');
  }

  await client
    .from('shop_cases')
    .update({
      status,
      resolution_notes: notes,
      escalated_at: status === 'resolved' ? new Date().toISOString() : null,
    })
    .eq('id', caseId);
}

export async function approveShopSellerForContext(context: ShopContext, sellerSlug: string) {
  const client = serviceClient();
  if (!client) {
    throw new Error('Shop admin approval requires Supabase configuration.');
  }
  if (!['moderator', 'admin'].includes(context.role)) {
    throw new Error('Only moderators and admins can approve sellers.');
  }

  await client
    .from('shop_sellers')
    .update({ approved: true, updated_at: new Date().toISOString() })
    .eq('slug', sellerSlug);
}

export async function getRuntimeShopContextForProfileSlug(profileSlug: string) {
  return createRuntimeContext(profileSlug);
}

export async function createLegacyCheckoutFallbackForContext(
  context: ShopContext,
  input: {
    offerId?: string;
    shippingAddress?: string;
    paymentMethod?: string;
  }
) {
  if (input.offerId) {
    const order = checkoutAcceptedShopOffer({
      profileSlug: context.profile.slug,
      offerId: input.offerId,
      shippingAddress: input.shippingAddress,
      paymentMethod: input.paymentMethod,
    });
    return {
      mode: 'completed' as const,
      orderIds: [order.id],
    };
  }

  const orders = checkoutShopCart({
    profileSlug: context.profile.slug,
    shippingAddress: input.shippingAddress,
    paymentMethod: input.paymentMethod,
  });
  return {
    mode: 'completed' as const,
    orderIds: orders.map((order) => order.id),
  };
}
