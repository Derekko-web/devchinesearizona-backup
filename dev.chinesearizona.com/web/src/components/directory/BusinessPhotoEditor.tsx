'use client';

import type { ClipboardEvent, FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { appendUploadedGalleryUrl, getClipboardImageFile, uploadBusinessImageFile } from '@/lib/business-image-upload-client';
import { formatBusinessGalleryInput, getBusinessHeroImageWarning } from '@/lib/business-media';
import type { Business, Locale } from '@/lib/types';

type BusinessPhotoEditorProps = {
  business: Business;
  locale: Locale;
};

export function BusinessPhotoEditor({ business, locale }: BusinessPhotoEditorProps) {
  const router = useRouter();
  const initialGalleryText = formatBusinessGalleryInput(business.gallery);
  const [heroImage, setHeroImage] = useState(business.heroImage ?? '');
  const [galleryText, setGalleryText] = useState(initialGalleryText);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<'hero' | 'gallery' | null>(null);
  const heroImageWarning = getBusinessHeroImageWarning(heroImage, locale);

  useEffect(() => {
    setHeroImage(business.heroImage ?? '');
    setGalleryText(initialGalleryText);
  }, [business.id, business.heroImage, initialGalleryText]);

  async function handleClipboardUpload(target: 'hero' | 'gallery', file: File) {
    setUploadingField(target);
    setUploadStatus(locale === 'zh' ? '正在上傳圖片...' : 'Uploading image...');

    try {
      const result = await uploadBusinessImageFile({
        file,
        locale,
        target,
      });

      if (target === 'hero') {
        setHeroImage(result.url);
      } else {
        setGalleryText((current) => appendUploadedGalleryUrl(current, result.url));
      }

      setUploadStatus(
        result.message ??
          (locale === 'zh' ? '圖片已上傳。' : 'Image uploaded.')
      );
    } catch (error) {
      setUploadStatus(
        error instanceof Error
          ? error.message
          : locale === 'zh'
            ? '目前無法上傳這張圖片。'
            : 'Unable to upload this image right now.'
      );
    } finally {
      setUploadingField(null);
    }
  }

  function handleHeroPaste(event: ClipboardEvent<HTMLInputElement>) {
    const file = getClipboardImageFile(event.clipboardData?.items);
    if (!file) {
      return;
    }

    event.preventDefault();
    void handleClipboardUpload('hero', file);
  }

  function handleGalleryPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const file = getClipboardImageFile(event.clipboardData?.items);
    if (!file) {
      return;
    }

    event.preventDefault();
    void handleClipboardUpload('gallery', file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch(`/api/directory/businesses/${encodeURIComponent(business.slug)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-locale': locale,
        },
        body: JSON.stringify({
          heroImage,
          gallery: galleryText,
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(
          data.message ??
            (locale === 'zh' ? '無法更新商家照片。' : 'Unable to update business photos.')
        );
      }

      setStatus(data.message ?? null);
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : locale === 'zh'
            ? '無法更新商家照片。'
            : 'Unable to update business photos.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="space-y-2">
        <h3 className="text-base font-semibold text-slate-900">
          {locale === 'zh' ? '商家照片' : 'Business photos'}
        </h3>
        <p className="text-sm leading-6 text-slate-600">
          {locale === 'zh'
            ? '可貼上封面與其他照片網址。若封面留白，系統會自動把第一張圖集照片當成封面。'
            : 'Paste a cover photo URL and any gallery URLs. If cover photo is blank, we will use the first gallery image as the cover.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-4 lg:grid-cols-[1fr,1.2fr]">
        <label className="space-y-2 text-sm">
          <span className="font-semibold text-slate-800">
            {locale === 'zh' ? '封面照片網址' : 'Cover photo URL'}
          </span>
          <input
            value={heroImage}
            onChange={(event) => setHeroImage(event.target.value)}
            onPaste={handleHeroPaste}
            placeholder="https://example.com/storefront.jpg"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
          />
          <p className="text-xs leading-5 text-slate-500">
            {locale === 'zh'
              ? '封面最好用橫向、較高解析度的照片，也可以直接把圖片貼到這個欄位。'
              : 'Cover photos work best with wide, higher-resolution images, and you can also paste an image directly into this field.'}
          </p>
          {heroImageWarning ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              {heroImageWarning}
            </p>
          ) : null}
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-semibold text-slate-800">
            {locale === 'zh' ? '其他照片網址' : 'Additional photo URLs'}
          </span>
          <textarea
            value={galleryText}
            onChange={(event) => setGalleryText(event.target.value)}
            onPaste={handleGalleryPaste}
            rows={4}
            placeholder={
              locale === 'zh'
                ? '每行一個網址。'
                : 'One URL per line.'
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting || uploadingField !== null}
            className="inline-flex items-center justify-center rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting
              ? locale === 'zh'
                ? '儲存中...'
                : 'Saving...'
              : locale === 'zh'
                ? '儲存照片'
                : 'Save photos'}
          </button>

          {uploadStatus ? (
            <p className="text-sm font-medium text-brand-700" aria-live="polite">
              {uploadStatus}
            </p>
          ) : null}

          {status ? (
            <p className="text-sm font-medium text-brand-700" aria-live="polite">
              {status}
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
