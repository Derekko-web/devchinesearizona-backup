'use client';

import { useState } from 'react';

import {
  WECHAT_ID_MAX_LENGTH,
  chineseMaterialsLabel,
  isSpokenLanguage,
  paymentLabels,
  spokenLanguageOptions,
  type BusinessBilingualDetails,
  type SpokenLanguage,
} from '@/lib/business-bilingual';
import { languageLabel } from '@/lib/i18n';
import type { Locale } from '@/lib/types';

type BusinessBilingualDetailsEditorProps = {
  businessSlug: string;
  categorySlug?: string;
  initialDetails: BusinessBilingualDetails;
  locale: Locale;
  // Shown above the form, e.g. the listing name in the admin editor.
  heading?: string;
};

type Status = { message: string; tone: 'error' | 'success' };

export function BusinessBilingualDetailsEditor({
  businessSlug,
  categorySlug,
  initialDetails,
  locale,
  heading,
}: BusinessBilingualDetailsEditorProps) {
  const zh = locale === 'zh';
  const [languages, setLanguages] = useState<SpokenLanguage[]>(
    initialDetails.languages.filter(isSpokenLanguage)
  );
  const [wechatId, setWechatId] = useState(initialDetails.wechatId ?? '');
  const [acceptsWeChatPay, setAcceptsWeChatPay] = useState(initialDetails.acceptsWeChatPay);
  const [acceptsAlipay, setAcceptsAlipay] = useState(initialDetails.acceptsAlipay);
  const [chineseMenuOrForms, setChineseMenuOrForms] = useState(initialDetails.chineseMenuOrForms);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  function toggleLanguage(language: SpokenLanguage) {
    setLanguages((current) =>
      current.includes(language) ? current.filter((item) => item !== language) : [...current, language]
    );
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch(`/api/directory/businesses/${encodeURIComponent(businessSlug)}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-locale': locale },
        body: JSON.stringify({ languages, wechatId, acceptsWeChatPay, acceptsAlipay, chineseMenuOrForms }),
      });
      const data = (await response.json()) as { message?: string };
      setStatus({
        tone: response.ok ? 'success' : 'error',
        message: data.message ?? (zh ? '目前無法儲存雙語資訊。' : 'Unable to save bilingual details right now.'),
      });
    } catch {
      setStatus({
        tone: 'error',
        message: zh ? '目前無法儲存雙語資訊。' : 'Unable to save bilingual details right now.',
      });
    } finally {
      setSaving(false);
    }
  }

  const checkboxClass = 'h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-200';
  const chipClass =
    'inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-brand-200';

  return (
    <form
      onSubmit={save}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="bilingual-details-editor"
    >
      <div className="space-y-2">
        <div className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
          {zh ? '雙語服務資訊' : 'Bilingual details'}
        </div>
        {heading ? <h3 className="text-lg font-semibold text-slate-900">{heading}</h3> : null}
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          {zh
            ? '新移民最常找這些資訊。填寫後會顯示在你的商家頁，並可在目錄中依語言與付款方式篩選。'
            : 'Newcomers look for these first. They show on your listing page, and visitors can filter the directory by language and payment.'}
        </p>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-slate-800">{zh ? '可使用的語言' : 'Languages spoken'}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {spokenLanguageOptions.map((language) => (
            <label key={language} className={chipClass}>
              <input
                type="checkbox"
                className={checkboxClass}
                checked={languages.includes(language)}
                onChange={() => toggleLanguage(language)}
              />
              {languageLabel(language, locale)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <label htmlFor={`wechat-${businessSlug}`} className="text-sm font-semibold text-slate-800">
            {zh ? '微信號' : 'WeChat ID'}
          </label>
          <input
            id={`wechat-${businessSlug}`}
            value={wechatId}
            maxLength={WECHAT_ID_MAX_LENGTH}
            onChange={(event) => setWechatId(event.target.value)}
            placeholder={zh ? '例如：lotus_kitchen_az' : 'e.g. lotus_kitchen_az'}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          />
          <p className="mt-1 text-xs text-slate-500">
            {zh ? '留空則不顯示。' : 'Leave empty to hide it.'}
          </p>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-slate-800">{zh ? '付款與中文資料' : 'Payment and Chinese materials'}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <label className={chipClass}>
              <input
                type="checkbox"
                className={checkboxClass}
                checked={acceptsWeChatPay}
                onChange={(event) => setAcceptsWeChatPay(event.target.checked)}
              />
              {zh ? `接受${paymentLabels['wechat-pay'].zh}` : `Accepts ${paymentLabels['wechat-pay'].en}`}
            </label>
            <label className={chipClass}>
              <input
                type="checkbox"
                className={checkboxClass}
                checked={acceptsAlipay}
                onChange={(event) => setAcceptsAlipay(event.target.checked)}
              />
              {zh ? `接受${paymentLabels.alipay.zh}` : `Accepts ${paymentLabels.alipay.en}`}
            </label>
            <label className={chipClass}>
              <input
                type="checkbox"
                className={checkboxClass}
                checked={chineseMenuOrForms}
                onChange={(event) => setChineseMenuOrForms(event.target.checked)}
              />
              {chineseMaterialsLabel(categorySlug, locale)}
            </label>
          </div>
        </fieldset>
      </div>

      {status ? (
        <p
          role="status"
          className={`mt-4 rounded-xl border px-3 py-2 text-sm leading-6 ${
            status.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {status.message}
        </p>
      ) : null}

      <div className="mt-5">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {saving ? (zh ? '儲存中…' : 'Saving…') : zh ? '儲存雙語資訊' : 'Save bilingual details'}
        </button>
      </div>
    </form>
  );
}
