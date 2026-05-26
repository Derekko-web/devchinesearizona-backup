import 'server-only';

import type Stripe from 'stripe';

import { siteUrl } from '@/lib/seo';
import { withLocale } from '@/lib/routing';
import { getStripeClient, getStripeWebhookSecret, isStripeConfigured } from '@/lib/stripe';
import { getSupabaseServiceClient } from '@/lib/supabase';
import type { Locale, ShopOrder, ShopShippingMethod, ShopSellerStripeStatus } from '@/lib/types';
import {
  createLegacyCheckoutFallbackForContext,
  type ShopContext,
} from '@/lib/shop-service';

type CheckoutInput = {
  baseUrl?: string;
  locale: Locale;
  offerId?: string;
  shippingAddress?: string;
  paymentMethod?: string;
};

type CheckoutResult =
  | {
      mode: 'completed';
      message: string;
      orderIds: string[];
    }
  | {
      mode: 'redirect';
      checkoutSessionId: string;
      message: string;
      orderIds: string[];
      url: string;
    };

type ConnectResult =
  | {
      mode: 'status_only';
      message: string;
    }
  | {
      mode: 'redirect';
      message: string;
      url: string;
    };

type SellerRow = {
  id: string;
  slug: string;
  profile_id: string;
  display_name_en: string;
  approved: boolean;
  stripe_account_id?: string | null;
  stripe_account_status: ShopSellerStripeStatus;
};

type ListingRow = {
  id: string;
  slug: string;
  seller_id: string;
  title_en: string;
  title_zh_tw?: string | null;
  price_cents: number;
  quantity_available: number;
  sold_count: number;
  status: ShopOrder['status'] | string;
  shipping_methods?: ShopShippingMethod[] | null;
  condition: ShopOrder['items'][number]['snapshotCondition'];
};

type VariantRow = {
  id: string;
  listing_id: string;
  label_en: string;
  label_zh_tw?: string | null;
  price_cents: number;
  quantity_available: number;
};

type CartItemRow = {
  id: string;
  quantity: number;
  listing_id: string;
  variant_id?: string | null;
  listing?: ListingRow[] | ListingRow | null;
};

type OfferRow = {
  id: string;
  listing_id: string;
  variant_id?: string | null;
  buyer_profile_id: string;
  seller_id: string;
  amount_cents: number;
  counter_amount_cents?: number | null;
  status: string;
  reserved_until?: string | null;
  used_at?: string | null;
  used_order_id?: string | null;
  listing?: ListingRow[] | ListingRow | null;
  seller?: SellerRow[] | SellerRow | null;
};

type PendingOrderRecord = {
  id: string;
  sellerId: string;
  sellerSlug: string;
  sellerDisplayName: string;
  shippingCents: number;
  shipmentMethod: ShopShippingMethod;
  lineItems: Array<{
    quantity: number;
    price_data: {
      currency: 'usd';
      product_data: {
        name: string;
        description?: string;
      };
      unit_amount: number;
    };
  }>;
  payoutAmountCents: number;
  offerId?: string;
  items: Array<{
    listingId: string;
    listingSlug: string;
    titleEn: string;
    titleZh?: string | null;
    quantity: number;
    unitPriceCents: number;
    variantId?: string | null;
    variantLabelEn?: string | null;
    variantLabelZh?: string | null;
    snapshotCondition: ShopOrder['items'][number]['snapshotCondition'];
  }>;
};

type PendingCheckoutRecord = {
  orderIds: string[];
  transferGroup: string;
  pendingOrders: PendingOrderRecord[];
};

type OrderRow = {
  id: string;
  buyer_profile_id: string;
  seller_id: string;
  status: ShopOrder['status'];
  total_cents: number;
  subtotal_cents: number;
  shipping_cents: number;
  offer_id?: string | null;
  stripe_transfer_group?: string | null;
  stripe_checkout_session_id?: string | null;
  seller?: SellerRow[] | SellerRow | null;
};

function unwrapRelation<T>(value?: T | T[] | null): T | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value ?? undefined;
}

function requireServiceClient() {
  const client = getSupabaseServiceClient();
  if (!client) {
    throw new Error('Supabase service role is required for shop payments.');
  }

  return client;
}

function nowIso() {
  return new Date().toISOString();
}

function chooseShipmentMethod(shippingMethods?: ShopShippingMethod[] | null): ShopShippingMethod {
  const methods = Array.isArray(shippingMethods) ? shippingMethods : [];

  if (methods.includes('standard')) {
    return 'standard';
  }

  return methods[0] ?? 'local_pickup';
}

function shippingCostForMethod(method: ShopShippingMethod): number {
  return method === 'local_pickup' ? 0 : 1200;
}

function buildSuccessUrl(locale: Locale, baseUrl = siteUrl) {
  return new URL(withLocale(locale, '/shop/orders?checkout=success'), baseUrl).toString();
}

function buildCancelUrl(locale: Locale, offerId?: string, baseUrl = siteUrl) {
  const path = withLocale(locale, '/shop/checkout');
  const url = new URL(path, baseUrl);
  url.searchParams.set('checkout', 'cancelled');

  if (offerId) {
    url.searchParams.set('offer', offerId);
  }

  return url.toString();
}

async function updateListingInventory(
  listingId: string,
  changeQuantity: number,
  soldCountDelta: number
) {
  const client = requireServiceClient();
  const { data: listing } = await client
    .from('shop_listings')
    .select('id, quantity_available, sold_count, status')
    .eq('id', listingId)
    .maybeSingle();

  if (!listing) {
    throw new Error('Listing not found.');
  }

  const nextQuantity = Math.max(0, Number(listing.quantity_available ?? 0) + changeQuantity);
  const nextSoldCount = Math.max(0, Number(listing.sold_count ?? 0) + soldCountDelta);
  const nextStatus =
    nextQuantity <= 0 && listing.status === 'active'
      ? 'sold_out'
      : nextQuantity > 0 && listing.status === 'sold_out'
        ? 'active'
        : listing.status;

  await client
    .from('shop_listings')
    .update({
      quantity_available: nextQuantity,
      sold_count: nextSoldCount,
      status: nextStatus,
      updated_at: nowIso(),
    })
    .eq('id', listing.id);
}

async function updateVariantInventory(variantId: string, changeQuantity: number) {
  const client = requireServiceClient();
  const { data: variant } = await client
    .from('shop_listing_variants')
    .select('id, quantity_available')
    .eq('id', variantId)
    .maybeSingle();

  if (!variant) {
    throw new Error('Variant not found.');
  }

  await client
    .from('shop_listing_variants')
    .update({
      quantity_available: Math.max(0, Number(variant.quantity_available ?? 0) + changeQuantity),
    })
    .eq('id', variant.id);
}

async function reserveInventory(listingId: string, quantity: number, variantId?: string | null) {
  const client = requireServiceClient();
  const { data: listing } = await client
    .from('shop_listings')
    .select('id, quantity_available, sold_count')
    .eq('id', listingId)
    .maybeSingle();

  if (!listing) {
    throw new Error('Listing not found.');
  }

  if (variantId) {
    const { data: variant } = await client
      .from('shop_listing_variants')
      .select('id, quantity_available')
      .eq('id', variantId)
      .eq('listing_id', listingId)
      .maybeSingle();

    if (!variant || Number(variant.quantity_available ?? 0) < quantity) {
      throw new Error('Not enough inventory available.');
    }

    await updateVariantInventory(variantId, -quantity);
  } else if (Number(listing.quantity_available ?? 0) < quantity) {
    throw new Error('Not enough inventory available.');
  }

  await updateListingInventory(listingId, -quantity, quantity);
}

async function releaseInventoryFromOrderItems(orderId: string) {
  const client = requireServiceClient();
  const { data: orderItems } = await client
    .from('shop_order_items')
    .select('id, listing_id, quantity, variant_label_en')
    .eq('order_id', orderId);

  for (const item of orderItems ?? []) {
    if (!item.listing_id) {
      continue;
    }

    if (item.variant_label_en) {
      const { data: variant } = await client
        .from('shop_listing_variants')
        .select('id')
        .eq('listing_id', item.listing_id)
        .eq('label_en', item.variant_label_en)
        .maybeSingle();

      if (variant?.id) {
        await updateVariantInventory(variant.id, Number(item.quantity ?? 0));
      }
    }

    await updateListingInventory(item.listing_id, Number(item.quantity ?? 0), -Number(item.quantity ?? 0));
  }
}

async function createOrderShipment(orderId: string, method: ShopShippingMethod) {
  const client = requireServiceClient();

  if (method === 'local_pickup') {
    await client.from('shop_shipments').insert({
      order_id: orderId,
      method,
      pickup_code: String(Math.floor(100000 + Math.random() * 900000)),
    });
    return;
  }

  await client.from('shop_shipments').insert({
    order_id: orderId,
    method,
  });
}

async function buildCartPendingCheckout(context: ShopContext, shippingAddress?: string): Promise<PendingCheckoutRecord> {
  const client = requireServiceClient();
  const { data: cart } = await client
    .from('shop_carts')
    .select('id')
    .eq('profile_id', context.profile.id)
    .maybeSingle();

  if (!cart) {
    throw new Error('Your cart is empty.');
  }

  const { data: cartItems } = await client
    .from('shop_cart_items')
    .select(`
      id,
      quantity,
      listing_id,
      variant_id,
      listing:shop_listings (
        id,
        slug,
        seller_id,
        title_en,
        title_zh_tw,
        price_cents,
        quantity_available,
        sold_count,
        status,
        shipping_methods,
        condition
      )
    `)
    .eq('cart_id', cart.id)
    .order('created_at', { ascending: true });

  const normalizedItems = (cartItems as CartItemRow[] | null)?.map((item) => ({
    ...item,
    listing: unwrapRelation(item.listing),
  })) ?? [];

  if (normalizedItems.length === 0) {
    throw new Error('Your cart is empty.');
  }

  const transferGroup = `shop_checkout_${context.profile.id}_${Date.now()}`;
  const createdAt = nowIso();
  const grouped = new Map<string, PendingOrderRecord>();

  for (const cartItem of normalizedItems) {
    const listing = cartItem.listing;
    if (!listing) {
      throw new Error('Listing not found.');
    }

    let variant: VariantRow | null = null;
    if (cartItem.variant_id) {
      const { data } = await client
        .from('shop_listing_variants')
        .select('id, listing_id, label_en, label_zh_tw, price_cents, quantity_available')
        .eq('id', cartItem.variant_id)
        .maybeSingle();
      variant = data as VariantRow | null;
    }

    await reserveInventory(listing.id, cartItem.quantity, cartItem.variant_id ?? undefined);

    const { data: sellerData } = await client
      .from('shop_sellers')
      .select('id, slug, profile_id, display_name_en, approved, stripe_account_id, stripe_account_status')
      .eq('id', listing.seller_id)
      .maybeSingle();
    const seller = sellerData as SellerRow | null;

    if (!seller) {
      throw new Error('Seller not found.');
    }

    const shipmentMethod = chooseShipmentMethod(listing.shipping_methods);
    const shippingCents = shippingCostForMethod(shipmentMethod);
    const existing = grouped.get(seller.id);
    const unitPriceCents = variant?.price_cents ?? listing.price_cents;

    const pendingOrder = existing ?? {
      id: '',
      sellerId: seller.id,
      sellerSlug: seller.slug,
      sellerDisplayName: seller.display_name_en,
      shippingCents,
      shipmentMethod,
      lineItems: [],
      payoutAmountCents: 0,
      items: [],
    };

    pendingOrder.items.push({
      listingId: listing.id,
      listingSlug: listing.slug,
      titleEn: listing.title_en,
      titleZh: listing.title_zh_tw ?? null,
      quantity: cartItem.quantity,
      unitPriceCents,
      variantId: variant?.id ?? null,
      variantLabelEn: variant?.label_en ?? null,
      variantLabelZh: variant?.label_zh_tw ?? null,
      snapshotCondition: listing.condition,
    });
    pendingOrder.lineItems.push({
      quantity: cartItem.quantity,
      price_data: {
        currency: 'usd',
        product_data: {
          name: variant ? `${listing.title_en} - ${variant.label_en}` : listing.title_en,
          ...(listing.title_zh_tw ? { description: listing.title_zh_tw } : {}),
        },
        unit_amount: unitPriceCents,
      },
    });
    grouped.set(seller.id, pendingOrder);
  }

  const pendingOrders = Array.from(grouped.values());
  const orderIds: string[] = [];

  for (const pendingOrder of pendingOrders) {
    if (pendingOrder.shippingCents > 0) {
      pendingOrder.lineItems.push({
        quantity: 1,
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${pendingOrder.sellerDisplayName} shipping`,
          },
          unit_amount: pendingOrder.shippingCents,
        },
      });
    }

    const subtotalCents = pendingOrder.items.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0
    );
    pendingOrder.payoutAmountCents = Math.max(
      0,
      Math.round((subtotalCents + pendingOrder.shippingCents) * 0.88)
    );

    const { data: order } = await client
      .from('shop_orders')
      .insert({
        buyer_profile_id: context.profile.id,
        seller_id: pendingOrder.sellerId,
        status: 'pending_payment',
        subtotal_cents: subtotalCents,
        shipping_cents: pendingOrder.shippingCents,
        total_cents: subtotalCents + pendingOrder.shippingCents,
        payment_method: 'Stripe Checkout',
        shipping_address:
          pendingOrder.shipmentMethod === 'local_pickup' ? null : shippingAddress ?? null,
        stripe_transfer_group: transferGroup,
        inventory_reserved_at: createdAt,
      })
      .select('id')
      .maybeSingle();

    if (!order?.id) {
      throw new Error('Unable to create pending marketplace orders.');
    }

    pendingOrder.id = order.id;
    orderIds.push(order.id);

    await client.from('shop_order_items').insert(
      pendingOrder.items.map((item) => ({
        order_id: order.id,
        listing_id: item.listingId,
        seller_id: pendingOrder.sellerId,
        title_en: item.titleEn,
        title_zh_tw: item.titleZh ?? null,
        unit_price_cents: item.unitPriceCents,
        quantity: item.quantity,
        variant_label_en: item.variantLabelEn ?? null,
        variant_label_zh_tw: item.variantLabelZh ?? null,
        snapshot_condition: item.snapshotCondition,
      }))
    );
    await createOrderShipment(order.id, pendingOrder.shipmentMethod);
  }

  return {
    orderIds,
    transferGroup,
    pendingOrders,
  };
}

async function buildOfferPendingCheckout(
  context: ShopContext,
  offerId: string,
  shippingAddress?: string
): Promise<PendingCheckoutRecord> {
  const client = requireServiceClient();
  const { data: rawOffer } = await client
    .from('shop_offers')
    .select(`
      id,
      listing_id,
      variant_id,
      buyer_profile_id,
      seller_id,
      amount_cents,
      counter_amount_cents,
      status,
      reserved_until,
      used_at,
      used_order_id,
      listing:shop_listings (
        id,
        slug,
        seller_id,
        title_en,
        title_zh_tw,
        price_cents,
        quantity_available,
        sold_count,
        status,
        shipping_methods,
        condition
      ),
      seller:shop_sellers (
        id,
        slug,
        profile_id,
        display_name_en,
        approved,
        stripe_account_id,
        stripe_account_status
      )
    `)
    .eq('id', offerId)
    .maybeSingle();

  const offer = rawOffer
    ? ({
        ...(rawOffer as OfferRow),
        listing: unwrapRelation((rawOffer as OfferRow).listing),
        seller: unwrapRelation((rawOffer as OfferRow).seller),
      } satisfies OfferRow)
    : null;

  if (!offer?.listing || !offer.seller) {
    throw new Error('Offer not found.');
  }

  if (offer.buyer_profile_id !== context.profile.id) {
    throw new Error('That offer does not belong to the current buyer.');
  }

  if (offer.status !== 'accepted') {
    throw new Error('This offer is not ready for checkout.');
  }

  if (offer.used_at || offer.used_order_id) {
    throw new Error('This offer has already been used.');
  }

  if (offer.reserved_until && new Date(offer.reserved_until).getTime() < Date.now()) {
    throw new Error('This accepted offer has expired.');
  }

  let variant: VariantRow | null = null;
  if (offer.variant_id) {
    const { data } = await client
      .from('shop_listing_variants')
      .select('id, listing_id, label_en, label_zh_tw, price_cents, quantity_available')
      .eq('id', offer.variant_id)
      .maybeSingle();
    variant = data as VariantRow | null;
  }

  await reserveInventory(offer.listing.id, 1, offer.variant_id ?? undefined);

  const shipmentMethod = chooseShipmentMethod(offer.listing.shipping_methods);
  const shippingCents = shippingCostForMethod(shipmentMethod);
  const transferGroup = `shop_offer_${offer.id}_${Date.now()}`;
  const unitPriceCents = offer.counter_amount_cents ?? offer.amount_cents;
  const { data: order } = await client
    .from('shop_orders')
    .insert({
      buyer_profile_id: context.profile.id,
      seller_id: offer.seller_id,
      status: 'pending_payment',
      subtotal_cents: unitPriceCents,
      shipping_cents: shippingCents,
      total_cents: unitPriceCents + shippingCents,
      payment_method: 'Stripe Checkout',
      shipping_address: shipmentMethod === 'local_pickup' ? null : shippingAddress ?? null,
      offer_id: offer.id,
      stripe_transfer_group: transferGroup,
      inventory_reserved_at: nowIso(),
    })
    .select('id')
    .maybeSingle();

  if (!order?.id) {
    throw new Error('Unable to create a pending offer order.');
  }

  await client.from('shop_order_items').insert({
    order_id: order.id,
    listing_id: offer.listing.id,
    seller_id: offer.seller_id,
    title_en: offer.listing.title_en,
    title_zh_tw: offer.listing.title_zh_tw ?? null,
    unit_price_cents: unitPriceCents,
    quantity: 1,
    variant_label_en: variant?.label_en ?? null,
    variant_label_zh_tw: variant?.label_zh_tw ?? null,
    snapshot_condition: offer.listing.condition,
  });
  await createOrderShipment(order.id, shipmentMethod);

  const pendingOrder: PendingOrderRecord = {
    id: order.id,
    sellerId: offer.seller_id,
    sellerSlug: offer.seller.slug,
    sellerDisplayName: offer.seller.display_name_en,
    shippingCents,
    shipmentMethod,
    payoutAmountCents: Math.max(0, Math.round((unitPriceCents + shippingCents) * 0.88)),
    offerId: offer.id,
    items: [
      {
        listingId: offer.listing.id,
        listingSlug: offer.listing.slug,
        titleEn: offer.listing.title_en,
        titleZh: offer.listing.title_zh_tw ?? null,
        quantity: 1,
        unitPriceCents,
        variantId: variant?.id ?? null,
        variantLabelEn: variant?.label_en ?? null,
        variantLabelZh: variant?.label_zh_tw ?? null,
        snapshotCondition: offer.listing.condition,
      },
    ],
    lineItems: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          product_data: {
            name: variant ? `${offer.listing.title_en} - ${variant.label_en}` : offer.listing.title_en,
            ...(offer.listing.title_zh_tw ? { description: offer.listing.title_zh_tw } : {}),
          },
          unit_amount: unitPriceCents,
        },
      },
    ],
  };

  if (shippingCents > 0) {
    pendingOrder.lineItems.push({
      quantity: 1,
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${offer.seller.display_name_en} shipping`,
        },
        unit_amount: shippingCents,
      },
    });
  }

  return {
    orderIds: [order.id],
    transferGroup,
    pendingOrders: [pendingOrder],
  };
}

async function cancelPendingOrders(orderIds: string[]) {
  const client = requireServiceClient();

  for (const orderId of orderIds) {
    await releaseInventoryFromOrderItems(orderId);
    await client
      .from('shop_orders')
      .update({
        status: 'cancelled',
        updated_at: nowIso(),
      })
      .eq('id', orderId)
      .eq('status', 'pending_payment');
  }
}

export async function createStripeConnectLinkForContext(
  context: ShopContext,
  locale: Locale,
  sellerSlug: string,
  baseUrl = siteUrl
): Promise<ConnectResult> {
  const stripe = getStripeClient();
  const client = getSupabaseServiceClient();

  if (!stripe || !client) {
    return {
      mode: 'status_only',
      message:
        locale === 'zh'
          ? 'Stripe 尚未設定完成，賣家付款設定仍可在本機流程中繼續。'
          : 'Stripe is not configured yet, so seller payout setup stays in local fallback mode.',
    };
  }

  const { data: sellerData } = await client
    .from('shop_sellers')
    .select('id, slug, profile_id, display_name_en, approved, stripe_account_id, stripe_account_status')
    .eq('slug', sellerSlug)
    .maybeSingle();
  const seller = sellerData as SellerRow | null;

  if (!seller) {
    throw new Error('Seller not found.');
  }

  if (seller.profile_id !== context.profile.id && !['moderator', 'admin'].includes(context.role)) {
    throw new Error('You cannot manage this seller account.');
  }

  let stripeAccountId = seller.stripe_account_id ?? undefined;
  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      metadata: {
        seller_id: seller.id,
        seller_slug: seller.slug,
        profile_id: context.profile.id,
      },
    });
    stripeAccountId = account.id;

    await client
      .from('shop_sellers')
      .update({
        stripe_account_id: stripeAccountId,
        stripe_account_status: 'pending',
        updated_at: nowIso(),
      })
      .eq('id', seller.id);
  }

  const dashboardPath = withLocale(locale, '/dashboard/shop/payouts');
  const refreshUrl = new URL(`${dashboardPath}?stripe=refresh`, baseUrl).toString();
  const returnUrl = new URL(`${dashboardPath}?stripe=return`, baseUrl).toString();
  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: seller.stripe_account_status === 'active' ? 'account_update' : 'account_onboarding',
  });

  return {
    mode: 'redirect',
    message:
      locale === 'zh'
        ? '正在開啟 Stripe Connect 設定。'
        : 'Opening Stripe Connect setup.',
    url: link.url,
  };
}

export async function createCheckoutForContext(
  context: ShopContext,
  input: CheckoutInput
): Promise<CheckoutResult> {
  const stripe = getStripeClient();

  if (!stripe || !isStripeConfigured() || !getSupabaseServiceClient()) {
    const fallback = await createLegacyCheckoutFallbackForContext(context, {
      offerId: input.offerId,
      shippingAddress: input.shippingAddress,
      paymentMethod: input.paymentMethod,
    });

    return {
      mode: 'completed',
      message:
        input.locale === 'zh'
          ? `結帳完成，已建立 ${fallback.orderIds.length} 張訂單。`
          : `Checkout complete. Created ${fallback.orderIds.length} order(s).`,
      orderIds: fallback.orderIds,
    };
  }

  const pendingCheckout = input.offerId
    ? await buildOfferPendingCheckout(context, input.offerId, input.shippingAddress)
    : await buildCartPendingCheckout(context, input.shippingAddress);

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: buildSuccessUrl(input.locale, input.baseUrl),
      cancel_url: buildCancelUrl(input.locale, input.offerId, input.baseUrl),
      line_items: pendingCheckout.pendingOrders.flatMap((order) => order.lineItems),
      metadata: {
        buyer_profile_id: context.profile.id,
        order_ids: pendingCheckout.orderIds.join(','),
        transfer_group: pendingCheckout.transferGroup,
        ...(input.offerId ? { offer_id: input.offerId } : {}),
      },
      payment_intent_data: {
        transfer_group: pendingCheckout.transferGroup,
        metadata: {
          buyer_profile_id: context.profile.id,
          order_ids: pendingCheckout.orderIds.join(','),
        },
      },
      customer_email: undefined,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    if (!checkoutSession.url) {
      throw new Error('Stripe did not return a checkout URL.');
    }

    await requireServiceClient()
      .from('shop_orders')
      .update({
        stripe_checkout_session_id: checkoutSession.id,
        checkout_expires_at: checkoutSession.expires_at
          ? new Date(checkoutSession.expires_at * 1000).toISOString()
          : null,
        updated_at: nowIso(),
      })
      .in('id', pendingCheckout.orderIds);

    return {
      mode: 'redirect',
      checkoutSessionId: checkoutSession.id,
      message:
        input.locale === 'zh'
          ? '結帳工作階段已建立，正在導向 Stripe。'
          : 'Checkout session created. Redirecting to Stripe.',
      orderIds: pendingCheckout.orderIds,
      url: checkoutSession.url,
    };
  } catch (error) {
    await cancelPendingOrders(pendingCheckout.orderIds);
    throw error;
  }
}

async function createSellerTransfer(
  stripe: Stripe,
  order: OrderRow,
  seller: SellerRow,
  amountCents: number,
  transferGroup: string
) {
  if (!seller.stripe_account_id || seller.stripe_account_status !== 'active') {
    return null;
  }

  return stripe.transfers.create({
    amount: amountCents,
    currency: 'usd',
    destination: seller.stripe_account_id,
    transfer_group: transferGroup,
    metadata: {
      order_id: order.id,
      seller_id: seller.id,
      seller_slug: seller.slug,
    },
  });
}

async function finalizeCompletedCheckout(session: Stripe.Checkout.Session) {
  const client = requireServiceClient();
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error('Stripe is not configured.');
  }

  const { data: rawOrders } = await client
    .from('shop_orders')
    .select(`
      id,
      buyer_profile_id,
      seller_id,
      status,
      total_cents,
      subtotal_cents,
      shipping_cents,
      offer_id,
      stripe_transfer_group,
      stripe_checkout_session_id,
      seller:shop_sellers (
        id,
        slug,
        profile_id,
        display_name_en,
        approved,
        stripe_account_id,
        stripe_account_status
      )
    `)
    .eq('stripe_checkout_session_id', session.id);

  const orders = ((rawOrders as OrderRow[] | null) ?? []).map((order) => ({
    ...order,
    seller: unwrapRelation(order.seller),
  }));

  if (orders.length === 0) {
    return;
  }

  const transferGroup =
    orders[0]?.stripe_transfer_group ??
    session.metadata?.transfer_group ??
    `shop_checkout_${session.id}`;
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : undefined;
  const paidAt = nowIso();

  await client
    .from('shop_orders')
    .update({
      status: 'paid',
      stripe_payment_intent_id: paymentIntentId ?? null,
      payment_captured_at: paidAt,
      updated_at: paidAt,
    })
    .in(
      'id',
      orders.map((order) => order.id)
    );

  const buyerProfileId = orders[0]?.buyer_profile_id;
  if (buyerProfileId) {
    const { data: cart } = await client
      .from('shop_carts')
      .select('id')
      .eq('profile_id', buyerProfileId)
      .maybeSingle();

    if (cart?.id) {
      await client.from('shop_cart_items').delete().eq('cart_id', cart.id);
      await client
        .from('shop_carts')
        .update({ updated_at: paidAt })
        .eq('id', cart.id);
    }
  }

  for (const order of orders) {
    if (order.offer_id) {
      await client
        .from('shop_offers')
        .update({
          used_at: paidAt,
          used_order_id: order.id,
          updated_at: paidAt,
        })
        .eq('id', order.offer_id);
    }

    const payoutAmount = Math.max(0, Math.round(Number(order.total_cents ?? 0) * 0.88));
    const seller = order.seller;
    const transfer = seller
      ? await createSellerTransfer(stripe, order, seller, payoutAmount, transferGroup)
      : null;

    const { data: existingPayout } = await client
      .from('shop_payouts')
      .select('id')
      .eq('order_id', order.id)
      .maybeSingle();

    const payoutPatch = {
      seller_id: order.seller_id,
      order_id: order.id,
      amount_cents: payoutAmount,
      status: transfer ? 'in_transit' : 'pending',
      available_at: paidAt,
      paid_at: transfer ? paidAt : null,
      stripe_transfer_id: transfer?.id ?? null,
      stripe_transfer_group: transferGroup,
    };

    if (existingPayout?.id) {
      await client
        .from('shop_payouts')
        .update(payoutPatch)
        .eq('id', existingPayout.id);
    } else {
      await client.from('shop_payouts').insert(payoutPatch);
    }
  }
}

async function cancelCheckoutBySessionId(sessionId: string) {
  const client = requireServiceClient();
  const { data: orders } = await client
    .from('shop_orders')
    .select('id')
    .eq('stripe_checkout_session_id', sessionId)
    .eq('status', 'pending_payment');

  const orderIds = (orders ?? []).map((order) => order.id);
  if (orderIds.length === 0) {
    return;
  }

  await cancelPendingOrders(orderIds);
}

async function syncSellerStripeAccount(account: Stripe.Account) {
  const client = requireServiceClient();
  const status: ShopSellerStripeStatus =
    account.charges_enabled && account.payouts_enabled && account.details_submitted
      ? 'active'
      : 'pending';

  await client
    .from('shop_sellers')
    .update({
      stripe_account_status: status,
      updated_at: nowIso(),
    })
    .eq('stripe_account_id', account.id);
}

export async function handleShopStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await finalizeCompletedCheckout(event.data.object as Stripe.Checkout.Session);
      break;
    case 'checkout.session.expired':
      await cancelCheckoutBySessionId((event.data.object as Stripe.Checkout.Session).id);
      break;
    case 'checkout.session.async_payment_failed':
      await cancelCheckoutBySessionId((event.data.object as Stripe.Checkout.Session).id);
      break;
    case 'account.updated':
      await syncSellerStripeAccount(event.data.object as Stripe.Account);
      break;
    default:
      break;
  }
}

export async function handleStripeWebhookRequest(
  rawBody: string,
  signature: string
) {
  const stripe = getStripeClient();
  const secret = getStripeWebhookSecret();

  if (!stripe || !secret) {
    throw new Error('Stripe webhook verification is not configured.');
  }

  const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  await handleShopStripeEvent(event);

  return event;
}
