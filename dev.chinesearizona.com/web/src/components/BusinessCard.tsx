import { Clock3, DollarSign, ExternalLink, MapPin, Navigation, Phone, Star } from 'lucide-react';
import Link from 'next/link';

import { BusinessImage } from '@/components/BusinessImage';
import { TrustBadges } from '@/components/TrustBadges';
import { TrackedLink } from '@/components/TrackedLink';
import {
  getBusinessDirectionsUrl,
  getBusinessHoursPreview,
  getBusinessMenuUrl,
  getBusinessServiceHighlights,
} from '@/lib/business-display';
import { getBusinessCategories } from '@/lib/content';
import { descriptiveImageAlt, formatDate, t } from '@/lib/i18n';
import { phoneHref } from '@/lib/phone';
import { withLocale } from '@/lib/routing';
import type { Business, BusinessCategory, Locale } from '@/lib/types';

type BusinessCardProps = {
  business: Business;
  locale: Locale;
  category?: BusinessCategory;
};

export function BusinessCard({ business, locale, category: providedCategory }: BusinessCardProps) {
  const category = providedCategory ?? getBusinessCategories().find((item) => item.slug === business.categorySlug);
  const detailHref = withLocale(locale, `/directory/business/${business.slug}`);
  const claimHref = withLocale(
    locale,
    `/add-business?businessSlug=${encodeURIComponent(business.slug)}&businessName=${encodeURIComponent(business.name.en)}`
  );
  const reportHref = `${detailHref}#report-issue`;
  const locationLabel = business.address ?? business.serviceAreaText ?? `${business.city}, AZ`;
  const websiteLabel = business.website?.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const hasReviews = business.reviewCount > 0;
  const hasRating = business.rating > 0;
  const phoneLink = phoneHref(business.phone);
  const directionsHref = getBusinessDirectionsUrl(business);
  const menuHref = getBusinessMenuUrl(business);
  const websiteHref = business.website && business.website !== menuHref ? business.website : undefined;
  const serviceHighlights = getBusinessServiceHighlights(business, locale);
  const hoursPreview = getBusinessHoursPreview(business.hours, locale);
  const hasQuickDetails =
    Boolean(business.priceRange) || hoursPreview.items.length > 0 || serviceHighlights.length > 0;

  return (
    <div className="group flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row">
      <div className="relative h-40 w-full overflow-hidden rounded-lg bg-slate-200 sm:h-auto sm:w-44 sm:flex-shrink-0">
        <BusinessImage
          imageUrl={business.heroImage}
          label={descriptiveImageAlt(t(business.name, locale), 'business', locale)}
          locale={locale}
          category={category}
          sizes="(max-width: 640px) 100vw, 176px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              {category ? (
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {t(category.name, locale)}
                </span>
              ) : null}
              <h3 className="text-xl font-bold text-slate-900">
                <TrackedLink
                  href={detailHref}
                  eventType="directory_click"
                  entitySlug={business.slug}
                  className="hover:text-brand-600"
                >
                  {t(business.name, locale)}
                </TrackedLink>
              </h3>
            </div>

            <TrustBadges
              locale={locale}
              verified={business.verified}
              bilingual={business.bilingual}
              sponsored={business.sponsored}
              verificationState={business.verificationState}
              status={business.status}
            />
          </div>

          <p className="text-sm leading-6 text-slate-600">{t(business.shortDescription, locale)}</p>

          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            {hasReviews ? (
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-current text-amber-400" />
                {hasRating ? (
                  <>
                    <span className="font-semibold text-slate-700">{business.rating.toFixed(1)}</span>
                    <span>({business.reviewCount})</span>
                  </>
                ) : (
                  <span className="font-semibold text-slate-700">
                    {business.reviewCount} {locale === 'zh' ? '則評論' : 'reviews'}
                  </span>
                )}
              </div>
            ) : null}
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>{locationLabel}</span>
            </div>
            {business.phone ? (
              <div className="flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-slate-400" />
                {phoneLink ? (
                  <a href={phoneLink} className="hover:text-brand-600">
                    {business.phone}
                  </a>
                ) : (
                  <span>{business.phone}</span>
                )}
              </div>
            ) : business.website ? (
              <div className="flex items-center gap-1.5">
                <ExternalLink className="h-4 w-4 text-slate-400" />
                <span>{websiteLabel}</span>
              </div>
            ) : null}
          </div>

          {hasQuickDetails ? (
            <div className="space-y-3 rounded-xl bg-slate-50 p-3">
              <div className="flex flex-wrap gap-2">
                {business.priceRange ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    {business.priceRange}
                  </span>
                ) : null}
                {hoursPreview.items.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    <Clock3 className="h-3.5 w-3.5 text-slate-500" />
                    {item}
                  </span>
                ))}
                {hoursPreview.remainingCount > 0 ? (
                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                    {locale === 'zh'
                      ? `還有 ${hoursPreview.remainingCount} 段時段`
                      : `+${hoursPreview.remainingCount} more`}
                  </span>
                ) : null}
              </div>

              {serviceHighlights.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {serviceHighlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {menuHref || websiteHref || directionsHref ? (
            <div className="flex flex-wrap gap-2">
              {menuHref ? (
                <a
                  href={menuHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-100"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {locale === 'zh' ? '菜單' : 'Menu'}
                </a>
              ) : null}
              {websiteHref ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {locale === 'zh' ? '網站' : 'Website'}
                </a>
              ) : null}
              {directionsHref ? (
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  {locale === 'zh' ? '路線' : 'Directions'}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div className="space-y-1">
            <span className="block">
              {locale === 'zh' ? '最近更新' : 'Last updated'}: {formatDate(business.lastUpdated, locale)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {business.verificationState === 'unverified' ? (
              <Link href={claimHref} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                {locale === 'zh' ? '認領這筆商家' : 'Claim this listing'}
              </Link>
            ) : null}
            <Link href={reportHref} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
              {locale === 'zh' ? '回報問題' : 'Report issue'}
            </Link>
            <TrackedLink
              href={detailHref}
              eventType="directory_click"
              entitySlug={business.slug}
              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              {locale === 'zh' ? '查看完整頁面' : 'View full profile'}
            </TrackedLink>
          </div>
        </div>
      </div>
    </div>
  );
}
