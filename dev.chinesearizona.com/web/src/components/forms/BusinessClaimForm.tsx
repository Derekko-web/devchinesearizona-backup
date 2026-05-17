'use client';

import type { ClipboardEvent } from 'react';
import { useMemo, useState } from 'react';
import { Camera, CheckCircle2, ImageIcon, Search, ShieldCheck } from 'lucide-react';

import { AuthActionPrompt } from '@/components/auth/AuthActionPrompt';
import { useAuth } from '@/components/auth/AuthProvider';
import { appendUploadedGalleryUrl, getClipboardImageFile, uploadBusinessImageFile } from '@/lib/business-image-upload-client';
import { getBusinessHeroImageWarning } from '@/lib/business-media';
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
  const { user } = useAuth();
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [heroImage, setHeroImage] = useState('');
  const [galleryText, setGalleryText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<'hero' | 'gallery' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fullName =
    typeof user?.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : '';
  const heroImageWarning = getBusinessHeroImageWarning(heroImage, locale);

  const matches = useMemo(() => {
    if (!businessName.trim()) {
      return [];
    }

    const term = businessName.toLowerCase();
    return businesses.filter((business) =>
      `${business.name.en} ${business.name['zh'] ?? ''}`.toLowerCase().includes(term)
    );
  }, [businessName, businesses]);

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

  async function handleSubmit(formData: FormData) {
    if (!user) {
      setStatus(locale === 'zh' ? '請先登入，再提交這個商家申請。' : 'Please log in before submitting this business request.');
      return;
    }

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

  if (!user) {
    return (
      <AuthActionPrompt
        locale={locale}
        title={locale === 'zh' ? '登入以認領或新增商家' : 'Log in to claim or add a business'}
        description={
          locale === 'zh'
            ? '商家目錄本身對所有訪客開放，但認領、新增、後續編輯與商家後台需要綁定到一個商家主理人帳號。登入後會帶你回到這個流程。'
            : 'Directory browsing stays open to everyone, but claims, new listings, future edits, and dashboard access are tied to an owner account. After login, we will bring you right back to this flow.'
        }
        ctaLabel={locale === 'zh' ? '登入或註冊' : 'Log in or sign up'}
      />
    );
  }

  const fieldClass =
    'w-full rounded-[15px] border border-[#dfcebd] bg-white px-4 py-3 text-sm font-medium text-[#33251d] outline-none transition-colors placeholder:text-[#a58f7d] focus:border-brand-300 focus:ring-2 focus:ring-brand-100';
  const labelClass = 'mb-2 block text-sm font-semibold text-[#382a22]';

  return (
    <section className="homepage-rise overflow-hidden rounded-[28px] border border-[#dfcebd] bg-[#fffaf3] shadow-[0_28px_65px_-52px_rgba(73,47,27,0.65)]" aria-labelledby="business-claim-form-title">
      <div className="grid gap-5 border-b border-[#eadac9] p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-[#9a806c]">
            <Search className="h-4 w-4 text-brand-600" aria-hidden="true" />
            {locale === 'zh' ? '先查重複，再送出申請' : 'SEARCH FIRST, THEN SUBMIT'}
          </p>
          <h2 id="business-claim-form-title" className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-[#261b15] [font-family:var(--font-display)]">
            {locale === 'zh' ? '商家申請與重複檢查' : 'Business request intake'}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6f5b4e]">
            {locale === 'zh'
              ? '先搜尋是否已存在相似商家。若已有資料，可直接送出認領；若沒有，送出新商家申請後，我們會在核准後直接上架到目錄。'
              : 'Search first for an existing listing. If we already have the business, submit a claim. If not, send a new business request and we will publish it to the directory once approved.'}
          </p>
        </div>

        <div className="flex max-w-sm items-start gap-3 border-l border-[#dfcebd] pl-4 text-sm leading-6 text-[#735f51] lg:justify-self-end">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600" aria-hidden="true" />
          <p>
            {locale === 'zh'
              ? `這筆申請將綁定到 ${user.email ?? '你的帳號'}，方便認領審核與後台開通。`
              : `This request will be tied to ${user.email ?? 'your account'} for review, claim tracking, and owner tools.`}
          </p>
        </div>
      </div>

      <form action={handleSubmit} className="space-y-6 p-5 sm:p-6">
        <div>
          <label htmlFor="businessName" className={labelClass}>
            {locale === 'zh' ? '商家名稱' : 'Business name'}
          </label>
          <input
            id="businessName"
            name="businessName"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder={locale === 'zh' ? '例如：Elite AZ Realty Team' : 'e.g. Elite AZ Realty Team'}
            className={fieldClass}
            required
          />
        </div>

        {matches.length > 0 ? (
          <div className="border-l-4 border-brand-500 bg-[#fff2ec] px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-brand-800">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {locale === 'zh' ? '找到可能重複的商家：' : 'Possible duplicate listings:'}
            </p>
            <ul className="mt-3 grid gap-2 text-sm text-brand-900">
              {matches.slice(0, 3).map((business) => (
                <li key={business.id}>
                  <label className="flex items-center gap-3 rounded-[14px] border border-brand-100 bg-white px-3 py-2.5 transition-colors hover:border-brand-200">
                    <input
                      type="radio"
                      name="businessSlug"
                      value={business.slug}
                      defaultChecked={business.slug === initialBusinessSlug}
                      className="accent-brand-600"
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
            <label htmlFor="claimantName" className={labelClass}>
              {locale === 'zh' ? '聯絡人姓名' : 'Your name'}
            </label>
            <input
              id="claimantName"
              name="claimantName"
              defaultValue={fullName}
              className={fieldClass}
              required
            />
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>
              {locale === 'zh' ? '聯絡 Email' : 'Contact email'}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={user.email ?? ''}
              readOnly={Boolean(user.email)}
              className={`${fieldClass} read-only:bg-[#f7efe5]`}
              required
            />
          </div>
          <div>
            <label htmlFor="category" className={labelClass}>
              {locale === 'zh' ? '分類' : 'Category'}
            </label>
            <input
              id="category"
              name="category"
              className={fieldClass}
              placeholder={locale === 'zh' ? '例如：房地產' : 'e.g. Real Estate'}
            />
          </div>
          <div>
            <label htmlFor="city" className={labelClass}>
              {locale === 'zh' ? '城市' : 'City'}
            </label>
            <input
              id="city"
              name="city"
              className={fieldClass}
              placeholder="Chandler"
            />
          </div>
        </div>

        <div>
          <label htmlFor="details" className={labelClass}>
            {locale === 'zh' ? '補充說明' : 'Notes'}
          </label>
          <textarea
            id="details"
            name="details"
            rows={4}
            className={fieldClass}
            placeholder={
              locale === 'zh'
                ? '可以補充網址、服務內容、認領背景或雙語服務資訊。'
                : 'Share website, services offered, claim context, or bilingual support details.'
            }
          />
        </div>

        <div className="border-t border-[#eadac9] pt-6">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[15px] bg-[#f4e4d6] text-brand-700">
              <Camera className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#382a22]">
                {locale === 'zh' ? '照片與封面圖' : 'Photos and cover image'}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#7b6759]">
                {locale === 'zh'
                  ? '可貼上照片網址，也可直接把圖片貼到封面或圖集欄位。若封面留白，系統會自動把第一張圖集照片當成封面。'
                  : 'Paste image URLs, or paste images directly into the cover or gallery fields. If the cover is blank, the first gallery photo becomes the cover.'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="heroImage" className={labelClass}>
              {locale === 'zh' ? '封面照片網址' : 'Cover photo URL'}
            </label>
            <input
              id="heroImage"
              name="heroImage"
              type="url"
              value={heroImage}
              onChange={(event) => setHeroImage(event.target.value)}
              onPaste={handleHeroPaste}
              className={fieldClass}
              placeholder="https://example.com/storefront.jpg"
            />
            <p className="mt-2 text-xs leading-5 text-[#7b6759]">
              {locale === 'zh'
                ? '封面最好用橫向、較高解析度的照片，也可以直接把圖片貼到這個欄位。'
                : 'Cover photos work best with wide, higher-resolution images, and you can also paste an image directly into this field.'}
            </p>
            {heroImageWarning ? (
              <p className="mt-2 rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                {heroImageWarning}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="gallery" className={labelClass}>
              {locale === 'zh' ? '其他照片網址' : 'Additional photo URLs'}
            </label>
            <textarea
              id="gallery"
              name="gallery"
              value={galleryText}
              onChange={(event) => setGalleryText(event.target.value)}
              onPaste={handleGalleryPaste}
              rows={4}
              className={fieldClass}
              placeholder={
                locale === 'zh'
                  ? '每行一個網址，例如室內、菜單、團隊或服務照片。'
                  : 'One URL per line for interior, menu, team, or service photos.'
              }
            />
          </div>
          </div>
        </div>

        {uploadStatus ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-brand-700" aria-live="polite">
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
            {uploadStatus}
          </p>
        ) : null}

        <div>
          <label htmlFor="humanCheck" className={labelClass}>
            {locale === 'zh' ? '人類驗證：3 + 4 = ?' : 'Human check: 3 + 4 = ?'}
          </label>
          <input
            id="humanCheck"
            name="humanCheck"
            className={fieldClass}
            required
          />
        </div>

        <div className="grid gap-4 border-t border-[#eadac9] pt-6 md:grid-cols-[1fr_auto] md:items-center">
          <p className="flex items-start gap-2 text-xs leading-5 text-[#7b6759]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600" aria-hidden="true" />
            <span>
              {locale === 'zh'
                ? '所有認領與新增申請都會進入人工審核。提交後，我們會以 email 確認並安排後續。'
                : 'All claims and new business submissions enter manual review. We verify by email before ownership is approved.'}
            </span>
          </p>

          <button
            type="submit"
            disabled={isSubmitting || uploadingField !== null}
            className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_42px_-25px_rgba(187,61,41,0.9)] transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting
              ? locale === 'zh'
                ? '送出中...'
                : 'Submitting...'
              : uploadingField
                ? locale === 'zh'
                  ? '圖片上傳中...'
                  : 'Uploading image...'
                : locale === 'zh'
                  ? '送出認領／新增申請'
                  : 'Submit claim / new listing'}
          </button>
        </div>

        {status ? (
          <p className="border-l-4 border-brand-500 bg-[#fff2ec] px-4 py-3 text-sm font-semibold text-brand-800" aria-live="polite">
            {status}
          </p>
        ) : null}
      </form>
    </section>
  );
}
