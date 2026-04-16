'use client';

import { Compass, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';

import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { localeLangAttribute } from '@/lib/i18n';
import { localeFromPath, withLocale } from '@/lib/routing';

export default function Navbar() {
  const pathname = usePathname();
  const locale = localeFromPath(pathname);
  const navItems = [
    {
      href: '/directory',
      label: locale === 'zh' ? '商家目錄' : 'Directory',
    },
    {
      href: '/hidden-arizona',
      label: locale === 'zh' ? '亞利桑那秘境' : 'Hidden Arizona',
    },
    {
      href: '/relocation-guide',
      label: locale === 'zh' ? '搬遷指南' : 'Relocation Guide',
    },
    {
      href: '/community',
      label: locale === 'zh' ? '社群中心' : 'Community',
    },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href={withLocale(locale, '/')} className="flex flex-shrink-0 items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-900 text-lg font-bold text-white">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xl font-bold leading-tight tracking-tight text-brand-900">ChineseArizona</span>
              <span
                className="relative top-[-2px] block text-[10px] font-medium uppercase leading-none tracking-wider text-slate-500"
                lang={localeLangAttribute(locale)}
              >
                {locale === 'zh' ? '亞利桑那華語指南' : 'Arizona bilingual guide'}
              </span>
            </div>
          </Link>

          <div className="hidden items-center space-x-8 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={withLocale(locale, item.href)}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-brand-500"
              >
                {item.label}
              </Link>
            ))}

            <div className="mx-2 h-6 w-px bg-slate-200" />

            <Suspense fallback={null}>
              <LocaleSwitcher currentLocale={locale} />
            </Suspense>
            <Link href={withLocale(locale, '/add-business')} className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-800">
              {locale === 'zh' ? '新增商家' : 'Add Business'} <Plus className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
