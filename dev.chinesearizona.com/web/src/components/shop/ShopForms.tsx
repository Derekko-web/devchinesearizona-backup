'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/components/auth/AuthProvider';
import { buildAuthCompleteUrl, buildAuthPath, getBrowserAuthBaseUrl } from '@/lib/auth';
import { appendSearch, withLocale } from '@/lib/routing';
import { getSupabaseBrowserClient, getSupabasePublicKey, isSupabaseConfigured } from '@/lib/supabase';
import type {
  Locale,
  ShopBrowseSearchParams,
  ShopFeedbackSentiment,
  ShopListingVariant,
  ShopSeller,
} from '@/lib/types';

async function postJson<T>(
  endpoint: string,
  locale: Locale,
  payload: Record<string, unknown>,
  accessToken?: string
): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-locale': locale,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(data.message ?? 'Request failed.');
  }

  return data;
}

function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = getSupabasePublicKey();

  if (!url || !publicKey) {
    return null;
  }

  return { url, anonKey: publicKey };
}

function formatShopMoney(amountCents: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'zh' ? 'zh-Hant-US' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

function StatusMessage({ status }: { status: string | null }) {
  if (!status) {
    return null;
  }

  return (
    <p className="mt-3 text-sm font-medium text-brand-700" aria-live="polite">
      {status}
    </p>
  );
}

function shopAuthDescription(locale: Locale): string {
  return locale === 'zh'
    ? 'Shop 瀏覽對訪客開放，但收藏、購物車、出價、訊息與賣家工具都會綁定到一個帳號。'
    : 'Shop browsing stays open, but saved items, cart activity, offers, messages, and seller tools are tied to an account.';
}

function useShopActionAccess(locale: Locale) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { session, user } = useAuth();
  const authHref = buildAuthPath(locale, appendSearch(pathname, searchParams.toString()));

  return {
    accessToken: session?.access_token,
    authHref,
    isAuthenticated: Boolean(user),
  };
}

function ShopActionPrompt({
  locale,
  authHref,
  label,
}: {
  locale: Locale;
  authHref: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{shopAuthDescription(locale)}</p>
      <Link
        href={authHref}
        className="mt-3 inline-flex items-center justify-center rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
      >
        {locale === 'zh' ? '登入或註冊' : 'Log in or sign up'}
      </Link>
    </div>
  );
}

export function WatchlistButton({
  locale,
  listingSlug,
  className,
}: {
  locale: Locale;
  listingSlug: string;
  className?: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const { accessToken, authHref, isAuthenticated } = useShopActionAccess(locale);

  if (!isAuthenticated) {
    return (
      <ShopActionPrompt
        locale={locale}
        authHref={authHref}
        label={locale === 'zh' ? '登入以加入追蹤清單' : 'Log in to add this item to your watchlist'}
      />
    );
  }

  async function handleClick() {
    const data = await postJson<{ message: string }>('/api/shop/watchlist', locale, {
      listingSlug,
    }, accessToken);
    setStatus(data.message);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={
          className ??
          'inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100'
        }
      >
        {locale === 'zh' ? '加入追蹤' : 'Add to watchlist'}
      </button>
      <StatusMessage status={status} />
    </div>
  );
}

export function SaveSellerButton({
  locale,
  sellerSlug,
}: {
  locale: Locale;
  sellerSlug: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const { accessToken, authHref, isAuthenticated } = useShopActionAccess(locale);

  if (!isAuthenticated) {
    return (
      <ShopActionPrompt
        locale={locale}
        authHref={authHref}
        label={locale === 'zh' ? '登入以收藏賣家' : 'Log in to save this seller'}
      />
    );
  }

  async function handleClick() {
    const data = await postJson<{ message: string }>('/api/shop/saved-sellers', locale, {
      sellerSlug,
    }, accessToken);
    setStatus(data.message);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
      >
        {locale === 'zh' ? '收藏賣家' : 'Save seller'}
      </button>
      <StatusMessage status={status} />
    </div>
  );
}

export function AddToCartForm({
  locale,
  listingSlug,
  variants,
}: {
  locale: Locale;
  listingSlug: string;
  variants: ShopListingVariant[];
}) {
  const [status, setStatus] = useState<string | null>(null);
  const { accessToken, authHref, isAuthenticated } = useShopActionAccess(locale);

  if (!isAuthenticated) {
    return (
      <ShopActionPrompt
        locale={locale}
        authHref={authHref}
        label={locale === 'zh' ? '登入以建立購物車' : 'Log in to build your cart'}
      />
    );
  }

  async function handleSubmit(formData: FormData) {
    const variantId = String(formData.get('variantId') ?? '').trim() || undefined;
    const quantity = Number(formData.get('quantity') ?? 1);
    const data = await postJson<{ message: string }>('/api/shop/cart', locale, {
      action: 'add',
      listingSlug,
      variantId,
      quantity,
    }, accessToken);
    setStatus(data.message);
  }

  return (
    <form action={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
        <div>
          <label htmlFor={`variant-${listingSlug}`} className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '選項' : 'Option'}
          </label>
          <select
            id={`variant-${listingSlug}`}
            name="variantId"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
            defaultValue=""
          >
            <option value="">{locale === 'zh' ? '預設款式' : 'Default item'}</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.label.en} · {formatShopMoney(variant.priceCents, locale)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`quantity-${listingSlug}`} className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '數量' : 'Qty'}
          </label>
          <input
            id={`quantity-${listingSlug}`}
            name="quantity"
            type="number"
            min="1"
            defaultValue="1"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            {locale === 'zh' ? '加入購物車' : 'Add to cart'}
          </button>
        </div>
      </div>
      <StatusMessage status={status} />
    </form>
  );
}

export function SaveSearchForm({
  locale,
  initialSearchParams,
}: {
  locale: Locale;
  initialSearchParams?: ShopBrowseSearchParams;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const { accessToken, authHref, isAuthenticated } = useShopActionAccess(locale);

  if (!isAuthenticated) {
    return (
      <ShopActionPrompt
        locale={locale}
        authHref={authHref}
        label={locale === 'zh' ? '登入以儲存搜尋' : 'Log in to save this search'}
      />
    );
  }

  async function handleSubmit(formData: FormData) {
    const data = await postJson<{ message: string }>('/api/shop/saved-searches', locale, {
      label: String(formData.get('label') ?? '').trim(),
      query: initialSearchParams?.q ?? '',
      category: initialSearchParams?.category,
      condition: initialSearchParams?.condition,
      offerOnly: initialSearchParams?.offer === '1' || initialSearchParams?.offer === 'true',
      pickupOnly: initialSearchParams?.pickup === '1' || initialSearchParams?.pickup === 'true',
      priceMin: initialSearchParams?.priceMin,
      priceMax: initialSearchParams?.priceMax,
      sort: initialSearchParams?.sort,
    }, accessToken);
    setStatus(data.message);
  }

  return (
    <form action={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <label htmlFor="search-label" className="mb-2 block text-sm font-semibold text-slate-800">
        {locale === 'zh' ? '把目前篩選存起來' : 'Save current search'}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="search-label"
          name="label"
          placeholder={locale === 'zh' ? '例如：Mesa 面交電子產品' : 'Example: Mesa pickup electronics'}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
          required
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100"
        >
          {locale === 'zh' ? '儲存搜尋' : 'Save search'}
        </button>
      </div>
      <StatusMessage status={status} />
    </form>
  );
}

export function DeleteSavedSearchButton({
  locale,
  searchId,
}: {
  locale: Locale;
  searchId: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const { accessToken, authHref, isAuthenticated } = useShopActionAccess(locale);

  if (!isAuthenticated) {
    return (
      <ShopActionPrompt
        locale={locale}
        authHref={authHref}
        label={locale === 'zh' ? '登入以管理儲存搜尋' : 'Log in to manage saved searches'}
      />
    );
  }

  async function handleClick() {
    const data = await postJson<{ message: string }>('/api/shop/saved-searches', locale, {
      action: 'delete',
      id: searchId,
    }, accessToken);
    setStatus(data.message);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
      >
        {locale === 'zh' ? '刪除' : 'Delete'}
      </button>
      <StatusMessage status={status} />
    </div>
  );
}

export function MakeOfferForm({
  locale,
  listingSlug,
  sellerSlug,
  currentPriceCents,
  variants,
}: {
  locale: Locale;
  listingSlug: string;
  sellerSlug: string;
  currentPriceCents: number;
  variants: ShopListingVariant[];
}) {
  const [status, setStatus] = useState<string | null>(null);
  const { accessToken, authHref, isAuthenticated } = useShopActionAccess(locale);

  if (!isAuthenticated) {
    return (
      <ShopActionPrompt
        locale={locale}
        authHref={authHref}
        label={locale === 'zh' ? '登入以送出出價' : 'Log in to send an offer'}
      />
    );
  }

  async function handleSubmit(formData: FormData) {
    const variantId = String(formData.get('variantId') ?? '').trim() || undefined;
    const amount = Number(formData.get('amount') ?? 0);
    const data = await postJson<{ message: string }>('/api/shop/offers', locale, {
      listingSlug,
      sellerSlug,
      variantId,
      amountCents: Math.round(amount * 100),
      message: String(formData.get('message') ?? '').trim(),
    }, accessToken);
    setStatus(data.message);
  }

  return (
    <form action={handleSubmit} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-base font-semibold text-slate-900">{locale === 'zh' ? '議價' : 'Make Offer'}</h3>
      <div className="mt-4 grid gap-3">
        {variants.length > 0 ? (
          <select
            name="variantId"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
            defaultValue={variants[0]?.id}
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.label.en}
              </option>
            ))}
          </select>
        ) : null}
        <input
          name="amount"
          type="number"
          min="1"
          step="0.01"
          defaultValue={(currentPriceCents / 100).toFixed(2)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
          required
        />
        <textarea
          name="message"
          rows={3}
          placeholder={locale === 'zh' ? '附註（可選）' : 'Message (optional)'}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          {locale === 'zh' ? '送出出價' : 'Send offer'}
        </button>
      </div>
      <StatusMessage status={status} />
    </form>
  );
}

export function MessageSellerForm({
  locale,
  sellerSlug,
  listingSlug,
  orderId,
  topic,
}: {
  locale: Locale;
  sellerSlug: string;
  listingSlug?: string;
  orderId?: string;
  topic: 'pre_sale' | 'order_support' | 'pickup';
}) {
  const [status, setStatus] = useState<string | null>(null);
  const { accessToken, authHref, isAuthenticated } = useShopActionAccess(locale);

  if (!isAuthenticated) {
    return (
      <ShopActionPrompt
        locale={locale}
        authHref={authHref}
        label={locale === 'zh' ? '登入以聯絡賣家' : 'Log in to message this seller'}
      />
    );
  }

  async function handleSubmit(formData: FormData) {
    const data = await postJson<{ message: string }>('/api/shop/messages', locale, {
      sellerSlug,
      listingSlug,
      orderId,
      topic,
      body: String(formData.get('body') ?? '').trim(),
    }, accessToken);
    setStatus(data.message);
  }

  return (
    <form action={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <label htmlFor={`message-${sellerSlug}-${listingSlug ?? orderId ?? 'general'}`} className="mb-2 block text-sm font-semibold text-slate-800">
        {locale === 'zh' ? '聯絡賣家' : 'Message seller'}
      </label>
      <textarea
        id={`message-${sellerSlug}-${listingSlug ?? orderId ?? 'general'}`}
        name="body"
        rows={4}
        placeholder={
          locale === 'zh'
            ? '請描述你的問題、面交時間或希望確認的細節。'
            : 'Ask about pickup time, condition details, or order support.'
        }
        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
        required
      />
      <button
        type="submit"
        className="mt-3 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
      >
        {locale === 'zh' ? '送出訊息' : 'Send message'}
      </button>
      <StatusMessage status={status} />
    </form>
  );
}

export function ShopSellForm({
  locale,
  seller,
  categories,
}: {
  locale: Locale;
  seller: ShopSeller;
  categories: Array<{ slug: string; label: string }>;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const { accessToken, authHref, isAuthenticated } = useShopActionAccess(locale);

  if (!isAuthenticated) {
    return (
      <ShopActionPrompt
        locale={locale}
        authHref={authHref}
        label={locale === 'zh' ? '登入以送審商品' : 'Log in to submit a listing'}
      />
    );
  }

  async function handleSubmit(formData: FormData) {
    const imageUrls = String(formData.get('imageUrls') ?? '')
      .split('\n')
      .map((url) => url.trim())
      .filter(Boolean);

    const data = await postJson<{ message: string; slug: string }>('/api/shop/listings', locale, {
      sellerSlug: seller.slug,
      categorySlug: String(formData.get('categorySlug') ?? ''),
      titleEn: String(formData.get('titleEn') ?? '').trim(),
      titleZh: String(formData.get('titleZh') ?? '').trim(),
      excerptEn: String(formData.get('excerptEn') ?? '').trim(),
      excerptZh: String(formData.get('excerptZh') ?? '').trim(),
      descriptionEn: String(formData.get('descriptionEn') ?? '').trim(),
      descriptionZh: String(formData.get('descriptionZh') ?? '').trim(),
      condition: String(formData.get('condition') ?? ''),
      priceCents: Math.round(Number(formData.get('price') ?? 0) * 100),
      quantityAvailable: Number(formData.get('quantity') ?? 1),
      allowOffers: formData.get('allowOffers') === 'on',
      allowLocalPickup: formData.get('allowLocalPickup') === 'on',
      pickupCity: String(formData.get('pickupCity') ?? '').trim(),
      shippingMethods: ['standard', 'expedited', 'local_pickup'].filter(
        (method) => formData.get(`shipping-${method}`) === 'on'
      ),
      returnPolicyEn: String(formData.get('returnPolicyEn') ?? '').trim(),
      returnPolicyZh: String(formData.get('returnPolicyZh') ?? '').trim(),
      itemSpecifics: String(formData.get('itemSpecifics') ?? '').trim(),
      imageUrls,
    }, accessToken);
    setStatus(
      locale === 'zh'
        ? `商品已送審：${data.slug}`
        : `Listing submitted for review: ${data.slug}`
    );
  }

  return (
    <form action={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '英文標題' : 'English title'}
          </label>
          <input
            name="titleEn"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '中文標題' : 'Chinese title'}
          </label>
          <input
            name="titleZh"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '英文摘要' : 'English excerpt'}
          </label>
          <textarea
            name="excerptEn"
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '中文摘要' : 'Chinese excerpt'}
          </label>
          <textarea
            name="excerptZh"
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '英文詳情' : 'English details'}
          </label>
          <textarea
            name="descriptionEn"
            rows={5}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '中文詳情' : 'Chinese details'}
          </label>
          <textarea
            name="descriptionZh"
            rows={5}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '分類' : 'Category'}
          </label>
          <select
            name="categorySlug"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
            required
          >
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '品況' : 'Condition'}
          </label>
          <select
            name="condition"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
            required
          >
            <option value="new">{locale === 'zh' ? '全新' : 'New'}</option>
            <option value="excellent">{locale === 'zh' ? '近新' : 'Excellent'}</option>
            <option value="good">{locale === 'zh' ? '良好' : 'Good'}</option>
            <option value="fair">{locale === 'zh' ? '普通' : 'Fair'}</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '價格（美元）' : 'Price (USD)'}
          </label>
          <input
            name="price"
            type="number"
            step="0.01"
            min="1"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '數量' : 'Quantity'}
          </label>
          <input
            name="quantity"
            type="number"
            min="1"
            defaultValue="1"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
            required
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '面交城市' : 'Pickup city'}
          </label>
          <input
            name="pickupCity"
            defaultValue={seller.city}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '圖片網址（每行一個）' : 'Image URLs (one per line)'}
          </label>
          <textarea
            name="imageUrls"
            rows={4}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '退貨政策（英文）' : 'Return policy (English)'}
          </label>
          <textarea
            name="returnPolicyEn"
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '退貨政策（中文）' : 'Return policy (Chinese)'}
          </label>
          <textarea
            name="returnPolicyZh"
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-sm font-semibold text-slate-800">
          {locale === 'zh' ? '商品細節（每行 key: value）' : 'Item specifics (one `key: value` per line)'}
        </label>
        <textarea
          name="itemSpecifics"
          rows={4}
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
          placeholder="brand: Apple&#10;color: Midnight"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-700">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="allowOffers" defaultChecked />
          {locale === 'zh' ? '接受議價' : 'Allow offers'}
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="allowLocalPickup" defaultChecked />
          {locale === 'zh' ? '支援面交' : 'Allow local pickup'}
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="shipping-standard" defaultChecked />
          {locale === 'zh' ? '標準寄送' : 'Standard shipping'}
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="shipping-expedited" />
          {locale === 'zh' ? '快速寄送' : 'Expedited shipping'}
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="shipping-local_pickup" defaultChecked />
          {locale === 'zh' ? '面交取貨' : 'Local pickup'}
        </label>
      </div>

      <button
        type="submit"
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-900 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800"
      >
        {locale === 'zh' ? '送審商品' : 'Submit listing'}
      </button>
      <StatusMessage status={status} />
    </form>
  );
}

export function ShopCheckoutForm({
  locale,
  offerId,
}: {
  locale: Locale;
  offerId?: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const { accessToken, authHref, isAuthenticated } = useShopActionAccess(locale);

  if (!isAuthenticated) {
    return (
      <ShopActionPrompt
        locale={locale}
        authHref={authHref}
        label={locale === 'zh' ? '登入以完成結帳' : 'Log in to check out'}
      />
    );
  }

  async function handleSubmit(formData: FormData) {
    const data = await postJson<{
      message: string;
      mode?: 'completed' | 'redirect';
      orderIds?: string[];
      orderId?: string;
      url?: string;
    }>(
      '/api/shop/checkout',
      locale,
      {
        offerId,
        shippingAddress: String(formData.get('shippingAddress') ?? '').trim() || undefined,
        paymentMethod: String(formData.get('paymentMethod') ?? '').trim() || undefined,
      },
      accessToken
    );

    if (data.url && typeof window !== 'undefined') {
      window.location.assign(data.url);
      return;
    }

    setStatus(data.message);
  }

  return (
    <form action={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '配送地址（若寄送）' : 'Shipping address (if shipped)'}
          </label>
          <textarea
            name="shippingAddress"
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
            placeholder={locale === 'zh' ? 'Phoenix, AZ 85016' : 'Phoenix, AZ 85016'}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '付款方式' : 'Payment method'}
          </label>
          <input
            name="paymentMethod"
            defaultValue={locale === 'zh' ? '模擬信用卡結帳' : 'Simulated marketplace card checkout'}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
          />
          <p className="mt-2 text-xs text-slate-500">
            {locale === 'zh'
              ? '正式環境會建立 Stripe Checkout session；若本機尚未設定 Stripe，系統會安全地退回本地測試結帳流程。'
              : 'Production creates a Stripe Checkout session. If Stripe is not configured locally, the flow safely falls back to local checkout for testing.'}
          </p>
        </div>
      </div>

      <button
        type="submit"
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-900 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800"
      >
        {locale === 'zh' ? '完成安全結帳' : 'Complete secure checkout'}
      </button>
      <StatusMessage status={status} />
    </form>
  );
}

export function RemoveCartItemButton({
  locale,
  itemId,
}: {
  locale: Locale;
  itemId: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const { accessToken, authHref, isAuthenticated } = useShopActionAccess(locale);

  if (!isAuthenticated) {
    return (
      <ShopActionPrompt
        locale={locale}
        authHref={authHref}
        label={locale === 'zh' ? '登入以管理購物車' : 'Log in to manage your cart'}
      />
    );
  }

  async function handleClick() {
    const data = await postJson<{ message: string }>('/api/shop/cart', locale, {
      action: 'remove',
      itemId,
    }, accessToken);
    setStatus(data.message);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
      >
        {locale === 'zh' ? '移除' : 'Remove'}
      </button>
      <StatusMessage status={status} />
    </div>
  );
}

export function ClearCartButton({ locale }: { locale: Locale }) {
  const [status, setStatus] = useState<string | null>(null);
  const { accessToken, authHref, isAuthenticated } = useShopActionAccess(locale);

  if (!isAuthenticated) {
    return (
      <ShopActionPrompt
        locale={locale}
        authHref={authHref}
        label={locale === 'zh' ? '登入以管理購物車' : 'Log in to manage your cart'}
      />
    );
  }

  async function handleClick() {
    const data = await postJson<{ message: string }>('/api/shop/cart', locale, {
      action: 'clear',
    }, accessToken);
    setStatus(data.message);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
      >
        {locale === 'zh' ? '清空購物車' : 'Clear cart'}
      </button>
      <StatusMessage status={status} />
    </div>
  );
}

export function ShopReturnRequestForm({
  locale,
  orderId,
}: {
  locale: Locale;
  orderId: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const { accessToken, authHref, isAuthenticated } = useShopActionAccess(locale);

  if (!isAuthenticated) {
    return (
      <ShopActionPrompt
        locale={locale}
        authHref={authHref}
        label={locale === 'zh' ? '登入以管理這張訂單' : 'Log in to manage this order'}
      />
    );
  }

  async function handleSubmit(formData: FormData) {
    const data = await postJson<{ message: string }>('/api/shop/orders', locale, {
      action: 'request_return',
      orderId,
      reason: String(formData.get('reason') ?? '').trim(),
    }, accessToken);
    setStatus(data.message);
  }

  return (
    <form action={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="mb-2 block text-sm font-semibold text-slate-800">
        {locale === 'zh' ? '申請退貨' : 'Request return'}
      </label>
      <textarea
        name="reason"
        rows={3}
        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
        required
      />
      <button
        type="submit"
        className="mt-3 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
      >
        {locale === 'zh' ? '送出退貨申請' : 'Submit return request'}
      </button>
      <StatusMessage status={status} />
    </form>
  );
}

export function ShopCaseOpenForm({
  locale,
  orderId,
}: {
  locale: Locale;
  orderId: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const { accessToken, authHref, isAuthenticated } = useShopActionAccess(locale);

  if (!isAuthenticated) {
    return (
      <ShopActionPrompt
        locale={locale}
        authHref={authHref}
        label={locale === 'zh' ? '登入以管理這張訂單' : 'Log in to manage this order'}
      />
    );
  }

  async function handleSubmit(formData: FormData) {
    const data = await postJson<{ message: string }>('/api/shop/orders', locale, {
      action: 'open_case',
      orderId,
      reason: String(formData.get('reason') ?? '').trim(),
    }, accessToken);
    setStatus(data.message);
  }

  return (
    <form action={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="mb-2 block text-sm font-semibold text-slate-800">
        {locale === 'zh' ? '開啟案件' : 'Open case'}
      </label>
      <textarea
        name="reason"
        rows={3}
        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
        required
      />
      <button
        type="submit"
        className="mt-3 inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100"
      >
        {locale === 'zh' ? '送出案件' : 'Submit case'}
      </button>
      <StatusMessage status={status} />
    </form>
  );
}

export function ShopFeedbackForm({
  locale,
  orderId,
  sellerSlug,
}: {
  locale: Locale;
  orderId: string;
  sellerSlug: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const { accessToken, authHref, isAuthenticated } = useShopActionAccess(locale);

  if (!isAuthenticated) {
    return (
      <ShopActionPrompt
        locale={locale}
        authHref={authHref}
        label={locale === 'zh' ? '登入以留下評價' : 'Log in to leave feedback'}
      />
    );
  }

  async function handleSubmit(formData: FormData) {
    const data = await postJson<{ message: string }>('/api/shop/orders', locale, {
      action: 'leave_feedback',
      orderId,
      sellerSlug,
      sentiment: String(formData.get('sentiment') ?? 'positive') as ShopFeedbackSentiment,
      titleEn: String(formData.get('titleEn') ?? '').trim(),
      titleZh: String(formData.get('titleZh') ?? '').trim(),
      commentEn: String(formData.get('commentEn') ?? '').trim(),
      commentZh: String(formData.get('commentZh') ?? '').trim(),
    }, accessToken);
    setStatus(data.message);
  }

  return (
    <form action={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2">
        <select
          name="sentiment"
          defaultValue="positive"
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
        >
          <option value="positive">{locale === 'zh' ? '正面' : 'Positive'}</option>
          <option value="neutral">{locale === 'zh' ? '中立' : 'Neutral'}</option>
          <option value="negative">{locale === 'zh' ? '負面' : 'Negative'}</option>
        </select>
        <input
          name="titleEn"
          placeholder={locale === 'zh' ? '英文標題' : 'English title'}
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
          required
        />
        <input
          name="titleZh"
          placeholder={locale === 'zh' ? '中文標題' : 'Chinese title'}
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
        />
        <textarea
          name="commentEn"
          rows={3}
          placeholder={locale === 'zh' ? '英文評語' : 'English comment'}
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
          required
        />
        <textarea
          name="commentZh"
          rows={3}
          placeholder={locale === 'zh' ? '中文評語' : 'Chinese comment'}
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
        />
      </div>
      <button
        type="submit"
        className="mt-3 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
      >
        {locale === 'zh' ? '送出評價' : 'Leave feedback'}
      </button>
      <StatusMessage status={status} />
    </form>
  );
}

export function SellerOfferResponseForm({
  locale,
  offerId,
  surface = 'default',
}: {
  locale: Locale;
  offerId: string;
  surface?: 'default' | 'inline';
}) {
  const [status, setStatus] = useState<string | null>(null);
  const { accessToken, authHref, isAuthenticated } = useShopActionAccess(locale);
  const isInline = surface === 'inline';

  if (!isAuthenticated) {
    return (
      <ShopActionPrompt
        locale={locale}
        authHref={authHref}
        label={locale === 'zh' ? '登入以管理出價' : 'Log in to manage offers'}
      />
    );
  }

  async function handleSubmit(formData: FormData) {
    const action = String(formData.get('action') ?? '');
    const counterAmount = String(formData.get('counterAmount') ?? '').trim();
    const data = await postJson<{ message: string }>('/api/shop/offers', locale, {
      offerId,
      action,
      counterAmountCents: counterAmount ? Math.round(Number(counterAmount) * 100) : undefined,
    }, accessToken);
    setStatus(data.message);
  }

  return (
    <form
      action={handleSubmit}
      className={
        isInline
          ? 'w-full rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 p-3'
          : 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'
      }
    >
      <div className="grid gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))_10rem]">
        <button
          name="action"
          value="accepted"
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          {locale === 'zh' ? '接受' : 'Accept'}
        </button>
        <button
          name="action"
          value="declined"
          className="rounded-lg bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-300"
        >
          {locale === 'zh' ? '拒絕' : 'Decline'}
        </button>
        <button
          name="action"
          value="countered"
          className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
        >
          {locale === 'zh' ? '還價' : 'Counter'}
        </button>
        <input
          name="counterAmount"
          type="number"
          step="0.01"
          min="1"
          placeholder={locale === 'zh' ? '還價金額' : 'Counter'}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
        />
      </div>
      <StatusMessage status={status} />
    </form>
  );
}

export function ShopListingStatusForm({
  locale,
  listingSlug,
  status,
  label,
}: {
  locale: Locale;
  listingSlug: string;
  status: string;
  label: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const { accessToken, authHref, isAuthenticated } = useShopActionAccess(locale);

  if (!isAuthenticated) {
    return (
      <ShopActionPrompt
        locale={locale}
        authHref={authHref}
        label={locale === 'zh' ? '登入以管理商品' : 'Log in to manage this listing'}
      />
    );
  }

  async function handleSubmit() {
    const data = await postJson<{ message: string }>('/api/shop/listings', locale, {
      action: 'set_status',
      listingSlug,
      status,
    }, accessToken);
    setMessage(data.message);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSubmit}
        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
      >
        {label}
      </button>
      <StatusMessage status={message} />
    </div>
  );
}

export function ShopShipmentForm({
  locale,
  orderId,
  surface = 'default',
}: {
  locale: Locale;
  orderId: string;
  surface?: 'default' | 'inline';
}) {
  const [status, setStatus] = useState<string | null>(null);
  const { accessToken, authHref, isAuthenticated } = useShopActionAccess(locale);
  const isInline = surface === 'inline';

  if (!isAuthenticated) {
    return (
      <ShopActionPrompt
        locale={locale}
        authHref={authHref}
        label={locale === 'zh' ? '登入以管理這張訂單' : 'Log in to manage this order'}
      />
    );
  }

  async function handleSubmit(formData: FormData) {
    const data = await postJson<{ message: string }>('/api/shop/orders', locale, {
      action: 'mark_shipped',
      orderId,
      carrier: String(formData.get('carrier') ?? '').trim(),
      trackingNumber: String(formData.get('trackingNumber') ?? '').trim(),
    }, accessToken);
    setStatus(data.message);
  }

  return (
    <form
      action={handleSubmit}
      className={
        isInline
          ? 'w-full rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 p-3'
          : 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <input
          name="carrier"
          placeholder={locale === 'zh' ? '承運商' : 'Carrier'}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
          required
        />
        <input
          name="trackingNumber"
          placeholder={locale === 'zh' ? '追蹤號碼' : 'Tracking number'}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
          required
        />
      </div>
      <button
        type="submit"
        className="mt-3 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
      >
        {locale === 'zh' ? '標記已出貨' : 'Mark shipped'}
      </button>
      <StatusMessage status={status} />
    </form>
  );
}

export function PickupConfirmForm({
  locale,
  orderId,
  surface = 'default',
}: {
  locale: Locale;
  orderId: string;
  surface?: 'default' | 'inline';
}) {
  const [status, setStatus] = useState<string | null>(null);
  const { accessToken, authHref, isAuthenticated } = useShopActionAccess(locale);
  const isInline = surface === 'inline';

  if (!isAuthenticated) {
    return (
      <ShopActionPrompt
        locale={locale}
        authHref={authHref}
        label={locale === 'zh' ? '登入以管理這張訂單' : 'Log in to manage this order'}
      />
    );
  }

  async function handleSubmit(formData: FormData) {
    const data = await postJson<{ message: string }>('/api/shop/orders', locale, {
      action: 'confirm_pickup',
      orderId,
      pickupCode: String(formData.get('pickupCode') ?? '').trim(),
    }, accessToken);
    setStatus(data.message);
  }

  return (
    <form
      action={handleSubmit}
      className={
        isInline
          ? 'grid w-full gap-2 rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start'
          : 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'
      }
    >
      <input
        name="pickupCode"
        placeholder={locale === 'zh' ? '六位取貨碼' : '6-digit pickup code'}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
      />
      <button
        type="submit"
        className={`inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 ${
          isInline ? '' : 'mt-3'
        }`}
      >
        {locale === 'zh' ? '確認取貨' : 'Confirm pickup'}
      </button>
      {isInline ? (
        <div className="sm:col-span-2">
          <StatusMessage status={status} />
        </div>
      ) : (
        <StatusMessage status={status} />
      )}
    </form>
  );
}

export function ShopStripeConnectButton({
  locale,
  sellerSlug,
}: {
  locale: Locale;
  sellerSlug: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const { accessToken, authHref, isAuthenticated } = useShopActionAccess(locale);

  if (!isAuthenticated) {
    return (
      <ShopActionPrompt
        locale={locale}
        authHref={authHref}
        label={locale === 'zh' ? '登入以管理賣家設定' : 'Log in to manage seller settings'}
      />
    );
  }

  async function handleClick() {
    const data = await postJson<{ message: string; mode?: 'status_only' | 'redirect'; url?: string }>('/api/shop/connect', locale, {
      sellerSlug,
    }, accessToken);

    if (data.url && typeof window !== 'undefined') {
      window.location.assign(data.url);
      return;
    }

    setStatus(data.message);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center justify-center rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
      >
        {locale === 'zh' ? '連接 Stripe Connect' : 'Connect Stripe'}
      </button>
      <StatusMessage status={status} />
    </div>
  );
}

export function ShopSellerApprovalButton({
  locale,
  sellerSlug,
}: {
  locale: Locale;
  sellerSlug: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const { accessToken, authHref, isAuthenticated } = useShopActionAccess(locale);

  if (!isAuthenticated) {
    return (
      <ShopActionPrompt
        locale={locale}
        authHref={authHref}
        label={locale === 'zh' ? '登入以管理賣家設定' : 'Log in to manage seller settings'}
      />
    );
  }

  async function handleClick() {
    const data = await postJson<{ message: string }>('/api/shop/admin/sellers', locale, {
      sellerSlug,
    }, accessToken);
    setStatus(data.message);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
      >
        {locale === 'zh' ? '核准賣家' : 'Approve seller'}
      </button>
      <StatusMessage status={status} />
    </div>
  );
}

export function ShopAuthPanel({ locale }: { locale: Locale }) {
  const [status, setStatus] = useState<string | null>(null);

  async function handleMagicLink(formData: FormData) {
    const email = String(formData.get('email') ?? '').trim();
    if (!email) {
      setStatus(locale === 'zh' ? '請先輸入 email。' : 'Please enter an email address.');
      return;
    }

    const config = getSupabasePublicConfig();
    if (!config) {
      setStatus(
        locale === 'zh'
          ? '尚未設定 Supabase Auth 環境值，magic link 接點已保留。'
          : 'Supabase Auth env vars are not configured yet, but the magic-link hook is wired.'
      );
      return;
    }

    const baseUrl = getBrowserAuthBaseUrl();
    const redirectTo = baseUrl ? new URL(withLocale(locale, '/shop/sell'), baseUrl).toString() : undefined;

    const response = await fetch(`${config.url}/auth/v1/otp`, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        create_user: true,
        ...(redirectTo ? { email_redirect_to: redirectTo } : {}),
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { msg?: string; error_description?: string };

    setStatus(
      !response.ok
        ? data.error_description ?? data.msg ?? (locale === 'zh' ? '無法寄送 magic link。' : 'Unable to send magic link.')
        : locale === 'zh'
          ? 'Magic link 已送出，請檢查你的信箱。'
          : 'Magic link sent. Check your email to continue.'
    );
  }

  async function handleGoogleClick() {
    let client: ReturnType<typeof getSupabaseBrowserClient> = null;

    try {
      client = getSupabaseBrowserClient();
    } catch {
      client = null;
    }

    if (!client || !isSupabaseConfigured()) {
      setStatus(
        locale === 'zh'
          ? '尚未設定 Supabase Auth 環境值，Google OAuth 接點已保留。'
          : 'Supabase Auth env vars are not configured yet, but the Google OAuth hook is wired.'
      );
      return;
    }

    const baseUrl = getBrowserAuthBaseUrl();
    if (!baseUrl) {
      setStatus(
        locale === 'zh'
          ? '目前無法判斷登入完成後應返回的位置。請重新整理後再試一次。'
          : 'Unable to determine where to return after Google login. Refresh and try again.'
      );
      return;
    }

    const redirectTo = buildAuthCompleteUrl(baseUrl, locale, 'login', withLocale(locale, '/shop/sell'));
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      setStatus(
        error?.message ??
          (locale === 'zh'
            ? '目前無法啟動 Google 登入。請稍後再試。'
            : 'Unable to start Google login right now. Please try again.')
      );
      return;
    }

    window.location.assign(data.url);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">{locale === 'zh' ? '賣家帳號入口' : 'Seller account access'}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {locale === 'zh'
          ? '這裡是賣家工具專用的帳號入口，已接上 Supabase magic link 與 Google OAuth；未設定環境值時會保留成安全的示意入口。'
          : 'This is the seller-only account entry point, wired for Supabase magic-link and Google OAuth. If env vars are missing, it stays in a safe scaffolded mode.'}
      </p>
      <form action={handleMagicLink} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          name="email"
          type="email"
          placeholder="you@example.com"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          {locale === 'zh' ? '寄送 magic link' : 'Send magic link'}
        </button>
      </form>
      <button
        type="button"
        onClick={handleGoogleClick}
        className="mt-3 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
      >
        {locale === 'zh' ? '以 Google 登入' : 'Continue with Google'}
      </button>
      <StatusMessage status={status} />
    </div>
  );
}

export function QuickCartLink({ locale }: { locale: Locale }) {
  return (
    <Link
      href={withLocale(locale, '/shop/cart')}
      className="inline-flex items-center rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100"
    >
      {locale === 'zh' ? '查看購物車' : 'Open cart'}
    </Link>
  );
}
