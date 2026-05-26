import { Mail, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { getPublisherPageCopy, type PublisherPageSlug } from '@/lib/publisher-pages';
import { withLocale } from '@/lib/routing';
import { getCurrentSiteProfile } from '@/lib/site-config.server';
import type { Locale } from '@/lib/types';

export async function PublisherPageView({
  locale,
  slug,
}: {
  locale: Locale;
  slug: PublisherPageSlug;
}) {
  const site = await getCurrentSiteProfile();
  const page = getPublisherPageCopy(slug, locale, site);

  return (
    <main className="min-h-screen bg-[#fbf7f0] text-[#2d211b]">
      <section className="border-b border-[#e1d2c1] bg-[#fffaf3]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-6 lg:grid-cols-[0.78fr_0.22fr] lg:px-8 lg:py-18">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              {page.eyebrow}
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-[#251a15] sm:text-5xl">
              {page.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#6f5d51] sm:text-lg">
              {page.description}
            </p>
            {page.updatedLabel ? (
              <p className="mt-5 text-sm font-medium text-[#8a7668]">{page.updatedLabel}</p>
            ) : null}
          </div>

          <div className="flex h-fit flex-col gap-3 rounded-[8px] border border-[#e3d4c4] bg-white p-5 text-sm leading-6 text-[#6b5a50]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5e6df] text-brand-600">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="font-semibold text-[#2d211b]">
              {locale === 'zh' ? '正式主網域' : 'Production domain'}
            </p>
            <p>{site.domain}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-5">
          {page.sections.map((section) => (
            <article key={section.heading} className="rounded-[8px] border border-[#e4d6c7] bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold tracking-tight text-[#2b2019]">{section.heading}</h2>
              <div className="mt-4 grid gap-4 text-base leading-8 text-[#5f4f45]">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{renderLinkedText(paragraph)}</p>
                ))}
              </div>
              {section.bullets?.length ? (
                <ul className="mt-5 grid gap-3 text-sm leading-6 text-[#6b5a50]">
                  {section.bullets.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 rounded-[8px] border border-[#e4d6c7] bg-[#fffaf3] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[#2b2019]">
              {locale === 'zh' ? '需要修正或聯絡？' : 'Need a correction or contact?'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6b5a50]">
              {locale === 'zh'
                ? '請附上頁面網址與具體問題，方便我們快速核對。'
                : 'Include the page URL and the specific issue so we can review it quickly.'}
            </p>
          </div>
          <Link
            href={slug === 'contact' ? 'mailto:hello@chinesearizona.com' : withLocale(locale, '/contact')}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {slug === 'contact'
              ? locale === 'zh'
                ? '寄送 Email'
                : 'Email Us'
              : locale === 'zh'
                ? '前往聯絡頁'
                : 'Contact Page'}
          </Link>
        </div>
      </section>
    </main>
  );
}

function renderLinkedText(value: string) {
  const googlePartnerUrl = 'https://policies.google.com/technologies/partner-sites';
  const index = value.indexOf(googlePartnerUrl);

  if (index === -1) {
    return value;
  }

  return (
    <>
      {value.slice(0, index)}
      <a
        href={googlePartnerUrl}
        className="font-semibold text-brand-700 underline decoration-brand-300 underline-offset-4"
        rel="noreferrer"
        target="_blank"
      >
        {googlePartnerUrl}
      </a>
      {value.slice(index + googlePartnerUrl.length)}
    </>
  );
}
