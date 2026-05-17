import fs from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import sitemap from '@/app/sitemap';
import { shopMetadata } from '@/lib/shop-metadata';
import {
  getShopBrowsePage,
  getShopCategories,
  getShopCartDetailedItems,
  getShopListingBySlug,
  getShopListings,
  getShopOrderById,
  getShopSellers,
} from '@/lib/shop';
import { shouldUseRuntimeShopBrowseData } from '@/lib/shop-service';
import {
  addShopCartItem,
  checkoutAcceptedShopOffer,
  checkoutShopCart,
  createShopOffer,
  resetShopRuntimeStore,
  respondToShopOffer,
} from '@/lib/shop-runtime-store';

const env = process.env as Record<string, string | undefined>;
const originalNodeEnv = env.NODE_ENV;
const originalShopFlag = env.NEXT_PUBLIC_SHOP_PUBLIC_ENABLED;

beforeEach(() => {
  resetShopRuntimeStore();
});

afterEach(() => {
  if (originalNodeEnv === undefined) {
    delete env.NODE_ENV;
  } else {
    env.NODE_ENV = originalNodeEnv;
  }

  if (originalShopFlag === undefined) {
    delete env.NEXT_PUBLIC_SHOP_PUBLIC_ENABLED;
  } else {
    env.NEXT_PUBLIC_SHOP_PUBLIC_ENABLED = originalShopFlag;
  }
});

describe('shop browse and seo', () => {
  it('filters browse results by query, category, pickup, and offer flags', () => {
    const page = getShopBrowsePage('en', {
      q: 'macbook',
      category: 'electronics',
      offer: '1',
      pickup: '1',
    });

    expect(page.listings.map((listing) => listing.slug)).toEqual(['macbook-air-m2-13-east-valley']);
    expect(page.listings.every((listing) => listing.status === 'active' || listing.status === 'sold_out')).toBe(true);
  });

  it('keeps filtered pages canonicalized to the shop hub and paginated pages self-canonical', () => {
    const filtered = shopMetadata('en', {
      q: 'steam deck',
      sort: 'price_high',
    });
    const paginated = shopMetadata('en', {
      page: '2',
    });

    expect(filtered.alternates?.canonical).toBe('https://chinesearizona.com/shop');
    expect(paginated.title).toBe('Shop Page 2 | ChineseArizona');
    expect(paginated.alternates?.canonical).toBe('https://chinesearizona.com/shop?page=2');
  });

  it('falls back to runtime browse data when public DB payloads are empty or non-public', () => {
    const categories = getShopCategories();
    const sellers = getShopSellers();
    const listings = getShopListings();

    expect(shouldUseRuntimeShopBrowseData({ categories, sellers, listings })).toBe(false);
    expect(shouldUseRuntimeShopBrowseData({ categories: [], sellers, listings })).toBe(true);
    expect(
      shouldUseRuntimeShopBrowseData({
        categories,
        sellers,
        listings: listings.map((listing) => ({ ...listing, status: 'draft' })),
      })
    ).toBe(true);
  });
});

describe('shop checkout flows', () => {
  it('splits a cart into seller-specific orders and clears the cart after checkout', () => {
    const gracoBeforeQuantity = getShopListingBySlug('graco-4ever-dlx-car-seat')?.quantityAvailable;

    addShopCartItem('newcomer-derek', 'graco-4ever-dlx-car-seat', 1);
    const orders = checkoutShopCart({
      profileSlug: 'newcomer-derek',
      shippingAddress: 'Tempe, AZ 85281',
      paymentMethod: 'Visa ending in 1111',
    });

    expect(orders).toHaveLength(2);
    expect(new Set(orders.map((order) => order.sellerSlug))).toEqual(
      new Set(['cactus-collectibles', 'mesa-family-closet'])
    );
    expect(orders.some((order) => order.shipment?.method === 'local_pickup')).toBe(true);
    expect(getShopCartDetailedItems('newcomer-derek')).toHaveLength(0);
    expect(gracoBeforeQuantity).toBe(1);
    expect(getShopListingBySlug('graco-4ever-dlx-car-seat')?.status).toBe('sold_out');
  });

  it('turns an accepted offer into a single-use order', () => {
    const createdOffer = createShopOffer({
      listingSlug: 'steam-deck-oled-1tb',
      buyerProfileSlug: 'newcomer-derek',
      sellerSlug: 'east-valley-tech',
      amountCents: 54000,
      message: 'Can you meet me at asking if I pay today?',
    });

    respondToShopOffer({
      offerId: createdOffer.id,
      action: 'countered',
      counterAmountCents: 54900,
      actorProfileSlug: 'grace-lin',
    });
    respondToShopOffer({
      offerId: createdOffer.id,
      action: 'accepted',
      actorProfileSlug: 'grace-lin',
    });

    const order = checkoutAcceptedShopOffer({
      profileSlug: 'newcomer-derek',
      offerId: createdOffer.id,
      shippingAddress: 'Phoenix, AZ 85016',
      paymentMethod: 'Offer checkout',
    });

    expect(order.offerId).toBe(createdOffer.id);
    expect(getShopOrderById(order.id)?.offerId).toBe(createdOffer.id);
    expect(getShopListingBySlug('steam-deck-oled-1tb')?.status).toBe('sold_out');
  });
});

describe('shop route exposure', () => {
  it('adds shop hub, listing, and seller routes to the sitemap', { timeout: 20000 }, async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain('https://chinesearizona.com/shop');
    expect(urls).not.toContain('https://chinesearizona.com/en/shop');
    expect(urls).toContain('https://chinesearizona.com/zh/shop');
    expect(urls).toContain('https://chinesearizona.com/shop/item/macbook-air-m2-13-east-valley');
    expect(urls).toContain('https://chinesearizona.com/shop/seller/east-valley-tech');
    expect(urls).not.toContain('https://chinesearizona.com/shop/cart');
    expect(urls).not.toContain('https://chinesearizona.com/shop/checkout');
    expect(urls).not.toContain('https://chinesearizona.com/shop/orders');
    expect(urls).not.toContain('https://chinesearizona.com/shop/sell');
    expect(urls).not.toContain('https://chinesearizona.com/dashboard');
    expect(urls).not.toContain('https://chinesearizona.com/admin');
    expect(urls).not.toContain('https://chinesearizona.com/en/dashboard');
    expect(urls).not.toContain('https://chinesearizona.com/zh/dashboard');
    expect(urls).not.toContain('https://chinesearizona.com/en/admin');
    expect(urls).not.toContain('https://chinesearizona.com/zh/admin');
  });

  it('removes public shop routes from the sitemap in production until launch is explicitly enabled', async () => {
    env.NODE_ENV = 'production';
    delete env.NEXT_PUBLIC_SHOP_PUBLIC_ENABLED;
    vi.resetModules();

    const { default: productionSitemap } = await import('@/app/sitemap');
    const entries = await productionSitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).not.toContain('https://chinesearizona.com/shop');
    expect(urls).not.toContain('https://chinesearizona.com/en/shop');
    expect(urls).not.toContain('https://chinesearizona.com/zh/shop');
    expect(urls).not.toContain('https://chinesearizona.com/shop/item/macbook-air-m2-13-east-valley');
    expect(urls).not.toContain('https://chinesearizona.com/shop/seller/east-valley-tech');
  });

  it('keeps shop in public chrome without leaking protected footer links', () => {
    const navbar = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'Navbar.tsx'), 'utf-8');
    const footer = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'Footer.tsx'), 'utf-8');

    expect(navbar).toContain("/shop");
    expect(footer).toContain("/shop");
    expect(footer).not.toContain("/shop/sell");
    expect(footer).not.toContain("/admin");
    expect(footer).not.toContain("/dashboard");
  });
});
