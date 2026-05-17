import { notFound } from 'next/navigation';

import { isShopPublicLaunchReady } from '@/lib/shop-launch-server';
import { getOptionalShopContext, requireShopPageContext } from '@/lib/shop-page-auth';
import {
  getShopBrowsePageData,
  getShopCartPageDataForContext,
  getShopCheckoutPageDataForContext,
  getShopListingPageData,
  getShopOrderDetailPageDataForContext,
  getShopOrdersPageDataForContext,
  getShopSavedSearchesPageDataForContext,
  getShopSellerPageData,
  getShopSellPageDataForContext,
  getShopWatchlistPageDataForContext,
} from '@/lib/shop-service';
import {
  buildShopItemMetadata,
  buildShopSellerMetadata,
  shopCartMetadata,
  shopCheckoutMetadata,
  shopMetadata,
  shopOrderMetadata,
  shopOrdersMetadata,
  shopSavedSearchesMetadata,
  shopSellMetadata,
  shopWatchlistMetadata,
} from '@/lib/shop-metadata';
import {
  ShopCartPageView,
  ShopCheckoutPageView,
  ShopHubPageView,
  ShopListingPageView,
  ShopOrderDetailPageView,
  ShopOrdersPageView,
  ShopSavedSearchesPageView,
  ShopSellerPageView,
  ShopSellPageView,
  ShopWatchlistPageView,
} from '@/views/shop-pages';
import type { ShopBrowseSearchParams } from '@/lib/types';

type PageProps = {
  params: Promise<{
    segments?: string[];
  }>;
  searchParams: Promise<ShopBrowseSearchParams & { offer?: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params, searchParams }: PageProps) {
  const { segments = [] } = await params;
  if (!isShopPublicLaunchReady()) {
    return {
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const query = await searchParams;

  if (segments.length === 0) {
    return shopMetadata('en', query);
  }

  if (segments[0] === 'item' && segments[1]) {
    const data = await getShopListingPageData(segments[1]);
    return data ? buildShopItemMetadata('en', data.listing) : {};
  }

  if (segments[0] === 'seller' && segments[1]) {
    const data = await getShopSellerPageData(segments[1]);
    return data ? buildShopSellerMetadata('en', data.seller) : {};
  }

  if (segments[0] === 'watchlist' && segments.length === 1) {
    return shopWatchlistMetadata('en');
  }

  if (segments[0] === 'saved-searches' && segments.length === 1) {
    return shopSavedSearchesMetadata('en');
  }

  if (segments[0] === 'cart' && segments.length === 1) {
    return shopCartMetadata('en');
  }

  if (segments[0] === 'checkout' && segments.length === 1) {
    return shopCheckoutMetadata('en');
  }

  if (segments[0] === 'orders' && segments.length === 1) {
    return shopOrdersMetadata('en');
  }

  if (segments[0] === 'orders' && segments[1]) {
    return shopOrderMetadata('en', segments[1]);
  }

  if (segments[0] === 'sell' && segments.length === 1) {
    return shopSellMetadata('en');
  }

  return {};
}

export default async function Page({ params, searchParams }: PageProps) {
  const { segments = [] } = await params;
  if (!isShopPublicLaunchReady()) {
    notFound();
  }

  const query = await searchParams;

  if (segments.length === 0) {
    const data = await getShopBrowsePageData('en', query);
    return <ShopHubPageView locale="en" searchParams={query} data={data} />;
  }

  if (segments[0] === 'item' && segments[1]) {
    const context = await getOptionalShopContext();
    const data = await getShopListingPageData(segments[1], context?.profile.id);
    const rendered = ShopListingPageView({ locale: 'en', slug: segments[1], data });
    if (!rendered) {
      notFound();
    }
    return rendered;
  }

  if (segments[0] === 'seller' && segments[1]) {
    const data = await getShopSellerPageData(segments[1]);
    const rendered = ShopSellerPageView({ locale: 'en', slug: segments[1], data });
    if (!rendered) {
      notFound();
    }
    return rendered;
  }

  if (segments[0] === 'watchlist' && segments.length === 1) {
    const context = await requireShopPageContext('en', '/shop/watchlist');
    const data = await getShopWatchlistPageDataForContext(context);
    return <ShopWatchlistPageView locale="en" data={data} />;
  }

  if (segments[0] === 'saved-searches' && segments.length === 1) {
    const context = await requireShopPageContext('en', '/shop/saved-searches');
    const data = await getShopSavedSearchesPageDataForContext(context);
    return <ShopSavedSearchesPageView locale="en" data={data} />;
  }

  if (segments[0] === 'cart' && segments.length === 1) {
    const context = await requireShopPageContext('en', '/shop/cart');
    const data = await getShopCartPageDataForContext(context);
    return <ShopCartPageView locale="en" data={data} />;
  }

  if (segments[0] === 'checkout' && segments.length === 1) {
    const context = await requireShopPageContext('en', '/shop/checkout');
    const data = await getShopCheckoutPageDataForContext(context, query.offer);
    return <ShopCheckoutPageView locale="en" searchParams={query} data={data} />;
  }

  if (segments[0] === 'orders' && segments.length === 1) {
    const context = await requireShopPageContext('en', '/shop/orders');
    const data = await getShopOrdersPageDataForContext(context);
    return <ShopOrdersPageView locale="en" data={data} />;
  }

  if (segments[0] === 'orders' && segments[1]) {
    const context = await requireShopPageContext('en', `/shop/orders/${segments[1]}`);
    const data = await getShopOrderDetailPageDataForContext(context, segments[1]);
    const rendered = ShopOrderDetailPageView({ locale: 'en', orderId: segments[1], data });
    if (!rendered) {
      notFound();
    }
    return rendered;
  }

  if (segments[0] === 'sell' && segments.length === 1) {
    const context = await requireShopPageContext('en', '/shop/sell');
    const data = await getShopSellPageDataForContext(context);
    return <ShopSellPageView locale="en" data={data} />;
  }

  notFound();
}
