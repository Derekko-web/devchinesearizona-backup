'use client';

import { BadgeCheck, Heart, Languages, MapPin } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { localeFromPath, withLocale } from '@/lib/routing';
import { isShopPublicLaunchEnabled } from '@/lib/shop-launch';

function oppositeCopy(locale: string, en: string, zh: string) {
  return locale === 'zh' ? en : zh;
}

export default function Footer() {
  const pathname = usePathname();
  const locale = localeFromPath(pathname);
  const shopEnabled = isShopPublicLaunchEnabled();
  const featurePillars = [
    {
      icon: Languages,
      title: locale === 'zh' ? '雙語平台' : 'Bilingual Platform',
      subtitle: oppositeCopy(locale, 'English + Chinese guidance', '中英雙語平台'),
      tone: 'text-brand-600 bg-[#f9e8e1]',
    },
    {
      icon: Heart,
      title: locale === 'zh' ? '社區共建' : 'Community Driven',
      subtitle: oppositeCopy(locale, 'Built with local input', '社區共建'),
      tone: 'text-[#c98938] bg-[#f7eedc]',
    },
    {
      icon: BadgeCheck,
      title: locale === 'zh' ? '認證可信' : 'Verified & Trusted',
      subtitle: oppositeCopy(locale, 'Real listings with context', '認證可靠'),
      tone: 'text-[#6e8b68] bg-[#e8f0e5]',
    },
    {
      icon: MapPin,
      title: locale === 'zh' ? '本地優先' : 'Local First',
      subtitle: oppositeCopy(locale, 'Arizona-first coverage', '本地優先'),
      tone: 'text-[#cf5a6d] bg-[#f9e6eb]',
    },
  ];
  const footerLinks = [
    { href: '/', label: locale === 'zh' ? '首頁' : 'Home' },
    { href: '/business', label: locale === 'zh' ? '商家' : 'Business' },
    { href: '/community', label: locale === 'zh' ? '社區' : 'Community' },
    { href: '/hidden-arizona', label: locale === 'zh' ? '亞利桑那秘境' : 'Hidden Arizona' },
    ...(shopEnabled ? [{ href: '/shop', label: locale === 'zh' ? '市集' : 'Shop' }] : []),
  ];

  return (
    <footer className="w-full border-t border-[#dccab6] bg-[#faf6f0] text-[#4a382d]">
      <div className="px-3 py-2.5 sm:px-4 lg:py-2 xl:px-5">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-3 lg:grid lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(400px,1.42fr)] lg:items-center lg:gap-x-5">
          {featurePillars.map((pillar, index) => {
            const Icon = pillar.icon;

            return (
              <div
                key={pillar.title}
                className={`flex min-w-0 items-center gap-2.5 px-1 py-0.5 ${index < featurePillars.length - 1 ? 'xl:border-r xl:border-[#e5d8ca]' : ''}`}
              >
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${pillar.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold leading-none text-[#2f241d]">{pillar.title}</p>
                  <p className="mt-1 text-[10px] leading-[1.15] text-[#7b685b]">{pillar.subtitle}</p>
                </div>
              </div>
            );
          })}

          <div className="lg:border-l lg:border-[#e5d8ca] lg:pl-4">
            <div className="grid gap-1.5">
              <div className="min-w-0">
                <h4 className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold tracking-tight text-[#2d211b]">
                  <span>{locale === 'zh' ? '訂閱社區資訊' : 'Stay Connected'}</span>
                  <span className="text-[10px] font-medium text-[#8b7768]">
                    {locale === 'zh' ? 'Stay Connected' : '订阅社区资讯'}
                  </span>
                </h4>
                <p className="mt-1 text-[10px] leading-[1.25] text-[#6f5b50]">
                  {locale === 'zh'
                    ? '接收最新新聞、活動與商家更新。'
                    : 'Get the latest news, events, and business updates.'}
                </p>
              </div>

              <form
                className="flex w-full max-w-[400px] min-w-0 shrink-0 flex-col gap-2 sm:flex-row lg:w-auto lg:min-w-[320px] lg:max-w-[400px]"
                action="#"
              >
                <label className="sr-only" htmlFor="footer-newsletter-email">
                  {locale === 'zh' ? '電子郵件' : 'Email'}
                </label>
                <div className="min-w-0 flex-1">
                  <input
                    id="footer-newsletter-email"
                    type="email"
                    placeholder={locale === 'zh' ? '輸入你的信箱' : 'Enter your email'}
                    className="h-10 min-w-0 w-full rounded-[10px] border border-[#dccbbc] bg-white px-3 text-[13px] text-[#352720] outline-none placeholder:text-[#9a897e] focus:border-brand-300"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-[10px] bg-brand-600 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  {locale === 'zh' ? '訂閱' : 'Subscribe'}
                </button>
              </form>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-2 flex max-w-[1480px] flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-[#e5d8ca] pt-2 text-[11px] font-semibold text-[#745f52]">
          {footerLinks.map((item) => (
            <Link
              key={item.href}
              href={withLocale(locale, item.href)}
              className="transition-colors hover:text-brand-600"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
