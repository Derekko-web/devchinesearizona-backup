import Link from 'next/link';

import { EmptyState } from '@/components/EmptyState';
import { TrackedLink } from '@/components/TrackedLink';
import { ReportIssueForm } from '@/components/forms/ReportIssueForm';
import {
  AddToCartForm,
  ClearCartButton,
  DeleteSavedSearchButton,
  MakeOfferForm,
  MessageSellerForm,
  PickupConfirmForm,
  QuickCartLink,
  RemoveCartItemButton,
  SaveSearchForm,
  SaveSellerButton,
  SellerOfferResponseForm,
  ShopAuthPanel,
  ShopCaseOpenForm,
  ShopCheckoutForm,
  ShopFeedbackForm,
  ShopListingStatusForm,
  ShopReturnRequestForm,
  ShopSellForm,
  ShopSellerApprovalButton,
  ShopShipmentForm,
  ShopStripeConnectButton,
  WatchlistButton,
} from '@/components/shop/ShopForms';
import { getModerationReportsSnapshot } from '@/lib/directory-moderation';
import { formatDate, formatDateTime, formatLanguageList, t } from '@/lib/i18n';
import { absoluteUrl } from '@/lib/seo';
import { JsonLd } from '@/lib/schema';
import { appendSearch, withLocale } from '@/lib/routing';
import type {
  getShopAdminPageDataForContext,
  getShopBrowsePageData,
  getShopCartPageDataForContext,
  getShopCheckoutPageDataForContext,
  getShopDashboardDataForContext,
  getShopListingPageData,
  getShopOrderDetailPageDataForContext,
  getShopOrdersPageDataForContext,
  getShopSavedSearchesPageDataForContext,
  getShopSellerPageData,
  getShopSellPageDataForContext,
  getShopWatchlistPageDataForContext,
} from '@/lib/shop-service';
import {
  defaultShopBuyerProfileSlug,
  defaultShopDashboardSellerSlug,
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
  getShopListingByWatchlist,
  getShopListingPrimaryImage,
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
  shopCaseStatusLabel,
  shopConditionLabel,
  formatShopMoney,
  shopListingStatusLabel,
  shopOfferStatusLabel,
  shopOrderStatusLabel,
  shopShippingLabel,
  shopSortLabel,
  shopFeedbackSentimentLabel,
} from '@/lib/shop';
import type { Locale, ShopBrowseSearchParams, ShopListing, ShopSeller } from '@/lib/types';

type ShopBrowseViewData = Awaited<ReturnType<typeof getShopBrowsePageData>>;
type ShopListingViewData = Awaited<ReturnType<typeof getShopListingPageData>>;
type ShopSellerViewData = Awaited<ReturnType<typeof getShopSellerPageData>>;
type ShopWatchlistViewData = Awaited<ReturnType<typeof getShopWatchlistPageDataForContext>>;
type ShopSavedSearchesViewData = Awaited<ReturnType<typeof getShopSavedSearchesPageDataForContext>>;
type ShopCartViewData = Awaited<ReturnType<typeof getShopCartPageDataForContext>>;
type ShopCheckoutViewData = Awaited<ReturnType<typeof getShopCheckoutPageDataForContext>>;
type ShopOrdersViewData = Awaited<ReturnType<typeof getShopOrdersPageDataForContext>>;
type ShopOrderDetailViewData = Awaited<ReturnType<typeof getShopOrderDetailPageDataForContext>>;
type ShopSellViewData = Awaited<ReturnType<typeof getShopSellPageDataForContext>>;
type ShopDashboardViewData = Awaited<ReturnType<typeof getShopDashboardDataForContext>>;
type ShopAdminViewData = Awaited<ReturnType<typeof getShopAdminPageDataForContext>>;

function sectionContainer(children: React.ReactNode) {
  return <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>;
}

function buildShopHref(
  locale: Locale,
  current: Partial<ShopBrowseSearchParams>,
  overrides: Partial<ShopBrowseSearchParams> = {}
) {
  const params = new URLSearchParams();
  const merged = { ...current, ...overrides };

  for (const [key, value] of Object.entries(merged)) {
    if (!value || value === '' || value === 'best_match' || value === '1' && key === 'page') {
      continue;
    }
    params.set(key, String(value));
  }

  const search = params.toString();
  return `${withLocale(locale, '/shop')}${search ? `?${search}` : ''}`;
}

function ShopImage({ listing, locale }: { listing: ShopListing; locale: Locale }) {
  const image = getShopListingPrimaryImage(listing);

  if (!image) {
    return (
      <div className="flex h-full min-h-56 items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_top,#fde68a_0%,#f8fafc_38%,#dbeafe_100%)] p-6 text-center">
        <div>
          <p className="text-base font-semibold text-slate-700">{t(listing.title, locale)}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">
            {locale === 'zh' ? '待補圖片' : 'Image pending'}
          </p>
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.url}
      alt={t(image.alt, locale)}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className="h-full w-full rounded-2xl object-cover"
    />
  );
}

function SellerTrustPanel({
  seller,
  locale,
  trustSummary,
}: {
  seller: ShopSeller;
  locale: Locale;
  trustSummary?: ReturnType<typeof getShopSellerTrustSummary> | null;
}) {
  const summary = trustSummary ?? getShopSellerTrustSummary(seller.slug);
  if (!summary) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
        <span>{seller.topRated ? (locale === 'zh' ? '優質賣家' : 'Top rated seller') : locale === 'zh' ? '已驗證賣家' : 'Verified seller'}</span>
        <span className="text-slate-300">/</span>
        <span>{summary.positiveFeedbackRate}% {locale === 'zh' ? '正評' : 'positive'}</span>
      </div>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">{t(seller.displayName, locale)}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t(seller.headline, locale)}</p>
      <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <p>{locale === 'zh' ? '回覆率' : 'Response rate'}: {seller.responseRate}%</p>
        <p>{locale === 'zh' ? '處理時間' : 'Handling time'}: {seller.handlingTimeDays} {locale === 'zh' ? '天' : 'day(s)'}</p>
        <p>{locale === 'zh' ? '會員時間' : 'Member since'}: {formatDate(summary.memberSince, locale)}</p>
        <p>{locale === 'zh' ? '退貨政策' : 'Returns'}: {seller.acceptsReturns ? `${seller.returnWindowDays} ${locale === 'zh' ? '天' : 'days'}` : locale === 'zh' ? '不接受' : 'Not accepted'}</p>
      </div>
    </div>
  );
}

function ShopListingCard({
  listing,
  locale,
  seller: sellerProp,
}: {
  listing: ShopListing;
  locale: Locale;
  seller?: ShopSeller;
}) {
  const seller = sellerProp ?? getShopSellerBySlug(listing.sellerSlug);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="aspect-[4/3] bg-slate-100 p-3">
        <TrackedLink
          href={withLocale(locale, `/shop/item/${listing.slug}`)}
          eventType="shop_listing_click"
          entitySlug={listing.slug}
          className="block h-full"
        >
          <ShopImage listing={listing} locale={locale} />
        </TrackedLink>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {shopConditionLabel(listing.condition, locale)}
            </span>
            <h3 className="text-lg font-bold text-slate-900">{t(listing.title, locale)}</h3>
          </div>
          <p className="text-lg font-bold text-slate-900">{formatShopMoney(listing.priceCents, locale)}</p>
        </div>
        <p className="text-sm leading-6 text-slate-600">{t(listing.excerpt, locale)}</p>
        <div className="flex flex-wrap gap-3 text-sm text-slate-500">
          <span>{listing.watcherCount} {locale === 'zh' ? '追蹤' : 'watchers'}</span>
          <span>{listing.soldCount} {locale === 'zh' ? '已售' : 'sold'}</span>
          {listing.allowLocalPickup ? <span>{locale === 'zh' ? '可面交' : 'Pickup available'}</span> : null}
        </div>
        {seller ? (
          <TrackedLink
            href={withLocale(locale, `/shop/seller/${seller.slug}`)}
            eventType="shop_seller_click"
            entitySlug={seller.slug}
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            {t(seller.displayName, locale)} · {seller.city}
          </TrackedLink>
        ) : null}
      </div>
    </article>
  );
}

export async function ShopHubPageView({
  locale,
  searchParams,
  data,
}: {
  locale: Locale;
  searchParams?: ShopBrowseSearchParams;
  data?: ShopBrowseViewData;
}) {
  const page = data ?? getShopBrowsePage(locale, searchParams);
  const sellersBySlug = new Map(page.sellers.map((seller) => [seller.slug, seller]));

  return sectionContainer(
    <div className="space-y-10 py-12">
      <div className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Link href={withLocale(locale, '/shop/sell')} className="inline-flex items-center rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
              {locale === 'zh' ? '開始賣東西' : 'Start selling'}
            </Link>
            <Link href={withLocale(locale, '/shop/watchlist')} className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              {locale === 'zh' ? '打開追蹤清單' : 'Open watchlist'}
            </Link>
            <QuickCartLink locale={locale} />
          </div>
        </div>
      </div>

      <form action={withLocale(locale, '/shop')} method="get" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,0.8fr))_auto]">
          <input
            name="q"
            defaultValue={searchParams?.q}
            placeholder={locale === 'zh' ? '搜尋商品、品牌、賣家…' : 'Search items, brands, sellers…'}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
          />
          <select name="category" defaultValue={searchParams?.category ?? ''} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
            <option value="">{locale === 'zh' ? '全部分類' : 'All categories'}</option>
            {page.categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {t(category.name, locale)}
              </option>
            ))}
          </select>
          <select name="condition" defaultValue={searchParams?.condition ?? ''} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
            <option value="">{locale === 'zh' ? '全部品況' : 'All conditions'}</option>
            <option value="new">{shopConditionLabel('new', locale)}</option>
            <option value="excellent">{shopConditionLabel('excellent', locale)}</option>
            <option value="good">{shopConditionLabel('good', locale)}</option>
            <option value="fair">{shopConditionLabel('fair', locale)}</option>
          </select>
          <input
            name="priceMin"
            defaultValue={searchParams?.priceMin}
            placeholder={locale === 'zh' ? '最低價' : 'Min price'}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
          />
          <input
            name="priceMax"
            defaultValue={searchParams?.priceMax}
            placeholder={locale === 'zh' ? '最高價' : 'Max price'}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
          />
          <select name="sort" defaultValue={searchParams?.sort ?? 'best_match'} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
            <option value="best_match">{shopSortLabel('best_match', locale)}</option>
            <option value="newest">{shopSortLabel('newest', locale)}</option>
            <option value="price_low">{shopSortLabel('price_low', locale)}</option>
            <option value="price_high">{shopSortLabel('price_high', locale)}</option>
          </select>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="offer" value="1" defaultChecked={searchParams?.offer === '1' || searchParams?.offer === 'true'} />
            {locale === 'zh' ? '只看可議價' : 'Offer-enabled only'}
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="pickup" value="1" defaultChecked={searchParams?.pickup === '1' || searchParams?.pickup === 'true'} />
            {locale === 'zh' ? '只看可面交' : 'Pickup available only'}
          </label>
          <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
            {locale === 'zh' ? '更新結果' : 'Update results'}
          </button>
        </div>
      </form>

      <SaveSearchForm locale={locale} initialSearchParams={searchParams} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {locale === 'zh'
            ? `目前顯示 ${page.totalCount} 筆商品`
            : `Showing ${page.totalCount} listings`}
        </p>
        <div className="flex flex-wrap gap-2">
          {page.currentPage > 1 ? (
            <Link href={buildShopHref(locale, searchParams ?? {}, { page: String(page.currentPage - 1) })} className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              {locale === 'zh' ? '上一頁' : 'Previous'}
            </Link>
          ) : null}
          {page.currentPage < page.totalPages ? (
            <Link href={buildShopHref(locale, searchParams ?? {}, { page: String(page.currentPage + 1) })} className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              {locale === 'zh' ? '下一頁' : 'Next'}
            </Link>
          ) : null}
        </div>
      </div>

      {page.listings.length === 0 ? (
        <EmptyState
          title={locale === 'zh' ? '沒有符合條件的商品' : 'No listings match these filters'}
          description={
            locale === 'zh'
              ? '放寬搜尋字詞、價格區間，或取消只看面交 / 可議價篩選再試一次。'
              : 'Try a broader search, wider price range, or remove the pickup/offer-only filters.'
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {page.listings.map((listing) => (
            <ShopListingCard
              key={listing.slug}
              listing={listing}
              locale={locale}
              seller={sellersBySlug.get(listing.sellerSlug)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ShopListingPageView({
  locale,
  slug,
  data,
}: {
  locale: Locale;
  slug: string;
  data?: ShopListingViewData | null;
}) {
  const listing = data?.listing ?? getShopListingBySlug(slug);
  if (!listing) {
    return null;
  }

  const seller = data?.seller ?? getShopSellerBySlug(listing.sellerSlug);
  if (!seller) {
    return null;
  }
  const acceptedOffer =
    data?.acceptedOffer ??
    getAcceptedShopOffersForBuyer(defaultShopBuyerProfileSlug).find(
      (offer) => offer.listingSlug === listing.slug
    );

  return sectionContainer(
    <div className="space-y-8 py-12">
      <div className="grid gap-8 lg:grid-cols-[1.15fr,0.85fr]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <ShopImage listing={listing} locale={locale} />
            </div>
            {listing.images.slice(1).map((image) => (
              <div key={image.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={t(image.alt, locale)}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="h-full w-full rounded-xl object-cover"
                />
              </div>
            ))}
          </div>

          <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
              <span>{shopConditionLabel(listing.condition, locale)}</span>
              <span className="text-slate-300">/</span>
              <span>{seller.city}</span>
              <span className="text-slate-300">/</span>
              <span>{listing.watcherCount} {locale === 'zh' ? '追蹤' : 'watchers'}</span>
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">{t(listing.title, locale)}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{t(listing.excerpt, locale)}</p>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
              <div className="space-y-4">
                {listing.description.map((paragraph, index) => (
                  <p key={`${listing.slug}-${index}`} className="text-base leading-8 text-slate-700">
                    {t(paragraph, locale)}
                  </p>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-lg font-semibold text-slate-900">{locale === 'zh' ? '商品細節' : 'Item specifics'}</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  {Object.entries(listing.itemSpecifics).map(([key, value]) => (
                    <div key={`${listing.slug}-${key}`} className="grid grid-cols-[7rem,1fr] gap-3">
                      <dt className="font-semibold capitalize text-slate-500">{key.replace(/_/g, ' ')}</dt>
                      <dd className="text-slate-700">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </article>
        </div>

        <aside className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-3xl font-bold text-slate-900">{formatShopMoney(listing.priceCents, locale)}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-500">
              <span>{listing.quantityAvailable} {locale === 'zh' ? '可售' : 'available'}</span>
              <span>·</span>
              <span>{listing.allowOffers ? (locale === 'zh' ? '接受議價' : 'Offers welcome') : locale === 'zh' ? '固定價格' : 'Fixed price only'}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {listing.shippingMethods.map((method) => (
                <span key={`${listing.slug}-${method}`} className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {shopShippingLabel(method, locale)}
                </span>
              ))}
            </div>
            {acceptedOffer ? (
              <Link
                href={appendSearch(withLocale(locale, '/shop/checkout'), `offer=${acceptedOffer.id}`)}
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {locale === 'zh' ? '用已接受出價結帳' : 'Checkout with accepted offer'}
              </Link>
            ) : null}
            <div className="mt-5 space-y-4">
              <AddToCartForm locale={locale} listingSlug={listing.slug} variants={listing.variants} />
              {listing.allowOffers ? (
                <MakeOfferForm
                  locale={locale}
                  listingSlug={listing.slug}
                  sellerSlug={seller.slug}
                  currentPriceCents={listing.priceCents}
                  variants={listing.variants}
                />
              ) : null}
              <div className="flex flex-wrap gap-3">
                <WatchlistButton locale={locale} listingSlug={listing.slug} />
                <QuickCartLink locale={locale} />
              </div>
            </div>
          </div>

          <SellerTrustPanel seller={seller} locale={locale} />

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {locale === 'zh' ? '賣家' : 'Seller'}
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">{t(seller.displayName, locale)}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t(seller.description, locale)}</p>
                <p className="mt-3 text-sm text-slate-500">
                  {seller.city} · {formatLanguageList(seller.languages, locale)}
                </p>
              </div>
              <SaveSellerButton locale={locale} sellerSlug={seller.slug} />
            </div>
            <div className="mt-4">
              <MessageSellerForm locale={locale} sellerSlug={seller.slug} listingSlug={listing.slug} topic="pre_sale" />
            </div>
          </div>

          <ReportIssueForm entitySlug={listing.slug} entityType="shop_listing" locale={locale} />
        </aside>
      </div>

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: t(listing.title, locale),
          description: t(listing.excerpt, locale),
          image: listing.images.map((image) => image.url),
          itemCondition: shopConditionLabel(listing.condition, 'en'),
          offers: {
            '@type': 'Offer',
            priceCurrency: 'USD',
            price: (listing.priceCents / 100).toFixed(2),
            availability: listing.quantityAvailable > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: absoluteUrl(withLocale(locale, `/shop/item/${listing.slug}`)),
          },
          seller: {
            '@type': 'Organization',
            name: seller.displayName.en,
          },
        }}
      />
    </div>
  );
}

export function ShopSellerPageView({
  locale,
  slug,
  data,
}: {
  locale: Locale;
  slug: string;
  data?: ShopSellerViewData | null;
}) {
  const seller = data?.seller ?? getShopSellerBySlug(slug);
  if (!seller) {
    return null;
  }

  const sellerProfile = data?.sellerProfile ?? getShopSellerProfile(slug);
  const listings = data?.listings ?? getShopSellerListings(slug);
  const feedback = data?.feedback ?? getShopFeedbackForSeller(slug);
  const trust = data?.trust ?? getShopSellerTrustSummary(slug);

  return sectionContainer(
    <div className="space-y-10 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
              <span>{seller.topRated ? (locale === 'zh' ? '優質賣家' : 'Top rated') : locale === 'zh' ? '已審核賣家' : 'Reviewed seller'}</span>
              <span className="text-slate-300">/</span>
              <span>{seller.city}</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t(seller.displayName, locale)}</h1>
            <p className="max-w-3xl text-base leading-7 text-slate-600">{t(seller.description, locale)}</p>
            <p className="text-sm text-slate-500">
              {trust ? `${trust.positiveFeedbackRate}% ${locale === 'zh' ? '正評' : 'positive'} · ${trust.totalCount} ${locale === 'zh' ? '則評價' : 'feedback'}` : null}
            </p>
          </div>
          <SaveSellerButton locale={locale} sellerSlug={seller.slug} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[0.9fr,1.1fr]">
        <div className="space-y-6">
          <SellerTrustPanel seller={seller} locale={locale} trustSummary={trust} />
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{locale === 'zh' ? '聯絡賣家' : 'Contact seller'}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {sellerProfile
                ? `${sellerProfile.name} · ${formatLanguageList(seller.languages, locale)}`
                : formatLanguageList(seller.languages, locale)}
            </p>
            <div className="mt-4">
              <MessageSellerForm locale={locale} sellerSlug={seller.slug} topic="pre_sale" />
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '上架商品' : 'Active listings'}</h2>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              {listings.map((listing) => (
                <ShopListingCard key={listing.slug} listing={listing} locale={locale} seller={seller} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{locale === 'zh' ? '最新評價' : 'Recent feedback'}</h2>
            <div className="mt-4 space-y-4">
              {feedback.length === 0 ? (
                <EmptyState
                  title={locale === 'zh' ? '還沒有新評價' : 'No recent feedback yet'}
                  description={
                    locale === 'zh'
                      ? '完成的訂單會在這裡累積買家評價。'
                      : 'Buyer feedback will begin appearing here after completed orders.'
                  }
                />
              ) : (
                feedback.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">{t(entry.title, locale)}</p>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {shopFeedbackSentimentLabel(entry.sentiment, locale)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{t(entry.comment, locale)}</p>
                    <p className="mt-3 text-xs text-slate-500">{formatDate(entry.createdAt, locale)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: seller.displayName.en,
          description: seller.description.en,
          url: absoluteUrl(withLocale(locale, `/shop/seller/${seller.slug}`)),
        }}
      />
    </div>
  );
}

export function ShopWatchlistPageView({
  locale,
  data,
}: {
  locale: Locale;
  data?: ShopWatchlistViewData;
}) {
  const watchlist = data?.watchlist ?? getShopListingByWatchlist(defaultShopBuyerProfileSlug);
  const acceptedOffers = data?.acceptedOffers ?? getAcceptedShopOffersForBuyer(defaultShopBuyerProfileSlug);
  const savedSellers = data?.savedSellers ?? getShopSavedSellers(defaultShopBuyerProfileSlug);

  return sectionContainer(
    <div className="space-y-8 py-12">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          {locale === 'zh' ? '追蹤清單' : 'Watchlist'}
        </h1>
        <p className="text-base leading-7 text-slate-600">
          {locale === 'zh'
            ? '這裡會集中你追蹤的商品、已接受的出價，以及收藏賣家。'
            : 'Your watched items, accepted offers, and saved sellers live here.'}
        </p>
      </div>

      {acceptedOffers.length > 0 ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="text-xl font-semibold text-emerald-950">{locale === 'zh' ? '已接受的出價' : 'Accepted offers'}</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {acceptedOffers.map((offer) => {
              const listing = getShopListingBySlug(offer.listingSlug);
              if (!listing) {
                return null;
              }

              return (
                <div key={offer.id} className="rounded-2xl border border-emerald-200 bg-white p-5">
                  <p className="font-semibold text-slate-900">{t(listing.title, locale)}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {locale === 'zh' ? '接受價格' : 'Accepted price'}: {formatShopMoney(offer.counterAmountCents ?? offer.amountCents, locale)}
                  </p>
                  <Link
                    href={appendSearch(withLocale(locale, '/shop/checkout'), `offer=${offer.id}`)}
                    className="mt-4 inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    {locale === 'zh' ? '前往結帳' : 'Checkout now'}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {watchlist.length === 0 ? (
        <EmptyState
          title={locale === 'zh' ? '追蹤清單還是空的' : 'Your watchlist is still empty'}
          description={
            locale === 'zh'
              ? '在商品頁點一下加入追蹤，就能回到這裡集中查看。'
              : 'Add listings from item pages and they will show up here.'
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {watchlist.map((listing) => (
            <ShopListingCard key={listing.slug} listing={listing} locale={locale} />
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">{locale === 'zh' ? '收藏賣家' : 'Saved sellers'}</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {savedSellers.length === 0 ? (
            <p className="text-sm text-slate-500">{locale === 'zh' ? '目前還沒有收藏賣家。' : 'No saved sellers yet.'}</p>
          ) : (
            savedSellers.map((seller) => (
              <Link key={seller.slug} href={withLocale(locale, `/shop/seller/${seller.slug}`)} className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                {t(seller.displayName, locale)}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function ShopSavedSearchesPageView({
  locale,
  data,
}: {
  locale: Locale;
  data?: ShopSavedSearchesViewData;
}) {
  const savedSearches = data?.savedSearches ?? getShopSavedSearches(defaultShopBuyerProfileSlug);
  const savedSellers = data?.savedSellers ?? getShopSavedSellers(defaultShopBuyerProfileSlug);

  return sectionContainer(
    <div className="space-y-8 py-12">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          {locale === 'zh' ? '已存搜尋' : 'Saved Searches'}
        </h1>
        <p className="text-base leading-7 text-slate-600">
          {locale === 'zh'
            ? '重跑常用篩選、快速回到有興趣的賣家。'
            : 'Rerun common filters and jump back to the sellers you follow.'}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">{locale === 'zh' ? '搜尋條件' : 'Saved filters'}</h2>
        <div className="mt-4 space-y-4">
            {savedSearches.length === 0 ? (
              <EmptyState
                title={locale === 'zh' ? '還沒有儲存搜尋' : 'No searches saved yet'}
                description={
                  locale === 'zh'
                    ? '在市集結果頁可以把目前篩選條件存起來。'
                    : 'Use the save-search form on Shop browse pages to save current filters.'
                }
              />
            ) : (
              savedSearches.map((search) => {
                const href = buildShopHref(locale, {
                  q: search.query,
                  category: search.category,
                  condition: search.condition,
                  offer: search.offerOnly ? '1' : undefined,
                  pickup: search.pickupOnly ? '1' : undefined,
                  priceMin: search.priceMin ? String(search.priceMin) : undefined,
                  priceMax: search.priceMax ? String(search.priceMax) : undefined,
                  sort: search.sort,
                });

                return (
                  <div key={search.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{search.label}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatDateTime(search.createdAt, locale)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link href={href} className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                          {locale === 'zh' ? '重跑搜尋' : 'Run search'}
                        </Link>
                        <DeleteSavedSearchButton locale={locale} searchId={search.id} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">{locale === 'zh' ? '收藏賣家' : 'Followed sellers'}</h2>
          <div className="mt-4 space-y-4">
            {savedSellers.length === 0 ? (
              <p className="text-sm text-slate-500">{locale === 'zh' ? '還沒有收藏賣家。' : 'No followed sellers yet.'}</p>
            ) : (
              savedSellers.map((seller) => (
                <Link key={seller.slug} href={withLocale(locale, `/shop/seller/${seller.slug}`)} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100">
                  <p className="font-semibold text-slate-900">{t(seller.displayName, locale)}</p>
                  <p className="mt-2 text-sm text-slate-600">{t(seller.headline, locale)}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShopCartPageView({
  locale,
  data,
}: {
  locale: Locale;
  data?: ShopCartViewData;
}) {
  const items = data?.items ?? getShopCartDetailedItems(defaultShopBuyerProfileSlug);
  const subtotal = items.reduce((sum, entry) => sum + entry.unitPriceCents * entry.item.quantity, 0);

  return sectionContainer(
    <div className="space-y-8 py-12">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          {locale === 'zh' ? '購物車' : 'Cart'}
        </h1>
        <p className="text-base leading-7 text-slate-600">
          {locale === 'zh'
            ? 'Shop 會在結帳時自動依賣家拆單，並重新驗證庫存與議價保留。'
            : 'Shop will split marketplace carts by seller at checkout and revalidate stock before creating orders.'}
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={locale === 'zh' ? '購物車目前是空的' : 'Your cart is currently empty'}
          description={
            locale === 'zh'
              ? '回到 Shop 商品頁，把想買的東西先放進購物車。'
              : 'Visit item pages and add the listings you want to buy.'
          }
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-4">
            <div className="flex justify-end">
              <ClearCartButton locale={locale} />
            </div>
            {items.map((entry) => (
              <div key={entry.item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Link href={withLocale(locale, `/shop/item/${entry.listing.slug}`)} className="text-lg font-semibold text-slate-900 hover:text-brand-700">
                      {t(entry.listing.title, locale)}
                    </Link>
                    <p className="mt-2 text-sm text-slate-600">
                      {entry.variant ? `${t(entry.variant.label, locale)} · ` : ''}{entry.item.quantity} × {formatShopMoney(entry.unitPriceCents, locale)}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">{entry.seller ? t(entry.seller.displayName, locale) : entry.listing.sellerSlug}</p>
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    {formatShopMoney(entry.unitPriceCents * entry.item.quantity, locale)}
                  </p>
                </div>
                <div className="mt-4">
                  <RemoveCartItemButton locale={locale} itemId={entry.item.id} />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{locale === 'zh' ? '訂單預估' : 'Order estimate'}</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>{locale === 'zh' ? '商品小計' : 'Items subtotal'}</span>
                <span>{formatShopMoney(subtotal, locale)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{locale === 'zh' ? '運費' : 'Shipping'}</span>
                <span>{locale === 'zh' ? '結帳時計算' : 'Calculated at checkout'}</span>
              </div>
            </div>
            <Link href={withLocale(locale, '/shop/checkout')} className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-brand-900 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-800">
              {locale === 'zh' ? '前往結帳' : 'Proceed to checkout'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function ShopCheckoutPageView({
  locale,
  searchParams,
  data,
}: {
  locale: Locale;
  searchParams?: { offer?: string };
  data?: ShopCheckoutViewData;
}) {
  const offerId = searchParams?.offer;
  const acceptedOffer =
    data?.acceptedOffer ??
    (offerId
      ? getAcceptedShopOffersForBuyer(defaultShopBuyerProfileSlug).find((offer) => offer.id === offerId)
      : undefined);
  const offerListing = data?.offerListing ?? (acceptedOffer ? getShopListingBySlug(acceptedOffer.listingSlug) : undefined);
  const cartItems = data?.cartItems ?? (offerId ? [] : getShopCartDetailedItems(defaultShopBuyerProfileSlug));

  return sectionContainer(
    <div className="space-y-8 py-12">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          {locale === 'zh' ? '結帳' : 'Checkout'}
        </h1>
        <p className="text-base leading-7 text-slate-600">
          {locale === 'zh'
            ? '結帳會在建立訂單前重新確認庫存，並依賣家拆分付款後的訂單。'
            : 'Checkout revalidates inventory and splits marketplace orders by seller before creation.'}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-4">
          {acceptedOffer && offerListing ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
              <h2 className="text-xl font-semibold text-emerald-950">{locale === 'zh' ? '接受的出價' : 'Accepted offer checkout'}</h2>
              <p className="mt-3 font-semibold text-slate-900">{t(offerListing.title, locale)}</p>
              <p className="mt-2 text-sm text-slate-600">
                {locale === 'zh' ? '結帳價格' : 'Checkout price'}: {formatShopMoney(acceptedOffer.counterAmountCents ?? acceptedOffer.amountCents, locale)}
              </p>
            </div>
          ) : cartItems.length === 0 ? (
            <EmptyState
              title={locale === 'zh' ? '沒有可結帳的商品' : 'Nothing ready for checkout'}
              description={
                locale === 'zh'
                  ? '請先把商品加入購物車，或從接受的出價連結進入。'
                  : 'Add something to your cart first, or use the checkout link from an accepted offer.'
              }
            />
          ) : (
            cartItems.map((entry) => (
              <div key={entry.item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{t(entry.listing.title, locale)}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {entry.item.quantity} × {formatShopMoney(entry.unitPriceCents, locale)}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-900">
                    {formatShopMoney(entry.item.quantity * entry.unitPriceCents, locale)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <ShopCheckoutForm locale={locale} offerId={offerId} />
      </div>
    </div>
  );
}

export function ShopOrdersPageView({
  locale,
  data,
}: {
  locale: Locale;
  data?: ShopOrdersViewData;
}) {
  const orders = data?.orders ?? getShopOrdersForBuyer(defaultShopBuyerProfileSlug);

  return sectionContainer(
    <div className="space-y-8 py-12">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          {locale === 'zh' ? '訂單紀錄' : 'Orders'}
        </h1>
        <p className="text-base leading-7 text-slate-600">
          {locale === 'zh'
            ? '從這裡查看訂單、退貨與案件狀態，也可以進入訂單詳情跟賣家聯絡。'
            : 'Review order history, returns, and cases here, then jump into order detail for support.'}
        </p>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title={locale === 'zh' ? '目前沒有訂單' : 'No orders yet'}
          description={
            locale === 'zh'
              ? '完成結帳後，訂單會在這裡出現。'
              : 'Orders will appear here after checkout.'
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const seller = getShopSellerBySlug(order.sellerSlug);
            const returnRequest = data?.returnsByOrderId?.get(order.id) ?? getShopReturnByOrderId(order.id);
            const caseRecord = data?.casesByOrderId?.get(order.id) ?? getShopCaseByOrderId(order.id);

            return (
              <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {order.id}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{seller ? t(seller.displayName, locale) : order.sellerSlug}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                      <span>{shopOrderStatusLabel(order.status, locale)}</span>
                      <span>{formatDateTime(order.createdAt, locale)}</span>
                      <span>{formatShopMoney(order.totalCents, locale)}</span>
                    </div>
                    {returnRequest ? (
                      <p className="mt-2 text-sm text-amber-700">
                        {locale === 'zh' ? '退貨狀態' : 'Return'}: {returnRequest.status}
                      </p>
                    ) : null}
                    {caseRecord ? (
                      <p className="mt-1 text-sm text-rose-700">
                        {locale === 'zh' ? '案件狀態' : 'Case'}: {shopCaseStatusLabel(caseRecord.status, locale)}
                      </p>
                    ) : null}
                  </div>
                  <Link href={withLocale(locale, `/shop/orders/${order.id}`)} className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                    {locale === 'zh' ? '查看訂單' : 'View order'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ShopOrderDetailPageView({
  locale,
  orderId,
  data,
}: {
  locale: Locale;
  orderId: string;
  data?: ShopOrderDetailViewData | null;
}) {
  const order = data?.order ?? getShopOrderById(orderId);
  if (!order) {
    return null;
  }
  const seller = data?.seller ?? getShopSellerBySlug(order.sellerSlug);
  const returnRequest = data?.returnRequest ?? getShopReturnByOrderId(order.id);
  const caseRecord = data?.caseRecord ?? getShopCaseByOrderId(order.id);
  const feedback = data?.feedback ?? getShopFeedbackForSeller(order.sellerSlug).find((entry) => entry.orderId === order.id);
  const conversation = seller
    ? getShopConversationsForSeller(seller.slug).find((item) => item.orderId === order.id)
    : undefined;
  const messages = data?.conversationMessages ?? (conversation ? getShopConversationMessages(conversation.id) : []);

  return sectionContainer(
    <div className="space-y-8 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{order.id}</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
              {locale === 'zh' ? '訂單詳情' : 'Order detail'}
            </h1>
            <p className="mt-2 text-base text-slate-600">
              {shopOrderStatusLabel(order.status, locale)} · {formatDateTime(order.createdAt, locale)}
            </p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatShopMoney(order.totalCents, locale)}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{locale === 'zh' ? '商品明細' : 'Items'}</h2>
            <div className="mt-4 space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="font-semibold text-slate-900">{t(item.title, locale)}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {item.quantity} × {formatShopMoney(item.unitPriceCents, locale)}
                      {item.variantLabel ? ` · ${t(item.variantLabel, locale)}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-600">
                    {shopConditionLabel(item.snapshotCondition, locale)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{locale === 'zh' ? '訊息紀錄' : 'Message thread'}</h2>
            <div className="mt-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {locale === 'zh' ? '目前還沒有訊息紀錄。' : 'No messages yet for this order.'}
                </p>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">{message.senderProfileSlug}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(message.createdAt, locale)}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{message.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{locale === 'zh' ? '配送與支援' : 'Shipping and support'}</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>{locale === 'zh' ? '付款方式' : 'Payment'}: {order.paymentMethod}</p>
              {order.shippingAddress ? <p>{locale === 'zh' ? '配送地址' : 'Ship to'}: {order.shippingAddress}</p> : null}
              {order.shipment?.carrier ? <p>{order.shipment.carrier}: {order.shipment.trackingNumber}</p> : null}
              {order.shipment?.pickupCode ? <p>{locale === 'zh' ? '取貨碼' : 'Pickup code'}: {order.shipment.pickupCode}</p> : null}
            </div>
            {seller ? (
              <div className="mt-4">
                <MessageSellerForm locale={locale} sellerSlug={seller.slug} orderId={order.id} topic="order_support" />
              </div>
            ) : null}
          </div>

          {!returnRequest ? <ShopReturnRequestForm locale={locale} orderId={order.id} /> : null}
          {!caseRecord ? <ShopCaseOpenForm locale={locale} orderId={order.id} /> : null}
          {!feedback ? <ShopFeedbackForm locale={locale} orderId={order.id} sellerSlug={order.sellerSlug} /> : null}

          {returnRequest ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="text-lg font-semibold text-amber-950">{locale === 'zh' ? '退貨申請' : 'Return request'}</h2>
              <p className="mt-2 text-sm text-amber-900">{returnRequest.reason}</p>
              <p className="mt-2 text-xs text-amber-700">
                {locale === 'zh' ? '賣家回覆期限' : 'Seller response due'}: {formatDateTime(returnRequest.sellerRespondBy, locale)}
              </p>
            </div>
          ) : null}

          {caseRecord ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <h2 className="text-lg font-semibold text-rose-950">{locale === 'zh' ? '案件狀態' : 'Case status'}</h2>
              <p className="mt-2 text-sm text-rose-900">{caseRecord.reason}</p>
              <p className="mt-2 text-xs text-rose-700">
                {shopCaseStatusLabel(caseRecord.status, locale)} · {formatDateTime(caseRecord.sellerRespondBy, locale)}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ShopSellPageView({
  locale,
  data,
}: {
  locale: Locale;
  data?: ShopSellViewData;
}) {
  const seller = data?.seller ?? getPrimaryShopSellerForProfile();
  if (!seller) {
    return sectionContainer(
      <div className="py-12">
        <EmptyState
          title={locale === 'zh' ? '目前沒有可用賣家帳號' : 'No seller account is available yet'}
          description={
            locale === 'zh'
              ? '請先建立 seller profile 再回來送審商品。'
              : 'Create a seller profile first, then come back to submit listings.'
          }
        />
      </div>
    );
  }

  return sectionContainer(
    <div className="space-y-10 py-12">
      <div className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm lg:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
            {locale === 'zh' ? '賣家開通流程' : 'Seller Onboarding'}
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            {locale === 'zh' ? '市集賣家流程：認證、Stripe Connect 與送審上架' : 'Shop Sell: seller auth, Stripe Connect, and moderated listing intake'}
          </h1>
          <p className="text-base leading-7 text-slate-600">
            {locale === 'zh'
              ? '這個流程先把 magic link / Google OAuth 與 Stripe Connect 接點預留好，再用送審流程把商品送進 Marketplace。'
              : 'This flow keeps the magic-link / Google OAuth and Stripe Connect touchpoints visible, then sends new listings into a moderated marketplace intake.'}
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-500">{locale === 'zh' ? '賣家狀態' : 'Seller state'}</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{seller.approved ? (locale === 'zh' ? '已核准' : 'Approved') : locale === 'zh' ? '待核准' : 'Pending'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-500">Stripe Connect</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{seller.stripeAccountStatus}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-500">{locale === 'zh' ? '退貨政策' : 'Returns'}</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{seller.returnWindowDays} {locale === 'zh' ? '天' : 'days'}</p>
            </div>
          </div>
        </div>
        <ShopAuthPanel locale={locale} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{locale === 'zh' ? '賣家支付設定' : 'Seller payouts setup'}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {locale === 'zh'
                ? '目前按鈕會更新 demo seller 的 Stripe Connect 狀態；若正式環境接上密鑰，可改成真正 onboarding link。'
                : 'Right now the button updates the demo seller Stripe Connect state. In production, it can be swapped for a real onboarding link.'}
            </p>
          </div>
          <ShopStripeConnectButton locale={locale} sellerSlug={seller.slug} />
        </div>
      </div>

      <ShopSellForm
        locale={locale}
        seller={seller}
        categories={(data?.categories ?? getShopCategories()).map((category) => ({
          slug: category.slug,
          label: t(category.name, locale),
        }))}
      />
    </div>
  );
}

export function ShopDashboardListingsPageView({
  locale,
  data,
}: {
  locale: Locale;
  data?: ShopDashboardViewData | null;
}) {
  const snapshot = data?.snapshot ?? getShopSellerDashboardSnapshot(defaultShopDashboardSellerSlug);
  if (!snapshot.seller) {
    return null;
  }

  const metrics = [
    {
      label: locale === 'zh' ? '目前上架' : 'Live now',
      value: String(snapshot.stats.activeListings),
      detail: locale === 'zh' ? '可立即販售' : 'Ready to buy',
    },
    {
      label: locale === 'zh' ? '待審核' : 'Pending review',
      value: String(snapshot.stats.pendingListings),
      detail: locale === 'zh' ? '等待上架' : 'Needs approval',
    },
    {
      label: locale === 'zh' ? '追蹤數' : 'Watchers',
      value: String(snapshot.stats.totalWatchers),
      detail: locale === 'zh' ? '所有商品合計' : 'Across inventory',
    },
    {
      label: locale === 'zh' ? '瀏覽轉單' : 'View to order',
      value: `${snapshot.stats.conversionRate}%`,
      detail: locale === 'zh' ? '估算值' : 'Estimated',
    },
  ];

  return (
    <ShopDashboardShell
      locale={locale}
      section="listings"
      seller={snapshot.seller}
      metrics={metrics}
      action={
        <div className="flex flex-wrap gap-3 xl:justify-end">
          <Link
            href={withLocale(locale, '/shop/sell')}
            className="inline-flex items-center justify-center rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            {locale === 'zh' ? '新增商品' : 'New listing'}
          </Link>
          <Link
            href={withLocale(locale, `/shop/seller/${snapshot.seller.slug}`)}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            {locale === 'zh' ? '查看賣家頁' : 'View storefront'}
          </Link>
        </div>
      }
    >
      <ShopDashboardPanel
        title={locale === 'zh' ? '商品佇列' : 'Listing queue'}
        description={locale === 'zh' ? '價格、庫存與目前狀態集中在同一列處理。' : 'Price, availability, and current state are handled in one queue.'}
        meta={locale === 'zh' ? `${snapshot.listings.length} 筆商品` : `${snapshot.listings.length} listings`}
      >
        {snapshot.listings.length === 0 ? (
          <ShopDashboardEmptyState
            title={locale === 'zh' ? '目前沒有商品' : 'No listings yet'}
            description={locale === 'zh' ? '建立第一筆商品後，狀態與庫存會出現在這裡。' : 'Once the first item is created, status and inventory will appear here.'}
          />
        ) : (
          <div className="divide-y divide-slate-200/80">
            {snapshot.listings.map((listing) => (
              <div
                key={listing.slug}
                className="group grid gap-4 px-6 py-5 transition-colors duration-200 hover:bg-slate-50/70 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <ShopDashboardPill tone={shopDashboardListingTone(listing.status)}>
                      {shopListingStatusLabel(listing.status, locale)}
                    </ShopDashboardPill>
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                      {locale === 'zh' ? '更新於' : 'Updated'} {formatDate(listing.updatedAt, locale)}
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{t(listing.title, locale)}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {formatShopMoney(listing.priceCents, locale)} · {listing.quantityAvailable} {locale === 'zh' ? '可售' : 'available'} · {listing.viewCount}{' '}
                      {locale === 'zh' ? '次瀏覽' : 'views'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {listing.watcherCount} {locale === 'zh' ? '人追蹤' : 'watchers'} · {listing.soldCount} {locale === 'zh' ? '已售' : 'sold'}
                      {listing.allowOffers ? ` · ${locale === 'zh' ? '可議價' : 'Offers on'}` : ''}
                      {listing.allowLocalPickup ? ` · ${locale === 'zh' ? '可面交' : 'Pickup'}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <ShopListingStatusForm locale={locale} listingSlug={listing.slug} status="active" label={locale === 'zh' ? '設為上架' : 'Set active'} />
                  <ShopListingStatusForm locale={locale} listingSlug={listing.slug} status="paused" label={locale === 'zh' ? '暫停' : 'Pause'} />
                  <ShopListingStatusForm locale={locale} listingSlug={listing.slug} status="ended" label={locale === 'zh' ? '結束' : 'End'} />
                </div>
              </div>
            ))}
          </div>
        )}
      </ShopDashboardPanel>
    </ShopDashboardShell>
  );
}

type ShopDashboardSection = 'listings' | 'orders' | 'offers' | 'payouts';
type ShopDashboardMetric = {
  label: string;
  value: string;
  detail?: string;
};
type ShopDashboardTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

function shopDashboardSectionHref(locale: Locale, section: ShopDashboardSection) {
  return withLocale(locale, `/dashboard/shop/${section}`);
}

function shopDashboardSectionLabel(section: ShopDashboardSection, locale: Locale) {
  switch (section) {
    case 'listings':
      return locale === 'zh' ? '商品' : 'Listings';
    case 'orders':
      return locale === 'zh' ? '訂單' : 'Orders';
    case 'offers':
      return locale === 'zh' ? '議價' : 'Offers';
    case 'payouts':
      return locale === 'zh' ? '收款' : 'Payouts';
  }
}

function shopDashboardSectionDescription(section: ShopDashboardSection, locale: Locale) {
  switch (section) {
    case 'listings':
      return locale === 'zh'
        ? '檢查上架、待審與暫停中的商品，直接調整狀態與可售數量。'
        : 'Review live, pending, and paused inventory, then adjust state and sellable units from one place.';
    case 'orders':
      return locale === 'zh'
        ? '追蹤出貨、面交、退貨與案件，優先處理需要賣家回應的訂單。'
        : 'Track shipping, pickup, returns, and cases, with seller actions kept visible in the queue.';
    case 'offers':
      return locale === 'zh'
        ? '處理新出價、還價與保留時限，避免漏掉需要回覆的議價。'
        : 'Handle new offers, counters, and reservation windows without losing the next reply.';
    case 'payouts':
      return locale === 'zh'
        ? '確認 Stripe 狀態、檢查待入帳款項，並追蹤每筆撥款時間。'
        : 'Confirm Stripe status, monitor queued balances, and track when each payout becomes available.';
  }
}

function shopDashboardStripeStatusLabel(status: 'not_started' | 'pending' | 'active', locale: Locale) {
  switch (status) {
    case 'active':
      return locale === 'zh' ? '已啟用' : 'Active';
    case 'pending':
      return locale === 'zh' ? '處理中' : 'Pending';
    case 'not_started':
      return locale === 'zh' ? '未開始' : 'Not started';
  }
}

function shopDashboardPayoutStatusLabel(status: 'pending' | 'in_transit' | 'paid', locale: Locale) {
  switch (status) {
    case 'pending':
      return locale === 'zh' ? '待入帳' : 'Queued';
    case 'in_transit':
      return locale === 'zh' ? '轉帳中' : 'In transit';
    case 'paid':
      return locale === 'zh' ? '已付款' : 'Paid';
  }
}

function shopDashboardToneClasses(tone: ShopDashboardTone) {
  switch (tone) {
    case 'accent':
      return 'border-brand-200 bg-brand-50 text-brand-700';
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'danger':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'neutral':
      return 'border-slate-200 bg-slate-100 text-slate-700';
  }
}

function shopDashboardListingTone(status: ShopListing['status']): ShopDashboardTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'pending_review':
      return 'warning';
    case 'paused':
    case 'draft':
    case 'sold_out':
    case 'ended':
    case 'removed':
      return 'neutral';
  }
}

function shopDashboardOrderTone(status: Parameters<typeof shopOrderStatusLabel>[0]): ShopDashboardTone {
  switch (status) {
    case 'pending_payment':
    case 'paid':
      return 'warning';
    case 'processing':
    case 'shipped':
      return 'accent';
    case 'delivered':
    case 'completed':
      return 'success';
    case 'cancelled':
    case 'refunded':
    case 'partially_refunded':
      return 'neutral';
  }
}

function shopDashboardOfferTone(status: Parameters<typeof shopOfferStatusLabel>[0]): ShopDashboardTone {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'countered':
      return 'accent';
    case 'accepted':
      return 'success';
    case 'declined':
    case 'expired':
    case 'withdrawn':
      return 'neutral';
  }
}

function shopDashboardPayoutTone(status: 'pending' | 'in_transit' | 'paid'): ShopDashboardTone {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'in_transit':
      return 'accent';
    case 'paid':
      return 'success';
  }
}

function shopDashboardStripeTone(status: 'not_started' | 'pending' | 'active'): ShopDashboardTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'pending':
      return 'warning';
    case 'not_started':
      return 'neutral';
  }
}

function ShopDashboardPill({
  tone = 'neutral',
  children,
}: {
  tone?: ShopDashboardTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${shopDashboardToneClasses(tone)}`}
    >
      {children}
    </span>
  );
}

function ShopDashboardMetricBand({ metrics }: { metrics: ShopDashboardMetric[] }) {
  return (
    <div className="shop-dashboard-band overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white/90 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
      <dl className="grid divide-y divide-slate-200/80 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="px-5 py-4 sm:px-6">
            <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{metric.label}</dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{metric.value}</dd>
            {metric.detail ? <p className="mt-2 text-sm text-slate-500">{metric.detail}</p> : null}
          </div>
        ))}
      </dl>
    </div>
  );
}

function ShopDashboardPanel({
  title,
  description,
  meta,
  children,
}: {
  title: string;
  description: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="shop-dashboard-panel overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white/95 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {meta ? <p className="text-sm font-medium text-slate-500">{meta}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ShopDashboardEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-6 py-14 text-center">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function ShopDashboardShell({
  locale,
  section,
  seller,
  metrics,
  action,
  children,
}: {
  locale: Locale;
  section: ShopDashboardSection;
  seller: ShopSeller;
  metrics: ShopDashboardMetric[];
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return sectionContainer(
    <div className="space-y-8 py-8 sm:py-10">
      <section className="shop-dashboard-shell relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#fffdf7_0%,#ffffff_56%,#f8fafc_100%)] px-6 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] sm:px-8 sm:py-8">
        <div className="shop-dashboard-line absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(37,99,235,0.35),transparent)]" />

        <div className="relative space-y-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                {locale === 'zh' ? 'Shop 工作台' : 'Shop workspace'}
              </p>
              <div className="space-y-2">
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-[2.75rem]">
                  {shopDashboardSectionLabel(section, locale)}
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  {shopDashboardSectionDescription(section, locale)}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-4 xl:min-w-[19rem] xl:items-end xl:text-right">
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <ShopDashboardPill tone={seller.approved ? 'success' : 'warning'}>
                  {seller.approved ? (locale === 'zh' ? '賣家已核准' : 'Seller approved') : locale === 'zh' ? '等待核准' : 'Pending approval'}
                </ShopDashboardPill>
                <ShopDashboardPill tone={shopDashboardStripeTone(seller.stripeAccountStatus)}>
                  Stripe {shopDashboardStripeStatusLabel(seller.stripeAccountStatus, locale)}
                </ShopDashboardPill>
              </div>

              <div className="grid gap-1.5 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-4 xl:justify-end">
                  <span className="text-slate-500">{locale === 'zh' ? '賣家' : 'Seller'}</span>
                  <span className="font-medium text-slate-900">
                    {t(seller.displayName, locale)} · {seller.city}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 xl:justify-end">
                  <span className="text-slate-500">{locale === 'zh' ? '回覆率' : 'Response rate'}</span>
                  <span className="font-medium text-slate-900">{seller.responseRate}%</span>
                </div>
                <div className="flex items-center justify-between gap-4 xl:justify-end">
                  <span className="text-slate-500">{locale === 'zh' ? '處理時間' : 'Handling'}</span>
                  <span className="font-medium text-slate-900">
                    {seller.handlingTimeDays} {locale === 'zh' ? '天' : 'day(s)'}
                  </span>
                </div>
              </div>

              {action ? action : null}
            </div>
          </div>

          <div className="overflow-x-auto pb-1">
            <nav className="flex min-w-max gap-2 rounded-[1.25rem] border border-slate-200/80 bg-white/85 p-2 backdrop-blur">
              {(['listings', 'orders', 'offers', 'payouts'] as const).map((item) => {
                const active = item === section;

                return (
                  <Link
                    key={item}
                    href={shopDashboardSectionHref(locale, item)}
                    className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                      active
                        ? 'bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {shopDashboardSectionLabel(item, locale)}
                  </Link>
                );
              })}
            </nav>
          </div>

          <ShopDashboardMetricBand metrics={metrics} />
        </div>
      </section>

      {children}
    </div>
  );
}

export function ShopDashboardOrdersPageView({
  locale,
  data,
}: {
  locale: Locale;
  data?: ShopDashboardViewData | null;
}) {
  const snapshot = data?.snapshot ?? getShopSellerDashboardSnapshot(defaultShopDashboardSellerSlug);
  if (!snapshot.seller) {
    return null;
  }

  const returnsByOrderId = data?.returnsByOrderId ?? new Map(snapshot.orders.map((order) => [order.id, getShopReturnByOrderId(order.id)]));
  const casesByOrderId = data?.casesByOrderId ?? new Map(snapshot.orders.map((order) => [order.id, getShopCaseByOrderId(order.id)]));
  const pickupQueueCount = snapshot.orders.filter(
    (order) => order.shipment?.method === 'local_pickup' && !order.shipment?.pickedUpAt
  ).length;
  const returnCount = snapshot.orders.filter((order) => returnsByOrderId.get(order.id)?.status === 'requested').length;
  const openCaseCount = snapshot.orders.filter((order) => {
    const caseRecord = casesByOrderId.get(order.id);
    return Boolean(caseRecord && caseRecord.status !== 'resolved' && caseRecord.status !== 'closed');
  }).length;
  const metrics = [
    {
      label: locale === 'zh' ? '訂單數' : 'Orders in view',
      value: String(snapshot.orders.length),
      detail: locale === 'zh' ? '目前賣家範圍' : 'Current seller scope',
    },
    {
      label: locale === 'zh' ? '面交待處理' : 'Pickup queue',
      value: String(pickupQueueCount),
      detail: locale === 'zh' ? '等待驗證取貨碼' : 'Waiting for code confirmation',
    },
    {
      label: locale === 'zh' ? '退貨申請' : 'Returns',
      value: String(returnCount),
      detail: locale === 'zh' ? '需要賣家回覆' : 'Seller review needed',
    },
    {
      label: locale === 'zh' ? '未結案件' : 'Open cases',
      value: String(openCaseCount),
      detail: locale === 'zh' ? '含升級中的案件' : 'Includes escalations',
    },
  ];

  return (
    <ShopDashboardShell
      locale={locale}
      section="orders"
      seller={snapshot.seller}
      metrics={metrics}
      action={
        <Link
          href={withLocale(locale, `/shop/seller/${snapshot.seller.slug}`)}
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          {locale === 'zh' ? '查看賣家頁' : 'View storefront'}
        </Link>
      }
    >
      <ShopDashboardPanel
        title={locale === 'zh' ? '訂單佇列' : 'Order queue'}
        description={locale === 'zh' ? '出貨方式、例外狀態與下一步動作都保留在同一列。' : 'Fulfillment method, exceptions, and the next seller step stay in the same row.'}
        meta={locale === 'zh' ? `${snapshot.orders.length} 張訂單` : `${snapshot.orders.length} orders`}
      >
        {snapshot.orders.length === 0 ? (
          <ShopDashboardEmptyState
            title={locale === 'zh' ? '目前沒有訂單' : 'No orders yet'}
            description={locale === 'zh' ? '當買家完成結帳後，出貨與支援工作會從這裡開始。' : 'Once a buyer checks out, fulfillment and support work will start here.'}
          />
        ) : (
          <div className="divide-y divide-slate-200/80">
            {snapshot.orders.map((order) => {
              const returnRequest = returnsByOrderId.get(order.id) ?? getShopReturnByOrderId(order.id);
              const caseRecord = casesByOrderId.get(order.id) ?? getShopCaseByOrderId(order.id);
              const primaryItem = order.items[0];
              const extraItemCount = Math.max(0, order.items.length - 1);
              const shippingMethod = order.shipment?.method ?? (order.shippingCents === 0 ? 'local_pickup' : 'standard');

              return (
                <div
                  key={order.id}
                  className="group grid gap-5 px-6 py-6 transition-colors duration-200 hover:bg-slate-50/70 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] xl:items-start"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{order.id}</p>
                      <ShopDashboardPill tone={shopDashboardOrderTone(order.status)}>
                        {shopOrderStatusLabel(order.status, locale)}
                      </ShopDashboardPill>
                    </div>

                    <div>
                      <p className="text-lg font-semibold text-slate-950">
                        {primaryItem ? t(primaryItem.title, locale) : order.id}
                        {extraItemCount > 0 ? ` ${locale === 'zh' ? `等 ${extraItemCount + 1} 件商品` : `+ ${extraItemCount} more item${extraItemCount > 1 ? 's' : ''}`}` : ''}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        {formatShopMoney(order.totalCents, locale)} · {formatDateTime(order.createdAt, locale)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {order.items.length} {locale === 'zh' ? '件商品' : 'items'} · {shopShippingLabel(shippingMethod, locale)}
                      </p>
                    </div>

                    {returnRequest || caseRecord ? (
                      <div className="flex flex-wrap gap-2">
                        {returnRequest ? (
                          <ShopDashboardPill tone="warning">
                            {locale === 'zh' ? '退貨申請' : 'Return requested'}
                          </ShopDashboardPill>
                        ) : null}
                        {caseRecord ? (
                          <ShopDashboardPill tone="danger">
                            {locale === 'zh' ? '案件進行中' : 'Case open'}
                          </ShopDashboardPill>
                        ) : null}
                      </div>
                    ) : null}

                    {returnRequest ? (
                      <p className="text-sm leading-6 text-amber-800">
                        {locale === 'zh' ? '退貨原因' : 'Return reason'}: {returnRequest.reason}
                      </p>
                    ) : null}
                    {caseRecord ? (
                      <p className="text-sm leading-6 text-rose-700">
                        {locale === 'zh' ? '案件狀態' : 'Case status'}: {shopCaseStatusLabel(caseRecord.status, locale)}
                      </p>
                    ) : null}
                  </div>

                  <div className="xl:justify-self-end xl:w-full">
                    {order.shipment?.method === 'local_pickup' ? (
                      <PickupConfirmForm locale={locale} orderId={order.id} surface="inline" />
                    ) : (
                      <ShopShipmentForm locale={locale} orderId={order.id} surface="inline" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ShopDashboardPanel>
    </ShopDashboardShell>
  );
}

export function ShopDashboardOffersPageView({
  locale,
  data,
}: {
  locale: Locale;
  data?: ShopDashboardViewData | null;
}) {
  const snapshot = data?.snapshot ?? getShopSellerDashboardSnapshot(defaultShopDashboardSellerSlug);
  if (!snapshot.seller) {
    return null;
  }

  const listingBySlug = new Map(snapshot.listings.map((listing) => [listing.slug, listing]));
  const pendingCount = snapshot.offers.filter((offer) => offer.status === 'pending').length;
  const counteredCount = snapshot.offers.filter((offer) => offer.status === 'countered').length;
  const acceptedCount = snapshot.offers.filter((offer) => offer.status === 'accepted').length;
  const metrics = [
    {
      label: locale === 'zh' ? '待回覆' : 'Awaiting reply',
      value: String(snapshot.stats.openOffers),
      detail: locale === 'zh' ? '含待回覆與還價' : 'Pending and countered',
    },
    {
      label: locale === 'zh' ? '新出價' : 'New offers',
      value: String(pendingCount),
      detail: locale === 'zh' ? '尚未處理' : 'No seller action yet',
    },
    {
      label: locale === 'zh' ? '已還價' : 'Countered',
      value: String(counteredCount),
      detail: locale === 'zh' ? '等待買家回應' : 'Waiting on buyer',
    },
    {
      label: locale === 'zh' ? '保留中' : 'Accepted hold',
      value: String(acceptedCount),
      detail: locale === 'zh' ? '保留結帳時段' : 'Reserved checkout window',
    },
  ];

  return (
    <ShopDashboardShell
      locale={locale}
      section="offers"
      seller={snapshot.seller}
      metrics={metrics}
      action={
        <Link
          href={withLocale(locale, `/shop/seller/${snapshot.seller.slug}`)}
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          {locale === 'zh' ? '查看賣家頁' : 'View storefront'}
        </Link>
      }
    >
      <ShopDashboardPanel
        title={locale === 'zh' ? '議價佇列' : 'Offer queue'}
        description={locale === 'zh' ? '出價、目前還價與截止時間並排顯示，方便快速決策。' : 'Offer amount, current counter, and deadline stay side by side for quick decisions.'}
        meta={locale === 'zh' ? `${snapshot.offers.length} 筆議價` : `${snapshot.offers.length} offers`}
      >
        {snapshot.offers.length === 0 ? (
          <ShopDashboardEmptyState
            title={locale === 'zh' ? '目前沒有議價' : 'No offers yet'}
            description={locale === 'zh' ? '買家送出出價後，回覆工作會從這裡開始。' : 'Once buyers start negotiating, reply work will show up here.'}
          />
        ) : (
          <div className="divide-y divide-slate-200/80">
            {snapshot.offers.map((offer) => {
              const listing = listingBySlug.get(offer.listingSlug) ?? getShopListingBySlug(offer.listingSlug);
              if (!listing) {
                return null;
              }

              return (
                <div
                  key={offer.id}
                  className="group grid gap-5 px-6 py-6 transition-colors duration-200 hover:bg-slate-50/70 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] xl:items-start"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <ShopDashboardPill tone={shopDashboardOfferTone(offer.status)}>
                        {shopOfferStatusLabel(offer.status, locale)}
                      </ShopDashboardPill>
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                        {locale === 'zh' ? '到期於' : 'Expires'} {formatDateTime(offer.expiresAt, locale)}
                      </p>
                    </div>

                    <div>
                      <p className="text-lg font-semibold text-slate-950">{t(listing.title, locale)}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        {formatShopMoney(offer.amountCents, locale)} · {formatDateTime(offer.createdAt, locale)}
                      </p>
                      {offer.counterAmountCents ? (
                        <p className="mt-1 text-sm text-brand-700">
                          {locale === 'zh' ? '目前還價' : 'Counter on file'}: {formatShopMoney(offer.counterAmountCents, locale)}
                        </p>
                      ) : null}
                      {offer.reservedUntil ? (
                        <p className="mt-1 text-sm text-slate-500">
                          {locale === 'zh' ? '保留到' : 'Reserved until'} {formatDateTime(offer.reservedUntil, locale)}
                        </p>
                      ) : null}
                    </div>

                    {offer.message ? <p className="text-sm leading-6 text-slate-600">&ldquo;{offer.message}&rdquo;</p> : null}
                  </div>

                  <div className="xl:justify-self-end xl:w-full">
                    {offer.status === 'pending' || offer.status === 'countered' ? (
                      <SellerOfferResponseForm locale={locale} offerId={offer.id} surface="inline" />
                    ) : (
                      <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 p-4 text-sm leading-6 text-slate-600">
                        {offer.status === 'accepted'
                          ? locale === 'zh'
                            ? '買家保留結帳視窗已建立，暫時不需要新的回覆。'
                            : 'The buyer hold window is active, so no new seller reply is needed.'
                          : locale === 'zh'
                            ? '這筆議價已結束，目前不需要賣家操作。'
                            : 'This negotiation is closed. No seller action is needed right now.'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ShopDashboardPanel>
    </ShopDashboardShell>
  );
}

export function ShopDashboardPayoutsPageView({
  locale,
  data,
}: {
  locale: Locale;
  data?: ShopDashboardViewData | null;
}) {
  const snapshot = data?.snapshot ?? getShopSellerDashboardSnapshot(defaultShopDashboardSellerSlug);
  if (!snapshot.seller) {
    return null;
  }

  const pendingCount = snapshot.payouts.filter((payout) => payout.status === 'pending').length;
  const inTransitCount = snapshot.payouts.filter((payout) => payout.status === 'in_transit').length;
  const metrics = [
    {
      label: locale === 'zh' ? 'Stripe 狀態' : 'Stripe status',
      value: shopDashboardStripeStatusLabel(snapshot.seller.stripeAccountStatus, locale),
      detail: locale === 'zh' ? 'Connect 帳戶' : 'Connect account',
    },
    {
      label: locale === 'zh' ? '總銷售額' : 'Gross sales',
      value: formatShopMoney(snapshot.stats.grossSalesCents, locale),
      detail: locale === 'zh' ? '目前賣家範圍' : 'Current seller scope',
    },
    {
      label: locale === 'zh' ? '待入帳' : 'Queued',
      value: String(pendingCount),
      detail: locale === 'zh' ? '尚未開始轉帳' : 'Awaiting transfer',
    },
    {
      label: locale === 'zh' ? '轉帳中' : 'In transit',
      value: String(inTransitCount),
      detail: locale === 'zh' ? '銀行處理中' : 'Bank processing',
    },
  ];

  return (
    <ShopDashboardShell
      locale={locale}
      section="payouts"
      seller={snapshot.seller}
      metrics={metrics}
      action={
        <div className="flex flex-wrap gap-3 xl:justify-end">
          <ShopStripeConnectButton locale={locale} sellerSlug={snapshot.seller.slug} />
          <Link
            href={withLocale(locale, `/shop/seller/${snapshot.seller.slug}`)}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            {locale === 'zh' ? '查看賣家頁' : 'View storefront'}
          </Link>
        </div>
      }
    >
      <ShopDashboardPanel
        title={locale === 'zh' ? '撥款時程' : 'Payout schedule'}
        description={locale === 'zh' ? '每筆訂單的可撥款日期與轉帳狀態會依時間順序顯示。' : 'Each order payout shows its availability date and transfer state in time order.'}
        meta={locale === 'zh' ? `${snapshot.payouts.length} 筆撥款` : `${snapshot.payouts.length} payouts`}
      >
        {snapshot.payouts.length === 0 ? (
          <ShopDashboardEmptyState
            title={locale === 'zh' ? '目前沒有待撥款項' : 'No payouts queued'}
            description={locale === 'zh' ? '完成的訂單結算後，撥款時程會出現在這裡。' : 'When completed orders are ready to settle, the payout schedule will appear here.'}
          />
        ) : (
          <div className="divide-y divide-slate-200/80">
            {snapshot.payouts.map((payout) => (
              <div
                key={payout.id}
                className="group grid gap-4 px-6 py-5 transition-colors duration-200 hover:bg-slate-50/70 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-semibold text-slate-950">{payout.orderId}</p>
                    <ShopDashboardPill tone={shopDashboardPayoutTone(payout.status)}>
                      {shopDashboardPayoutStatusLabel(payout.status, locale)}
                    </ShopDashboardPill>
                  </div>
                  <p className="text-sm text-slate-600">{formatShopMoney(payout.amountCents, locale)}</p>
                </div>

                <div className="text-sm text-slate-500 lg:text-right">
                  <p>{payout.paidAt ? (locale === 'zh' ? '付款時間' : 'Paid at') : locale === 'zh' ? '可撥款時間' : 'Available at'}</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {formatDateTime(payout.paidAt ?? payout.availableAt, locale)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ShopDashboardPanel>
    </ShopDashboardShell>
  );
}

export async function ShopAdminPageView({
  locale,
  data,
}: {
  locale: Locale;
  data?: ShopAdminViewData;
}) {
  const snapshot = data?.snapshot ?? getShopAdminSnapshot();
  const reports =
    data?.reports ??
    (await getModerationReportsSnapshot()).filter((report) =>
      report.entityType.startsWith('shop_')
    );

  return sectionContainer(
    <div className="space-y-10 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">{locale === 'zh' ? '市集管理中心' : 'Shop admin center'}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          {locale === 'zh'
            ? '集中處理賣家核准、待審商品、被標記訊息、案件與稽核紀錄。'
            : 'Review seller approvals, pending listings, flagged messages, open cases, and audit history in one place.'}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '待處理賣家' : 'Pending sellers'}</h2>
          {snapshot.pendingSellers.map((seller) => (
            <div key={seller.slug} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{t(seller.displayName, locale)}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {seller.approved ? (locale === 'zh' ? '已核准' : 'Approved') : locale === 'zh' ? '未核准' : 'Not approved'} · Stripe {seller.stripeAccountStatus}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ShopStripeConnectButton locale={locale} sellerSlug={seller.slug} />
                  {!seller.approved ? <ShopSellerApprovalButton locale={locale} sellerSlug={seller.slug} /> : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '待審商品' : 'Pending listings'}</h2>
          {snapshot.pendingListings.map((listing) => (
            <div key={listing.slug} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{t(listing.title, locale)}</p>
                  <p className="mt-2 text-sm text-slate-600">{shopListingStatusLabel(listing.status, locale)} · {formatDateTime(listing.updatedAt, locale)}</p>
                </div>
                <ShopListingStatusForm locale={locale} listingSlug={listing.slug} status="active" label={locale === 'zh' ? '核准上架' : 'Approve live'} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '被標記訊息' : 'Flagged messages'}</h2>
          <div className="mt-4 space-y-4">
            {snapshot.flaggedMessages.length === 0 ? (
              <p className="text-sm text-slate-500">{locale === 'zh' ? '目前沒有自動標記訊息。' : 'No auto-flagged messages right now.'}</p>
            ) : (
              snapshot.flaggedMessages.map(({ message, conversation }) => (
                <div key={message.id} className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm font-semibold text-rose-900">{conversation?.orderId ?? conversation?.listingSlug ?? message.id}</p>
                  <p className="mt-2 text-sm leading-6 text-rose-900">{message.body}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '未結案件' : 'Open cases'}</h2>
          <div className="mt-4 space-y-4">
            {snapshot.openCases.length === 0 ? (
              <p className="text-sm text-slate-500">{locale === 'zh' ? '目前沒有案件。' : 'No active cases right now.'}</p>
            ) : (
              snapshot.openCases.map((item) => (
                <div key={item.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-semibold text-amber-950">{item.orderId}</p>
                  <p className="mt-2 text-sm text-amber-900">{item.reason}</p>
                  <p className="mt-2 text-xs text-amber-700">{shopCaseStatusLabel(item.status, locale)} · {formatDateTime(item.sellerRespondBy, locale)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? 'Shop 檢舉' : 'Shop reports'}</h2>
          <div className="mt-4 space-y-4">
            {reports.length === 0 ? (
              <p className="text-sm text-slate-500">{locale === 'zh' ? '目前沒有 Shop 檢舉。' : 'No Shop reports at the moment.'}</p>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{report.entityType} · {report.entitySlug}</p>
                  <p className="mt-2 text-sm text-slate-600">{report.reason}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '稽核紀錄' : 'Audit history'}</h2>
          <div className="mt-4 space-y-4">
            {snapshot.auditEntries.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{entry.action}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(entry.createdAt, locale)}</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">{entry.entitySlug}</p>
                <p className="mt-2 text-sm text-slate-500">{entry.details}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
