'use client';

import type { User } from '@supabase/supabase-js';
import { Heart, Menu, Plus, UserRound, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { useAuth } from '@/components/auth/AuthProvider';
import { canServeArizonaOnlyContent } from '@/lib/arizona-only-routes';
import { buildAuthPath, buildJoinPath } from '@/lib/auth';
import { getNewsPath } from '@/lib/arizona-news';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { localeLangAttribute } from '@/lib/i18n';
import { isShopPublicLaunchEnabled } from '@/lib/shop-launch';
import { appendSearch, localeFromPath, withLocale } from '@/lib/routing';
import { defaultSiteProfile, hasLiveNewsData, type SiteProfile } from '@/lib/site-config';

function accountHandle(user: User): string {
  const username =
    typeof user.user_metadata?.username === 'string' ? user.user_metadata.username.trim() : '';
  if (username) {
    return username;
  }

  const email = user.email?.trim();
  if (email) {
    const [localPart] = email.split('@');
    if (localPart) {
      return localPart;
    }
  }

  const fullName =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name.trim()
      : typeof user.user_metadata?.name === 'string'
        ? user.user_metadata.name.trim()
        : '';

  if (fullName) {
    return fullName;
  }

  return 'Account';
}

function accountInitial(label: string): string {
  return label.charAt(0).toUpperCase() || 'A';
}

function oppositeCopy(locale: string, en: string, zh: string) {
  return locale === 'zh' ? en : zh;
}

type NavItem = {
  path: string;
  label: string;
  subLabel?: string;
  hash?: string;
};

function ChineseArizonaLogoMark() {
  return (
    <span
      aria-hidden="true"
      className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[12px] shadow-[0_16px_32px_-18px_rgba(199,25,41,0.9)]"
    >
      <Image
        src="/brand/chinesearizona-logo.png"
        alt=""
        width={40}
        height={40}
        className="h-full w-full object-cover"
        priority
      />
    </span>
  );
}

export default function Navbar({ site = defaultSiteProfile }: { site?: SiteProfile }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();
  const locale = localeFromPath(pathname);
  const currentPath = appendSearch(pathname, currentSearch);
  const { isLoading, signOut, user } = useAuth();
  const shopEnabled = isShopPublicLaunchEnabled();
  const canShowArizonaOnlyLinks = canServeArizonaOnlyContent(site);
  const loginHref = buildAuthPath(locale, currentPath);
  const joinHref = buildJoinPath(locale, currentPath);
  const dashboardHref = withLocale(locale, '/dashboard');
  const editProfileHref = withLocale(locale, '/dashboard/profile');
  const myListsHref = withLocale(locale, '/shop/watchlist');
  const favoritesHref = user
    ? shopEnabled
      ? myListsHref
      : withLocale(locale, '/community')
    : loginHref;
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const mobileOpen = mobileMenuPath === currentPath;
  const signedInHandle = user ? accountHandle(user) : null;
  const signedInInitial = signedInHandle ? accountInitial(signedInHandle) : null;
  const navItems: NavItem[] = [
    {
      path: '/',
      label: locale === 'zh' ? '首頁' : 'Home',
      subLabel: oppositeCopy(locale, 'Home', '首頁'),
    },
    {
      path: '/business',
      label: locale === 'zh' ? '商家' : 'Business',
      subLabel: oppositeCopy(locale, 'Business', '商家'),
    },
    {
      path: '/community',
      label: locale === 'zh' ? '社區' : 'Community',
      subLabel: oppositeCopy(locale, 'Community', '社區'),
    },
    ...(hasLiveNewsData(site)
      ? [
          {
            path: getNewsPath(site),
            label: locale === 'zh' ? `${site.regionNameZh}新聞` : 'News',
            subLabel: oppositeCopy(locale, 'News', '新聞資訊'),
          },
        ]
      : []),
    ...(shopEnabled
      ? [
          {
            path: '/shop',
            label: locale === 'zh' ? '市集' : 'Shop',
            subLabel: oppositeCopy(locale, 'Curated finds', '好物精選'),
          },
        ]
      : []),
    ...(canShowArizonaOnlyLinks
      ? [
          {
            path: '/relocation-guide',
            label: locale === 'zh' ? '搬遷' : 'Relocation',
            subLabel: oppositeCopy(locale, 'Relocation Guide', '搬家指南'),
          },
        ]
      : []),
  ];

  async function handleSignOut() {
    const error = await signOut();

    if (error) {
      setStatus(error.message);
      return;
    }

    setMobileMenuPath(null);
    setStatus(locale === 'zh' ? '已登出' : 'Signed out');
    router.refresh();
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-[#ddd0c2] bg-[#fbf7f0]/94 backdrop-blur-xl">
      <div className="px-2 sm:px-3 xl:px-4">
        <div className="flex min-h-[76px] items-center justify-between gap-4 py-2.5">
          <Link href={withLocale(locale, '/')} className="flex flex-shrink-0 items-center gap-3">
            <ChineseArizonaLogoMark />
            <div>
              <div className="flex flex-wrap items-end gap-2 leading-none">
                <span className="text-[1.05rem] font-bold tracking-tight text-[#2b1f19] sm:text-[1.22rem]">
                  {locale === 'zh' ? (
                    <>
                      {site.brandParts.zhPrefix}<span className="text-brand-600">{site.brandParts.zhAccent}</span>
                    </>
                  ) : (
                    <>
                      {site.brandParts.enPrefix}<span className="text-brand-600">{site.brandParts.enAccent}</span>
                    </>
                  )}
                </span>
              </div>
              <span
                className="mt-1 block text-[10px] font-medium uppercase tracking-[0.24em] text-[#89766a]"
                lang={localeLangAttribute(locale)}
              >
                {locale === 'zh' ? site.guideTagline.zh : site.guideTagline.en}
              </span>
            </div>
          </Link>

          <div className="hidden items-center gap-8 xl:flex">
            {navItems.map((item) => {
              const href = item.hash
                ? `${withLocale(locale, item.path)}#${item.hash}`
                : withLocale(locale, item.path);

              return (
                <Link
                  key={`${item.path}-${item.hash ?? 'root'}`}
                  href={href}
                  className="group flex flex-col items-center gap-1 text-center"
                >
                  <span className="text-[0.95rem] font-semibold leading-none text-[#32251d] transition-colors group-hover:text-brand-600">
                    {item.label}
                  </span>
                  {item.subLabel ? (
                    <span className="text-[0.72rem] leading-none text-[#7a695d] transition-colors group-hover:text-brand-500">
                      {item.subLabel}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-3 lg:flex">
              <Suspense fallback={null}>
                <LocaleSwitcher currentLocale={locale} />
              </Suspense>

              <Link
                href={withLocale(locale, '/add-business')}
                className="inline-flex h-11 items-center gap-2 rounded-[16px] bg-brand-600 px-4 text-sm font-semibold text-white shadow-[0_20px_40px_-24px_rgba(187,61,41,0.9)] transition-colors hover:bg-brand-700"
              >
                <span className="flex flex-col items-start leading-none">
                  <span>{locale === 'zh' ? '新增商家' : 'Add Business'}</span>
                  <span className="mt-1 text-[10px] font-medium tracking-[0.08em] text-white/85">
                    {oppositeCopy(locale, 'Add Business', '新增商家')}
                  </span>
                </span>
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Link>

              <Link
                href={favoritesHref}
                aria-label={locale === 'zh' ? '收藏' : 'Favorites'}
                className="group inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d6c3af] bg-[#fbf4ea] text-[#c4312d] transition-colors hover:border-[#d6c3af] hover:text-[#c4312d]"
              >
                <Heart className="h-4.5 w-4.5 transition-colors group-hover:fill-current" aria-hidden="true" />
              </Link>
            </div>

            <div className="hidden items-center gap-3 md:flex">
              {isLoading ? (
                <div
                  aria-hidden="true"
                  className="h-11 w-11 animate-pulse rounded-full bg-[#eadfd1]"
                />
              ) : user && signedInHandle && signedInInitial ? (
                <div className="relative">
                  <Link
                    href={dashboardHref}
                    aria-label={locale === 'zh' ? '帳號選單' : 'Account menu'}
                    className="peer inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d6c2af] bg-white text-base font-semibold text-[#3a2a22] shadow-sm transition-colors hover:border-brand-300 hover:text-brand-600"
                  >
                    {signedInInitial}
                  </Link>

                  <div className="invisible pointer-events-none absolute right-0 top-full z-10 w-56 -translate-y-2 rounded-[28px] border border-[#decdbc] bg-[#fffaf3] p-4 opacity-0 shadow-[0_28px_60px_-34px_rgba(72,54,31,0.38)] transition-all peer-hover:pointer-events-auto peer-hover:visible peer-hover:translate-y-0 peer-hover:opacity-100 peer-focus:pointer-events-auto peer-focus:visible peer-focus:translate-y-0 peer-focus:opacity-100 hover:pointer-events-auto hover:visible hover:translate-y-0 hover:opacity-100 focus-within:pointer-events-auto focus-within:visible focus-within:translate-y-0 focus-within:opacity-100">
                    <div>
                      <p className="truncate text-lg font-semibold tracking-tight text-[#2c2019]">
                        {signedInHandle}
                      </p>
                      <Link
                        href={editProfileHref}
                        className="mt-1 inline-block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c796e] transition-colors hover:text-brand-600"
                      >
                        {locale === 'zh' ? '編輯個人資料' : 'Edit Profile'}
                      </Link>
                    </div>

                    <div className="mt-4 grid gap-2 border-t border-[#eadfd0] pt-4">
                      <Link
                        href={dashboardHref}
                        className="rounded-2xl px-3 py-2 text-sm font-semibold text-[#2c2019] transition-colors hover:bg-[#f4ede3] hover:text-brand-600"
                      >
                        {locale === 'zh' ? '個人檔案' : 'Profile'}
                      </Link>
                      {shopEnabled ? (
                        <Link
                          href={myListsHref}
                          className="rounded-2xl px-3 py-2 text-sm font-semibold text-[#2c2019] transition-colors hover:bg-[#f4ede3] hover:text-brand-600"
                        >
                          {locale === 'zh' ? '我的清單' : 'My Lists'}
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="rounded-2xl px-3 py-2 text-left text-sm font-semibold text-[#2c2019] transition-colors hover:bg-[#f4ede3] hover:text-brand-600"
                      >
                        {locale === 'zh' ? '登出' : 'Sign Out'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Link
                    href={loginHref}
                    aria-label={locale === 'zh' ? '登入' : 'Log In'}
                    className="peer inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d6c2af] bg-white text-[#3a2a22] shadow-sm transition-colors hover:border-brand-300 hover:text-brand-600"
                  >
                    <UserRound className="h-5 w-5" aria-hidden="true" />
                  </Link>

                  <div className="invisible pointer-events-none absolute right-0 top-full z-10 w-44 -translate-y-2 rounded-[24px] border border-[#decdbc] bg-[#fffaf3] p-2 opacity-0 shadow-[0_28px_60px_-34px_rgba(72,54,31,0.38)] transition-all peer-hover:pointer-events-auto peer-hover:visible peer-hover:translate-y-0 peer-hover:opacity-100 peer-focus:pointer-events-auto peer-focus:visible peer-focus:translate-y-0 peer-focus:opacity-100 hover:pointer-events-auto hover:visible hover:translate-y-0 hover:opacity-100 focus-within:pointer-events-auto focus-within:visible focus-within:translate-y-0 focus-within:opacity-100">
                    <Link
                      href={loginHref}
                      className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[#362821] transition-colors hover:bg-[#f5ede3] hover:text-brand-600"
                    >
                      {locale === 'zh' ? '登入' : 'Log In'}
                    </Link>
                    <Link
                      href={joinHref}
                      className="mt-1 block rounded-2xl px-4 py-3 text-sm font-semibold text-[#362821] transition-colors hover:bg-[#f5ede3] hover:text-brand-600"
                    >
                      {locale === 'zh' ? '加入' : 'Join'}
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setMobileMenuPath((value) => (value === currentPath ? null : currentPath))
              }
              aria-expanded={mobileOpen}
              aria-label={
                mobileOpen
                  ? locale === 'zh'
                    ? '關閉選單'
                    : 'Close menu'
                  : locale === 'zh'
                    ? '開啟選單'
                    : 'Open menu'
              }
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d6c2af] bg-[#fbf4ea] text-[#3d2b22] transition-colors hover:border-brand-300 hover:text-brand-600 xl:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {status ? <p className="pb-3 text-right text-xs font-medium text-[#7c6a5d]">{status}</p> : null}

        {mobileOpen ? (
          <div className="border-t border-[#e4d5c6] py-4 xl:hidden">
            <div className="space-y-4">
              <div className="grid gap-2">
                {navItems.map((item) => {
                  const href = item.hash
                    ? `${withLocale(locale, item.path)}#${item.hash}`
                    : withLocale(locale, item.path);

                  return (
                    <Link
                      key={`mobile-${item.path}-${item.hash ?? 'root'}`}
                      href={href}
                      className="rounded-[24px] border border-[#e1d2c1] bg-[#fffaf3] px-4 py-3 transition-colors hover:border-brand-200 hover:bg-white"
                    >
                      <span className="block text-sm font-semibold text-[#2e211a]">{item.label}</span>
                      {item.subLabel ? (
                        <span className="mt-1 block text-xs text-[#7a695d]">{item.subLabel}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>

              <div className="rounded-[24px] border border-[#e1d2c1] bg-[#fffaf3] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c796e]">
                    {locale === 'zh' ? '語言' : 'Language'}
                  </span>
                  <Suspense fallback={null}>
                    <LocaleSwitcher currentLocale={locale} />
                  </Suspense>
                </div>
              </div>

              <div className="grid gap-2">
                <Link
                  href={withLocale(locale, '/add-business')}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[24px] bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  {locale === 'zh' ? '新增商家' : 'Add Business'}
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </Link>

                <Link
                  href={favoritesHref}
                  className="group inline-flex h-11 items-center justify-center gap-2 rounded-[24px] border border-[#d6c2af] bg-white px-4 text-sm font-semibold text-[#c4312d] transition-colors hover:border-[#d6c2af] hover:text-[#c4312d]"
                >
                  <Heart className="h-4 w-4 transition-colors group-hover:fill-current" aria-hidden="true" />
                  {locale === 'zh' ? '收藏' : 'Favorites'}
                </Link>

                {isLoading ? (
                  <div
                    aria-hidden="true"
                    className="h-24 animate-pulse rounded-[24px] border border-[#e1d2c1] bg-[#efe3d3]"
                  />
                ) : user && signedInHandle && signedInInitial ? (
                  <>
                    <div className="rounded-[24px] border border-[#e1d2c1] bg-white p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dcc8b3] bg-[#fbf3e8] text-base font-semibold text-[#3a2a22]">
                          {signedInInitial}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold tracking-tight text-[#2e211a]">
                            {signedInHandle}
                          </p>
                          <Link
                            href={editProfileHref}
                            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c796e]"
                          >
                            {locale === 'zh' ? '編輯個人資料' : 'Edit Profile'}
                          </Link>
                        </div>
                      </div>
                    </div>
                    <Link
                      href={dashboardHref}
                      className="inline-flex items-center justify-center rounded-[24px] border border-[#d6c2af] bg-white px-4 py-3 text-sm font-semibold text-[#3a2a22] transition-colors hover:border-brand-300 hover:text-brand-600"
                    >
                      {locale === 'zh' ? '個人檔案' : 'Profile'}
                    </Link>
                    {shopEnabled ? (
                      <Link
                        href={myListsHref}
                        className="inline-flex items-center justify-center rounded-[24px] border border-[#d6c2af] bg-white px-4 py-3 text-sm font-semibold text-[#3a2a22] transition-colors hover:border-brand-300 hover:text-brand-600"
                      >
                        {locale === 'zh' ? '我的清單' : 'My Lists'}
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="inline-flex items-center justify-center rounded-[24px] border border-[#d6c2af] bg-white px-4 py-3 text-sm font-semibold text-[#3a2a22] transition-colors hover:border-brand-300 hover:text-brand-600"
                    >
                      {locale === 'zh' ? '登出' : 'Sign Out'}
                    </button>
                  </>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Link
                      href={loginHref}
                      className="inline-flex items-center justify-center rounded-[24px] border border-[#d6c2af] bg-white px-4 py-3 text-sm font-semibold text-[#3a2a22] transition-colors hover:border-brand-300 hover:text-brand-600"
                    >
                      {locale === 'zh' ? '登入' : 'Log In'}
                    </Link>
                    <Link
                      href={joinHref}
                      className="inline-flex items-center justify-center rounded-[24px] bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                    >
                      {locale === 'zh' ? '加入' : 'Join'}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
