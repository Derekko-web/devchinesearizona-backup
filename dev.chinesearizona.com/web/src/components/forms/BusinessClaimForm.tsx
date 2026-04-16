'use client';

import { useMemo, useState } from 'react';

import type { Business, Locale } from '@/lib/types';

type BusinessClaimFormProps = {
  locale: Locale;
  businesses: Business[];
  initialBusinessName?: string;
  initialBusinessSlug?: string;
};

const humanAnswer = '7';

export function BusinessClaimForm({
  locale,
  businesses,
  initialBusinessName = '',
  initialBusinessSlug,
}: BusinessClaimFormProps) {
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const matches = useMemo(() => {
    if (!businessName.trim()) {
      return [];
    }

    const term = businessName.toLowerCase();
    return businesses.filter((business) =>
      `${business.name.en} ${business.name['zh'] ?? ''}`.toLowerCase().includes(term)
    );
  }, [businessName, businesses]);

  async function handleSubmit(formData: FormData) {
    const verification = String(formData.get('humanCheck') ?? '').trim();
    if (verification !== humanAnswer) {
      setStatus(locale === 'zh' ? '驗證答案不正確，請再試一次。' : 'Human verification failed. Please try again.');
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    const payload = Object.fromEntries(formData.entries());

    const response = await fetch('/api/business-claims', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-locale': locale,
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { message: string };
    setStatus(data.message);
    setIsSubmitting(false);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">
          {locale === 'zh' ? '商家申請與重複檢查' : 'Claim or add a business'}
        </h2>
        <p className="text-sm leading-6 text-slate-600">
          {locale === 'zh'
            ? '先搜尋是否已存在相似商家。若已有資料，可直接送出認領；若沒有，我們會建立待審核的新商家草稿。'
            : 'Search first for an existing listing. If we already have the business, submit a claim. If not, we create a review-ready draft listing.'}
        </p>
      </div>

      <form action={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="businessName" className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '商家名稱' : 'Business name'}
          </label>
          <input
            id="businessName"
            name="businessName"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder={locale === 'zh' ? '例如：Elite AZ Realty Team' : 'e.g. Elite AZ Realty Team'}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
            required
          />
        </div>

        {matches.length > 0 ? (
          <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
            <p className="text-sm font-semibold text-brand-800">
              {locale === 'zh' ? '找到可能重複的商家：' : 'Possible duplicate listings:'}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-brand-900">
              {matches.slice(0, 3).map((business) => (
                <li key={business.id} className="rounded-lg bg-white px-3 py-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="businessSlug"
                      value={business.slug}
                      defaultChecked={business.slug === initialBusinessSlug}
                    />
                    <span>
                      {business.name[locale] ?? business.name.en} · {business.city}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <input type="hidden" name="businessSlug" value={initialBusinessSlug ?? ''} />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="claimantName" className="mb-2 block text-sm font-semibold text-slate-800">
              {locale === 'zh' ? '聯絡人姓名' : 'Your name'}
            </label>
            <input
              id="claimantName"
              name="claimantName"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-800">
              {locale === 'zh' ? '聯絡 Email' : 'Contact email'}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
              required
            />
          </div>
          <div>
            <label htmlFor="category" className="mb-2 block text-sm font-semibold text-slate-800">
              {locale === 'zh' ? '分類' : 'Category'}
            </label>
            <input
              id="category"
              name="category"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
              placeholder={locale === 'zh' ? '例如：房地產' : 'e.g. Real Estate'}
            />
          </div>
          <div>
            <label htmlFor="city" className="mb-2 block text-sm font-semibold text-slate-800">
              {locale === 'zh' ? '城市' : 'City'}
            </label>
            <input
              id="city"
              name="city"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
              placeholder="Chandler"
            />
          </div>
        </div>

        <div>
          <label htmlFor="details" className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '補充說明' : 'Notes'}
          </label>
          <textarea
            id="details"
            name="details"
            rows={4}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
            placeholder={
              locale === 'zh'
                ? '可以補充網址、服務內容、認領背景或雙語服務資訊。'
                : 'Share website, services offered, claim context, or bilingual support details.'
            }
          />
        </div>

        <div>
          <label htmlFor="humanCheck" className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '人類驗證：3 + 4 = ?' : 'Human check: 3 + 4 = ?'}
          </label>
          <input
            id="humanCheck"
            name="humanCheck"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
            required
          />
        </div>

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
          {locale === 'zh'
            ? '所有認領與新增申請都會進入人工審核。提交後，我們會以 email 確認並安排後續。'
            : 'All claims and new business submissions enter manual review. We verify by email before ownership is approved.'}
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-lg bg-brand-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting
            ? locale === 'zh'
              ? '送出中...'
              : 'Submitting...'
            : locale === 'zh'
              ? '送出認領／新增申請'
              : 'Submit claim / new listing'}
        </button>

        {status ? (
          <p className="text-sm font-medium text-brand-700" aria-live="polite">
            {status}
          </p>
        ) : null}
      </form>
    </div>
  );
}
