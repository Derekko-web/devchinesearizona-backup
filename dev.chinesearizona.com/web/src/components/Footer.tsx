'use client';

import { Compass } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { localeFromPath, withLocale } from '@/lib/routing';

export default function Footer() {
  const pathname = usePathname();
  const locale = localeFromPath(pathname);

  return (
    <footer className="mt-12 mt-auto w-full border-t border-slate-800 bg-slate-900 py-12 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="col-span-1 md:col-span-2">
            <div className="mb-4 flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-lg font-bold text-white">
                <Compass className="h-5 w-5" />
              </div>
              <span className="block text-xl font-bold tracking-tight text-white">ChineseArizona</span>
            </div>
            <p className="max-w-sm text-sm text-slate-400">
              {locale === 'zh'
                ? '結合商家、指南、活動與社群互助的現代雙語平台。'
                : 'A modern bilingual platform for trusted local businesses, newcomer resources, events, and community support.'}
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              {locale === 'zh' ? '探索' : 'Explore'}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href={withLocale(locale, '/hidden-arizona')} className="transition-colors hover:text-white">
                  {locale === 'zh' ? '亞利桑那秘境' : 'Hidden Arizona'}
                </Link>
              </li>
              <li>
                <Link href={withLocale(locale, '/directory')} className="transition-colors hover:text-white">
                  {locale === 'zh' ? '商家目錄' : 'Directory'}
                </Link>
              </li>
              <li>
                <Link href={withLocale(locale, '/community')} className="transition-colors hover:text-white">
                  {locale === 'zh' ? '活動與社群' : 'Events & Community'}
                </Link>
              </li>
              <li>
                <Link href={withLocale(locale, '/relocation-guide')} className="transition-colors hover:text-white">
                  {locale === 'zh' ? '搬遷指南' : 'Relocation Guides'}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              {locale === 'zh' ? '商家專區' : 'For Business'}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href={withLocale(locale, '/add-business')} className="transition-colors hover:text-white">
                  {locale === 'zh' ? '新增商家' : 'Add a listing'}
                </Link>
              </li>
              <li>
                <Link href={withLocale(locale, '/dashboard')} className="transition-colors hover:text-white">
                  {locale === 'zh' ? '商家後台' : 'Owner dashboard'}
                </Link>
              </li>
              <li>
                <Link href={withLocale(locale, '/admin')} className="transition-colors hover:text-white">
                  {locale === 'zh' ? '管理中心' : 'Admin center'}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between border-t border-slate-800 pt-8 text-sm md:flex-row">
          <p>
            &copy; {new Date().getFullYear()} ChineseArizona.com.{' '}
            {locale === 'zh' ? '版權所有。' : 'All rights reserved.'}
          </p>
          <div className="mt-4 flex space-x-4 md:mt-0">
            <span>{locale === 'zh' ? '雙語信任平台' : 'Bilingual trust platform'}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
