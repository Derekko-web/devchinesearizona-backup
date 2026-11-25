'use client';

import { useState, type FormEvent } from 'react';

import { INQUIRY_HONEYPOT_FIELD } from '@/lib/business-inquiry-fields';
import type { Locale } from '@/lib/types';

type BusinessInquiryFormProps = {
  businessName: string;
  businessSlug: string;
  locale: Locale;
  privacyHref: string;
};

type SubmitState = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent'; message: string } | { kind: 'error'; message: string };

const inputClassName =
  'w-full rounded-md border border-[#d7cabe] bg-white px-3 py-2.5 text-sm text-[#2c2722] placeholder:text-[#a29586] focus:border-[#bd2730] focus:outline-none focus:ring-2 focus:ring-[#bd2730]/20';

export function BusinessInquiryForm({ businessName, businessSlug, locale, privacyHref }: BusinessInquiryFormProps) {
  const [inquiryType, setInquiryType] = useState<'question' | 'quote'>('question');
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });
  const zh = locale === 'zh';
  const idPrefix = `inquiry-${businessSlug}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form).entries());
    setState({ kind: 'sending' });

    try {
      const response = await fetch('/api/directory/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-locale': locale,
        },
        body: JSON.stringify({
          ...fields,
          businessSlug,
          inquiryType,
          pagePath: window.location.pathname,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      const message = data.message ?? (zh ? '目前無法送出訊息，請稍後再試。' : 'Unable to send your message right now.');

      if (!response.ok) {
        setState({ kind: 'error', message });
        return;
      }

      form.reset();
      setState({ kind: 'sent', message });
    } catch {
      setState({
        kind: 'error',
        message: zh ? '網路連線失敗，請稍後再試。' : 'Network error. Please try again.',
      });
    }
  }

  const typeOptions = [
    { value: 'question' as const, label: zh ? '提問' : 'Ask a question' },
    { value: 'quote' as const, label: zh ? '索取報價' : 'Request a quote' },
  ];

  return (
    <form onSubmit={handleSubmit} className="relative space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-[#2c2722]">
          {zh ? '詢價' : 'Ask a question / Request a quote'}
          <span className="ml-2 text-sm font-medium text-[#9a8d80]">
            {zh ? 'Ask a question / Request a quote' : '詢價'}
          </span>
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#6d6258]">
          {zh ? `免費。我們會把你的訊息轉給 ${businessName}。` : `Free. We pass your message to ${businessName}.`}
        </p>
      </div>

      <div role="radiogroup" aria-label={zh ? '詢問類型' : 'Request type'} className="grid grid-cols-2 gap-2">
        {typeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={inquiryType === option.value}
            onClick={() => setInquiryType(option.value)}
            className={`h-10 rounded-md border text-sm font-semibold transition ${
              inquiryType === option.value
                ? 'border-[#bd2730] bg-[#bd2730] text-white'
                : 'border-[#d7cabe] bg-white text-[#3d342e] hover:border-[#bd2730] hover:text-[#bd2730]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-name`} className="mb-1 block text-xs font-semibold text-[#5f554c]">
            {zh ? '姓名' : 'Name'}
          </label>
          <input id={`${idPrefix}-name`} name="name" required maxLength={120} autoComplete="name" className={inputClassName} />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-phone`} className="mb-1 block text-xs font-semibold text-[#5f554c]">
            {zh ? '電話（選填）' : 'Phone (optional)'}
          </label>
          <input
            id={`${idPrefix}-phone`}
            name="phone"
            type="tel"
            maxLength={40}
            autoComplete="tel"
            className={inputClassName}
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-email`} className="mb-1 block text-xs font-semibold text-[#5f554c]">
          Email
        </label>
        <input
          id={`${idPrefix}-email`}
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-message`} className="mb-1 block text-xs font-semibold text-[#5f554c]">
          {zh ? '訊息' : 'Message'}
        </label>
        <textarea
          id={`${idPrefix}-message`}
          name="message"
          required
          maxLength={2000}
          rows={4}
          placeholder={
            inquiryType === 'quote'
              ? zh
                ? '需要什麼服務？時間、地點、預算？'
                : 'What do you need? When, where, and your budget?'
              : zh
                ? '想問什麼？'
                : 'What would you like to know?'
          }
          className={inputClassName}
        />
      </div>

      {/* Honeypot: hidden from people and screen readers, filled only by bots. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor={`${idPrefix}-${INQUIRY_HONEYPOT_FIELD}`}>Company website</label>
        <input
          id={`${idPrefix}-${INQUIRY_HONEYPOT_FIELD}`}
          name={INQUIRY_HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <p className="text-xs leading-5 text-[#766b61]">
        {zh ? (
          <>
            送出即表示你同意我們把你的姓名、聯絡方式和訊息提供給這家商家，讓對方回覆你。我們不會販售你的資料。
            <a href={privacyHref} className="ml-1 underline hover:text-[#bd2730]">
              隱私權政策
            </a>
          </>
        ) : (
          <>
            By sending, you agree that we share your name, contact details, and message with this business so it can
            reply. We never sell your information.
            <a href={privacyHref} className="ml-1 underline hover:text-[#bd2730]">
              Privacy policy
            </a>
          </>
        )}
      </p>

      <button
        type="submit"
        disabled={state.kind === 'sending'}
        className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#bd2730] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(189,39,48,0.2)] transition hover:bg-[#a91f27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd2730]/35 disabled:cursor-wait disabled:opacity-70"
      >
        {state.kind === 'sending' ? (zh ? '送出中…' : 'Sending…') : zh ? '送出' : 'Send'}
      </button>

      <p
        aria-live="polite"
        className={`min-h-5 text-sm font-medium ${state.kind === 'error' ? 'text-[#a91f27]' : 'text-[#4d744b]'}`}
      >
        {state.kind === 'sent' || state.kind === 'error' ? state.message : null}
      </p>
    </form>
  );
}
