'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { formatBusinessGalleryInput } from '@/lib/business-media';
import type { BusinessCategory, BusinessClaim, Locale } from '@/lib/types';

function normalize(value?: string | null): string {
  return value?.trim().toLowerCase() ?? '';
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function inferCategorySlug(
  claimCategory: string | undefined,
  categories: BusinessCategory[]
): string {
  const normalizedClaimCategory = normalize(claimCategory);
  if (!normalizedClaimCategory) {
    return '';
  }

  const match = categories.find((category) => {
    const aliases = [
      category.slug,
      category.name.en,
      category.name.zh,
      slugify(category.name.en),
      slugify(category.name.zh ?? ''),
    ];

    return aliases.some((alias) => normalize(alias) === normalizedClaimCategory);
  });

  return match?.slug ?? '';
}

export function BusinessClaimApprovalCard({
  categories,
  claim,
  locale,
}: {
  categories: BusinessCategory[];
  claim: BusinessClaim;
  locale: Locale;
}) {
  const router = useRouter();
  const isNewListing = !claim.businessSlug && !claim.businessId;
  const inferredCategorySlug = useMemo(
    () => inferCategorySlug(claim.category, categories),
    [categories, claim.category]
  );
  const [categorySlug, setCategorySlug] = useState(inferredCategorySlug);
  const [city, setCity] = useState(claim.city ?? '');
  const [heroImage, setHeroImage] = useState(claim.heroImage ?? '');
  const [galleryText, setGalleryText] = useState(formatBusinessGalleryInput(claim.gallery));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleApprove() {
    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch('/api/admin/business-claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-locale': locale,
        },
        body: JSON.stringify({
          claimId: claim.id,
          categorySlug: categorySlug || undefined,
          city: city.trim() || undefined,
          heroImage: heroImage.trim() || undefined,
          gallery: galleryText,
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(
          data.message ??
            (locale === 'zh' ? '無法核准這筆商家認領。' : 'Unable to approve this business claim.')
        );
      }

      setStatus(data.message ?? null);
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : locale === 'zh'
            ? '無法核准這筆商家認領。'
            : 'Unable to approve this business claim.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
          {isNewListing
            ? locale === 'zh'
              ? '新商家申請'
              : 'New business submission'
            : locale === 'zh'
              ? '既有商家認領'
              : 'Existing listing claim'}
        </span>
        {claim.businessSlug ? (
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">
            {claim.businessSlug}
          </span>
        ) : null}
      </div>

      {claim.details ? (
        <p className="text-sm leading-6 text-slate-600">{claim.details}</p>
      ) : null}

      {claim.heroImage || claim.gallery.length > 0 ? (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
          {locale === 'zh'
            ? `申請人提交了 ${Number(Boolean(claim.heroImage)) + claim.gallery.length} 張照片網址，可在核准前調整。`
            : `The claimant submitted ${Number(Boolean(claim.heroImage)) + claim.gallery.length} photo URL${Number(Boolean(claim.heroImage)) + claim.gallery.length === 1 ? '' : 's'}. You can adjust them before approval.`}
        </p>
      ) : null}

      {isNewListing ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-800">
              {locale === 'zh' ? '目錄分類' : 'Directory category'}
            </span>
            <select
              value={categorySlug}
              onChange={(event) => setCategorySlug(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
            >
              <option value="">
                {locale === 'zh' ? '選擇分類' : 'Choose a category'}
              </option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name[locale] ?? category.name.en}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-800">{locale === 'zh' ? '城市' : 'City'}</span>
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Phoenix"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
            />
          </label>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-semibold text-slate-800">
            {locale === 'zh' ? '封面照片網址' : 'Cover photo URL'}
          </span>
          <input
            value={heroImage}
            onChange={(event) => setHeroImage(event.target.value)}
            placeholder="https://example.com/storefront.jpg"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-semibold text-slate-800">
            {locale === 'zh' ? '其他照片網址' : 'Additional photo URLs'}
          </span>
          <textarea
            value={galleryText}
            onChange={(event) => setGalleryText(event.target.value)}
            rows={4}
            placeholder={
              locale === 'zh'
                ? '每行一個網址。'
                : 'One URL per line.'
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={handleApprove}
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting
          ? locale === 'zh'
            ? '核准中...'
            : 'Approving...'
          : isNewListing
            ? locale === 'zh'
              ? '核准並上架'
              : 'Approve and publish'
            : locale === 'zh'
              ? '核准並發布'
              : 'Approve and publish'}
      </button>

      {status ? (
        <p className="text-sm font-medium text-brand-700" aria-live="polite">
          {status}
        </p>
      ) : null}
    </div>
  );
}
