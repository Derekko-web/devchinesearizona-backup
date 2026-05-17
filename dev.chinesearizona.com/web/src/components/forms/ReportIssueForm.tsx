'use client';

import { useState } from 'react';

import { AuthActionPrompt } from '@/components/auth/AuthActionPrompt';
import { useAuth } from '@/components/auth/AuthProvider';
import type { Locale, ModerationReport } from '@/lib/types';

type ReportIssueFormProps = {
  entitySlug: string;
  entityType?: ModerationReport['entityType'];
  locale: Locale;
};

export function ReportIssueForm({ entitySlug, entityType = 'community_post', locale }: ReportIssueFormProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    if (!user) {
      setStatus(locale === 'zh' ? '請先登入，再送出檢舉。' : 'Please log in before sending a report.');
      return;
    }

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

  if (!user) {
    return (
      <AuthActionPrompt
        locale={locale}
        title={locale === 'zh' ? '登入以回報問題' : 'Log in to report an issue'}
        description={
          locale === 'zh'
            ? '瀏覽內容不需要帳號，但檢舉與修正回報會綁定到一個帳號，方便我們防止濫用並在需要時追蹤後續。'
            : 'Browsing stays open, but reports are tied to an account so we can prevent abuse and follow up when a correction needs more context.'
        }
        ctaLabel={locale === 'zh' ? '登入或註冊' : 'Log in or sign up'}
        variant="compact"
      />
    );
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
