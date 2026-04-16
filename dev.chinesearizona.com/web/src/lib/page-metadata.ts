import { resolveArticleText } from '@/lib/article-localization';
import type { Metadata } from 'next';

import {
  getArticleBySlug,
  getBusinessCategories,
  getCommunityPostBySlug,
  getEventBySlug,
  getGuideBySlug,
  getProfileBySlug,
  shouldNoIndexCommunityPost,
} from '@/lib/content';
import { getDirectoryBusinessBySlug } from '@/lib/directory';
import { getHiddenArizonaEntryBySlug, getHiddenArizonaEntryPath } from '@/lib/hidden-arizona';
import { t } from '@/lib/i18n';
import { buildMetadata } from '@/lib/seo';
import type { CommunityPostType, HiddenArizonaKind, Locale } from '@/lib/types';

export function directoryMetadata(locale: Locale, path = '/directory'): Metadata {
  return buildMetadata({
    title: locale === 'zh' ? '商家目錄 | ChineseArizona' : 'Business Directory | ChineseArizona',
    description:
      locale === 'zh'
        ? '可依城市、分類與評分篩選的亞利桑那雙語商家目錄。'
        : 'A bilingual Arizona directory you can filter by city, category, and rating.',
    path,
    locale,
  });
}

export function addBusinessMetadata(locale: Locale): Metadata {
  return buildMetadata({
    title: locale === 'zh' ? '新增或認領商家 | ChineseArizona' : 'Add or Claim a Business | ChineseArizona',
    description:
      locale === 'zh'
        ? '送出商家認領或新商家申請，並經過 email 驗證與人工審核。'
        : 'Submit a business claim or new listing request with email verification and manual review.',
    path: '/add-business',
    locale,
  });
}

export function communityMetadata(locale: Locale): Metadata {
  return buildMetadata({
    title: locale === 'zh' ? '社群中心 | ChineseArizona' : 'Community Hub | ChineseArizona',
    description:
      locale === 'zh'
        ? '活動、新聞、社群看板與分類資訊集中在同一個雙語入口。'
        : 'A bilingual hub for events, news, community board posts, and classifieds.',
    path: '/community',
    locale,
  });
}

export function communityNewsMetadata(locale: Locale): Metadata {
  return buildMetadata({
    title: locale === 'zh' ? '新聞檔案 | ChineseArizona' : 'News Archive | ChineseArizona',
    description:
      locale === 'zh'
        ? '瀏覽完整新聞文章檔案，包含原創摘要、系列觀察與授權轉載內容。'
        : 'Browse the full news archive, including original summary series, staff editorial, and permission-based republished content.',
    path: '/community/news',
    locale,
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

export function dashboardMetadata(locale: Locale): Metadata {
  return buildMetadata({
    title: locale === 'zh' ? '商家後台 | ChineseArizona' : 'Owner Dashboard | ChineseArizona',
    description:
      locale === 'zh'
        ? '商家管理、評論監看、活動提交與認領追蹤。'
        : 'Business management, review monitoring, event submissions, and claim tracking.',
    path: '/dashboard',
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

export async function businessMetadata(locale: Locale, slug: string): Promise<Metadata | null> {
  const business = await getDirectoryBusinessBySlug(slug);
  if (!business) {
    return null;
  }

  return buildMetadata({
    title: `${t(business.name, locale)} | ChineseArizona`,
    description: t(business.shortDescription, locale),
    path: `/directory/business/${business.slug}`,
    locale,
    image: business.heroImage ?? undefined,
  });
}

export function cityCategoryMetadata(locale: Locale, city: string, categorySlug: string): Metadata | null {
  const category = getBusinessCategories().find((item) => item.slug === categorySlug);
  if (!category) {
    return null;
  }

  const title = `${t(category.name, locale)} ${locale === 'zh' ? `在 ${city}` : `in ${city}`} | ChineseArizona`;
  return buildMetadata({
    title,
    description: t(category.description, locale),
    path: `/directory/${city}/${category.slug}`,
    locale,
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

export function hiddenArizonaEntryMetadata(
  locale: Locale,
  kind: HiddenArizonaKind,
  slug: string
): Metadata | null {
  const entry = getHiddenArizonaEntryBySlug(kind, slug);
  if (!entry) {
    return null;
  }

  return buildMetadata({
    title: `${t(entry.title, locale)} | ChineseArizona`,
    description: t(entry.excerpt, locale),
    path: getHiddenArizonaEntryPath(entry),
    locale,
    image: entry.heroImage ?? undefined,
  });
}

export async function articleMetadata(locale: Locale, slug: string): Promise<Metadata | null> {
  const article = getArticleBySlug(slug);
  if (!article) {
    return null;
  }

  const localizedArticle = await resolveArticleText(article, locale);

  return buildMetadata({
    title: `${localizedArticle.title} | ChineseArizona`,
    description: localizedArticle.excerpt,
    path: `/community/news/${article.slug}`,
    locale,
    image: article.heroImage,
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
  });
}
