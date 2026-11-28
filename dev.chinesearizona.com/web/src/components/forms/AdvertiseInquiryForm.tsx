'use client';

import { Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { buildAdvertiseInquiryMailto, getAdvertisePlans, isAdvertisePlanId } from '@/lib/advertise';
import { INQUIRY_HONEYPOT_FIELD } from '@/lib/business-inquiry-fields';
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

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; message: string }
  | { kind: 'error'; message: string };

function readInput(form: HTMLFormElement) {
  const data = new FormData(form);
  return {
    name: String(data.get('name') ?? ''),
    businessName: String(data.get('businessName') ?? ''),
    contact: String(data.get('contact') ?? ''),
    planId: String(data.get('planId') ?? ''),
    message: String(data.get('message') ?? ''),
    honeypot: String(data.get(INQUIRY_HONEYPOT_FIELD) ?? ''),
  };
}

// Sends the inquiry to our server, which saves it and tells the team (#474).
// Opening the visitor's email app is only a second option now: the site's
// hello@ mailbox could not receive mail, and many phones have no mail app.
export function AdvertiseInquiryForm({ locale, site, initialPlanId }: AdvertiseInquiryFormProps) {
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });
  const plans = getAdvertisePlans(site);
  const zh = locale === 'zh';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = readInput(form);

    if (!input.name.trim() || !input.businessName.trim() || !input.contact.trim()) {
      setState({
        kind: 'error',
        message: zh ? '請填寫姓名、商家名稱與聯絡方式。' : 'Please fill in your name, business name and how to reach you.',
      });
      return;
    }

    setState({ kind: 'sending' });
    try {
      const response = await fetch('/api/advertise/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-locale': locale },
        body: JSON.stringify({
          name: input.name,
          businessName: input.businessName,
          contact: input.contact,
          planId: input.planId,
          message: input.message,
          pagePath: window.location.pathname,
          [INQUIRY_HONEYPOT_FIELD]: input.honeypot,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        setState({
          kind: 'error',
          message: data.message ?? (zh ? '目前無法送出訊息，請稍後再試。' : 'Unable to send your message right now. Please try again.'),
        });
        return;
      }

      form.reset();
      setState({
        kind: 'sent',
        message:
          data.message ??
          (zh
            ? '謝謝！我們已收到你的訊息，會在一個工作天內回覆你。'
            : 'Thank you! We have your message and will reply within one business day.'),
      });
    } catch {
      setState({
        kind: 'error',
        message: zh ? '目前無法送出訊息，請檢查網路後再試。' : 'Unable to send your message. Check your connection and try again.',
      });
    }
  }

  // Second option: the same message, ready to send from the visitor's own email app.
  function openEmailApp(event: React.MouseEvent<HTMLAnchorElement>) {
    const form = event.currentTarget.closest('form');
    if (!form) {
      return;
    }

    const input = readInput(form);
    event.currentTarget.href = buildAdvertiseInquiryMailto(input, locale, site);
  }

  return (
    <form
      id="advertise-inquiry"
      onSubmit={handleSubmit}
      className="relative grid gap-4 rounded-[8px] border border-[#e4d6c7] bg-white p-5 shadow-sm sm:p-6"
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

      {/* Honeypot: hidden from people and screen readers, filled only by bots. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor={`advertise-${INQUIRY_HONEYPOT_FIELD}`}>Company website</label>
        <input
          id={`advertise-${INQUIRY_HONEYPOT_FIELD}`}
          name={INQUIRY_HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-[#7b685b]">
          {zh ? '我們會在一個工作天內回覆你。' : 'We reply within one business day.'}
        </p>
        <button
          type="submit"
          disabled={state.kind === 'sending'}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {state.kind === 'sending' ? (zh ? '送出中…' : 'Sending…') : zh ? '送出詢問' : 'Send inquiry'}
        </button>
      </div>

      <div aria-live="polite">
        {state.kind === 'sent' ? (
          <p
            role="status"
            data-testid="advertise-inquiry-sent"
            className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-800"
          >
            {state.message}
          </p>
        ) : null}
        {state.kind === 'error' ? (
          <p className="rounded-[8px] border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium leading-6 text-brand-800">
            {state.message}
          </p>
        ) : null}
      </div>

      <p className="text-xs leading-5 text-[#7b685b]">
        {zh ? '想用自己的 Email 寄出？' : 'Prefer your own email app? '}
        <a
          href={`mailto:${site.publisher.contactEmail}`}
          onClick={openEmailApp}
          className="font-semibold text-brand-700 underline underline-offset-4"
        >
          {zh ? '用郵件程式開啟這則訊息' : 'Open this message in your email app'}
        </a>
        {zh ? '。' : '.'}
      </p>
    </form>
  );
}
