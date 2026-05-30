import { resolveArticleText } from '@/lib/article-localization';
import type { Metadata } from 'next';

import {
  getNewsArchivePath,
  getNewsArticlePath,
  getNewsPath,
} from '@/lib/arizona-news';
import { resolveLocalizedBusinessDetailText } from '@/lib/business-localization';
import {
  getArticleBySlugAsync,
  isLegacyArticle,
  resolveArticleArchiveFilters,
  type ArticleArchiveSearchParams,
  getBusinessCategories,
  getCommunityPostBySlug,
  getEventBySlug,
  getGuideBySlug,
  getProfileBySlug,
  shouldNoIndexCommunityPost,
} from '@/lib/content';
import { getDiscoverArticleBySlug, getDiscoveryCategory } from '@/lib/discover-arizona';
import { getDirectoryBusinessBySlug, shouldNoIndexDirectoryBusiness } from '@/lib/directory';
import { getHiddenArizonaEntryBySlug, getHiddenArizonaEntryPath } from '@/lib/hidden-arizona';
import { resolveLocalizedHiddenArizonaSummaryText } from '@/lib/hidden-arizona-localization';
import { t } from '@/lib/i18n';
import { getPublisherPageCopy, type PublisherPageSlug } from '@/lib/publisher-pages';
import { buildMetadata } from '@/lib/seo';
import {
  defaultSiteProfile,
  hasLiveDirectoryData,
  hasLiveNewsData,
  shouldNoIndexSiteProfile,
  type SiteProfile,
} from '@/lib/site-config';
import { appendSearch } from '@/lib/routing';
import type { CommunityPostType, DiscoveryCategory, HiddenArizonaKind, Locale } from '@/lib/types';

type DirectoryMetadataSearchParams = {
  q?: string;
  city?: string;
  category?: string;
  minRating?: string;
  sort?: string;
  page?: string;
};

function parseDirectoryPageNumber(value?: string): number {
  if (!value) {
    return 1;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 1 ? Math.floor(parsed) : 1;
}

function siteNewsLabel(site: SiteProfile, locale: Locale): string {
  if (site.key === defaultSiteProfile.key) {
    return locale === 'zh' ? '亞利桑那新聞' : 'Arizona News';
  }

  return locale === 'zh' ? `${site.regionNameZh}新聞` : `${site.regionName} News`;
}

function buildNewsArchiveMetadataPath(
  site: SiteProfile,
  searchParams?: ArticleArchiveSearchParams
): string {
  const filters = resolveArticleArchiveFilters(searchParams);
  const params = new URLSearchParams();

  if (filters.bucket === 'legacy') {
    params.set('bucket', 'legacy');
  }
  if (filters.series) {
    params.set('series', filters.series);
  }
  if (filters.sourcePolicy) {
    params.set('sourcePolicy', filters.sourcePolicy);
  }
  if (filters.year) {
    params.set('year', String(filters.year));
  }
  if (filters.month) {
    params.set('month', String(filters.month));
  }
  if (filters.page > 1) {
    params.set('page', String(filters.page));
  }

  return getNewsArchivePath(site, params.toString());
}

export function homeMetadata(locale: Locale, site: SiteProfile = defaultSiteProfile): Metadata {
  return buildMetadata({
    title: locale === 'zh' ? site.seo.title.zh : site.seo.title.en,
    description: locale === 'zh' ? site.seo.description.zh : site.seo.description.en,
    path: '/',
    locale,
    site,
    noIndex: shouldNoIndexSiteProfile(site),
  });
}

export function cityContentUnavailableMetadata(
  locale: Locale,
  site: SiteProfile,
  path: string,
  label = 'City content'
): Metadata {
  return buildMetadata({
    title:
      locale === 'zh'
        ? `${site.brandName} ${label} 需要本地內容來源`
        : `${site.brandName} ${label} Requires Local Content Sources`,
    description:
      locale === 'zh'
        ? `${site.brandName} 尚未接入此頁所需的城市專屬內容，不會回退顯示 ChineseArizona 或 Arizona 內容。`
        : `${site.brandName} does not have city-specific content connected for this page and will not fall back to ChineseArizona or Arizona content.`,
    path,
    locale,
    site,
    noIndex: true,
  });
}

export function directoryMetadata(
  locale: Locale,
  path = '/business',
  searchParams?: DirectoryMetadataSearchParams,
  site: SiteProfile = defaultSiteProfile
): Metadata {
  if (!hasLiveDirectoryData(site)) {
    return buildMetadata({
      title:
        locale === 'zh'
          ? `${site.brandName} 商家目錄需要本地資料`
          : `${site.brandName} Business Directory Requires Local Data`,
      description:
        locale === 'zh'
          ? `${site.brandName} 尚未接入城市專屬商家資料，不會回退顯示 ChineseArizona 商家。`
          : `${site.brandName} does not have city-specific business data connected yet and will not fall back to ChineseArizona listings.`,
      path,
      locale,
      site,
      noIndex: true,
    });
  }

  const currentPage = parseDirectoryPageNumber(searchParams?.page);
  const hasFilteredQuery = Boolean(
    searchParams?.q?.trim() ||
      searchParams?.city ||
      searchParams?.category ||
      searchParams?.minRating ||
      (searchParams?.sort && searchParams.sort !== 'featured')
  );
  const baseTitle = locale === 'zh' ? `華人商家 | ${site.brandName}` : `Chinese Businesses | ${site.brandName}`;
  const title =
    currentPage > 1 && !hasFilteredQuery
      ? locale === 'zh'
        ? `華人商家第 ${currentPage} 頁 | ${site.brandName}`
        : `Chinese Businesses Page ${currentPage} | ${site.brandName}`
      : baseTitle;
  const pathWithPage = currentPage > 1 && !hasFilteredQuery ? appendSearch(path, `page=${currentPage}`) : path;

  return buildMetadata({
    title,
    description:
      locale === 'zh'
        ? `可依城市、分類與評分篩選的${site.regionNameZh}華人商家。`
        : `Chinese businesses in ${site.regionName}, filterable by city, category, and rating.`,
    path: pathWithPage,
    locale,
    site,
  });
}

export function addBusinessMetadata(locale: Locale): Metadata {
  return buildMetadata({
    title: locale === 'zh' ? '新增或認領商家 | ChineseArizona' : 'Add or Claim a Business | ChineseArizona',
    description:
      locale === 'zh'
        ? '用商家主理人帳號送出商家認領或新商家申請，並進入人工審核流程。'
        : 'Use an owner account to submit a business claim or new listing request for manual review.',
    path: '/add-business',
    locale,
  });
}

export function publisherPageMetadata(
  locale: Locale,
  slug: PublisherPageSlug,
  site: SiteProfile = defaultSiteProfile
): Metadata {
  const page = getPublisherPageCopy(slug, locale, site);

  return buildMetadata({
    title: `${page.title} | ${site.brandName}`,
    description: page.description,
    path: `/${slug}`,
    locale,
    site,
  });
}

export function authMetadata(locale: Locale): Metadata {
  return buildMetadata({
    title: locale === 'zh' ? '商家與供稿帳號 | ChineseArizona' : 'Owner & Contributor Account | ChineseArizona',
    description:
      locale === 'zh'
        ? '用 email／密碼或 Google 登入商家 / 供稿帳號，並回到你原本的認領、發文、儲存或後台流程。'
        : 'Log in with email/password or Google for owner and contributor actions, then return to the claim, posting, saved-item, or dashboard flow you started.',
    path: '/auth',
    locale,
    noIndex: true,
  });
}

export function resetPasswordMetadata(locale: Locale): Metadata {
  return buildMetadata({
    title: locale === 'zh' ? '重設密碼 | ChineseArizona' : 'Reset Password | ChineseArizona',
    description:
      locale === 'zh'
        ? '要求重設密碼信件，或在驗證後直接設定新的帳號密碼。'
        : 'Request a password reset email or set a new password after opening your recovery link.',
    path: '/auth/reset-password',
    locale,
    noIndex: true,
  });
}

export function communityMetadata(locale: Locale, site: SiteProfile = defaultSiteProfile): Metadata {
  if (site.key !== defaultSiteProfile.key) {
    return buildMetadata({
      title:
        locale === 'zh'
          ? `${site.brandName} 社群內容需要本地來源`
          : `${site.brandName} Community Requires Local Sources`,
      description:
        locale === 'zh'
          ? `${site.brandName} 尚未接入城市專屬社群內容，不會回退顯示 ChineseArizona 社群內容。`
          : `${site.brandName} does not have city-specific community content connected yet and will not fall back to ChineseArizona community content.`,
      path: '/community',
      locale,
      site,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: locale === 'zh' ? '社群資源 | ChineseArizona' : 'Community Resources | ChineseArizona',
    description:
      locale === 'zh'
        ? '亞利桑那華人學校、教會、乒乓球俱樂部與社群活動集中在同一個雙語入口。'
        : 'A bilingual guide to Arizona Chinese community schools, churches, ping pong clubs, and events.',
    path: '/community',
    locale,
    site,
  });
}

export function communityRadarMetadata(locale: Locale, site: SiteProfile = defaultSiteProfile): Metadata {
  if (!hasLiveNewsData(site)) {
    return buildMetadata({
      title:
        locale === 'zh'
          ? `${site.brandName} 新聞需要本地來源`
          : `${site.brandName} News Requires Local Sources`,
      description:
        locale === 'zh'
          ? `${site.brandName} 尚未接入城市專屬新聞來源，不會回退顯示 Arizona News。`
          : `${site.brandName} does not have city-specific news sources connected yet and will not fall back to Arizona News.`,
      path: site.news.routePath,
      locale,
      site,
      noIndex: true,
    });
  }

  const newsLabel = siteNewsLabel(site, locale);

  return buildMetadata({
    title: `${newsLabel} | ${site.brandName}`,
    description:
      locale === 'zh'
        ? `每 5 分鐘更新的${newsLabel}首頁，整理住房、官方、社群與新店資訊成可用的雙語摘要與來源連結。`
        : `A live ${newsLabel} homepage updated every 5 minutes with bilingual summaries and source links for housing, official, community, and opening updates.`,
    path: getNewsPath(site),
    locale,
    site,
  });
}

export function communityNewsMetadata(
  locale: Locale,
  searchParams?: ArticleArchiveSearchParams,
  site: SiteProfile = defaultSiteProfile
): Metadata {
  if (!hasLiveNewsData(site)) {
    return buildMetadata({
      title:
        locale === 'zh'
          ? `${site.brandName} 新聞檔案需要本地來源`
          : `${site.brandName} News Archive Requires Local Sources`,
      description:
        locale === 'zh'
          ? `${site.brandName} 尚未接入城市專屬文章資料，不會回退顯示 Arizona News 檔案。`
          : `${site.brandName} does not have city-specific article data connected yet and will not fall back to the Arizona News archive.`,
      path: site.news.archivePath,
      locale,
      site,
      noIndex: true,
    });
  }

  const filters = resolveArticleArchiveFilters(searchParams);
  const isLegacyBucket = filters.bucket === 'legacy';
  const currentPage = filters.page;
  const newsLabel = siteNewsLabel(site, locale);
  const baseTitle = isLegacyBucket
    ? locale === 'zh'
      ? `${newsLabel} 舊聞檔案 | ${site.brandName}`
      : `${newsLabel} Legacy Archive | ${site.brandName}`
    : locale === 'zh'
      ? `${newsLabel} 檔案 | ${site.brandName}`
      : `${newsLabel} Archive | ${site.brandName}`;
  const title =
    currentPage > 1
      ? locale === 'zh'
        ? `${baseTitle.replace(` | ${site.brandName}`, '')}第 ${currentPage} 頁 | ${site.brandName}`
        : `${baseTitle.replace(` | ${site.brandName}`, '')} Page ${currentPage} | ${site.brandName}`
      : baseTitle;

  return buildMetadata({
    title,
    description:
      isLegacyBucket
        ? locale === 'zh'
          ? '瀏覽歷史社群轉載與舊聞檔案。這些頁面仍可存取，但不作為搜尋收錄主入口。'
          : 'Browse the historical community-wire and legacy archive. These pages remain reachable, but they are no longer primary indexed entry points.'
        : locale === 'zh'
          ? '瀏覽目前主打的原創摘要、系列觀察與最新編輯內容。'
          : 'Browse current editorial coverage, including original summaries, recurring series, and current published work.',
    path: buildNewsArchiveMetadataPath(site, searchParams),
    locale,
    site,
    noIndex: isLegacyBucket,
  });
}

export function relocationMetadata(locale: Locale): Metadata {
  return buildMetadata({
    title: locale === 'zh' ? '搬遷指南 | ChineseArizona' : 'Relocation Guide | ChineseArizona',
    description:
      locale === 'zh'
        ? '整合搬家、MVD、學校、公用事業與醫療資源的新手中心。'
        : 'A newcomer resource center covering moving, MVD, schools, utilities, and healthcare.',
    path: '/relocation-guide',
    locale,
  });
}

export function hiddenArizonaMetadata(locale: Locale): Metadata {
  return buildMetadata({
    title: locale === 'zh' ? '亞利桑那秘境 | ChineseArizona' : 'Hidden Arizona | ChineseArizona',
    description:
      locale === 'zh'
        ? '授權同步的 Atlas Obscura Arizona 地點、故事、清單與行程探索中心。'
        : 'A bilingual hub for licensed Atlas Obscura Arizona places, stories, lists, and itineraries.',
    path: '/hidden-arizona',
    locale,
  });
}

export function discoverArizonaMetadata(locale: Locale): Metadata {
  return buildMetadata({
    title: locale === 'zh' ? '探索亞利桑那 | ChineseArizona' : 'Discover Arizona | ChineseArizona',
    description:
      locale === 'zh'
        ? '把 Arizona 旅行內容整理成雙語文章、分類頁與 Hidden Arizona 延伸探索。'
        : 'A bilingual Arizona travel hub with category pages, usable articles, and scenic follow-through.',
    path: '/discover-arizona',
    locale,
  });
}

export function discoverArizonaCategoryMetadata(
  locale: Locale,
  category: DiscoveryCategory
): Metadata | null {
  const categoryRecord = getDiscoveryCategory(category);
  if (!categoryRecord) {
    return null;
  }

  return buildMetadata({
    title: `${t(categoryRecord.title, locale)} | ChineseArizona`,
    description: t(categoryRecord.description, locale),
    path: `/discover-arizona/${category}`,
    locale,
  });
}

export async function discoverArizonaArticleMetadata(
  locale: Locale,
  category: DiscoveryCategory,
  slug: string
): Promise<Metadata | null> {
  const article = await getDiscoverArticleBySlug(slug);
  if (!article || article.primaryCategory !== category || article.queueStatus !== 'published' || !article.embedEnabled) {
    return null;
  }

  return buildMetadata({
    title: `${t(article.title, locale)} | ChineseArizona`,
    description: t(article.excerpt, locale),
    path: `/discover-arizona/${category}/${slug}`,
    locale,
    image: article.heroImageUrl,
  });
}

export function dashboardMetadata(locale: Locale): Metadata {
  return buildMetadata({
    title: locale === 'zh' ? '後台 | ChineseArizona' : 'Dashboard | ChineseArizona',
    description:
      locale === 'zh'
        ? '管理商家、認領與帳號活動。'
        : 'Manage listings, claims, and account activity.',
    path: '/dashboard',
    locale,
    noIndex: true,
  });
}

export function profileSettingsMetadata(locale: Locale): Metadata {
  return buildMetadata({
    title: locale === 'zh' ? '編輯個人資料 | ChineseArizona' : 'Edit Your Profile | ChineseArizona',
    description:
      locale === 'zh'
        ? '更新你的站內名稱、個人簡介、頭像連結，以及帳號 email / 密碼設定。'
        : 'Update your public handle, profile details, avatar, and account email or password settings.',
    path: '/dashboard/profile',
    locale,
    noIndex: true,
  });
}

export function adminMetadata(locale: Locale): Metadata {
  return buildMetadata({
    title: locale === 'zh' ? '管理與審核中心 | ChineseArizona' : 'Admin & Moderation Center | ChineseArizona',
    description:
      locale === 'zh'
        ? '整合檢舉、認領與社群風險管理的管理中心。'
        : 'Admin surface for moderation, claim review, and community risk management.',
    path: '/admin',
    locale,
    noIndex: true,
  });
}

export async function businessMetadata(
  locale: Locale,
  slug: string,
  site: SiteProfile = defaultSiteProfile
): Promise<Metadata | null> {
  if (!hasLiveDirectoryData(site)) {
    return null;
  }

  const business = await getDirectoryBusinessBySlug(slug);
  if (!business) {
    return null;
  }

  const localizedBusinessText = await resolveLocalizedBusinessDetailText(business, locale);

  return buildMetadata({
    title: `${t(business.name, locale)} | ${site.brandName}`,
    description: localizedBusinessText.shortDescription,
    path: `/business/${business.slug}`,
    locale,
    site,
    image: business.heroImage ?? undefined,
    noIndex: shouldNoIndexDirectoryBusiness(business),
  });
}

export function cityCategoryMetadata(
  locale: Locale,
  city: string,
  categorySlug: string,
  site: SiteProfile = defaultSiteProfile
): Metadata | null {
  if (!hasLiveDirectoryData(site)) {
    return null;
  }

  const category = getBusinessCategories().find((item) => item.slug === categorySlug);
  if (!category) {
    return null;
  }

  const title = `${t(category.name, locale)} ${locale === 'zh' ? `在 ${city}` : `in ${city}`} | ${site.brandName}`;
  return buildMetadata({
    title,
    description: t(category.description, locale),
    path: `/business/${city}/${category.slug}`,
    locale,
    site,
    noIndex: true,
  });
}

export function guideMetadata(locale: Locale, slug: string): Metadata | null {
  const guide = getGuideBySlug(slug);
  if (!guide) {
    return null;
  }

  return buildMetadata({
    title: `${t(guide.title, locale)} | ChineseArizona`,
    description: t(guide.excerpt, locale),
    path: `/relocation-guide/${guide.slug}`,
    locale,
    image: guide.heroImage,
  });
}

export function eventMetadata(locale: Locale, slug: string): Metadata | null {
  const event = getEventBySlug(slug);
  if (!event) {
    return null;
  }

  return buildMetadata({
    title: `${t(event.title, locale)} | ChineseArizona`,
    description: t(event.excerpt, locale),
    path: `/community/events/${event.slug}`,
    locale,
    image: event.heroImage,
  });
}

export async function hiddenArizonaEntryMetadata(
  locale: Locale,
  kind: HiddenArizonaKind,
  slug: string
): Promise<Metadata | null> {
  const entry = getHiddenArizonaEntryBySlug(kind, slug);
  if (!entry) {
    return null;
  }
  const localizedEntry = await resolveLocalizedHiddenArizonaSummaryText(entry, locale);

  return buildMetadata({
    title: `${localizedEntry.title} | ChineseArizona`,
    description: localizedEntry.excerpt,
    path: getHiddenArizonaEntryPath(entry),
    locale,
    image: entry.heroImage ?? undefined,
  });
}

export async function articleMetadata(
  locale: Locale,
  slug: string,
  site: SiteProfile = defaultSiteProfile
): Promise<Metadata | null> {
  if (!hasLiveNewsData(site)) {
    return null;
  }

  const article = await getArticleBySlugAsync(slug, site);
  if (!article) {
    return null;
  }

  const localizedArticle = await resolveArticleText(article, locale);

  return buildMetadata({
    title: `${localizedArticle.title} | ${site.brandName}`,
    description: localizedArticle.excerpt,
    path: getNewsArticlePath(site, article.slug),
    locale,
    site,
    image: article.heroImage,
    noIndex: isLegacyArticle(article, site),
  });
}

export function communityPostMetadata(
  locale: Locale,
  type: CommunityPostType,
  slug: string
): Metadata | null {
  const post = getCommunityPostBySlug(type, slug);
  if (!post) {
    return null;
  }

  return buildMetadata({
    title: `${t(post.title, locale)} | ChineseArizona`,
    description: t(post.excerpt, locale),
    path: `/community/${type === 'classified' ? 'classifieds' : 'board'}/${post.slug}`,
    locale,
    noIndex: shouldNoIndexCommunityPost(post),
  });
}

export function profileMetadata(locale: Locale, slug: string): Metadata | null {
  const profile = getProfileBySlug(slug);
  if (!profile) {
    return null;
  }

  return buildMetadata({
    title: `${profile.name} | ChineseArizona`,
    description: t(profile.bio, locale),
    path: `/profile/${profile.slug}`,
    locale,
    noIndex: true,
  });
}
