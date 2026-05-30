import { notFound, permanentRedirect } from 'next/navigation';

import {
  getLocalizedNewsArchivePath,
  getLocalizedNewsArticlePath,
  getLocalizedNewsPath,
  getNewsRouteSegment,
} from '@/lib/arizona-news';
import {
  canServeArizonaOnlyContent,
  getArizonaOnlyRoutePath,
  isArizonaOnlyRouteSegments,
} from '@/lib/arizona-only-routes';
import {
  addBusinessMetadata,
  adminMetadata,
  articleMetadata,
  businessMetadata,
  cityCategoryMetadata,
  cityContentUnavailableMetadata,
  communityMetadata,
  communityRadarMetadata,
  communityNewsMetadata,
  communityPostMetadata,
  dashboardMetadata,
  discoverArizonaArticleMetadata,
  discoverArizonaCategoryMetadata,
  discoverArizonaMetadata,
  directoryMetadata,
  eventMetadata,
  guideMetadata,
  hiddenArizonaEntryMetadata,
  hiddenArizonaMetadata,
  homeMetadata,
  profileMetadata,
  publisherPageMetadata,
  relocationMetadata,
} from '@/lib/page-metadata';
import { isLocale } from '@/lib/i18n';
import { isPublisherPageSlug } from '@/lib/publisher-pages';
import { hiddenArizonaSegmentToKind } from '@/lib/hidden-arizona';
import { getDiscoveryCategory } from '@/lib/discover-arizona';
import { requireAuthenticatedPageUser, requireStaffPageContext } from '@/lib/page-auth';
import { appendSearch, withLocale } from '@/lib/routing';
import { getCurrentSiteProfile } from '@/lib/site-config.server';
import {
  AddBusinessPageView,
  AdminPageView,
  ArticleDetailPageView,
  BusinessDetailPageView,
  CityCategoryPageView,
  CommunityRadarPageView,
  CommunityPostDetailPageView,
  DashboardPageView,
  DiscoverArizonaCategoryPageView,
  DiscoverArizonaDetailPageView,
  DiscoverArizonaHubPageView,
  DirectoryPageView,
  EventDetailPageView,
  GuideDetailPageView,
  HiddenArizonaDetailPageView,
  HiddenArizonaHubPageView,
  NewsArchivePageView,
  ProfilePageView,
  RelocationGuidePageView,
} from '@/views/site-pages';
import { CommunityPageView } from '@/views/community-page';
import { HomePageView } from '@/views/home-page';
import { PublisherPageView } from '@/views/publisher-pages';
import type { DiscoveryCategory, HiddenArizonaKind } from '@/lib/types';

type PageProps = {
  params: Promise<{
    locale: string;
    segments?: string[];
  }>;
  searchParams: Promise<{
    q?: string;
    city?: string;
    category?: string;
    kind?: string;
    tag?: string;
    minRating?: string;
    bucket?: string;
    series?: string;
    sourcePolicy?: string;
    lane?: string;
    year?: string;
    month?: string;
    sort?: string;
    view?: string;
    businessName?: string;
    businessSlug?: string;
    page?: string;
  }>;
};

export const dynamic = 'force-dynamic';

function buildSearchString(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.length > 0) {
      search.set(key, value);
    }
  }

  return search.toString();
}

function isSiteNewsRoute(segments: string[], routeSegment: string): boolean {
  return segments[0] === routeSegment;
}

export async function generateMetadata({ params, searchParams }: PageProps) {
  const { locale, segments = [] } = await params;
  if (!isLocale(locale)) {
    return {};
  }
  const query = await searchParams;
  const site = await getCurrentSiteProfile();
  const newsRouteSegment = getNewsRouteSegment(site);

  if (segments.length === 0) {
    return homeMetadata(locale, site);
  }

  if (isArizonaOnlyRouteSegments(segments) && !canServeArizonaOnlyContent(site)) {
    return cityContentUnavailableMetadata(
      locale,
      site,
      getArizonaOnlyRoutePath(segments),
      'Arizona-only content'
    );
  }

  if (segments[0] === 'business' && segments.length === 1) {
    return directoryMetadata(locale, '/business', query, site);
  }

  if (segments[0] === 'business' && segments.length === 2) {
    return (await businessMetadata(locale, segments[1], site)) ?? {};
  }

  if (segments[0] === 'business' && segments[1] && segments[2]) {
    return cityCategoryMetadata(locale, segments[1], segments[2], site) ?? {};
  }

  if (segments[0] === 'directory' && segments.length === 1) {
    return directoryMetadata(locale, '/business', query, site);
  }

  if (segments[0] === 'directory' && segments[1] === 'business' && segments[2]) {
    return (await businessMetadata(locale, segments[2], site)) ?? {};
  }

  if (segments[0] === 'directory' && segments[1] && segments[2]) {
    return cityCategoryMetadata(locale, segments[1], segments[2], site) ?? {};
  }

  if (segments[0] === 'relocation-guide' && segments.length === 1) {
    return relocationMetadata(locale);
  }

  if (segments[0] === 'hidden-arizona' && segments.length === 1) {
    return hiddenArizonaMetadata(locale);
  }

  if (segments[0] === 'hidden-arizona' && segments[1] && segments[2]) {
    const kind = hiddenArizonaSegmentToKind(segments[1]);
    return kind ? (await hiddenArizonaEntryMetadata(locale, kind, segments[2])) ?? {} : {};
  }

  if (segments[0] === 'discover-arizona' && segments.length === 1) {
    return discoverArizonaMetadata(locale);
  }

  if (segments[0] === 'discover-arizona' && segments[1] && segments.length === 2) {
    const category = getDiscoveryCategory(segments[1] as DiscoveryCategory);
    return category ? discoverArizonaCategoryMetadata(locale, category.slug) ?? {} : {};
  }

  if (segments[0] === 'discover-arizona' && segments[1] && segments[2]) {
    const category = getDiscoveryCategory(segments[1] as DiscoveryCategory);
    return category
      ? (await discoverArizonaArticleMetadata(locale, category.slug, segments[2])) ?? {}
      : {};
  }

  if (segments[0] === 'relocation-guide' && segments[1]) {
    return guideMetadata(locale, segments[1]) ?? {};
  }

  if (segments[0] === 'community' && segments.length === 1) {
    return communityMetadata(locale, site);
  }

  if (isSiteNewsRoute(segments, newsRouteSegment) && segments.length === 1) {
    return communityRadarMetadata(locale, site);
  }

  if (isSiteNewsRoute(segments, newsRouteSegment) && segments[1] === 'archive' && segments.length === 2) {
    return communityNewsMetadata(locale, query, site);
  }

  if (isSiteNewsRoute(segments, newsRouteSegment) && segments[1] && segments.length === 2) {
    return (await articleMetadata(locale, segments[1], site)) ?? {};
  }

  if (segments[0] === 'community' && segments[1] === 'radar' && segments.length === 2) {
    return communityRadarMetadata(locale, site);
  }

  if (segments[0] === 'community' && segments[1] === 'news' && segments.length === 2) {
    return communityNewsMetadata(locale, query, site);
  }

  if (segments[0] === 'community' && segments[1] === 'events' && segments[2]) {
    return eventMetadata(locale, segments[2]) ?? {};
  }

  if (segments[0] === 'community' && segments[1] === 'news' && segments[2]) {
    return (await articleMetadata(locale, segments[2], site)) ?? {};
  }

  if (segments[0] === 'community' && segments[1] === 'board' && segments[2]) {
    return communityPostMetadata(locale, 'board', segments[2]) ?? {};
  }

  if (segments[0] === 'community' && segments[1] === 'classifieds' && segments[2]) {
    return communityPostMetadata(locale, 'classified', segments[2]) ?? {};
  }

  if (segments[0] === 'add-business') {
    return addBusinessMetadata(locale);
  }

  if (segments[0] && segments.length === 1 && isPublisherPageSlug(segments[0])) {
    return publisherPageMetadata(locale, segments[0], site);
  }

  if (segments[0] === 'profile' && segments[1]) {
    return profileMetadata(locale, segments[1]) ?? {};
  }

  if (segments[0] === 'dashboard') {
    return dashboardMetadata(locale);
  }

  if (segments[0] === 'admin') {
    return adminMetadata(locale);
  }

  return {};
}

export default async function LocalizedPage({ params, searchParams }: PageProps) {
  const { locale, segments = [] } = await params;
  if (!isLocale(locale)) {
    notFound();
  }
  const site = await getCurrentSiteProfile();
  const newsRouteSegment = getNewsRouteSegment(site);

  if (segments.length === 0) {
    return <HomePageView locale={locale} site={site} />;
  }

  if (isArizonaOnlyRouteSegments(segments) && !canServeArizonaOnlyContent(site)) {
    notFound();
  }

  if (segments[0] === 'business' && segments.length === 1) {
    return <DirectoryPageView locale={locale} searchParams={await searchParams} site={site} />;
  }

  if (segments[0] === 'business' && segments.length === 2) {
    const rendered = await BusinessDetailPageView({ locale, slug: segments[1], site });
    if (!rendered) notFound();
    return rendered;
  }

  if (segments[0] === 'business' && segments[1] && segments[2]) {
    const rendered = await CityCategoryPageView({ locale, city: segments[1], category: segments[2], site });
    if (!rendered) notFound();
    return rendered;
  }

  if (segments[0] === 'directory' && segments.length === 1) {
    permanentRedirect(appendSearch(withLocale(locale, '/business'), buildSearchString(await searchParams)));
  }

  if (segments[0] === 'directory' && segments[1] === 'business' && segments[2]) {
    permanentRedirect(withLocale(locale, `/business/${segments[2]}`));
  }

  if (segments[0] === 'directory' && segments[1] && segments[2]) {
    permanentRedirect(withLocale(locale, `/business/${segments[1]}/${segments[2]}`));
  }

  if (segments[0] === 'relocation-guide' && segments.length === 1) {
    return await RelocationGuidePageView({ locale });
  }

  if (segments[0] === 'hidden-arizona' && segments.length === 1) {
    return await HiddenArizonaHubPageView({ locale, searchParams: await searchParams });
  }

  if (segments[0] === 'hidden-arizona' && segments[1] && segments[2]) {
    const kind = hiddenArizonaSegmentToKind(segments[1]) as HiddenArizonaKind | undefined;
    if (!kind) {
      notFound();
    }
    const rendered = await HiddenArizonaDetailPageView({ locale, kind, slug: segments[2] });
    if (!rendered) notFound();
    return rendered;
  }

  if (segments[0] === 'discover-arizona' && segments.length === 1) {
    return <DiscoverArizonaHubPageView locale={locale} />;
  }

  if (segments[0] === 'discover-arizona' && segments[1] && segments.length === 2) {
    const category = getDiscoveryCategory(segments[1] as DiscoveryCategory);
    if (!category) {
      notFound();
    }
    const rendered = await DiscoverArizonaCategoryPageView({ locale, category: category.slug });
    if (!rendered) notFound();
    return rendered;
  }

  if (segments[0] === 'discover-arizona' && segments[1] && segments[2]) {
    const category = getDiscoveryCategory(segments[1] as DiscoveryCategory);
    if (!category) {
      notFound();
    }
    const rendered = await DiscoverArizonaDetailPageView({
      locale,
      category: category.slug,
      slug: segments[2],
    });
    if (!rendered) notFound();
    return rendered;
  }

  if (segments[0] === 'relocation-guide' && segments[1]) {
    const rendered = await GuideDetailPageView({ locale, slug: segments[1] });
    if (!rendered) notFound();
    return rendered;
  }

  if (segments[0] === 'community' && segments.length === 1) {
    return await CommunityPageView({ locale, site });
  }

  if (isSiteNewsRoute(segments, newsRouteSegment) && segments.length === 1) {
    return await CommunityRadarPageView({ locale, searchParams: await searchParams, site });
  }

  if (isSiteNewsRoute(segments, newsRouteSegment) && segments[1] === 'archive' && segments.length === 2) {
    return await NewsArchivePageView({ locale, searchParams: await searchParams, site });
  }

  if (isSiteNewsRoute(segments, newsRouteSegment) && segments[1] && segments.length === 2) {
    const rendered = await ArticleDetailPageView({ locale, slug: segments[1], site });
    if (!rendered) notFound();
    return rendered;
  }

  if (segments[0] === 'community' && segments[1] === 'radar' && segments.length === 2) {
    const query = await searchParams;
    permanentRedirect(getLocalizedNewsPath(locale, site, buildSearchString(query)));
  }

  if (segments[0] === 'community' && segments[1] === 'news' && segments.length === 2) {
    const query = await searchParams;
    permanentRedirect(getLocalizedNewsArchivePath(locale, site, buildSearchString(query)));
  }

  if (segments[0] === 'community' && segments[1] === 'events' && segments[2]) {
    const rendered = await EventDetailPageView({ locale, slug: segments[2] });
    if (!rendered) notFound();
    return rendered;
  }

  if (segments[0] === 'community' && segments[1] === 'news' && segments[2]) {
    permanentRedirect(getLocalizedNewsArticlePath(locale, site, segments[2]));
  }

  if (segments[0] === 'community' && segments[1] === 'board' && segments[2]) {
    const rendered = CommunityPostDetailPageView({ locale, type: 'board', slug: segments[2] });
    if (!rendered) notFound();
    return rendered;
  }

  if (segments[0] === 'community' && segments[1] === 'classifieds' && segments[2]) {
    const rendered = CommunityPostDetailPageView({ locale, type: 'classified', slug: segments[2] });
    if (!rendered) notFound();
    return rendered;
  }

  if (segments[0] === 'add-business') {
    return <AddBusinessPageView locale={locale} searchParams={await searchParams} site={site} />;
  }

  if (segments[0] && segments.length === 1 && isPublisherPageSlug(segments[0])) {
    return await PublisherPageView({ locale, slug: segments[0] });
  }

  if (segments[0] === 'profile' && segments[1]) {
    const rendered = await ProfilePageView({ locale, slug: segments[1] });
    if (!rendered) notFound();
    return rendered;
  }

  if (segments[0] === 'dashboard') {
    await requireAuthenticatedPageUser(locale, withLocale(locale, '/dashboard'));
    return <DashboardPageView locale={locale} />;
  }

  if (segments[0] === 'admin') {
    await requireStaffPageContext();
    return <AdminPageView locale={locale} />;
  }

  notFound();
}
