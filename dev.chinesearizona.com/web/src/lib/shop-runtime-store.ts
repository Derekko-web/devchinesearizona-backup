import { shopSeedState, type ShopSeedState } from '@/data/shop-data';
import { recordAnalyticsEvent } from '@/lib/runtime-store';
import type {
  LocalizedText,
  ShopAuditEntry,
  ShopCart,
  ShopCase,
  ShopCaseStatus,
  ShopConversation,
  ShopFeedback,
  ShopFeedbackSentiment,
  ShopListing,
  ShopListingStatus,
  ShopMessage,
  ShopOffer,
  ShopOfferStatus,
  ShopOrder,
  ShopOrderItem,
  ShopPayout,
  ShopReturn,
  ShopSavedSearch,
  ShopShippingMethod,
} from '@/lib/types';

type CreateShopListingInput = {
  sellerSlug: string;
  categorySlug: string;
  title: LocalizedText;
  excerpt: LocalizedText;
  description: LocalizedText[];
  condition: ShopListing['condition'];
  priceCents: number;
  quantityAvailable: number;
  allowOffers: boolean;
  allowLocalPickup: boolean;
  pickupCity: string;
  shippingMethods: ShopShippingMethod[];
  returnPolicy: LocalizedText;
  itemSpecifics: Record<string, string>;
  imageUrls: string[];
};

type CheckoutInput = {
  profileSlug: string;
  shippingAddress?: string;
  paymentMethod?: string;
};

type SendShopMessageInput = {
  buyerProfileSlug: string;
  sellerSlug: string;
  senderProfileSlug: string;
  body: string;
  listingSlug?: string;
  orderId?: string;
  topic: ShopConversation['topic'];
};

function cloneSeedState(): ShopSeedState {
  return JSON.parse(JSON.stringify(shopSeedState)) as ShopSeedState;
}

let state = cloneSeedState();

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function addHours(base: string, hours: number): string {
  return new Date(new Date(base).getTime() + hours * 60 * 60 * 1000).toISOString();
}

function addDays(base: string, days: number): string {
  return new Date(new Date(base).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function recalculateListingInventory(listing: ShopListing) {
  if (listing.variants.length > 0) {
    listing.quantityAvailable = listing.variants.reduce(
      (sum, variant) => sum + Math.max(0, variant.quantityAvailable),
      0
    );
  }

  if (listing.quantityAvailable <= 0 && listing.status === 'active') {
    listing.status = 'sold_out';
  }

  if (listing.quantityAvailable > 0 && listing.status === 'sold_out') {
    listing.status = 'active';
  }
}

function getListing(slug: string): ShopListing {
  const listing = state.listings.find((item) => item.slug === slug);
  if (!listing) {
    throw new Error('Listing not found.');
  }

  return listing;
}

function getOrder(orderId: string): ShopOrder {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) {
    throw new Error('Order not found.');
  }

  return order;
}

function getOffer(offerId: string): ShopOffer {
  const offer = state.offers.find((item) => item.id === offerId);
  if (!offer) {
    throw new Error('Offer not found.');
  }

  return offer;
}

function getOrCreateCart(profileSlug: string): ShopCart {
  const existing = state.carts.find((cart) => cart.profileSlug === profileSlug);
  if (existing) {
    return existing;
  }

  const cart: ShopCart = {
    profileSlug,
    items: [],
    updatedAt: nowIso(),
  };
  state.carts.push(cart);
  return cart;
}

function addAuditEntry(entry: Omit<ShopAuditEntry, 'id' | 'createdAt'>) {
  state.auditEntries.unshift({
    id: randomId('audit_shop'),
    createdAt: nowIso(),
    ...entry,
  });
}

function decrementInventory(listing: ShopListing, variantId: string | undefined, quantity: number) {
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }

  if (variantId) {
    const variant = listing.variants.find((item) => item.id === variantId);
    if (!variant) {
      throw new Error('Variant not found.');
    }

    if (variant.quantityAvailable < quantity) {
      throw new Error('Not enough inventory for that option.');
    }

    variant.quantityAvailable -= quantity;
    recalculateListingInventory(listing);
  } else {
    if (listing.quantityAvailable < quantity) {
      throw new Error('Not enough inventory.');
    }

    listing.quantityAvailable -= quantity;
    recalculateListingInventory(listing);
  }

  listing.soldCount += quantity;
  listing.updatedAt = nowIso();
}

function createOrderItem(
  listing: ShopListing,
  quantity: number,
  variantId?: string,
  overrideUnitPriceCents?: number
): ShopOrderItem {
  const variant = variantId
    ? listing.variants.find((item) => item.id === variantId)
    : undefined;

  return {
    id: randomId('ord_item'),
    listingSlug: listing.slug,
    sellerSlug: listing.sellerSlug,
    title: listing.title,
    unitPriceCents: overrideUnitPriceCents ?? variant?.priceCents ?? listing.priceCents,
    quantity,
    variantLabel: variant?.label,
    snapshotCondition: listing.condition,
  };
}

function createPayout(order: ShopOrder): ShopPayout {
  const payout: ShopPayout = {
    id: randomId('payout'),
    sellerSlug: order.sellerSlug,
    orderId: order.id,
    amountCents: Math.max(0, Math.round(order.totalCents * 0.88)),
    status: 'pending',
    availableAt: addDays(nowIso(), 2),
  };
  state.payouts.unshift(payout);
  return payout;
}

export function getShopCategoriesState() {
  return state.categories;
}

export function getShopSellersState() {
  return state.sellers;
}

export function getShopListingsState() {
  return state.listings;
}

export function getShopSavedSearchesState() {
  return state.savedSearches;
}

export function getShopWatchlistItemsState() {
  return state.watchlistItems;
}

export function getShopSavedSellersState() {
  return state.savedSellers;
}

export function getShopOffersState() {
  return state.offers;
}

export function getShopCartsState() {
  return state.carts;
}

export function getShopOrdersState() {
  return state.orders;
}

export function getShopReturnsState() {
  return state.returns;
}

export function getShopCasesState() {
  return state.cases;
}

export function getShopFeedbackState() {
  return state.feedback;
}

export function getShopPayoutsState() {
  return state.payouts;
}

export function getShopConversationsState() {
  return state.conversations;
}

export function getShopMessagesState() {
  return state.messages;
}

export function getShopAuditEntriesState() {
  return state.auditEntries;
}

export function resetShopRuntimeStore() {
  state = cloneSeedState();
}

export function toggleShopWatchlist(profileSlug: string, listingSlug: string) {
  const existing = state.watchlistItems.find(
    (item) => item.profileSlug === profileSlug && item.listingSlug === listingSlug
  );
  const listing = getListing(listingSlug);

  if (existing) {
    state.watchlistItems = state.watchlistItems.filter((item) => item.id !== existing.id);
    listing.watcherCount = Math.max(0, listing.watcherCount - 1);
    recordAnalyticsEvent('shop_watchlist_remove', listingSlug, '/shop/watchlist');
    return { saved: false };
  }

  state.watchlistItems.unshift({
    id: randomId('watch'),
    profileSlug,
    listingSlug,
    createdAt: nowIso(),
  });
  listing.watcherCount += 1;
  recordAnalyticsEvent('shop_watchlist_add', listingSlug, '/shop/watchlist');
  return { saved: true };
}

export function toggleShopSavedSeller(profileSlug: string, sellerSlug: string) {
  const existing = state.savedSellers.find(
    (item) => item.profileSlug === profileSlug && item.sellerSlug === sellerSlug
  );

  if (existing) {
    state.savedSellers = state.savedSellers.filter((item) => item.id !== existing.id);
    recordAnalyticsEvent('shop_saved_seller_remove', sellerSlug, '/shop/seller');
    return { saved: false };
  }

  state.savedSellers.unshift({
    id: randomId('saved_seller'),
    profileSlug,
    sellerSlug,
    createdAt: nowIso(),
  });
  recordAnalyticsEvent('shop_saved_seller_add', sellerSlug, '/shop/seller');
  return { saved: true };
}

export function createShopSavedSearch(input: Omit<ShopSavedSearch, 'id' | 'createdAt'>) {
  const created: ShopSavedSearch = {
    id: randomId('search'),
    createdAt: nowIso(),
    ...input,
  };
  state.savedSearches.unshift(created);
  recordAnalyticsEvent('shop_saved_search_create', undefined, '/shop/saved-searches');
  return created;
}

export function deleteShopSavedSearch(profileSlug: string, id: string) {
  const before = state.savedSearches.length;
  state.savedSearches = state.savedSearches.filter(
    (item) => !(item.profileSlug === profileSlug && item.id === id)
  );
  return state.savedSearches.length !== before;
}

export function addShopCartItem(
  profileSlug: string,
  listingSlug: string,
  quantity = 1,
  variantId?: string
) {
  const listing = getListing(listingSlug);
  const cart = getOrCreateCart(profileSlug);
  const existing = cart.items.find(
    (item) => item.listingSlug === listingSlug && item.variantId === variantId
  );
  const availableQuantity = variantId
    ? listing.variants.find((item) => item.id === variantId)?.quantityAvailable ?? 0
    : listing.quantityAvailable;

  if (availableQuantity < quantity) {
    throw new Error('Not enough inventory available.');
  }

  if (existing) {
    if (existing.quantity + quantity > availableQuantity) {
      throw new Error('Not enough inventory available.');
    }
    existing.quantity += quantity;
  } else {
    cart.items.push({
      id: randomId('cart_item'),
      listingSlug,
      variantId,
      quantity,
    });
  }

  cart.updatedAt = nowIso();
  recordAnalyticsEvent('shop_add_to_cart', listingSlug, '/shop/cart');
  return cart;
}

export function removeShopCartItem(profileSlug: string, itemId: string) {
  const cart = getOrCreateCart(profileSlug);
  cart.items = cart.items.filter((item) => item.id !== itemId);
  cart.updatedAt = nowIso();
  return cart;
}

export function clearShopCart(profileSlug: string) {
  const cart = getOrCreateCart(profileSlug);
  cart.items = [];
  cart.updatedAt = nowIso();
  return cart;
}

export function createShopOffer(input: {
  listingSlug: string;
  variantId?: string;
  buyerProfileSlug: string;
  sellerSlug: string;
  amountCents: number;
  message?: string;
}) {
  const listing = getListing(input.listingSlug);
  if (!listing.allowOffers) {
    throw new Error('Offers are not enabled for this listing.');
  }

  const createdAt = nowIso();
  const offer: ShopOffer = {
    id: randomId('offer'),
    listingSlug: input.listingSlug,
    variantId: input.variantId,
    buyerProfileSlug: input.buyerProfileSlug,
    sellerSlug: input.sellerSlug,
    amountCents: input.amountCents,
    message: input.message,
    status: 'pending',
    createdAt,
    updatedAt: createdAt,
    expiresAt: addHours(createdAt, 48),
  };

  state.offers.unshift(offer);
  recordAnalyticsEvent('shop_offer_submit', input.listingSlug, '/shop/item');
  addAuditEntry({
    actorProfileSlug: input.buyerProfileSlug,
    action: 'offer_submitted',
    entityType: 'shop_listing',
    entitySlug: input.listingSlug,
    details: `Offer submitted for $${(input.amountCents / 100).toFixed(2)}.`,
  });
  return offer;
}

export function respondToShopOffer(input: {
  offerId: string;
  action: Extract<ShopOfferStatus, 'accepted' | 'declined' | 'countered'>;
  counterAmountCents?: number;
  actorProfileSlug?: string;
}) {
  const offer = getOffer(input.offerId);
  if (offer.status !== 'pending' && offer.status !== 'countered') {
    throw new Error('This offer can no longer be changed.');
  }

  offer.status = input.action;
  offer.updatedAt = nowIso();
  if (input.action === 'countered') {
    if (!input.counterAmountCents) {
      throw new Error('Counter amount is required.');
    }
    offer.counterAmountCents = input.counterAmountCents;
  }
  if (input.action === 'accepted') {
    offer.reservedUntil = addHours(offer.updatedAt, 48);
  }

  recordAnalyticsEvent(`shop_offer_${input.action}`, offer.listingSlug, '/dashboard/shop/offers');
  addAuditEntry({
    actorProfileSlug: input.actorProfileSlug,
    action: `offer_${input.action}`,
    entityType: 'shop_listing',
    entitySlug: offer.listingSlug,
    details:
      input.action === 'countered'
        ? `Counter sent for $${((input.counterAmountCents ?? 0) / 100).toFixed(2)}.`
        : `Offer ${input.action}.`,
  });
  return offer;
}

export function expireStaleShopOffers(referenceTime = nowIso()) {
  for (const offer of state.offers) {
    if (
      (offer.status === 'pending' || offer.status === 'countered' || offer.status === 'accepted') &&
      new Date(offer.expiresAt).getTime() < new Date(referenceTime).getTime()
    ) {
      offer.status = 'expired';
      offer.reservedUntil = undefined;
      offer.updatedAt = referenceTime;
    }
  }
}

export function createShopListing(input: CreateShopListingInput) {
  const slugBase = slugify(input.title.en);
  const slug = state.listings.some((item) => item.slug === slugBase)
    ? `${slugBase}-${state.listings.length + 1}`
    : slugBase;
  const createdAt = nowIso();
  const listing: ShopListing = {
    slug,
    sellerSlug: input.sellerSlug,
    categorySlug: input.categorySlug,
    title: input.title,
    excerpt: input.excerpt,
    description: input.description,
    condition: input.condition,
    status: 'pending_review',
    priceCents: input.priceCents,
    currency: 'USD',
    quantityAvailable: input.quantityAvailable,
    soldCount: 0,
    allowOffers: input.allowOffers,
    allowLocalPickup: input.allowLocalPickup,
    featured: false,
    createdAt,
    updatedAt: createdAt,
    pickupCity: input.pickupCity,
    shippingMethods: input.shippingMethods,
    returnPolicy: input.returnPolicy,
    itemSpecifics: input.itemSpecifics,
    tags: ['user-submission'],
    viewCount: 0,
    watcherCount: 0,
    images: input.imageUrls
      .filter(Boolean)
      .map((url, index) => ({
        id: `${slug}-image-${index + 1}`,
        url,
        alt: input.title,
        isPrimary: index === 0,
      })),
    variants: [],
  };

  state.listings.unshift(listing);
  recordAnalyticsEvent('shop_listing_submission', slug, '/shop/sell');
  addAuditEntry({
    actorProfileSlug: state.sellers.find((seller) => seller.slug === input.sellerSlug)?.profileSlug,
    action: 'listing_submitted_for_review',
    entityType: 'shop_listing',
    entitySlug: slug,
    details: `Listing submitted in ${input.categorySlug}.`,
  });
  return listing;
}

export function updateShopListingStatus(slug: string, status: ShopListingStatus, actorProfileSlug?: string) {
  const listing = getListing(slug);
  listing.status = status;
  listing.updatedAt = nowIso();
  addAuditEntry({
    actorProfileSlug,
    action: `listing_${status}`,
    entityType: 'shop_listing',
    entitySlug: slug,
    details: `Listing moved to ${status}.`,
  });
  return listing;
}

export function connectShopSellerStripe(sellerSlug: string) {
  const seller = state.sellers.find((item) => item.slug === sellerSlug);
  if (!seller) {
    throw new Error('Seller not found.');
  }

  seller.stripeAccountStatus =
    seller.stripeAccountStatus === 'not_started' ? 'pending' : 'active';
  addAuditEntry({
    actorProfileSlug: seller.profileSlug,
    action: 'stripe_connect_updated',
    entityType: 'shop_seller',
    entitySlug: sellerSlug,
    details: `Stripe Connect state is now ${seller.stripeAccountStatus}.`,
  });
  return seller;
}

export function approveShopSeller(sellerSlug: string, actorProfileSlug?: string) {
  const seller = state.sellers.find((item) => item.slug === sellerSlug);
  if (!seller) {
    throw new Error('Seller not found.');
  }

  seller.approved = true;
  addAuditEntry({
    actorProfileSlug,
    action: 'seller_approved',
    entityType: 'shop_seller',
    entitySlug: sellerSlug,
    details: 'Seller approved for live marketplace listings.',
  });
  return seller;
}

export function sendShopMessage(input: SendShopMessageInput) {
  let conversation = state.conversations.find(
    (item) =>
      item.buyerProfileSlug === input.buyerProfileSlug &&
      item.sellerSlug === input.sellerSlug &&
      item.listingSlug === input.listingSlug &&
      item.orderId === input.orderId &&
      item.topic === input.topic
  );

  if (!conversation) {
    conversation = {
      id: randomId('conv'),
      listingSlug: input.listingSlug,
      orderId: input.orderId,
      buyerProfileSlug: input.buyerProfileSlug,
      sellerSlug: input.sellerSlug,
      topic: input.topic,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastMessagePreview: input.body.slice(0, 96),
    };
    state.conversations.unshift(conversation);
  } else {
    conversation.updatedAt = nowIso();
    conversation.lastMessagePreview = input.body.slice(0, 96);
  }

  const message: ShopMessage = {
    id: randomId('msg'),
    conversationId: conversation.id,
    senderProfileSlug: input.senderProfileSlug,
    body: input.body,
    createdAt: nowIso(),
    flagged: /\bblast you|scam|threat\b/i.test(input.body),
  };
  state.messages.push(message);
  recordAnalyticsEvent('shop_message_sent', input.listingSlug ?? input.orderId, '/shop');
  if (message.flagged) {
    addAuditEntry({
      actorProfileSlug: input.senderProfileSlug,
      action: 'message_flagged',
      entityType: 'shop_message',
      entitySlug: message.id,
      details: 'Message matched the automatic flagging policy.',
    });
  }
  return { conversation, message };
}

export function checkoutShopCart(input: CheckoutInput) {
  expireStaleShopOffers();
  const cart = getOrCreateCart(input.profileSlug);
  if (cart.items.length === 0) {
    throw new Error('Your cart is empty.');
  }

  const createdAt = nowIso();
  const grouped = new Map<
    string,
    {
      items: ShopOrderItem[];
      shippingCents: number;
      method: ShopShippingMethod;
    }
  >();

  for (const cartItem of cart.items) {
    const listing = getListing(cartItem.listingSlug);
    decrementInventory(listing, cartItem.variantId, cartItem.quantity);
    const method = listing.shippingMethods.includes('standard')
      ? 'standard'
      : listing.shippingMethods[0] ?? 'local_pickup';
    const shippingCents = method === 'local_pickup' ? 0 : 1200;
    const sellerGroup = grouped.get(listing.sellerSlug) ?? {
      items: [],
      shippingCents,
      method,
    };

    sellerGroup.items.push(
      createOrderItem(listing, cartItem.quantity, cartItem.variantId)
    );
    grouped.set(listing.sellerSlug, sellerGroup);
  }

  const orders: ShopOrder[] = [];
  for (const [sellerSlug, group] of grouped.entries()) {
    const subtotalCents = group.items.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0
    );
    const order: ShopOrder = {
      id: randomId('ord'),
      buyerProfileSlug: input.profileSlug,
      sellerSlug,
      status: 'paid',
      createdAt,
      updatedAt: createdAt,
      subtotalCents,
      shippingCents: group.shippingCents,
      totalCents: subtotalCents + group.shippingCents,
      paymentMethod: input.paymentMethod ?? 'Simulated card checkout',
      shippingAddress: group.method === 'local_pickup' ? undefined : input.shippingAddress,
      items: group.items,
      shipment:
        group.method === 'local_pickup'
          ? {
              id: randomId('ship'),
              orderId: 'pending',
              method: 'local_pickup',
              pickupCode: String(Math.floor(100000 + Math.random() * 900000)),
            }
          : undefined,
    };
    if (order.shipment) {
      order.shipment.orderId = order.id;
    }
    state.orders.unshift(order);
    createPayout(order);
    orders.push(order);
  }

  cart.items = [];
  cart.updatedAt = createdAt;
  recordAnalyticsEvent('shop_checkout_complete', undefined, '/shop/checkout');
  addAuditEntry({
    actorProfileSlug: input.profileSlug,
    action: 'checkout_completed',
    entityType: 'shop_order',
    entitySlug: orders.map((order) => order.id).join(','),
    details: `Created ${orders.length} seller-specific order(s).`,
  });
  return orders;
}

export function checkoutAcceptedShopOffer(input: CheckoutInput & { offerId: string }) {
  expireStaleShopOffers();
  const offer = getOffer(input.offerId);
  if (offer.buyerProfileSlug !== input.profileSlug) {
    throw new Error('That offer does not belong to the current buyer.');
  }
  if (offer.status !== 'accepted') {
    throw new Error('This offer is not ready for checkout.');
  }
  if (state.orders.some((order) => order.offerId === offer.id)) {
    throw new Error('This offer has already been used.');
  }
  if (offer.reservedUntil && new Date(offer.reservedUntil).getTime() < Date.now()) {
    offer.status = 'expired';
    throw new Error('This accepted offer has expired.');
  }

  const listing = getListing(offer.listingSlug);
  decrementInventory(listing, offer.variantId, 1);

  const unitPriceCents = offer.counterAmountCents ?? offer.amountCents;
  const method = listing.shippingMethods.includes('standard')
    ? 'standard'
    : listing.shippingMethods[0] ?? 'local_pickup';
  const shippingCents = method === 'local_pickup' ? 0 : 1200;
  const createdAt = nowIso();

  const order: ShopOrder = {
    id: randomId('ord'),
    buyerProfileSlug: input.profileSlug,
    sellerSlug: offer.sellerSlug,
    status: 'paid',
    createdAt,
    updatedAt: createdAt,
    subtotalCents: unitPriceCents,
    shippingCents,
    totalCents: unitPriceCents + shippingCents,
    paymentMethod: input.paymentMethod ?? 'Offer checkout',
    shippingAddress: method === 'local_pickup' ? undefined : input.shippingAddress,
    offerId: offer.id,
    items: [createOrderItem(listing, 1, offer.variantId, unitPriceCents)],
    shipment:
      method === 'local_pickup'
        ? {
            id: randomId('ship'),
            orderId: 'pending',
            method: 'local_pickup',
            pickupCode: String(Math.floor(100000 + Math.random() * 900000)),
          }
        : undefined,
  };
  if (order.shipment) {
    order.shipment.orderId = order.id;
  }
  state.orders.unshift(order);
  createPayout(order);
  offer.reservedUntil = undefined;
  offer.updatedAt = createdAt;
  addAuditEntry({
    actorProfileSlug: input.profileSlug,
    action: 'accepted_offer_checked_out',
    entityType: 'shop_order',
    entitySlug: order.id,
    details: `Order created from accepted offer ${offer.id}.`,
  });
  recordAnalyticsEvent('shop_offer_checkout_complete', offer.listingSlug, '/shop/checkout');
  return order;
}

export function markShopOrderShipped(orderId: string, carrier: string, trackingNumber: string) {
  const order = getOrder(orderId);
  const shippedAt = nowIso();
  order.status = 'shipped';
  order.updatedAt = shippedAt;
  order.shipment = {
    id: order.shipment?.id ?? randomId('ship'),
    orderId: order.id,
    method: order.shipment?.method ?? 'standard',
    carrier,
    trackingNumber,
    shippedAt,
  };
  addAuditEntry({
    actorProfileSlug: undefined,
    action: 'order_marked_shipped',
    entityType: 'shop_order',
    entitySlug: orderId,
    details: `${carrier} tracking ${trackingNumber}.`,
  });
  return order;
}

export function confirmShopOrderPickup(orderId: string, pickupCode?: string) {
  const order = getOrder(orderId);
  if (order.shipment?.method !== 'local_pickup') {
    throw new Error('Only pickup orders can be confirmed here.');
  }
  if (pickupCode && order.shipment.pickupCode && pickupCode !== order.shipment.pickupCode) {
    throw new Error('Pickup code does not match.');
  }

  const pickedUpAt = nowIso();
  order.status = 'delivered';
  order.updatedAt = pickedUpAt;
  order.shipment = {
    ...order.shipment,
    pickedUpAt,
  };
  addAuditEntry({
    action: 'pickup_confirmed',
    entityType: 'shop_order',
    entitySlug: orderId,
    details: 'Local pickup was confirmed.',
  });
  return order;
}

export function requestShopReturn(orderId: string, reason: string, actorProfileSlug: string) {
  if (state.returns.some((item) => item.orderId === orderId)) {
    throw new Error('A return already exists for this order.');
  }

  const createdAt = nowIso();
  const request: ShopReturn = {
    id: randomId('return'),
    orderId,
    status: 'requested',
    reason,
    requestedAt: createdAt,
    sellerRespondBy: addDays(createdAt, 3),
  };
  state.returns.unshift(request);
  addAuditEntry({
    actorProfileSlug,
    action: 'return_requested',
    entityType: 'shop_order',
    entitySlug: orderId,
    details: reason,
  });
  recordAnalyticsEvent('shop_return_requested', orderId, '/shop/orders');
  return request;
}

export function openShopCase(orderId: string, reason: string, actorProfileSlug: string) {
  if (state.cases.some((item) => item.orderId === orderId)) {
    throw new Error('A case already exists for this order.');
  }

  const order = getOrder(orderId);
  const openedAt = nowIso();
  const created: ShopCase = {
    id: randomId('case'),
    orderId,
    openedByProfileSlug: actorProfileSlug,
    sellerSlug: order.sellerSlug,
    status: 'seller_action_required',
    reason,
    openedAt,
    sellerRespondBy: addDays(openedAt, 3),
  };
  state.cases.unshift(created);
  addAuditEntry({
    actorProfileSlug,
    action: 'case_opened',
    entityType: 'shop_order',
    entitySlug: orderId,
    details: reason,
  });
  recordAnalyticsEvent('shop_case_opened', orderId, '/shop/orders');
  return created;
}

export function resolveShopCase(caseId: string, status: Extract<ShopCaseStatus, 'resolved' | 'closed'>, notes: string) {
  const current = state.cases.find((item) => item.id === caseId);
  if (!current) {
    throw new Error('Case not found.');
  }

  current.status = status;
  current.resolutionNotes = notes;
  if (status === 'resolved') {
    current.escalatedAt = current.escalatedAt ?? nowIso();
  }
  addAuditEntry({
    action: `case_${status}`,
    entityType: 'shop_order',
    entitySlug: current.orderId,
    details: notes,
  });
  return current;
}

export function leaveShopFeedback(input: {
  orderId: string;
  sellerSlug: string;
  buyerProfileSlug: string;
  sentiment: ShopFeedbackSentiment;
  title: LocalizedText;
  comment: LocalizedText;
}) {
  if (state.feedback.some((item) => item.orderId === input.orderId)) {
    throw new Error('Feedback has already been left for this order.');
  }

  const created: ShopFeedback = {
    id: randomId('feedback'),
    createdAt: nowIso(),
    ...input,
  };
  state.feedback.unshift(created);
  recordAnalyticsEvent('shop_feedback_left', input.orderId, '/shop/orders');
  addAuditEntry({
    actorProfileSlug: input.buyerProfileSlug,
    action: 'feedback_left',
    entityType: 'shop_order',
    entitySlug: input.orderId,
    details: `Buyer left ${input.sentiment} feedback.`,
  });
  return created;
}
