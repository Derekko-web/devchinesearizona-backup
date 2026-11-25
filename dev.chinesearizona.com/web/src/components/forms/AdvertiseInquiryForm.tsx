'use client';

import { Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { buildAdvertiseInquiryMailto, getAdvertisePlans, isAdvertisePlanId } from '@/lib/advertise';
import type { SiteProfile } from '@/lib/site-config';
import type { Locale } from '@/lib/types';

type AdvertiseInquiryFormProps = {
  locale: Locale;
  site: SiteProfile;
  initialPlanId?: string;
};

const fieldClassName =
  'mt-1.5 w-full rounded-[8px] border border-[#dccbbc] bg-white px-3 py-2.5 text-sm text-[#352720] outline-none placeholder:text-[#9a897e] focus:border-brand-300';
const labelClassName = 'block text-sm font-semibold text-[#3d2f27]';

export function AdvertiseInquiryForm({ locale, site, initialPlanId }: AdvertiseInquiryFormProps) {
  const [mailtoHref, setMailtoHref] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const plans = getAdvertisePlans(site);
  const zh = locale === 'zh';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = {
      name: String(data.get('name') ?? ''),
      businessName: String(data.get('businessName') ?? ''),
      contact: String(data.get('contact') ?? ''),
      planId: String(data.get('planId') ?? ''),
      message: String(data.get('message') ?? ''),
    };

    if (!input.name.trim() || !input.businessName.trim() || !input.contact.trim()) {
      setMailtoHref(null);
      setError(zh ? '請填寫姓名、商家名稱與聯絡方式。' : 'Please fill in your name, business name and how to reach you.');
      return;
    }

    const href = buildAdvertiseInquiryMailto(input, locale, site);
    setError(null);
    setMailtoHref(href);
    window.location.href = href;
  }

  return (
    <form
      id="advertise-inquiry"
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-[8px] border border-[#e4d6c7] bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="advertise-name" className={labelClassName}>
            {zh ? '你的姓名' : 'Your name'}
          </label>
          <input id="advertise-name" name="name" required autoComplete="name" className={fieldClassName} />
        </div>
        <div>
          <label htmlFor="advertise-business" className={labelClassName}>
            {zh ? '商家名稱' : 'Business name'}
          </label>
          <input
            id="advertise-business"
            name="businessName"
            required
            autoComplete="organization"
            className={fieldClassName}
          />
        </div>
      </div>

      <div>
        <label htmlFor="advertise-contact" className={labelClassName}>
          {zh ? 'Email、電話或微信號' : 'Email, phone or WeChat ID'}
        </label>
        <input id="advertise-contact" name="contact" required className={fieldClassName} />
      </div>

      <div>
        <label htmlFor="advertise-plan" className={labelClassName}>
          {zh ? '有興趣的方案' : 'Plan you are interested in'}
        </label>
        <select
          id="advertise-plan"
          name="planId"
          defaultValue={isAdvertisePlanId(initialPlanId) ? initialPlanId : ''}
          className={fieldClassName}
        >
          <option value="">{zh ? '尚未決定' : 'Not sure yet'}</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {zh ? plan.name.zh : plan.name.en}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="advertise-message" className={labelClassName}>
          {zh ? '其他想說的（選填）' : 'Anything else? (optional)'}
        </label>
        <textarea id="advertise-message" name="message" rows={4} className={fieldClassName} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-[#7b685b]">
          {zh
            ? '按下後會開啟你的郵件程式，並自動填好內容。'
            : 'This opens your email app with your message filled in.'}
        </p>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {zh ? '用 Email 送出詢問' : 'Send inquiry by email'}
        </button>
      </div>

      <div aria-live="polite">
        {error ? <p className="text-sm font-medium text-brand-700">{error}</p> : null}
        {mailtoHref ? (
          <p className="text-sm leading-6 text-[#5f4f45]">
            {zh ? '你的郵件程式應該已開啟，內容已填好，按下傳送即可。沒有開啟嗎？' : 'Your email app should open with the message ready to send. Nothing opened? '}
            <a href={mailtoHref} className="font-semibold text-brand-700 underline underline-offset-4">
              {zh ? '再試一次' : 'Try again'}
            </a>
            {zh ? '，或直接寄信至 ' : ', or email '}
            <a
              href={`mailto:${site.publisher.contactEmail}`}
              className="font-semibold text-brand-700 underline underline-offset-4"
            >
              {site.publisher.contactEmail}
            </a>
            {zh ? '。' : '.'}
          </p>
        ) : null}
      </div>
    </form>
  );
}
