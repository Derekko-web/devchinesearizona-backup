import { notFound } from 'next/navigation';

import {
  addBusinessMetadata,
  adminMetadata,
  articleMetadata,
  businessMetadata,
  cityCategoryMetadata,
  communityMetadata,
  communityNewsMetadata,
  communityPostMetadata,
  dashboardMetadata,
  directoryMetadata,
  eventMetadata,
  guideMetadata,
  hiddenArizonaEntryMetadata,
  hiddenArizonaMetadata,
  profileMetadata,
  relocationMetadata,
} from '@/lib/page-metadata';
import { isLocale } from '@/lib/i18n';
import { hiddenArizonaSegmentToKind } from '@/lib/hidden-arizona';
import {
  AddBusinessPageView,
  AdminPageView,
  ArticleDetailPageView,
  BusinessDetailPageView,
  CityCategoryPageView,
  CommunityPageView,
  CommunityPostDetailPageView,
  DashboardPageView,
  DirectoryPageView,
  EventDetailPageView,
  GuideDetailPageView,
  HiddenArizonaDetailPageView,
  HiddenArizonaHubPageView,
  NewsArchivePageView,
  ProfilePageView,
  RelocationGuidePageView,
} from '@/views/site-pages';
import type { HiddenArizonaKind } from '@/lib/types';

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
    sort?: string;
    view?: string;
    businessName?: string;
    businessSlug?: string;
    page?: string;
  }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps) {
  const { locale, segments = [] } = await params;
  if (!isLocale(locale)) {
    return {};
  }

  if (segments.length === 0) {
    return directoryMetadata(locale, '/');
  }

  if (segments[0] === 'directory' && segments.length === 1) {
    return directoryMetadata(locale);
  }

  if (segments[0] === 'directory' && segments[1] === 'business' && segments[2]) {
    return (await businessMetadata(locale, segments[2])) ?? {};
  }

  if (segments[0] === 'directory' && segments[1] && segments[2]) {
    return cityCategoryMetadata(locale, segments[1], segments[2]) ?? {};
  }

  if (segments[0] === 'relocation-guide' && segments.length === 1) {
    return relocationMetadata(locale);
  }

  if (segments[0] === 'hidden-arizona' && segments.length === 1) {
    return hiddenArizonaMetadata(locale);
  }

  if (segments[0] === 'hidden-arizona' && segments[1] && segments[2]) {
    const kind = hiddenArizonaSegmentToKind(segments[1]);
    return kind ? hiddenArizonaEntryMetadata(locale, kind, segments[2]) ?? {} : {};
  }

  if (segments[0] === 'relocation-guide' && segments[1]) {
    return guideMetadata(locale, segments[1]) ?? {};
  }

  if (segments[0] === 'community' && segments.length === 1) {
    return communityMetadata(locale);
  }

  if (segments[0] === 'community' && segments[1] === 'news' && segments.length === 2) {
    return communityNewsMetadata(locale);
  }

  if (segments[0] === 'community' && segments[1] === 'events' && segments[2]) {
    return eventMetadata(locale, segments[2]) ?? {};
  }

  if (segments[0] === 'community' && segments[1] === 'news' && segments[2]) {
    return (await articleMetadata(locale, segments[2])) ?? {};
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

  if (segments.length === 0) {
    return <DirectoryPageView locale={locale} searchParams={await searchParams} />;
  }

  if (segments[0] === 'directory' && segments.length === 1) {
    return <DirectoryPageView locale={locale} searchParams={await searchParams} />;
  }

  if (segments[0] === 'directory' && segments[1] === 'business' && segments[2]) {
    const rendered = await BusinessDetailPageView({ locale, slug: segments[2] });
    if (!rendered) notFound();
    return rendered;
  }

  if (segments[0] === 'directory' && segments[1] && segments[2]) {
    const rendered = await CityCategoryPageView({ locale, city: segments[1], category: segments[2] });
    if (!rendered) notFound();
    return rendered;
  }

  if (segments[0] === 'relocation-guide' && segments.length === 1) {
    return await RelocationGuidePageView({ locale });
  }

  if (segments[0] === 'hidden-arizona' && segments.length === 1) {
    return <HiddenArizonaHubPageView locale={locale} searchParams={await searchParams} />;
  }

  if (segments[0] === 'hidden-arizona' && segments[1] && segments[2]) {
    const kind = hiddenArizonaSegmentToKind(segments[1]) as HiddenArizonaKind | undefined;
    if (!kind) {
      notFound();
    }
    const rendered = HiddenArizonaDetailPageView({ locale, kind, slug: segments[2] });
    if (!rendered) notFound();
    return rendered;
  }

  if (segments[0] === 'relocation-guide' && segments[1]) {
    const rendered = await GuideDetailPageView({ locale, slug: segments[1] });
    if (!rendered) notFound();
    return rendered;
  }

  if (segments[0] === 'community' && segments.length === 1) {
    return await CommunityPageView({ locale });
  }

  if (segments[0] === 'community' && segments[1] === 'news' && segments.length === 2) {
    return await NewsArchivePageView({ locale, searchParams: await searchParams });
  }

  if (segments[0] === 'community' && segments[1] === 'events' && segments[2]) {
    const rendered = await EventDetailPageView({ locale, slug: segments[2] });
    if (!rendered) notFound();
    return rendered;
  }

  if (segments[0] === 'community' && segments[1] === 'news' && segments[2]) {
    const rendered = await ArticleDetailPageView({ locale, slug: segments[2] });
    if (!rendered) notFound();
    return rendered;
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
    return <AddBusinessPageView locale={locale} searchParams={await searchParams} />;
  }

  if (segments[0] === 'profile' && segments[1]) {
    const rendered = await ProfilePageView({ locale, slug: segments[1] });
    if (!rendered) notFound();
    return rendered;
  }

  if (segments[0] === 'dashboard') {
    return <DashboardPageView locale={locale} />;
  }

  if (segments[0] === 'admin') {
    return <AdminPageView locale={locale} />;
  }

  notFound();
}
