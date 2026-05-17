import { notFound } from 'next/navigation';

import { isLocale } from '@/lib/i18n';
import { isShopPublicLaunchReady } from '@/lib/shop-launch-server';
import { getOptionalShopContext, requireShopPageContext } from '@/lib/shop-page-auth';
import { withLocale } from '@/lib/routing';
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
import type { Locale, ShopBrowseSearchParams } from '@/lib/types';

type PageProps = {
  params: Promise<{
    locale: string;
    segments?: string[];
  }>;
  searchParams: Promise<ShopBrowseSearchParams & { offer?: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params, searchParams }: PageProps) {
  const { locale, segments = [] } = await params;
  if (!isLocale(locale)) {
    return {};
  }

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
    return shopMetadata(locale, query);
  }

  if (segments[0] === 'item' && segments[1]) {
    const data = await getShopListingPageData(segments[1]);
    return data ? buildShopItemMetadata(locale, data.listing) : {};
  }

  if (segments[0] === 'seller' && segments[1]) {
    const data = await getShopSellerPageData(segments[1]);
    return data ? buildShopSellerMetadata(locale, data.seller) : {};
  }

  if (segments[0] === 'watchlist' && segments.length === 1) {
    return shopWatchlistMetadata(locale);
  }

  if (segments[0] === 'saved-searches' && segments.length === 1) {
    return shopSavedSearchesMetadata(locale);
  }

  if (segments[0] === 'cart' && segments.length === 1) {
    return shopCartMetadata(locale);
  }

  if (segments[0] === 'checkout' && segments.length === 1) {
    return shopCheckoutMetadata(locale);
  }

  if (segments[0] === 'orders' && segments.length === 1) {
    return shopOrdersMetadata(locale);
  }

  if (segments[0] === 'orders' && segments[1]) {
    return shopOrderMetadata(locale, segments[1]);
  }

  if (segments[0] === 'sell' && segments.length === 1) {
    return shopSellMetadata(locale);
  }

  return {};
}

export default async function Page({ params, searchParams }: PageProps) {
  const { locale, segments = [] } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  if (!isShopPublicLaunchReady()) {
    notFound();
  }

  const typedLocale = locale as Locale;
  const query = await searchParams;

  if (segments.length === 0) {
    const data = await getShopBrowsePageData(typedLocale, query);
    return <ShopHubPageView locale={typedLocale} searchParams={query} data={data} />;
  }

  if (segments[0] === 'item' && segments[1]) {
    const context = await getOptionalShopContext();
    const data = await getShopListingPageData(segments[1], context?.profile.id);
    const rendered = ShopListingPageView({ locale: typedLocale, slug: segments[1], data });
    if (!rendered) {
      notFound();
    }
    return rendered;
  }

  if (segments[0] === 'seller' && segments[1]) {
    const data = await getShopSellerPageData(segments[1]);
    const rendered = ShopSellerPageView({ locale: typedLocale, slug: segments[1], data });
    if (!rendered) {
      notFound();
    }
    return rendered;
  }

  if (segments[0] === 'watchlist' && segments.length === 1) {
    const context = await requireShopPageContext(typedLocale, withLocale(typedLocale, '/shop/watchlist'));
    const data = await getShopWatchlistPageDataForContext(context);
    return <ShopWatchlistPageView locale={typedLocale} data={data} />;
  }

  if (segments[0] === 'saved-searches' && segments.length === 1) {
    const context = await requireShopPageContext(typedLocale, withLocale(typedLocale, '/shop/saved-searches'));
    const data = await getShopSavedSearchesPageDataForContext(context);
    return <ShopSavedSearchesPageView locale={typedLocale} data={data} />;
  }

  if (segments[0] === 'cart' && segments.length === 1) {
    const context = await requireShopPageContext(typedLocale, withLocale(typedLocale, '/shop/cart'));
    const data = await getShopCartPageDataForContext(context);
    return <ShopCartPageView locale={typedLocale} data={data} />;
  }

  if (segments[0] === 'checkout' && segments.length === 1) {
    const context = await requireShopPageContext(typedLocale, withLocale(typedLocale, '/shop/checkout'));
    const data = await getShopCheckoutPageDataForContext(context, query.offer);
    return <ShopCheckoutPageView locale={typedLocale} searchParams={query} data={data} />;
  }

  if (segments[0] === 'orders' && segments.length === 1) {
    const context = await requireShopPageContext(typedLocale, withLocale(typedLocale, '/shop/orders'));
    const data = await getShopOrdersPageDataForContext(context);
    return <ShopOrdersPageView locale={typedLocale} data={data} />;
  }

  if (segments[0] === 'orders' && segments[1]) {
    const context = await requireShopPageContext(typedLocale, withLocale(typedLocale, `/shop/orders/${segments[1]}`));
    const data = await getShopOrderDetailPageDataForContext(context, segments[1]);
    const rendered = ShopOrderDetailPageView({ locale: typedLocale, orderId: segments[1], data });
    if (!rendered) {
      notFound();
    }
    return rendered;
  }

  if (segments[0] === 'sell' && segments.length === 1) {
    const context = await requireShopPageContext(typedLocale, withLocale(typedLocale, '/shop/sell'));
    const data = await getShopSellPageDataForContext(context);
    return <ShopSellPageView locale={typedLocale} data={data} />;
  }

  notFound();
}
