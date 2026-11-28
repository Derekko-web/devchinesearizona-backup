import { CheckCircle2, Mail, MessageCircle, ShieldCheck, Tag } from 'lucide-react';
import Link from 'next/link';

import { AdvertiseInquiryForm } from '@/components/forms/AdvertiseInquiryForm';
import {
  advertiseContactPerson,
  advertisePath,
  formatAdvertisePrice,
  getAdvertisePageCopy,
  getAdvertisePlans,
  isOnlineCheckoutPlan,
  sponsoredLabel,
  type AdvertisePlan,
} from '@/lib/advertise';
import { withLocale } from '@/lib/routing';
import { defaultSiteProfile, type SiteProfile } from '@/lib/site-config';
import type { Locale } from '@/lib/types';

function foundingSpotsText(spotsLeft: number, locale: Locale) {
  if (spotsLeft <= 0) {
    return locale === 'zh' ? '10 個創始名額已滿' : 'All 10 founding spots are taken';
  }

  return locale === 'zh' ? `創始名額剩 ${spotsLeft} / 10 個` : `${spotsLeft} of 10 founding spots left`;
}

function PlanCard({
  plan,
  locale,
  ctaHref,
  ctaLabel,
  foundingSpotsLeft,
}: {
  plan: AdvertisePlan;
  locale: Locale;
  ctaHref?: string;
  ctaLabel: string;
  // Counted from paid plans the same way checkout sets the founding price.
  foundingSpotsLeft?: number;
}) {
  const zh = locale === 'zh';
  const [firstPrice, ...otherPrices] = plan.prices;

  return (
    <article
      id={`plan-${plan.id}`}
      className="flex h-full flex-col rounded-[8px] border border-[#e4d6c7] bg-white p-5 shadow-sm"
    >
      {plan.labeledSponsored ? (
        <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-[#f5e6df] px-2 py-0.5 text-[11px] font-semibold text-brand-700">
          <Tag className="h-3 w-3" aria-hidden="true" />
          {sponsoredLabel}
        </span>
      ) : null}
      <h3 className="text-lg font-semibold leading-snug tracking-tight text-[#2b2019]">
        {zh ? plan.name.zh : plan.name.en}
      </h3>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-[#251a15] [font-variant-numeric:tabular-nums]">
        {firstPrice ? formatAdvertisePrice(firstPrice, locale) : zh ? '免費' : 'Free'}
      </p>
      {otherPrices.map((price) => (
        <p key={price.interval} className="text-sm font-medium text-[#6f5d51]">
          {zh ? '或 ' : 'or '}
          {formatAdvertisePrice(price, locale)}
        </p>
      ))}
      {plan.foundingOffer && foundingSpotsLeft !== 0 ? (
        <p className="mt-3 rounded-[6px] bg-[#f7eedc] px-2.5 py-1.5 text-xs font-semibold leading-5 text-[#8a5a1f]">
          {zh ? plan.foundingOffer.zh : plan.foundingOffer.en}
        </p>
      ) : null}
      {plan.foundingOffer && foundingSpotsLeft !== undefined ? (
        <p
          data-testid={`founding-spots-${plan.id}`}
          className="mt-1.5 text-xs font-semibold text-[#8a5a1f] [font-variant-numeric:tabular-nums]"
        >
          {foundingSpotsText(foundingSpotsLeft, locale)}
        </p>
      ) : null}

      <p className="mt-3 text-sm leading-6 text-[#5f4f45]">{zh ? plan.summary.zh : plan.summary.en}</p>
      <ul className="mt-3 grid gap-2 text-sm leading-5 text-[#6b5a50]">
        {plan.includes.map((item) => (
          <li key={item.en} className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600" aria-hidden="true" />
            <span>{zh ? item.zh : item.en}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-5">
        {ctaHref ? (
          <Link
            href={ctaHref}
            className="inline-flex h-10 w-full items-center justify-center rounded-[8px] border border-brand-600 px-4 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-600 hover:text-white"
          >
            {ctaLabel}
          </Link>
        ) : (
          <span className="inline-flex h-10 w-full items-center justify-center rounded-[8px] border border-[#e4d6c7] px-4 text-sm font-semibold text-[#8a7668]">
            {ctaLabel}
          </span>
        )}
      </div>
    </article>
  );
}

export function AdvertisePageView({
  locale,
  site = defaultSiteProfile,
  searchParams,
  foundingSpotsLeft,
}: {
  locale: Locale;
  site?: SiteProfile;
  searchParams?: { plan?: string };
  // Main site only, where plans are sold online; undefined hides the counter.
  foundingSpotsLeft?: Partial<Record<string, number>>;
}) {
  const copy = getAdvertisePageCopy(locale, site);
  const plans = getAdvertisePlans(site);
  const advertiseHref = withLocale(locale, advertisePath);
  const claimHref = withLocale(locale, '/add-business');
  const dashboardHref = withLocale(locale, '/dashboard');

  return (
    <main className="min-h-screen bg-[#fbf7f0] text-[#2d211b]">
      <section className="border-b border-[#e1d2c1] bg-[#fffaf3]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-6 lg:grid-cols-[0.7fr_0.3fr] lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">{copy.eyebrow}</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-[#251a15] sm:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#6f5d51] sm:text-lg">{copy.description}</p>
            <p className="mt-4 max-w-3xl text-sm font-medium leading-6 text-[#8a7668]">{copy.checkoutNote}</p>
          </div>

          <a
            href="#sponsored"
            className="flex h-fit flex-col gap-3 rounded-[8px] border border-[#e3d4c4] bg-white p-5 text-sm leading-6 text-[#6b5a50] transition-colors hover:border-brand-300"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5e6df] text-brand-600">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-semibold text-[#2d211b]">
              {locale === 'zh' ? '評論與評分絕不販售' : 'Reviews and ratings are never for sale'}
            </span>
            <span>
              {locale === 'zh'
                ? `所有付費版位都標示「${sponsoredLabel}」。`
                : `Every paid spot is labeled "${sponsoredLabel}".`}
            </span>
          </a>
        </div>
      </section>

      <section id="plans" className="mx-auto max-w-6xl px-5 py-12 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight text-[#2b2019] sm:text-3xl">{copy.plansHeading}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b5a50]">{copy.plansIntro}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              locale={locale}
              ctaHref={
                plan.comingLater
                  ? undefined
                  : plan.prices.length === 0
                    ? claimHref
                    : isOnlineCheckoutPlan(plan.id, site)
                      ? dashboardHref
                      : `${advertiseHref}?plan=${plan.id}#contact`
              }
              ctaLabel={
                plan.comingLater
                  ? copy.comingLaterCta
                  : plan.prices.length === 0
                    ? copy.claimCta
                    : isOnlineCheckoutPlan(plan.id, site)
                      ? copy.buyCta
                      : copy.askCta
              }
              foundingSpotsLeft={isOnlineCheckoutPlan(plan.id, site) ? foundingSpotsLeft?.[plan.id] : undefined}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <article id="sponsored" className="rounded-[8px] border border-[#e4d6c7] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-[#2b2019]">{copy.sponsored.heading}</h2>
          <p className="mt-4 text-base leading-7 text-[#5f4f45]">{copy.sponsored.body}</p>
          <ul className="mt-5 grid gap-3 text-sm leading-6 text-[#6b5a50]">
            {copy.sponsored.bullets.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>

        <article id="refunds" className="rounded-[8px] border border-[#e4d6c7] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-[#2b2019]">{copy.refunds.heading}</h2>
          <ul className="mt-5 grid gap-3 text-sm leading-6 text-[#6b5a50]">
            {copy.refunds.bullets.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section id="contact" className="border-t border-[#e1d2c1] bg-[#fffaf3]">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#2b2019] sm:text-3xl">{copy.contact.heading}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b5a50]">{copy.contact.intro}</p>
            <div className="mt-6">
              <AdvertiseInquiryForm locale={locale} site={site} initialPlanId={searchParams?.plan} />
            </div>
          </div>

          <aside className="grid h-fit gap-4 lg:mt-[4.5rem]">
            {advertiseContactPerson.name ? (
              <div className="rounded-[8px] border border-[#e4d6c7] bg-white p-5" data-testid="advertise-contact-person">
                <p className="text-sm font-semibold text-[#2d211b]">{copy.whoRunsThisHeading}</p>
                <p className="mt-2 text-base font-semibold text-[#2d211b]">{advertiseContactPerson.name}</p>
                {advertiseContactPerson.role.en ? (
                  <p className="text-sm text-[#6b5a50]">
                    {locale === 'zh' ? advertiseContactPerson.role.zh : advertiseContactPerson.role.en}
                  </p>
                ) : null}
                {advertiseContactPerson.phone ? (
                  <p className="mt-2 text-sm text-[#2d211b]">
                    {locale === 'zh' ? '電話：' : 'Phone: '}
                    {advertiseContactPerson.phone}
                  </p>
                ) : null}
                {advertiseContactPerson.wechat ? (
                  <p className="text-sm text-[#2d211b]">
                    {locale === 'zh' ? '微信：' : 'WeChat: '}
                    {advertiseContactPerson.wechat}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="rounded-[8px] border border-[#e4d6c7] bg-white p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#2d211b]">
                <Mail className="h-4 w-4 text-brand-600" aria-hidden="true" />
                {copy.contact.emailHeading}
              </p>
              <a
                href={`mailto:${copy.contact.email}`}
                className="mt-2 block break-all text-base font-semibold text-brand-700 underline decoration-brand-300 underline-offset-4"
              >
                {copy.contact.email}
              </a>
            </div>
            <div id="wechat" className="rounded-[8px] border border-[#e4d6c7] bg-white p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#2d211b]">
                <MessageCircle className="h-4 w-4 text-[#2f8f4e]" aria-hidden="true" />
                {copy.contact.wechatHeading}
              </p>
              {copy.contact.wechatId ? (
                <p className="mt-2 text-base font-semibold text-[#2d211b]">{copy.contact.wechatId}</p>
              ) : (
                <p className="mt-2 text-sm leading-6 text-[#6b5a50]">{copy.contact.wechatPending}</p>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
