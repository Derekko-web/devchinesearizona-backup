'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { appendSearch, switchLocaleInPathname } from '@/lib/routing';
import type { Locale } from '@/lib/types';

type LocaleSwitcherProps = {
  currentLocale: Locale;
};

export function LocaleSwitcher({ currentLocale }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  const currentHref = appendSearch(pathname, search);
  const englishHref = currentLocale === 'en' ? currentHref : switchLocaleInPathname(pathname, 'en', search);
  const chineseHref =
    currentLocale === 'zh' ? currentHref : switchLocaleInPathname(pathname, 'zh', search);
  const switcherLabel = currentLocale === 'zh' ? '語言切換' : 'Language switcher';

  return (
    <div
      className="inline-flex items-center rounded-full border border-[#d8c7b4] bg-[#fbf5ec] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
      role="navigation"
      aria-label={switcherLabel}
    >
      <LocaleOption
        href={englishHref}
        isActive={currentLocale === 'en'}
        shortLabel="EN"
        fullLabel={currentLocale === 'zh' ? '英文' : 'English'}
      />
      <LocaleOption
        href={chineseHref}
        isActive={currentLocale === 'zh'}
        shortLabel="中文"
        fullLabel={currentLocale === 'zh' ? '中文' : 'Chinese'}
      />
    </div>
  );
}

type LocaleOptionProps = {
  href: string;
  isActive: boolean;
  shortLabel: string;
  fullLabel: string;
};

function LocaleOption({ href, isActive, shortLabel, fullLabel }: LocaleOptionProps) {
  const className = isActive
    ? 'inline-flex min-w-10 shrink-0 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap bg-brand-600 text-white shadow-sm'
    : 'inline-flex min-w-10 shrink-0 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap text-[#5d4c41] transition-colors hover:bg-white hover:text-brand-700';

  if (isActive) {
    return (
      <span className={className} aria-label={fullLabel} aria-current="page" title={fullLabel}>
        {shortLabel}
      </span>
    );
  }

  return (
    <a
      href={href}
      className={className}
      aria-label={fullLabel}
      title={fullLabel}
    >
      {shortLabel}
    </a>
  );
}
