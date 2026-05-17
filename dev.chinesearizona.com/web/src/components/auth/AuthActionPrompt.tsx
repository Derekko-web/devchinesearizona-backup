'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { buildAuthPath } from '@/lib/auth';
import { appendSearch } from '@/lib/routing';
import type { Locale } from '@/lib/types';

type AuthActionPromptProps = {
  locale: Locale;
  title: string;
  description: string;
  ctaLabel: string;
  variant?: 'card' | 'compact';
};

export function useAuthActionHref(locale: Locale): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return buildAuthPath(locale, appendSearch(pathname, searchParams.toString()));
}

export function AuthActionPrompt({
  locale,
  title,
  description,
  ctaLabel,
  variant = 'card',
}: AuthActionPromptProps) {
  const authHref = useAuthActionHref(locale);

  if (variant === 'compact') {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
        <Link
          href={authHref}
          className="mt-3 inline-flex items-center justify-center rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
        >
          {ctaLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
        {locale === 'zh' ? '需要帳號' : 'Account required'}
      </p>
      <h2 className="mt-3 text-xl font-bold text-slate-900">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-700">{description}</p>
      <Link
        href={authHref}
        className="mt-5 inline-flex items-center justify-center rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
