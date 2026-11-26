import { CheckCircle2, Search, ShieldCheck, Store, UserRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { BusinessClaimForm } from '@/components/forms/BusinessClaimForm';
import { advertisePath } from '@/lib/advertise';
import { getDirectoryBusinesses } from '@/lib/directory';
import { t } from '@/lib/i18n';
import { withLocale } from '@/lib/routing';
import { defaultSiteProfile, hasLiveDirectoryData, type SiteProfile } from '@/lib/site-config';
import type { Locale } from '@/lib/types';

export async function AddBusinessPageView({
  locale,
  searchParams,
  site = defaultSiteProfile,
}: {
  locale: Locale;
  searchParams?: {
    businessName?: string;
    businessSlug?: string;
  };
  site?: SiteProfile;
}) {
  const businesses = hasLiveDirectoryData(site) ? await getDirectoryBusinesses({}, { limit: 200, site }) : [];
  const trustFacts = [
    {
      icon: ShieldCheck,
      title: locale === 'zh' ? '人工審核' : 'Manual review',
      description:
        locale === 'zh'
          ? '認領與新增申請都會由團隊確認。'
          : 'Every claim and new listing is checked before it goes live.',
    },
    {
      icon: Search,
      title: locale === 'zh' ? '先查重複' : 'Duplicate check',
      description:
        locale === 'zh'
          ? '先搜尋既有商家，避免目錄重複。'
          : 'Search existing coverage before creating a second profile.',
    },
    {
      icon: UserRound,
      title: locale === 'zh' ? '綁定主理人' : 'Owner access',
      description:
        locale === 'zh'
          ? '核准後可進入後台維護商家資料。'
          : 'Approved owners can maintain the listing from the dashboard.',
    },
  ];
  const workflowSteps = [
    {
      label: '01',
      title: locale === 'zh' ? '登入商家主理人帳號' : 'Log in with an owner account',
      description:
        locale === 'zh'
          ? '先用商家主理人帳號登入，再找是否已有商家頁面。'
          : 'Use an owner account first, then search for existing listing coverage.',
    },
    {
      label: '02',
      title: locale === 'zh' ? '認領既有商家' : 'Claim existing coverage',
      description:
        locale === 'zh'
          ? '若已有資料，可送出認領並等待人工驗證。'
          : 'If the listing exists, submit a claim and wait for manual verification.',
    },
    {
      label: '03',
      title: locale === 'zh' ? '提交新商家' : 'Submit a new business',
      description:
        locale === 'zh'
          ? '若沒有，送出新商家申請，交由人工審核。'
          : 'If it is not listed, send a new business request for manual review.',
    },
    {
      label: '04',
      title: locale === 'zh' ? '上架與後台管理' : 'Publish and manage',
      description:
        locale === 'zh'
          ? '核准後商家會上架到目錄，主理人可更新資訊、追蹤認領與管理後續內容。'
          : 'Once approved, the business goes live and the owner gets dashboard access for edits, claim tracking, and ongoing management.',
    },
  ];
  const operatingPrinciples = [
    locale === 'zh'
      ? '重視可搜尋、可維護、可驗證，而不是一次性聊天推薦。'
      : 'Built for searchable, maintainable, verifiable discovery instead of one-off chat recommendations.',
    locale === 'zh'
      ? '主推雙語可信商家，特別照顧新居民。'
      : 'Prioritizes bilingual, trustworthy providers with strong newcomer fit.',
    locale === 'zh'
      ? '自助贊助只提升目錄列表排序，不會改變商家的驗證或編輯狀態。'
      : 'Self-serve sponsorship only affects directory browse ranking and does not change verification or editorial status.',
  ];
  const isDefaultSite = site.key === defaultSiteProfile.key;
  const directoryLabel = isDefaultSite
    ? locale === 'zh'
      ? '華人商家目錄'
      : 'ChineseArizona business directory'
    : locale === 'zh'
      ? `${site.brandName} 商家目錄`
      : `${site.brandName} business directory`;
  const heroLead = isDefaultSite
    ? locale === 'zh'
      ? '讓可信的亞利桑那華人商家被找到、被維護、被驗證。'
      : 'Help trusted Arizona Chinese businesses get found, maintained, and verified.'
    : locale === 'zh'
      ? `讓可信的${site.regionNameZh}華人商家被找到、被維護、被驗證。`
      : `Help trusted ${site.regionName} Chinese businesses get found, maintained, and verified.`;
  const heroImageSrc = isDefaultSite
    ? '/directory-ai-replacements/lee-lee-oriental-supermarket-chandler.webp'
    : site.home.heroImageUrl;
  const heroImageAlt = isDefaultSite
    ? locale === 'zh'
      ? '亞利桑那華人商家店面'
      : 'Arizona Chinese business storefront'
    : t(site.home.heroImageAlt, locale);

  return (
    <div className="flex-grow overflow-x-hidden bg-[#f7f1e8] text-[#2c2722]">
      <section className="overflow-hidden border-b border-[#ded5c9] bg-[#f7f1e8]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="grid items-stretch gap-8 lg:grid-cols-[0.96fr_1.04fr]">
            <div className="homepage-rise flex flex-col justify-center py-3">
              <Link
                href={withLocale(locale, '/business')}
                className="inline-flex w-fit items-center gap-2 rounded-md bg-[#efe7dc] px-3.5 py-2 text-xs font-semibold text-[#5b5047] transition-colors hover:bg-[#e7d9ca] hover:text-[#bd2730]"
              >
                <Store className="h-4 w-4" aria-hidden="true" />
                {directoryLabel}
              </Link>

              <h1
                className="mt-5 max-w-[11ch] text-[3.5rem] font-black leading-[0.9] tracking-tight text-[#2c2019] sm:text-[4.5rem] lg:text-[5.35rem] [font-family:var(--font-display)]"
                style={{
                  WebkitTextStroke: '0.35px rgba(44, 32, 25, 0.42)',
                }}
              >
                {locale === 'zh' ? '認領或新增商家' : 'Claim or add a business'}
              </h1>

              <p className="mt-5 max-w-2xl text-lg font-semibold leading-7 text-[#bd2730]">
                {heroLead}
              </p>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#6d6258]">
                {locale === 'zh'
                  ? '先搜尋是否已有商家頁面，再送出認領或新增申請。核准後，商家會進入目錄，主理人也能進入後台管理資料與照片。'
                  : 'Search existing coverage first, then submit a claim or a new listing request. After approval, the business enters the directory and the owner can manage details and photos from the dashboard.'}
              </p>

              <div className="mt-7 hidden gap-3 sm:grid sm:grid-cols-3">
                {trustFacts.map((fact) => {
                  const Icon = fact.icon;

                  return (
                    <div key={fact.title} className="border-l border-[#ddcdbb] pl-4">
                      <Icon className="h-5 w-5 text-[#bd2730]" aria-hidden="true" />
                      <p className="mt-3 text-sm font-semibold text-[#2c2019]">{fact.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[#6d6258]">{fact.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="homepage-rise homepage-rise-delay-1 relative min-h-[330px] overflow-hidden rounded-lg border border-[#dfd4c8] bg-[#d8c7b5] shadow-[0_24px_70px_rgba(85,58,28,0.12)] sm:min-h-[420px]">
              <Image
                src={heroImageSrc}
                alt={heroImageAlt}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(42,30,22,0),rgba(42,30,22,0.26))]" />

              <div className="absolute left-5 top-5 max-w-[17rem] border-l-4 border-[#bd2730] bg-[#fbf7f0]/92 px-4 py-3 shadow-[0_16px_40px_rgba(42,30,22,0.16)] backdrop-blur">
                <p className="text-xs font-semibold tracking-[0.18em] text-[#8b8176]">
                  {locale === 'zh' ? '審核佇列' : 'REVIEW QUEUE'}
                </p>
                <p className="mt-2 text-lg font-semibold leading-tight text-[#2c2722]">
                  {locale === 'zh' ? '認領、新增、照片，一次送審。' : 'Claims, new listings, and photos in one request.'}
                </p>
              </div>

              <div className="absolute bottom-5 right-5 w-[min(22rem,calc(100%-2.5rem))] border border-[#dfd4c8] bg-[#fbf7f0] p-4 shadow-[0_16px_40px_rgba(42,30,22,0.16)]">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-[#bd2730] text-white">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#2c2722]">
                      {locale === 'zh' ? '商家資料通過審核後上架' : 'Approved profiles go live in the directory'}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#6d6258]">
                      {locale === 'zh'
                        ? '雙語搜尋、分類、城市、照片與後台管理會一起啟用。'
                        : 'Bilingual search, category, city, photos, and owner tools activate together.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="homepage-rise homepage-rise-delay-2 grid gap-3 sm:hidden">
              {trustFacts.map((fact) => {
                const Icon = fact.icon;

                return (
                  <div key={fact.title} className="border-l border-[#ddcdbb] pl-4">
                    <Icon className="h-5 w-5 text-[#bd2730]" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold text-[#2c2019]">{fact.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[#6d6258]">{fact.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#ded5c9] bg-[#fbf7f0]">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:grid-cols-[minmax(0,1fr)_400px]">
            <BusinessClaimForm
              locale={locale}
              businesses={businesses}
              initialBusinessName={searchParams?.businessName}
              initialBusinessSlug={searchParams?.businessSlug}
            />

            <aside className="homepage-rise homepage-rise-delay-2 lg:sticky lg:top-24 lg:self-start">
              <div className="border-y border-[#d9cbbd] bg-[#f7f1e8]">
                <div className="border-b border-[#ded2c5] p-5">
                  <p className="text-xs font-semibold tracking-[0.16em] text-[#8b8176]">
                    {locale === 'zh' ? '上架流程' : 'LISTING WORKFLOW'}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-[#2c2722] [font-family:var(--font-display)]">
                    {locale === 'zh' ? '從提交到上架的節奏' : 'From request to live profile'}
                  </h2>
                </div>

                <ol className="divide-y divide-[#ded2c5]">
                  {workflowSteps.map((step) => (
                    <li key={step.label} className="grid grid-cols-[3.25rem_1fr] gap-4 p-5">
                      <span className="text-sm font-black text-[#bd2730] [font-variant-numeric:tabular-nums]">
                        {step.label}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-[#3d342e]">{step.title}</span>
                        <span className="mt-1 block text-sm leading-6 text-[#6d6258]">{step.description}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-5 border-l-4 border-[#bd2730] bg-[#f7f1e8]">
                <div className="p-5">
                  <h2 className="text-xl font-semibold leading-tight text-[#2c2722] [font-family:var(--font-display)]">
                    {locale === 'zh' ? '平台營運原則' : 'Platform operating principles'}
                  </h2>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-[#6d6258]">
                    {operatingPrinciples.map((principle) => (
                      <li key={principle} className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#bd2730]" aria-hidden="true" />
                        <span>{principle}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div id="advertise-plans" className="mt-5 border border-[#ded2c5] bg-[#fbf7f0] p-5">
                <h2 className="text-xl font-semibold leading-tight text-[#2c2722] [font-family:var(--font-display)]">
                  {locale === 'zh' ? '想讓更多顧客找到你？' : 'Want more customers to find you?'}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#6d6258]">
                  {locale === 'zh'
                    ? '認領永遠免費。可選的付費方案提供更多照片、中英雙語介紹或清楚標示的贊助版位，價格公開透明。'
                    : 'Claiming stays free. Optional paid plans add photos, an English and Chinese write-up or a clearly labeled sponsored spot, with prices published up front.'}
                </p>
                <Link
                  href={withLocale(locale, advertisePath)}
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-[#bd2730] bg-white px-4 text-sm font-semibold text-[#bd2730] transition hover:bg-[#bd2730] hover:text-white"
                >
                  {locale === 'zh' ? '查看方案與價格' : 'See plans and prices'}
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
