'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import {
  isNewsletterResultCode,
  NEWSLETTER_HONEYPOT_FIELD,
  newsletterConsentCopy,
  newsletterResultCopy,
  type NewsletterResultCode,
} from '@/lib/newsletter-fields';
import type { Locale } from '@/lib/types';

type NewsletterSignupFormProps = {
  locale: Locale;
  brandName: string;
  privacyHref: string;
};

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'done'; code: NewsletterResultCode }
  | { kind: 'failed'; code: NewsletterResultCode };

function BilingualLine({ locale, copy }: { locale: Locale; copy: { en: string; zh: string } }) {
  const [primary, secondary] = locale === 'zh' ? [copy.zh, copy.en] : [copy.en, copy.zh];
  return (
    <>
      <span>{primary}</span> <span className="opacity-75">{secondary}</span>
    </>
  );
}

export function NewsletterSignupForm({ locale, brandName, privacyHref }: NewsletterSignupFormProps) {
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });
  const zh = locale === 'zh';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form).entries());
    const email = typeof fields.email === 'string' ? fields.email.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setState({ kind: 'failed', code: 'invalid_email' });
      return;
    }

    setState({ kind: 'sending' });

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-locale': locale },
        body: JSON.stringify({ ...fields, sourcePath: window.location.pathname }),
      });
      const data = (await response.json().catch(() => ({}))) as { code?: unknown };
      const code = isNewsletterResultCode(data.code) ? data.code : 'error';

      if (!response.ok || code !== 'subscribed') {
        setState({ kind: 'failed', code: code === 'subscribed' ? 'error' : code });
        return;
      }

      form.reset();
      setState({ kind: 'done', code });
    } catch {
      setState({ kind: 'failed', code: 'error' });
    }
  }

  if (state.kind === 'done') {
    return (
      <p
        role="status"
        className="w-full max-w-[400px] rounded-[10px] border border-[#cfe0cb] bg-[#eef5ec] px-3 py-2.5 text-[12px] font-semibold leading-[1.35] text-[#3f6a3a]"
      >
        <BilingualLine locale={locale} copy={newsletterResultCopy[state.code]} />
      </p>
    );
  }

  const sending = state.kind === 'sending';

  return (
    <div className="w-full max-w-[400px] min-w-0 lg:min-w-[320px]">
      <form
        className="relative flex w-full min-w-0 shrink-0 flex-col gap-2 sm:flex-row"
        onSubmit={handleSubmit}
        noValidate
      >
        <label className="sr-only" htmlFor="footer-newsletter-email">
          {zh ? '電子郵件' : 'Email'}
        </label>
        <div className="min-w-0 flex-1">
          <input
            id="footer-newsletter-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            aria-invalid={state.kind === 'failed' && state.code === 'invalid_email' ? true : undefined}
            aria-describedby={state.kind === 'failed' ? 'footer-newsletter-message' : undefined}
            placeholder={zh ? '輸入你的信箱' : 'Enter your email'}
            className="h-10 min-w-0 w-full rounded-[10px] border border-[#dccbbc] bg-white px-3 text-[13px] text-[#352720] outline-none placeholder:text-[#9a897e] focus:border-brand-300"
          />
        </div>
        {/* Hidden from people; bots that fill every field give themselves away. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="footer-newsletter-website">Website</label>
          <input id="footer-newsletter-website" name={NEWSLETTER_HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-[10px] bg-brand-600 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-wait disabled:opacity-70"
        >
          {sending ? (zh ? '送出中…' : 'Sending…') : zh ? '訂閱' : 'Subscribe'}
        </button>
      </form>
      {state.kind === 'failed' ? (
        <p id="footer-newsletter-message" role="alert" className="mt-1.5 text-[11px] font-semibold leading-[1.3] text-brand-700">
          <BilingualLine locale={locale} copy={newsletterResultCopy[state.code]} />
        </p>
      ) : null}
      <p className="mt-1 text-[10px] leading-[1.3] text-[#7b685b]">
        {zh ? newsletterConsentCopy(brandName).zh : newsletterConsentCopy(brandName).en}{' '}
        <Link href={privacyHref} className="underline underline-offset-2 hover:text-brand-600">
          {zh ? '隱私權政策' : 'Privacy'}
        </Link>
      </p>
    </div>
  );
}
