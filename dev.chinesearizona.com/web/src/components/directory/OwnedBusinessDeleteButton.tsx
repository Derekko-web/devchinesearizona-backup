'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import type { Business, Locale } from '@/lib/types';

type OwnedBusinessDeleteButtonProps = {
  business: Pick<Business, 'name' | 'slug'>;
  locale: Locale;
};

export function OwnedBusinessDeleteButton({
  business,
  locale,
}: OwnedBusinessDeleteButtonProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setStatus(null);

    try {
      const response = await fetch(`/api/directory/businesses/${encodeURIComponent(business.slug)}`, {
        method: 'DELETE',
        headers: {
          'x-locale': locale,
        },
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(
          data.message ??
            (locale === 'zh'
              ? '目前無法刪除這筆商家。'
              : 'Unable to delete this business right now.')
        );
      }

      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : locale === 'zh'
            ? '目前無法刪除這筆商家。'
            : 'Unable to delete this business right now.'
      );
      setIsDeleting(false);
      return;
    }

    setIsDeleting(false);
    setIsConfirming(false);
  }

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
      <div className="space-y-2">
        <h3 className="text-base font-semibold text-rose-900">
          {locale === 'zh' ? '刪除商家' : 'Delete listing'}
        </h3>
        <p className="text-sm leading-6 text-rose-800">
          {locale === 'zh'
            ? `刪除後，${business.name.en} 的商家頁面、圖片設定與相關廣告紀錄都會一起移除。`
            : `Deleting ${business.name.en} removes the listing, photo settings, and related ad records.`}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {isConfirming ? (
          <>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="inline-flex items-center justify-center rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isDeleting
                ? locale === 'zh'
                  ? '刪除中...'
                  : 'Deleting...'
                : locale === 'zh'
                  ? '確認刪除'
                  : 'Confirm delete'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (isDeleting) {
                  return;
                }

                setIsConfirming(false);
                setStatus(null);
              }}
              disabled={isDeleting}
              className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-800 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {locale === 'zh' ? '取消' : 'Cancel'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsConfirming(true);
              setStatus(null);
            }}
            className="inline-flex items-center justify-center rounded-lg border border-rose-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-800 transition-colors hover:bg-rose-100"
          >
            {locale === 'zh' ? '刪除這筆商家' : 'Delete this listing'}
          </button>
        )}

        {status ? (
          <p className="text-sm font-medium text-rose-800" aria-live="polite">
            {status}
          </p>
        ) : null}
      </div>
    </div>
  );
}
