import { Clock3, DollarSign, ExternalLink, Mail, MapPin, Navigation, Phone, Star } from 'lucide-react';
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
import { getDirectoryAiReplacementCardObjectPosition } from '@/lib/directory-ai-replacements';
import { isMostPopularDirectoryBusiness } from '@/lib/directory-highlights';
import { descriptiveImageAlt, formatDate, t } from '@/lib/i18n';
import { phoneHref } from '@/lib/phone';
import { withLocale } from '@/lib/routing';
import type { Business, BusinessCategory, Locale } from '@/lib/types';

type BusinessCardProps = {
  business: Business;
  locale: Locale;
  category?: BusinessCategory;
  enableSponsoredClickTracking?: boolean;
  localizedShortDescription?: string;
  localizedLocationLabel?: string;
  localizedServiceHighlights?: string[];
};

export function BusinessCard({
  business,
  locale,
  category: providedCategory,
  enableSponsoredClickTracking = false,
  localizedShortDescription,
  localizedLocationLabel,
  localizedServiceHighlights,
}: BusinessCardProps) {
  const category = providedCategory ?? getBusinessCategories().find((item) => item.slug === business.categorySlug);
  const detailHref = withLocale(locale, `/business/${business.slug}`);
  const claimHref = withLocale(
    locale,
    `/add-business?businessSlug=${encodeURIComponent(business.slug)}&businessName=${encodeURIComponent(business.name.en)}`
  );
  const reportHref = `${detailHref}#report-issue`;
  const locationLabel =
    localizedLocationLabel ?? business.address ?? business.serviceAreaText ?? `${business.city}, AZ`;
  const websiteLabel = business.website?.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const hasReviews = business.reviewCount > 0;
  const hasRating = business.rating > 0;
  const phoneLink = phoneHref(business.phone);
  const emailHref = business.email ? `mailto:${business.email}` : undefined;
  const directionsHref = getBusinessDirectionsUrl(business);
  const menuHref = getBusinessMenuUrl(business);
  const websiteHref = business.website && business.website !== menuHref ? business.website : undefined;
  const serviceHighlights = localizedServiceHighlights ?? getBusinessServiceHighlights(business, locale);
  const hoursPreview = getBusinessHoursPreview(business.hours, locale);
  const isMostPopular = isMostPopularDirectoryBusiness(business);
  const hasQuickDetails =
    Boolean(business.priceRange) || hoursPreview.items.length > 0 || serviceHighlights.length > 0;
  const cardImageObjectPosition = getDirectoryAiReplacementCardObjectPosition(business.slug);

  return (
    <article className="homepage-card group grid overflow-hidden rounded-[22px] border border-[#e3d3c2] bg-[#fffdfa] shadow-[0_24px_58px_-48px_rgba(74,49,27,0.54)] sm:grid-cols-[190px_minmax(0,1fr)]">
      <div className="relative min-h-[190px] w-full overflow-hidden bg-[#eadccb] sm:h-full">
        <BusinessImage
          imageUrl={business.heroImage}
          label={descriptiveImageAlt(t(business.name, locale), 'business', locale)}
          locale={locale}
          category={category}
          sizes="(max-width: 640px) 100vw, 176px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          style={cardImageObjectPosition ? { objectPosition: cardImageObjectPosition } : undefined}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 px-4 py-4 sm:px-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              {category ? (
                <span className="inline-flex rounded-[10px] bg-[#f2e6d9] px-2.5 py-1 text-xs font-semibold text-[#6e5748]">
                  {t(category.name, locale)}
                </span>
              ) : null}
              <h3 className="text-xl font-semibold tracking-tight text-[#261b15]">
                <TrackedLink
                  href={detailHref}
                  eventType="directory_click"
                  entitySlug={business.slug}
                  className="transition-colors hover:text-brand-600"
                  data-directory-ad-click={enableSponsoredClickTracking ? 'true' : undefined}
                >
                  {t(business.name, locale)}
                </TrackedLink>
              </h3>
            </div>

            <TrustBadges
              locale={locale}
              mostPopular={isMostPopular}
              verified={business.verified}
              bilingual={business.bilingual}
              sponsored={business.sponsored}
              verificationState={business.verificationState}
              status={business.status}
            />
          </div>

          <p className="text-sm leading-6 text-[#625044]">
            {localizedShortDescription ?? t(business.shortDescription, locale)}
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#776357]">
            {hasReviews ? (
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-[#f0ad48] text-[#f0ad48]" />
                {hasRating ? (
                  <>
                    <span className="font-semibold text-[#31231c]">{business.rating.toFixed(1)}</span>
                    <span>({business.reviewCount})</span>
                  </>
                ) : (
                  <span className="font-semibold text-[#31231c]">
                    {business.reviewCount} {locale === 'zh' ? '則評論' : 'reviews'}
                  </span>
                )}
              </div>
            ) : null}
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-brand-600" />
              <span>{locationLabel}</span>
            </div>
            {business.phone ? (
              <div className="flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-[#9a8575]" />
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
                <ExternalLink className="h-4 w-4 text-[#9a8575]" />
                <span>{websiteLabel}</span>
              </div>
            ) : business.email ? (
              <div className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-[#9a8575]" />
                {emailHref ? (
                  <a href={emailHref} className="hover:text-brand-600">
                    {business.email}
                  </a>
                ) : (
                  <span>{business.email}</span>
                )}
              </div>
            ) : null}
          </div>

          {hasQuickDetails ? (
            <div className="space-y-3 border-y border-[#eadbcc] bg-[#fbf4ec] px-3 py-3">
              <div className="flex flex-wrap gap-2">
                {business.priceRange ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e1d0bd] bg-white px-3 py-1 text-xs font-medium text-[#604d40]">
                    <DollarSign className="h-3.5 w-3.5 text-[#5f8640]" />
                    {business.priceRange}
                  </span>
                ) : null}
                {hoursPreview.items.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#e1d0bd] bg-white px-3 py-1 text-xs font-medium text-[#604d40]"
                  >
                    <Clock3 className="h-3.5 w-3.5 text-[#8b7768]" />
                    {item}
                  </span>
                ))}
                {hoursPreview.remainingCount > 0 ? (
                  <span className="inline-flex rounded-full border border-[#e1d0bd] bg-white px-3 py-1 text-xs font-medium text-[#806a5b]">
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
                      className="inline-flex rounded-full bg-[#fff2e5] px-3 py-1 text-xs font-medium text-brand-700"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {menuHref || websiteHref || directionsHref || emailHref ? (
            <div className="flex flex-wrap gap-2">
              {menuHref ? (
                <a
                  href={menuHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-[12px] border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
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
                  className="inline-flex items-center gap-1.5 rounded-[12px] border border-[#dfd0c0] bg-white px-3 py-1.5 text-sm font-semibold text-[#5f4c40] transition-colors hover:border-brand-200 hover:text-brand-700"
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
                  className="inline-flex items-center gap-1.5 rounded-[12px] border border-[#dfd0c0] bg-white px-3 py-1.5 text-sm font-semibold text-[#5f4c40] transition-colors hover:border-brand-200 hover:text-brand-700"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  {locale === 'zh' ? '路線' : 'Directions'}
                </a>
              ) : null}
              {emailHref ? (
                <a
                  href={emailHref}
                  className="inline-flex items-center gap-1.5 rounded-[12px] border border-[#dfd0c0] bg-white px-3 py-1.5 text-sm font-semibold text-[#5f4c40] transition-colors hover:border-brand-200 hover:text-brand-700"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {locale === 'zh' ? '電子郵件' : 'Email'}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eadbcc] pt-3 text-xs text-[#806a5b]">
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
            <Link href={reportHref} className="text-sm font-semibold text-[#6f5a4b] hover:text-[#30231c]">
              {locale === 'zh' ? '回報問題' : 'Report issue'}
            </Link>
            <TrackedLink
              href={detailHref}
              eventType="directory_click"
              entitySlug={business.slug}
              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
              data-directory-ad-click={enableSponsoredClickTracking ? 'true' : undefined}
            >
              {locale === 'zh' ? '查看完整頁面' : 'View full profile'}
            </TrackedLink>
          </div>
        </div>
      </div>
    </article>
  );
}
