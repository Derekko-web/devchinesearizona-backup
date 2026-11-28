import {
  Bookmark,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Globe2,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Route,
  Share2,
  ShieldCheck,
  Star,
  Store,
  Utensils,
} from 'lucide-react';
import Link from 'next/link';

import { BusinessImage } from '@/components/BusinessImage';
import { BusinessCard } from '@/components/BusinessCard';
import { BusinessContactClickTracker } from '@/components/directory/BusinessContactClickTracker';
import { BusinessInquiryForm } from '@/components/forms/BusinessInquiryForm';
import { ReportIssueForm } from '@/components/forms/ReportIssueForm';
import {
  getBusinessDirectionsUrl,
  getBusinessHoursPreview,
  getBusinessMenuUrl,
  getBusinessServiceHighlights,
} from '@/lib/business-display';
import { resolveCitySiteBusinessImages } from '@/lib/city-site-business-images';
import { getBusinessReviews, getProfileBySlug } from '@/lib/content';
import { advertisePath } from '@/lib/advertise';
import {
  getDirectoryBusinesses,
  getDirectoryBusinessBySlug,
  getDirectoryCategories,
  hasGeneratedDirectoryCopy,
  selectSimilarBusinesses,
} from '@/lib/directory';
import { isIllustrationImageUrl } from '@/lib/directory-ai-replacements';
import { businessLeadsEnabled, isInquiryCategory } from '@/lib/business-leads';
import { selectRealBusinessPhotos } from '@/lib/business-photos';
import { MAX_BUSINESS_GALLERY_IMAGES } from '@/lib/business-media';
import {
  acceptedPaymentNames,
  chineseMaterialsLabel,
  hasBilingualServiceDetails,
  isSpokenLanguage,
  paymentLabels,
} from '@/lib/business-bilingual';
import { isMostPopularDirectoryBusiness } from '@/lib/directory-highlights';
import { cityCategoryPath, getMetroCategoryTitle, metroCategoryPath } from '@/lib/metro-categories';
import {
  businessHoursLabel,
  businessHoursValue,
  descriptiveImageAlt,
  formatLanguageList,
  t,
} from '@/lib/i18n';
import {
  getListingTrustLevel,
  hasChineseSpokenLanguage,
  listingTrustExplanation,
  listingTrustLabel,
} from '@/lib/listing-trust';
import { phoneHref } from '@/lib/phone';
import { absoluteUrl, resolveAbsoluteAssetUrl } from '@/lib/seo';
import { JsonLd } from '@/lib/schema';
import { withLocale } from '@/lib/routing';
import { defaultSiteProfile, hasLiveDirectoryData, type SiteProfile } from '@/lib/site-config';
import type { Business, Locale } from '@/lib/types';

function formatCityStateLabel(city: string, site: SiteProfile): string {
  return site.stateCode ? `${city}, ${site.stateCode}` : city;
}

function formatCityRegionLabel(city: string, site: SiteProfile): string {
  const region = site.stateCode || site.stateRegion;
  return region ? `${city.toUpperCase()}, ${region.toUpperCase()}` : city.toUpperCase();
}

// A listing can be claimed while no owner is connected to it. Editors verify
// most listings before anyone claims them, so "editor verified" still means
// "unclaimed". City sites read static files and can't connect an owner, so
// there only unverified listings offer the claim flow, as before (#448).
export function canClaimBusiness(
  business: Pick<Business, 'ownerProfileSlug' | 'verificationState'>,
  site: Pick<SiteProfile, 'key'>
): boolean {
  if (business.ownerProfileSlug || business.verificationState === 'claimed') {
    return false;
  }

  return site.key === defaultSiteProfile.key || business.verificationState === 'unverified';
}

export async function BusinessDetailPageView({
  locale,
  slug,
  site = defaultSiteProfile,
}: {
  locale: Locale;
  slug: string;
  site?: SiteProfile;
}) {
  if (!hasLiveDirectoryData(site)) {
    return null;
  }

  const business = await getDirectoryBusinessBySlug(slug, { site });
  if (!business) {
    return null;
  }

  const [categories, sameCategoryBusinesses] = await Promise.all([
    getDirectoryCategories(site),
    getDirectoryBusinesses(
      {
        category: business.categorySlug,
        sort: 'featured',
      },
      {
        excludeSlug: business.slug,
        site,
      }
    ),
  ]);
  const relatedCategoryBusinesses = selectSimilarBusinesses(business, sameCategoryBusinesses);
  const relatedAllInSameCity =
    relatedCategoryBusinesses.length > 0 && relatedCategoryBusinesses.every((item) => item.city === business.city);
  const category = categories.find((item) => item.slug === business.categorySlug);
  const owner = business.ownerProfileSlug ? getProfileBySlug(business.ownerProfileSlug) : undefined;
  const businessReviews = getBusinessReviews(slug);
  // Plaza imports carry an English paragraph saying they were generated; the page
  // shows one honest line in its language instead, and structured data omits it.
  const hasGeneratedCopy = hasGeneratedDirectoryCopy(business);
  const imageSet = [business.heroImage, ...business.gallery]
    .filter((value) => !isIllustrationImageUrl(value))
    .map((value) => resolveAbsoluteAssetUrl(value, site))
    .filter((value): value is string => Boolean(value));
  const claimHref = withLocale(
    locale,
    `/add-business?businessSlug=${encodeURIComponent(business.slug)}&businessName=${encodeURIComponent(business.name.en)}`
  );
  const menuHref = getBusinessMenuUrl(business);
  const websiteHref = business.website && business.website !== menuHref ? business.website : undefined;
  const emailHref = business.email ? `mailto:${business.email}` : undefined;
  const phoneLink = phoneHref(business.phone);
  const directionsHref = getBusinessDirectionsUrl(business, site.stateCode || site.stateRegion);
  const serviceHighlights = getBusinessServiceHighlights(business, locale);
  const hoursPreview = getBusinessHoursPreview(business.hours, locale);
  const businessDetailPath = withLocale(locale, `/business/${business.slug}`);
  const businessDetailUrl = absoluteUrl(businessDetailPath, site);
  const localBusinessJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name.en,
    alternateName: business.name.zh,
    description: hasGeneratedCopy ? undefined : business.description.en,
    url: businessDetailUrl,
  };

  if (imageSet.length > 0) {
    localBusinessJsonLd.image = imageSet;
  }
  const spokenLanguages = business.languages.filter(isSpokenLanguage);
  if (spokenLanguages.length > 0) {
    localBusinessJsonLd.knowsLanguage = spokenLanguages;
  }
  const paymentNames = acceptedPaymentNames(business);
  if (paymentNames.length > 0) {
    localBusinessJsonLd.paymentAccepted = paymentNames.join(', ');
  }
  if (business.phone) {
    localBusinessJsonLd.telephone = business.phone;
  }
  if (business.email) {
    localBusinessJsonLd.email = business.email;
  }
  if (business.address) {
    localBusinessJsonLd.address = {
      '@type': 'PostalAddress',
      streetAddress: business.address,
      addressLocality: business.city,
      addressRegion: site.stateCode || undefined,
      addressCountry: 'US',
    };
  } else if (business.serviceAreaText) {
    localBusinessJsonLd.areaServed = business.serviceAreaText;
  }
  if (business.coordinates) {
    localBusinessJsonLd.geo = {
      '@type': 'GeoCoordinates',
      latitude: business.coordinates.lat,
      longitude: business.coordinates.lng,
    };
  }
  // No aggregateRating: we show ratings only from reviews collected on this site,
  // and there are none yet (issue #457).

  const displayName = t(business.name, locale);
  const alternateName =
    business.name.zh && business.name.zh !== business.name.en
      ? business.name.zh
      : locale === 'zh' && business.name.en !== displayName
      ? business.name.en
      : undefined;
  const categoryLabel = category ? t(category.name, locale) : locale === 'zh' ? '本地商家' : 'Local business';
  const cityStateLabel = formatCityStateLabel(business.city, site);
  const addressLabel = business.address ?? business.serviceAreaText ?? cityStateLabel;
  const cityRegionLabel = formatCityRegionLabel(business.city, site);
  const verificationBrandLabel =
    site.key === defaultSiteProfile.key ? 'ChineseArizona' : site.brandName;
  const verificationBrandLabelZh =
    site.key === defaultSiteProfile.key ? 'ChineseArizona' : site.brandNameZh;
  const trustLevel = getListingTrustLevel(business);
  const trustLabel = t(listingTrustLabel(trustLevel), locale);
  const trustExplanation = t(listingTrustExplanation(trustLevel), locale);
  const speaksChinese = hasChineseSpokenLanguage(business.languages);
  // Rows we have no data for are hidden, not marked "pending" (issue #473).
  const firstHoursLabel = hoursPreview.items[0];
  const contactWebsite = websiteHref ?? business.website;
  const contactWebsiteLabel = contactWebsite?.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const hasContactDetails = Boolean((business.phone && phoneLink) || business.email || contactWebsite);
  const resolvedImages = resolveCitySiteBusinessImages(business, site, {
    category,
    locale,
    minimumGalleryImages: 4,
  });
  const businessImageCandidates = [resolvedImages.heroImage, ...resolvedImages.gallery].filter(
    (value): value is string => Boolean(value)
  );
  // An Enhanced listing (paid plan, #408) shows every photo instead of the first 4.
  const realPhotos = selectRealBusinessPhotos(
    businessImageCandidates,
    business.paidPlans?.includes('enhanced-listing') ? MAX_BUSINESS_GALLERY_IMAGES : 4
  );
  // Only real photos: no AI illustration stands in for the business (#473).
  const heroPhoto = realPhotos[0];
  const aboutImage = selectRealBusinessPhotos([...resolvedImages.gallery, resolvedImages.heroImage], 1)[0];
  const primaryActionLabel = locale === 'zh' ? '撥打電話' : 'Call';
  const languageSummary = business.languages.length > 0 ? formatLanguageList(business.languages, locale) : undefined;
  const popularityBadge = isMostPopularDirectoryBusiness(business);
  const menuOrWebsiteHref = menuHref ?? websiteHref;
  const leadsEnabled = businessLeadsEnabled(site);
  const showInquiryForm = leadsEnabled && isInquiryCategory(business.categorySlug);
  const showClaimPrompt = canClaimBusiness(business, site);
  return (
    <div className="bg-[#f7f1e8] text-[#2c2722]">
      <JsonLd data={localBusinessJsonLd} />
      {leadsEnabled ? <BusinessContactClickTracker businessSlug={business.slug} /> : null}

      <section className="relative overflow-hidden border-b border-[#ded5c9] bg-[#f7f1e8]">
        <div className="absolute right-0 top-20 hidden h-72 w-[28rem] rounded-l-[9rem] bg-[#f1bf97] opacity-80 lg:block" />
        <div className="mx-auto max-w-[96rem] px-4 py-6 sm:px-6 lg:px-8">
          <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs font-medium text-[#776d62]" aria-label={locale === 'zh' ? '麵包屑' : 'Breadcrumb'}>
            <Link href={withLocale(locale, '/')} className="transition-colors hover:text-[#b7282e]">
              {locale === 'zh' ? '首頁' : 'Home'}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <Link href={withLocale(locale, '/business')} className="transition-colors hover:text-[#b7282e]">
              {locale === 'zh' ? '華人商家' : 'Chinese Businesses'}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            {category ? (
              <>
                <Link
                  href={withLocale(locale, metroCategoryPath(category.slug))}
                  className="transition-colors hover:text-[#b7282e]"
                >
                  {categoryLabel}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </>
            ) : null}
            <span className="text-[#2c2722]">{displayName}</span>
          </nav>

          <div className="relative grid min-h-[25rem] overflow-hidden rounded-lg border border-[#dfd4c8] bg-[#fbf7f0] shadow-[0_24px_70px_rgba(85,58,28,0.12)] lg:grid-cols-[0.72fr_1.28fr]">
            <div className="relative z-10 flex flex-col justify-center px-6 py-8 sm:px-9 lg:py-10">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {trustLevel === 'owner_verified' ? (
                  <span
                    title={trustExplanation}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#4d744b] px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {trustLabel}
                  </span>
                ) : (
                  <span
                    title={trustExplanation}
                    className="inline-flex items-center rounded-md bg-[#efe7dc] px-2.5 py-1 text-xs font-semibold text-[#6d6258]"
                  >
                    {trustLabel}
                  </span>
                )}
                {popularityBadge ? (
                  // Hand-picked by our editors, not a popularity ranking (#393).
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-[#d99633]/15 px-2.5 py-1 text-xs font-semibold text-[#8b5b19]">
                    <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    {locale === 'zh' ? '精選' : 'Featured'}
                  </span>
                ) : null}
                <span className="rounded-md bg-[#efe7dc] px-2.5 py-1 text-xs font-semibold text-[#5b5047]">
                  {categoryLabel}
                </span>
              </div>

              <h1 className="font-serif text-5xl leading-[0.95] text-[#2f2923] sm:text-6xl lg:text-7xl">
                {displayName}
              </h1>
              {alternateName ? <p className="mt-3 text-2xl font-semibold text-[#4b4038]">{alternateName}</p> : null}

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#5f554c]">
                <span className="inline-flex items-center gap-1.5 text-lg font-semibold text-[#2f2923]">
                  <Store className="h-5 w-5 text-[#b7282e]" aria-hidden="true" />
                  {cityStateLabel}
                </span>
              </div>

              {/* Only the short description up top; the full text lives in the About section below. */}
              {hasGeneratedCopy ? null : (
                <p className="mt-5 max-w-xl text-base leading-7 text-[#5f554c]">{t(business.shortDescription, locale)}</p>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                {serviceHighlights.slice(0, 4).map((highlight) => (
                  <span key={highlight} className="rounded-md border border-[#e0d4c7] bg-white/65 px-3 py-1.5 text-xs font-semibold text-[#51483f]">
                    {highlight}
                  </span>
                ))}
                {serviceHighlights.length === 0 ? (
                  <>
                    <span className="rounded-md border border-[#e0d4c7] bg-white/65 px-3 py-1.5 text-xs font-semibold text-[#51483f]">
                      {categoryLabel}
                    </span>
                    {languageSummary ? (
                      <span className="rounded-md border border-[#e0d4c7] bg-white/65 px-3 py-1.5 text-xs font-semibold text-[#51483f]">
                        {languageSummary}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>

            <div className="relative min-h-[19rem] overflow-hidden bg-[#d8c7b5] lg:min-h-[25rem]">
              <BusinessImage
                imageUrl={heroPhoto}
                label={heroPhoto ? descriptiveImageAlt(displayName, 'business', locale) : categoryLabel}
                locale={locale}
                category={category}
                priority
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#2a1e16]/20 via-transparent to-transparent" />
              <div className="absolute bottom-0 right-0 h-36 w-72 rounded-tl-[7rem] bg-[#f4c29c]/95">
                <div className="absolute bottom-0 right-0 h-full w-full bg-[radial-gradient(circle_at_65%_70%,rgba(74,52,33,0.36)_0_2px,transparent_3px),linear-gradient(135deg,transparent_0_45%,rgba(128,78,36,0.22)_45%_47%,transparent_47%)] opacity-70" />
                <div className="absolute bottom-8 right-10 h-16 w-28 rounded-t-full border-t-4 border-[#8b5b33]/45" />
                <div className="absolute bottom-10 right-28 h-20 w-px bg-[#8b5b33]/45" />
                <div className="absolute bottom-7 right-7 h-24 w-px bg-[#8b5b33]/55" />
              </div>
              <div className="absolute bottom-6 left-6 flex items-center gap-3 rounded-lg border border-white/55 bg-[#fbf7f0]/90 px-4 py-3 shadow-[0_16px_40px_rgba(42,30,22,0.16)] backdrop-blur">
                <Navigation className="h-5 w-5 text-[#d9972d]" aria-hidden="true" />
                <div>
                  <p className="text-xs font-bold text-[#5c5148]">{cityRegionLabel}</p>
                  <p className="text-sm font-semibold text-[#3b332d]">{locale === 'zh' ? '在地商家檔案' : 'Local business profile'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#e2d8cb] bg-[#fbf7f0]">
        <div className="mx-auto max-w-[96rem] px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              {business.phone && phoneLink ? (
                <a
                  href={phoneLink}
                  data-contact-action="call"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#bd2730] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(189,39,48,0.24)] transition hover:bg-[#a91f27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd2730]/35"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {primaryActionLabel}
                  <span className="text-white/80">{business.phone}</span>
                </a>
              ) : null}

              {directionsHref ? (
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noreferrer"
                  data-contact-action="directions"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d7cabe] bg-white px-4 text-sm font-semibold text-[#3d342e] transition hover:border-[#bd2730] hover:text-[#bd2730] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd2730]/25"
                >
                  <Route className="h-4 w-4" aria-hidden="true" />
                  {locale === 'zh' ? '查看路線' : 'Directions'}
                </a>
              ) : null}

              {menuOrWebsiteHref ? (
                <a
                  href={menuOrWebsiteHref}
                  target="_blank"
                  rel="noreferrer"
                  data-contact-action="website"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d7cabe] bg-white px-4 text-sm font-semibold text-[#3d342e] transition hover:border-[#bd2730] hover:text-[#bd2730] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd2730]/25"
                >
                  <Utensils className="h-4 w-4" aria-hidden="true" />
                  {menuHref ? (locale === 'zh' ? '菜單／下單' : 'Menu / order') : locale === 'zh' ? '官方網站' : 'Website'}
                </a>
              ) : null}

              {showInquiryForm ? (
                <a
                  href="#inquiry"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#bd2730] bg-white px-4 text-sm font-semibold text-[#bd2730] transition hover:bg-[#bd2730] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd2730]/25"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {locale === 'zh' ? '詢價' : 'Request a quote'}
                </a>
              ) : null}

              <button
                type="button"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d7cabe] bg-white px-4 text-sm font-semibold text-[#3d342e] transition hover:border-[#bd2730] hover:text-[#bd2730] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd2730]/25"
              >
                <Bookmark className="h-4 w-4" aria-hidden="true" />
                {locale === 'zh' ? '收藏' : 'Save'}
              </button>
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d7cabe] bg-white px-4 text-sm font-semibold text-[#3d342e] transition hover:border-[#bd2730] hover:text-[#bd2730] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd2730]/25"
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
                {locale === 'zh' ? '分享' : 'Share'}
              </button>
              <a
                href="#reviews"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d7cabe] bg-white px-4 text-sm font-semibold text-[#3d342e] transition hover:border-[#bd2730] hover:text-[#bd2730] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd2730]/25"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                {locale === 'zh' ? '寫評價' : 'Write a review'}
              </a>
            </div>

            {showClaimPrompt ? (
              <div
                data-testid="claim-listing-prompt"
                className="flex flex-col gap-3 rounded-lg border border-[#bd2730]/30 bg-[#fff6ef] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#bd2730]" aria-hidden="true" />
                  <p className="text-sm leading-6 text-[#4b4038]">
                    <span className="font-semibold text-[#2c2722]">
                      {locale === 'zh' ? '這是你的商家嗎？' : 'Is this your business?'}
                    </span>{' '}
                    {locale === 'zh'
                      ? '免費認領，即可更新資料、加入照片，並查看有多少客人聯絡你。'
                      : 'Claim it free to update your details, add photos and see how many customers contact you.'}
                  </p>
                </div>
                <Link
                  href={claimHref}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[#bd2730] px-4 text-sm font-semibold text-white transition hover:bg-[#a91f27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd2730]/35"
                >
                  {locale === 'zh' ? '免費認領此商家' : 'Claim this listing free'}
                  <span className="text-xs font-medium text-white/75">
                    {locale === 'zh' ? 'Claim free' : '免費認領'}
                  </span>
                </Link>
              </div>
            ) : null}

            <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
              <div className="flex min-h-14 items-center gap-3 rounded-lg border border-[#e2d8cb] bg-[#f7f1e8] px-4">
                <MapPin className="h-5 w-5 text-[#bd2730]" aria-hidden="true" />
                <span className="line-clamp-2">{addressLabel}</span>
              </div>
              {firstHoursLabel ? (
                <div className="flex min-h-14 items-center gap-3 rounded-lg border border-[#e2d8cb] bg-[#f7f1e8] px-4">
                  <Clock3 className="h-5 w-5 text-[#4d744b]" aria-hidden="true" />
                  <span className="line-clamp-2">{firstHoursLabel}</span>
                </div>
              ) : null}
              {speaksChinese || languageSummary ? (
                <div className="flex min-h-14 items-center gap-3 rounded-lg border border-[#e2d8cb] bg-[#f7f1e8] px-4">
                  <MessageCircle className="h-5 w-5 text-[#8b5b19]" aria-hidden="true" />
                  <span>{speaksChinese ? (locale === 'zh' ? '雙語服務' : 'Bilingual support') : languageSummary}</span>
                </div>
              ) : null}
              {business.priceRange ? (
                <div className="flex min-h-14 items-center gap-3 rounded-lg border border-[#e2d8cb] bg-[#f7f1e8] px-4">
                  <CircleDollarSign className="h-5 w-5 text-[#5b5047]" aria-hidden="true" />
                  <span>{business.priceRange}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[96rem] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_25rem] xl:grid-cols-[minmax(0,1fr)_28rem]">
          <div className="min-w-0">
            <div className="sticky top-16 z-20 mb-7 flex gap-1 overflow-x-auto border-b border-[#ddd1c4] bg-[#f7f1e8]/95 py-2 backdrop-blur">
              {[
                { id: '#overview', en: 'Overview', zh: '概覽' },
                { id: '#reviews', en: 'Reviews', zh: '評價' },
                ...(realPhotos.length > 0 ? [{ id: '#photos', en: 'Photos', zh: '照片' }] : []),
                { id: '#community', en: 'Community', zh: '社區' },
              ].map((item, index) => (
                <a
                  key={item.id}
                  href={item.id}
                  className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                    index === 0
                      ? 'border-[#bd2730] text-[#bd2730]'
                      : 'border-transparent text-[#6d6258] hover:border-[#bd2730]/35 hover:text-[#bd2730]'
                  }`}
                >
                  {locale === 'zh' ? item.zh : item.en}
                  <span className="ml-2 text-xs text-[#9a8d80]">{locale === 'zh' ? item.en : item.zh}</span>
                </a>
              ))}
            </div>

            <section
              id="overview"
              className={`grid gap-6 border-b border-[#e2d8cb] pb-8 ${aboutImage ? 'lg:grid-cols-[minmax(0,1fr)_24rem]' : ''}`}
            >
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#bd2730]">
                  <Store className="h-4 w-4" aria-hidden="true" />
                  {locale === 'zh' ? '商家介紹' : 'Business profile'}
                </div>
                <h2 className="text-3xl font-semibold text-[#2c2722]">
                  {locale === 'zh' ? `關於 ${displayName}` : `About ${displayName}`}
                </h2>
                {hasGeneratedCopy ? (
                  <p className="mt-4 max-w-3xl text-base leading-8 text-[#5f554c]">
                    {locale === 'zh' ? '我們還沒有這家商家的詳細資料。' : "We don't have details for this business yet."}
                    {canClaimBusiness(business, site) ? (
                      <>
                        {' '}
                        <Link
                          href={claimHref}
                          className="font-semibold text-[#bd2730] underline decoration-[#bd2730]/30 underline-offset-4 hover:text-[#8f1c22]"
                        >
                          {locale === 'zh' ? '是你的商家嗎？免費認領即可補上。' : 'Is this your business? Claim it free to add them.'}
                        </Link>
                      </>
                    ) : null}
                  </p>
                ) : (
                  <p className="mt-4 max-w-3xl text-base leading-8 text-[#5f554c]">{t(business.description, locale)}</p>
                )}
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-[#e2d8cb] bg-[#fbf7f0] p-4">
                    <p className="text-xs font-semibold text-[#8b8176]">{locale === 'zh' ? '城市' : 'City'}</p>
                    <p className="mt-1 text-lg font-semibold text-[#2c2722]">{business.city}</p>
                  </div>
                  <div className="rounded-lg border border-[#e2d8cb] bg-[#fbf7f0] p-4">
                    <p className="text-xs font-semibold text-[#8b8176]">{locale === 'zh' ? '分類' : 'Category'}</p>
                    {category ? (
                      <Link
                        href={withLocale(locale, metroCategoryPath(category.slug))}
                        className="mt-1 block text-lg font-semibold text-[#2c2722] underline decoration-[#d7cabe] underline-offset-4 transition hover:text-[#bd2730]"
                      >
                        {categoryLabel}
                      </Link>
                    ) : (
                      <p className="mt-1 text-lg font-semibold text-[#2c2722]">{categoryLabel}</p>
                    )}
                  </div>
                  {languageSummary ? (
                    <div className="rounded-lg border border-[#e2d8cb] bg-[#fbf7f0] p-4">
                      <p className="text-xs font-semibold text-[#8b8176]">{locale === 'zh' ? '語言' : 'Languages'}</p>
                      <p className="mt-1 text-lg font-semibold text-[#2c2722]">{languageSummary}</p>
                    </div>
                  ) : null}
                </div>
                {hasBilingualServiceDetails(business) ? (
                  <div id="chinese-service" className="mt-3 rounded-lg border border-[#e2d8cb] bg-[#fbf7f0] p-4">
                    <p className="text-xs font-semibold text-[#8b8176]">
                      {locale === 'zh' ? '華語服務' : 'Chinese-language service'}
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-2 text-sm font-semibold text-[#2c2722]">
                      {business.wechatId ? (
                        <li className="rounded-md border border-[#e2d8cb] bg-white px-3 py-1.5">
                          {locale === 'zh' ? '微信號：' : 'WeChat: '}
                          <span className="font-mono">{business.wechatId}</span>
                        </li>
                      ) : null}
                      {business.acceptsWeChatPay ? (
                        <li className="rounded-md border border-[#e2d8cb] bg-white px-3 py-1.5">
                          {locale === 'zh' ? `接受${paymentLabels['wechat-pay'].zh}` : `Accepts ${paymentLabels['wechat-pay'].en}`}
                        </li>
                      ) : null}
                      {business.acceptsAlipay ? (
                        <li className="rounded-md border border-[#e2d8cb] bg-white px-3 py-1.5">
                          {locale === 'zh' ? `接受${paymentLabels.alipay.zh}` : `Accepts ${paymentLabels.alipay.en}`}
                        </li>
                      ) : null}
                      {business.chineseMenuOrForms ? (
                        <li className="rounded-md border border-[#e2d8cb] bg-white px-3 py-1.5">
                          {chineseMaterialsLabel(business.categorySlug, locale)}
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ) : null}
              </div>

              {aboutImage ? (
                <div className="relative min-h-60 overflow-hidden rounded-lg border border-[#dfd4c8] bg-[#eadfce]">
                  <BusinessImage
                    imageUrl={aboutImage}
                    label={descriptiveImageAlt(displayName, 'business', locale)}
                    locale={locale}
                    category={category}
                    className="object-cover"
                  />
                </div>
              ) : null}
            </section>

            {/* Reviews collected on this site only; no star summary until we have some (#457). */}
            <section id="reviews" className="border-b border-[#e2d8cb] py-8">
              <h2 className="mb-4 text-sm font-semibold text-[#8b8176]">{locale === 'zh' ? '顧客評價' : 'Customer reviews'}</h2>
              <div className="space-y-3">
                {businessReviews.length > 0 ? (
                  businessReviews.map((review) => (
                    <article key={review.id} className="rounded-lg border border-[#e2d8cb] bg-[#fbf7f0] p-5">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-semibold text-[#2c2722]">{t(review.title, locale)}</h3>
                        <span className="text-sm text-[#d79526]">{'★'.repeat(review.rating)}</span>
                      </div>
                      <p className="text-sm leading-6 text-[#62584f]">{t(review.content, locale)}</p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-[#d5c8b9] bg-[#fbf7f0] p-6">
                    <p className="font-semibold text-[#2c2722]">{locale === 'zh' ? '還沒有站內評論' : 'No local reviews yet'}</p>
                    <p className="mt-2 text-sm leading-6 text-[#6d6258]">
                      {locale === 'zh'
                        ? '這裡會顯示經過整理的社區評論。'
                        : 'Community reviews will appear here once they are collected and reviewed.'}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {realPhotos.length > 0 ? (
              <section id="photos" className="border-b border-[#e2d8cb] py-8">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-semibold text-[#2c2722]">{locale === 'zh' ? '照片' : 'Photos'}</h2>
                  </div>
                  <Camera className="h-6 w-6 text-[#bd2730]" aria-hidden="true" />
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  {realPhotos.map((imageUrl, index) => (
                    <div key={`${imageUrl}-${index}`} className="relative h-36 overflow-hidden rounded-lg border border-[#e2d8cb] bg-[#eadfce]">
                      <BusinessImage
                        imageUrl={imageUrl}
                        label={`${displayName} ${locale === 'zh' ? '照片' : 'photo'} ${index + 1}`}
                        locale={locale}
                        category={category}
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section id="community" className="py-8">
              <div className="rounded-lg border border-[#e2d8cb] bg-[#fbf7f0] p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#bd2730]/10 text-[#bd2730]">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-[#2c2722]">{locale === 'zh' ? '社區資料修正' : 'Community corrections'}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d6258]">
                      {showClaimPrompt
                        ? locale === 'zh'
                          ? '如果這是你的商家，歡迎免費認領；如果資訊有誤，請送出回報。'
                          : 'If this is your business, claim it free. If anything is wrong, send a correction for review.'
                        : locale === 'zh'
                          ? '若資料有誤，請送出回報，我們審核後會更新。'
                          : 'If any detail is wrong, send a correction and we will review it.'}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      {showClaimPrompt ? (
                        <Link
                          href={claimHref}
                          className="inline-flex h-10 items-center justify-center rounded-md bg-[#bd2730] px-4 text-sm font-semibold text-white transition hover:bg-[#a91f27]"
                        >
                          {locale === 'zh' ? '免費認領此商家' : 'Claim this listing free'}
                        </Link>
                      ) : null}
                      {websiteHref ? (
                        <a
                          href={websiteHref}
                          target="_blank"
                          rel="noreferrer"
                          data-contact-action="website"
                          className="inline-flex h-10 items-center justify-center rounded-md border border-[#d7cabe] bg-white px-4 text-sm font-semibold text-[#3d342e] transition hover:border-[#bd2730] hover:text-[#bd2730]"
                        >
                          {locale === 'zh' ? '查看網站' : 'Visit website'}
                        </a>
                      ) : null}
                      <Link
                        href={withLocale(locale, advertisePath)}
                        className="inline-flex h-10 items-center justify-center rounded-md border border-[#d7cabe] bg-white px-4 text-sm font-semibold text-[#3d342e] transition hover:border-[#bd2730] hover:text-[#bd2730]"
                      >
                        {locale === 'zh' ? '推廣這家商家' : 'Promote this business'}
                      </Link>
                    </div>
                    <div className="mt-5 max-w-2xl">
                      <ReportIssueForm entitySlug={business.slug} entityType="business" locale={locale} />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            {showInquiryForm ? (
              <section
                id="inquiry"
                className="scroll-mt-24 rounded-lg border border-[#dfd4c8] bg-[#fbf7f0] p-5 shadow-[0_18px_45px_rgba(84,58,32,0.08)]"
              >
                <BusinessInquiryForm
                  businessName={displayName}
                  businessSlug={business.slug}
                  locale={locale}
                  privacyHref={withLocale(locale, '/privacy')}
                />
              </section>
            ) : null}

            <section className="overflow-hidden rounded-lg border border-[#dfd4c8] bg-[#fbf7f0] shadow-[0_18px_45px_rgba(84,58,32,0.08)]">
              <div className="relative h-48 overflow-hidden bg-[#e8efe5]">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(92,111,91,0.14)_1px,transparent_1px),linear-gradient(0deg,rgba(92,111,91,0.14)_1px,transparent_1px)] bg-[size:46px_46px]" />
                <div className="absolute inset-x-0 top-1/2 h-5 -translate-y-1/2 bg-[#d9cdbb]/70" />
                <div className="absolute left-1/2 top-0 h-full w-5 -translate-x-1/2 bg-[#d9cdbb]/70" />
                <div className="absolute left-[52%] top-[38%] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#bd2730]/15">
                  <MapPin className="h-9 w-9 fill-[#bd2730] text-[#bd2730]" aria-hidden="true" />
                </div>
                <span className="absolute left-4 top-4 rounded-md bg-white/80 px-2.5 py-1 text-xs font-semibold text-[#5f554c]">
                  {business.city}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 h-5 w-5 shrink-0 text-[#5f554c]" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-[#2c2722]">{addressLabel}</p>
                    <p className="text-sm text-[#766b61]">{business.region}</p>
                  </div>
                </div>
                {directionsHref ? (
                  <a
                    href={directionsHref}
                    target="_blank"
                    rel="noreferrer"
                    data-contact-action="directions"
                    className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#bd2730] bg-white text-sm font-semibold text-[#bd2730] transition hover:bg-[#bd2730] hover:text-white"
                  >
                    <Route className="h-4 w-4" aria-hidden="true" />
                    {locale === 'zh' ? '查看路線' : 'Directions'}
                  </a>
                ) : null}
              </div>
            </section>

            {hasContactDetails ? (
              <section className="rounded-lg border border-[#dfd4c8] bg-[#fbf7f0] p-5 shadow-[0_18px_45px_rgba(84,58,32,0.08)]">
                <h2 className="mb-4 text-lg font-semibold text-[#2c2722]">{locale === 'zh' ? '聯絡資訊' : 'Contact'}</h2>
                <div className="space-y-3 text-sm text-[#5f554c]">
                  {business.phone && phoneLink ? (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-[#bd2730]" aria-hidden="true" />
                      <a href={phoneLink} data-contact-action="call" className="font-semibold text-[#bd2730] hover:text-[#8f1c22]">
                        {business.phone}
                      </a>
                    </div>
                  ) : null}
                  {business.email && emailHref ? (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-[#5f554c]" aria-hidden="true" />
                      <a href={emailHref} className="transition hover:text-[#bd2730]">
                        {business.email}
                      </a>
                    </div>
                  ) : null}
                  {contactWebsite ? (
                    <div className="flex items-center gap-3">
                      <Globe2 className="h-4 w-4 text-[#5f554c]" aria-hidden="true" />
                      <a
                        href={contactWebsite}
                        target="_blank"
                        rel="noreferrer"
                        data-contact-action="website"
                        className="transition hover:text-[#bd2730]"
                      >
                        {contactWebsiteLabel}
                      </a>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {business.hours.length > 0 ? (
              <section className="rounded-lg border border-[#dfd4c8] bg-[#fbf7f0] p-5 shadow-[0_18px_45px_rgba(84,58,32,0.08)]">
                <h2 className="mb-4 text-lg font-semibold text-[#2c2722]">{locale === 'zh' ? '營業時間' : 'Business hours'}</h2>
                <div className="space-y-2">
                  {business.hours.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4 rounded-md bg-[#f7f1e8] px-3 py-2 text-sm">
                      <span className="font-semibold text-[#3b332d]">{businessHoursLabel(row.label, locale)}</span>
                      <span className="text-right text-[#6d6258]">{businessHoursValue(row.value, locale)}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {owner ? (
              <section className="rounded-lg border border-[#dfd4c8] bg-[#fbf7f0] p-5 shadow-[0_18px_45px_rgba(84,58,32,0.08)]">
                <h2 className="mb-4 text-lg font-semibold text-[#2c2722]">{locale === 'zh' ? '商家擁有者' : 'Business owner'}</h2>
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg text-sm font-bold text-white ${owner.avatarColor}`}>
                    {owner.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-[#2c2722]">
                      <span lang="en">{owner.name}</span> · <span lang="zh">{owner.nameZh}</span>
                    </p>
                    <p className="text-sm text-[#766b61]">{owner.city}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#6d6258]">{t(owner.bio, locale)}</p>
              </section>
            ) : null}

            <section className="rounded-lg border border-[#dfd4c8] bg-[#f4efe5] p-5 shadow-[0_18px_45px_rgba(84,58,32,0.08)]">
              <div className="flex gap-3">
                {trustLevel === 'owner_verified' ? (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#4d744b] text-white">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  </div>
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#e6ddd1] text-[#6d6258]">
                    <Store className="h-5 w-5" aria-hidden="true" />
                  </div>
                )}
                <div>
                  <h2 className="font-semibold text-[#2c2722]">{trustLabel}</h2>
                  <p className="mt-1 text-sm leading-6 text-[#6d6258]">{trustExplanation}</p>
                  <p className="mt-3 text-xs font-semibold text-[#6d6258]">
                    {locale === 'zh'
                      ? `發現錯誤？請在本頁回報，${verificationBrandLabelZh} 會核對後更新。`
                      : `Spotted a mistake? Report it on this page and ${verificationBrandLabel} will check and update it.`}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        {/* Hidden when no listing in the category is worth suggesting (#473). */}
        {relatedCategoryBusinesses.length > 0 ? (
          <section className="mt-8 space-y-4 border-t border-[#e2d8cb] pt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-semibold text-[#2c2722]">
                {relatedAllInSameCity
                  ? locale === 'zh'
                    ? '同城市／分類的其他選擇'
                    : 'More options in the same city and category'
                  : locale === 'zh'
                    ? '同分類的其他選擇'
                    : 'More options in this category'}
              </h2>
              {category ? (
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <Link
                    href={withLocale(locale, metroCategoryPath(category.slug))}
                    className="text-sm font-semibold text-[#bd2730] hover:text-[#8f1c22]"
                  >
                    {getMetroCategoryTitle(category, site, locale)}
                  </Link>
                  {relatedCategoryBusinesses.length > 0 ? (
                    <Link
                      href={withLocale(locale, cityCategoryPath(business.city, category.slug))}
                      className="text-sm font-semibold text-[#bd2730] hover:text-[#8f1c22]"
                    >
                      {locale === 'zh' ? '查看城市頁面' : 'View city landing page'}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {relatedCategoryBusinesses.map((item) => (
                <BusinessCard
                  key={item.id}
                  business={item}
                  locale={locale}
                  hideIllustration
                  localizedLocationLabel={item.address ?? item.serviceAreaText ?? `${item.city}, ${site.stateCode}`}
                  stateLabel={site.stateCode || site.stateRegion}
                />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
