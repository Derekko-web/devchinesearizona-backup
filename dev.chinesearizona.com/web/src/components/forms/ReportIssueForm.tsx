'use client';

import { useState } from 'react';

import type { Locale } from '@/lib/types';

type ReportIssueFormProps = {
  entitySlug: string;
  entityType?: 'community_post' | 'business' | 'review';
  locale: Locale;
};

export function ReportIssueForm({ entitySlug, entityType = 'community_post', locale }: ReportIssueFormProps) {
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch('/api/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-locale': locale,
      },
      body: JSON.stringify({
        ...payload,
        entitySlug,
        entityType,
      }),
    });
    const data = (await response.json()) as { message: string };
    setStatus(data.message);
  }

  return (
    <form id="report-issue" action={handleSubmit} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor={`reason-${entitySlug}`} className="mb-2 block text-sm font-semibold text-slate-800">
            {locale === 'zh' ? '檢舉原因' : 'Report reason'}
          </label>
          <select
            id={`reason-${entitySlug}`}
            name="reason"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
          >
            <option value="spam">{locale === 'zh' ? '垃圾訊息' : 'Spam'}</option>
            <option value="unsafe">{locale === 'zh' ? '不安全或可疑' : 'Unsafe or suspicious'}</option>
            <option value="incorrect">{locale === 'zh' ? '資訊錯誤' : 'Incorrect information'}</option>
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
        >
          {locale === 'zh' ? '送出檢舉' : 'Submit report'}
        </button>
      </div>
      {status ? (
        <p className="mt-3 text-sm font-medium text-brand-700" aria-live="polite">
          {status}
        </p>
      ) : null}
    </form>
  );
}
