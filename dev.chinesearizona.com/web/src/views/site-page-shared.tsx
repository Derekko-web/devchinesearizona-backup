import { BusinessCard } from '@/components/BusinessCard';
import { DirectoryAdCardTracker } from '@/components/DirectoryAdCardTracker';
import { EmptyState } from '@/components/EmptyState';
import { resolveCitySiteBusinessImages } from '@/lib/city-site-business-images';
import { type BusinessBilingualDetails } from '@/lib/business-bilingual';
import {
  articleCategoryLabel,
  articleSeriesLabel,
  formatDate,
  freshnessTierLabel,
} from '@/lib/i18n';
import { withLocale } from '@/lib/routing';
import { defaultSiteProfile, type SiteProfile } from '@/lib/site-config';
import type { Article, Business, BusinessCategory, Locale, SortOption } from '@/lib/types';

export function sectionContainer(children: React.ReactNode) {
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>;
}

export function CityDataUnavailable({
  locale,
  title,
  description,
}: {
  locale: Locale;
  title?: string;
  description?: string;
}) {
  return sectionContainer(
    <div className="py-12">
      <EmptyState
        title={
          title ??
          (locale === 'zh'
            ? '此城市站點需要本地內容來源'
            : 'This city site needs local content sources')
        }
        description={
          description ??
          (locale === 'zh'
            ? '平臺不會回退顯示 ChineseArizona 的商家、新聞或生成內容。'
            : 'The platform will not fall back to ChineseArizona listings, news, or generated content.')
        }
      />
    </div>
  );
}

export function DirectoryListingCard({
  business,
  category,
  locale,
  pagePath,
  site = defaultSiteProfile,
  stateCode = defaultSiteProfile.stateCode,
}: {
  business: Business;
  category?: BusinessCategory;
  locale: Locale;
  pagePath: string;
  site?: SiteProfile;
  stateCode?: string;
}) {
  const images = resolveCitySiteBusinessImages(business, site, { category, locale });
  const content = (
    <BusinessCard
      business={business}
      category={category}
      locale={locale}
      imageUrlOverride={images.heroImage}
      imageAltOverride={images.usesContextualFallback ? images.altLabel : undefined}
      enableSponsoredClickTracking={Boolean(business.activeDirectoryAdCampaign)}
      localizedLocationLabel={business.address ?? business.serviceAreaText ?? `${business.city}, ${stateCode}`}
      stateLabel={stateCode}
    />
  );

  if (!business.activeDirectoryAdCampaign) {
    return content;
  }

  return (
    <DirectoryAdCardTracker
      businessId={business.id}
      campaignId={business.activeDirectoryAdCampaign.id}
      pagePath={pagePath}
    >
      {content}
    </DirectoryAdCardTracker>
  );
}

export function parsePageNumber(value?: string): number {
  if (!value) {
    return 1;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

export function siteNewsLabel(site: SiteProfile, locale: Locale): string {
  if (site.key === defaultSiteProfile.key) {
    return locale === 'zh' ? '亞利桑那新聞' : 'Arizona News';
  }

  return locale === 'zh' ? `${site.regionNameZh}新聞` : `${site.regionName} News`;
}

export function buildDirectoryHref(
  locale: Locale,
  values: {
    q?: string;
    city?: string;
    category?: string;
    language?: string;
    payment?: string;
    minRating?: number;
    sort?: SortOption;
    page?: number;
  }
) {
  const params = new URLSearchParams();
  const query = values.q?.trim();

  if (query) {
    params.set('q', query);
  }
  if (values.city) {
    params.set('city', values.city);
  }
  if (values.category) {
    params.set('category', values.category);
  }
  if (values.language) {
    params.set('language', values.language);
  }
  if (values.payment) {
    params.set('payment', values.payment);
  }
  if (values.minRating) {
    params.set('minRating', String(values.minRating));
  }
  if (values.sort && values.sort !== 'featured') {
    params.set('sort', values.sort);
  }
  if (values.page && values.page > 1) {
    params.set('page', String(values.page));
  }

  const search = params.toString();
  return `${withLocale(locale, '/business')}${search ? `?${search}` : ''}`;
}

export function ArticleMetaRow({
  article,
  locale,
  showDate = false,
}: {
  article: Article;
  locale: Locale;
  showDate?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
      <span>{articleCategoryLabel(article.category, locale)}</span>
      <span className="text-slate-300">/</span>
      <span>{articleSeriesLabel(article.series, locale)}</span>
      <span className="text-slate-300">/</span>
      <span>{freshnessTierLabel(article.freshnessTier, locale)}</span>
      {showDate ? (
        <>
          <span className="text-slate-300">/</span>
          <span className="tracking-normal text-slate-500">{formatDate(article.publishedAt, locale)}</span>
        </>
      ) : null}
    </div>
  );
}

export function cleanArizonaNewsCopy(value: string): string {
  return value
    .replace(/\bSignals\b/g, 'Indicators')
    .replace(/\bsignals\b/g, 'indicators')
    .replace(/\bSignal\b/g, 'Indicator')
    .replace(/\bsignal\b/g, 'indicator')
    .replace(/訊號/g, '資訊');
}

export function bilingualDetailsOf(business: Business): BusinessBilingualDetails {
  return {
    languages: business.languages,
    wechatId: business.wechatId,
    acceptsWeChatPay: Boolean(business.acceptsWeChatPay),
    acceptsAlipay: Boolean(business.acceptsAlipay),
    chineseMenuOrForms: Boolean(business.chineseMenuOrForms),
  };
}
