import Link from 'next/link';

import { getCurrentSiteProfile } from '@/lib/site-config.server';

// Shown for any URL that does not exist. It renders inside the root layout,
// so visitors keep the normal header and footer. Copy is bilingual because
// the request path's locale is not available here.
export default async function NotFound() {
  const site = await getCurrentSiteProfile();
  const links = [
    { href: '/business', en: 'Browse businesses', zh: '瀏覽商家' },
    { href: site.news.routePath, en: 'Latest news', zh: '最新新聞' },
    { href: '/', en: 'Home', zh: '首頁' },
  ];

  return (
    <main className="flex flex-1 items-center bg-[#f7f1e8] px-4 py-16 text-[#2c2722] sm:px-6">
      <div className="mx-auto w-full max-w-xl text-center">
        <p className="text-sm font-semibold tracking-[0.2em] text-[#bd2730]">404</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-lg text-[#5f554c]">找不到這個頁面</p>
        <p className="mt-4 text-base leading-7 text-[#6d6258]">
          The link may be old or the page may have moved. Try a search, or pick a place to start.
          <br />
          連結可能已過期或頁面已移動。請試試搜尋，或從下面開始瀏覽。
        </p>

        <form action="/business" method="get" role="search" className="mt-8 flex gap-2">
          <label htmlFor="not-found-search" className="sr-only">
            Search {site.brandName}
          </label>
          <input
            id="not-found-search"
            name="q"
            type="search"
            placeholder="Search businesses / 搜尋商家"
            className="h-12 min-w-0 flex-1 rounded-md border border-[#ddd1c4] bg-white px-4 text-base outline-none focus:border-[#bd2730]"
          />
          <button
            type="submit"
            className="h-12 rounded-md bg-[#bd2730] px-5 text-sm font-semibold text-white transition hover:bg-[#a91f27]"
          >
            Search 搜尋
          </button>
        </form>

        <nav aria-label="Helpful links" className="mt-6 flex flex-wrap justify-center gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex h-10 items-center rounded-md border border-[#ddd1c4] bg-white/70 px-4 text-sm font-semibold text-[#2c2722] transition hover:border-[#bd2730] hover:text-[#bd2730]"
            >
              {link.en} · {link.zh}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
