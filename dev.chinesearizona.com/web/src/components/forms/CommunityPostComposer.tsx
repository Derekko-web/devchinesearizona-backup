'use client';

import { useState, type ReactNode } from 'react';

import { AuthActionPrompt } from '@/components/auth/AuthActionPrompt';
import { useAuth } from '@/components/auth/AuthProvider';
import { localeLangAttribute, localeName } from '@/lib/i18n';
import type { Locale } from '@/lib/types';

const humanAnswer = '7';

type CommunityPostComposerProps = {
  locale: Locale;
  children?: ReactNode;
};

export function CommunityPostComposer({ locale, children }: CommunityPostComposerProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerClassName = children ? 'grid gap-6 lg:grid-cols-[1.15fr,0.85fr]' : 'space-y-6';
  const localizedSections =
    locale === 'zh'
      ? [
          {
            key: 'zh',
            lang: localeLangAttribute('zh'),
            titleName: 'titleZh',
            excerptName: 'excerptZh',
            bodyName: 'bodyZh',
            heading: '優先顯示欄位',
            sectionLabel: localeName('zh', locale),
            titleLabel: '中文標題',
            excerptLabel: '中文摘要',
            bodyLabel: '中文內容',
          },
          {
            key: 'en',
            lang: localeLangAttribute('en'),
            titleName: 'titleEn',
            excerptName: 'excerptEn',
            bodyName: 'bodyEn',
            heading: '其他語言版本',
            sectionLabel: localeName('en', locale),
            titleLabel: '英文標題',
            excerptLabel: '英文摘要',
            bodyLabel: '英文內容',
          },
        ]
      : [
          {
            key: 'en',
            lang: localeLangAttribute('en'),
            titleName: 'titleEn',
            excerptName: 'excerptEn',
            bodyName: 'bodyEn',
            heading: 'Primary display fields',
            sectionLabel: localeName('en', locale),
            titleLabel: 'English title',
            excerptLabel: 'English excerpt',
            bodyLabel: 'English details',
          },
          {
            key: 'zh',
            lang: localeLangAttribute('zh'),
            titleName: 'titleZh',
            excerptName: 'excerptZh',
            bodyName: 'bodyZh',
            heading: 'Secondary language version',
            sectionLabel: localeName('zh', locale),
            titleLabel: 'Chinese title',
            excerptLabel: 'Chinese excerpt',
            bodyLabel: 'Chinese details',
          },
        ];

  async function handleSubmit(formData: FormData) {
    if (!user) {
      setStatus(locale === 'zh' ? '請先登入，再發佈社群貼文。' : 'Please log in before publishing a community post.');
      return;
    }

    const verification = String(formData.get('humanCheck') ?? '').trim();
    if (verification !== humanAnswer) {
      setStatus(locale === 'zh' ? '驗證答案不正確。' : 'Human verification failed.');
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    const payload = Object.fromEntries(formData.entries());

    const response = await fetch('/api/community-posts', {
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
      <div className={containerClassName}>
        <AuthActionPrompt
          locale={locale}
          title={locale === 'zh' ? '登入以發佈社群貼文' : 'Log in to publish in the community'}
          description={
            locale === 'zh'
              ? '瀏覽社群內容不需要帳號，但發文、分類資訊與後續審核需要綁定到一個供稿帳號，這樣我們才能處理檢舉、建立信任，並在登入後把你帶回這裡。'
              : 'Browsing community content stays open, but posts, classifieds, and moderation follow-up are tied to a contributor account so we can build trust, handle reports, and return you here after login.'
          }
          ctaLabel={locale === 'zh' ? '登入或註冊' : 'Log in or sign up'}
        />
        {children}
      </div>
    );
  }

  if (!isExpanded) {
    return (
      <div className="flex justify-end relative z-10 w-full mb-12">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setIsExpanded(true);
          }}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-900 px-6 py-3 font-semibold text-white shadow-md transition-all hover:bg-brand-800 hover:shadow-lg"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {locale === 'zh' ? '發佈社群貼文' : 'Create a community post'}
        </button>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">
              {locale === 'zh' ? '發佈社群貼文' : 'Publish a community post'}
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              {locale === 'zh'
                ? '新貼文會立即上線，但在建立信任前不會被搜尋引擎收錄，外部連結也會加上 ugc / nofollow。'
                : 'New posts go live immediately, but remain noindex until trust is established. External links are marked ugc / nofollow by default.'}
            </p>
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
              {locale === 'zh'
                ? `目前將以 ${user.email ?? '你的帳號'} 發佈這則內容。`
                : `This post will be published under ${user.email ?? 'your signed-in account'}.`}
            </p>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="rounded-full bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900 shrink-0"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form action={handleSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="type" className="mb-2 block text-sm font-semibold text-slate-800">
              {locale === 'zh' ? '貼文類型' : 'Post type'}
            </label>
            <select
              id="type"
              name="type"
              defaultValue="board"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
            >
              <option value="board">{locale === 'zh' ? '社群看板' : 'Community board'}</option>
              <option value="classified">{locale === 'zh' ? '分類資訊' : 'Classified'}</option>
            </select>
          </div>
          <div>
            <label htmlFor="city" className="mb-2 block text-sm font-semibold text-slate-800">
              {locale === 'zh' ? '城市' : 'City'}
            </label>
            <input
              id="city"
              name="city"
              placeholder="Mesa"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
              required
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {localizedSections.map((section) => (
            <fieldset
              key={section.key}
              className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <legend className="px-1 text-sm font-semibold text-slate-900">
                {section.heading}: {section.sectionLabel}
              </legend>
              <div>
                <label htmlFor={section.titleName} className="mb-2 block text-sm font-semibold text-slate-800">
                  {section.titleLabel}
                </label>
                <input
                  id={section.titleName}
                  name={section.titleName}
                  lang={section.lang}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
                  required
                />
              </div>
              <div>
                <label htmlFor={section.excerptName} className="mb-2 block text-sm font-semibold text-slate-800">
                  {section.excerptLabel}
                </label>
                <textarea
                  id={section.excerptName}
                  name={section.excerptName}
                  lang={section.lang}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
                  required
                />
              </div>
              <div>
                <label htmlFor={section.bodyName} className="mb-2 block text-sm font-semibold text-slate-800">
                  {section.bodyLabel}
                </label>
                <textarea
                  id={section.bodyName}
                  name={section.bodyName}
                  lang={section.lang}
                  rows={5}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
                  required
                />
              </div>
            </fieldset>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="linkUrl" className="mb-2 block text-sm font-semibold text-slate-800">
              {locale === 'zh' ? '外部連結（可選）' : 'External link (optional)'}
            </label>
            <input
              id="linkUrl"
              name="linkUrl"
              type="url"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
              placeholder="https://"
            />
          </div>
          <div>
            <label htmlFor="price" className="mb-2 block text-sm font-semibold text-slate-800">
              {locale === 'zh' ? '價格（分類資訊可選）' : 'Price (optional for classifieds)'}
            </label>
            <input
              id="price"
              name="price"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
              placeholder="$200"
            />
          </div>
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-lg bg-brand-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting
            ? locale === 'zh'
              ? '發布中...'
              : 'Publishing...'
            : locale === 'zh'
              ? '立即發布'
              : 'Publish now'}
        </button>

        {status ? (
          <p className="text-sm font-medium text-brand-700" aria-live="polite">
            {status}
          </p>
        ) : null}
      </form>
      </div>
      {children}
    </div>
  );
}
