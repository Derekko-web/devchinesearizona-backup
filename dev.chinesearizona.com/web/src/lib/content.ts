import fs from 'node:fs';
import path from 'node:path';

import {
  businesses,
  businessCategories,
  communityPosts,
  events,
  guides,
  localArticles,
  normalizeImportedArticle,
  profiles,
  reviews,
} from '@/data/platform-data';
import type { ImportedArticle } from '@/data/platform-data';
import { t } from '@/lib/i18n';
import {
  getAnalyticsSummary,
  getBusinessClaims,
  getCommunitySubmissions,
  getEntityReportCount,
  getModerationReports,
} from '@/lib/runtime-store';
import type {
  Article,
  Business,
  BusinessCategory,
  CommunityPost,
  CommunityPostType,
  Event,
  Guide,
  Locale,
  Profile,
  Review,
  SortOption,
} from '@/lib/types';

type BusinessFilters = {
  q?: string;
  city?: string;
  category?: string;
  verifiedOnly?: boolean;
  language?: string;
  newcomerFriendlyOnly?: boolean;
  sort?: SortOption;
};

const GENERATED_IMPORTED_ARTICLES_PATH = path.join(process.cwd(), 'src', 'data', 'generated-imported-articles.json');

let importedArticlesCache:
  | {
      mtimeMs: number;
      articles: Article[];
    }
  | null = null;

function readImportedArticles(): Article[] {
  try {
    const stats = fs.statSync(GENERATED_IMPORTED_ARTICLES_PATH);
    if (importedArticlesCache?.mtimeMs === stats.mtimeMs) {
      return importedArticlesCache.articles;
    }

    const payload = fs.readFileSync(GENERATED_IMPORTED_ARTICLES_PATH, 'utf-8');
    const importedArticles = (JSON.parse(payload) as ImportedArticle[]).map(normalizeImportedArticle);

    importedArticlesCache = {
      mtimeMs: stats.mtimeMs,
      articles: importedArticles,
    };

    return importedArticles;
  } catch (error) {
    if (importedArticlesCache) {
      return importedArticlesCache.articles;
    }

    console.error('Unable to load generated imported articles.', error);
    return [];
  }
}

function getAllArticles(): Article[] {
  return [...localArticles, ...readImportedArticles()];
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function matchesSearch(business: Business, locale: Locale, q?: string): boolean {
  if (!q) {
    return true;
  }

  const haystack = [
    t(business.name, locale),
    t(business.shortDescription, locale),
    t(business.description, locale),
    business.city,
    business.region,
    ...business.searchAliases,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalize(q));
}

export function getBusinessCategories(): BusinessCategory[] {
  return businessCategories;
}

export function getBusinesses(locale: Locale, filters: BusinessFilters = {}): Business[] {
  const {
    q,
    city,
    category,
    verifiedOnly = false,
    language,
    newcomerFriendlyOnly = false,
    sort = 'featured',
  } = filters;

  const filtered = businesses.filter((business) => {
    if (!matchesSearch(business, locale, q)) {
      return false;
    }

    if (city && normalize(business.city) !== normalize(city)) {
      return false;
    }

    if (category && business.categorySlug !== category) {
      return false;
    }

    if (verifiedOnly && !business.verified) {
      return false;
    }

    if (language && !business.languages.some((item) => item === language)) {
      return false;
    }

    if (newcomerFriendlyOnly && !business.newcomerFriendly) {
      return false;
    }

    return true;
  });

  return filtered.sort((left, right) => {
    if (sort === 'reviewed') {
      return right.reviewCount - left.reviewCount;
    }

    if (sort === 'newest') {
      return new Date(right.lastUpdated).getTime() - new Date(left.lastUpdated).getTime();
    }

    const featuredDelta = Number(right.featured) - Number(left.featured);
    if (featuredDelta !== 0) {
      return featuredDelta;
    }

    const sponsoredDelta = Number(right.sponsored) - Number(left.sponsored);
    if (sponsoredDelta !== 0) {
      return sponsoredDelta;
    }

    return right.rating - left.rating;
  });
}

export function getFeaturedBusinesses(locale: Locale): Business[] {
  return getBusinesses(locale, { sort: 'featured' }).slice(0, 4);
}

export function getBusinessBySlug(slug: string): Business | undefined {
  return businesses.find((business) => business.slug === slug);
}

export function getBusinessReviews(slug: string): Review[] {
  return reviews.filter((review) => review.businessSlug === slug);
}

export function getCityCategoryLanding(city: string, category: string, locale: Locale) {
  const categoryRecord = businessCategories.find((item) => item.slug === category);
  if (!categoryRecord) {
    return null;
  }

  const listings = getBusinesses(locale, { city, category, sort: 'featured' });
  return {
    city,
    category: categoryRecord,
    listings,
  };
}

export function getGuides(): Guide[] {
  return guides.sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
}

export function getGuideBySlug(slug: string): Guide | undefined {
  return guides.find((guide) => guide.slug === slug);
}

export function getArticles(limit?: number): Article[] {
  const sortedArticles = getAllArticles().sort(
    (left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()
  );

  return typeof limit === 'number' ? sortedArticles.slice(0, limit) : sortedArticles;
}

export function getArticlePage(page: number, pageSize: number) {
  const normalizedPageSize = Math.max(1, pageSize);
  const articles = getArticles();
  const totalCount = articles.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * normalizedPageSize;

  return {
    articles: articles.slice(startIndex, startIndex + normalizedPageSize),
    currentPage,
    pageSize: normalizedPageSize,
    totalCount,
    totalPages,
  };
}

export function getArticleBySlug(slug: string): Article | undefined {
  return getAllArticles().find((article) => article.slug === slug);
}

export function getEvents(): Event[] {
  return events.sort(
    (left, right) => new Date(left.startDate).getTime() - new Date(right.startDate).getTime()
  );
}

export function getEventBySlug(slug: string): Event | undefined {
  return events.find((event) => event.slug === slug);
}

export function getCommunityPosts(type?: CommunityPostType): CommunityPost[] {
  const allPosts = [...communityPosts, ...getCommunitySubmissions()];
  const enrichedPosts = allPosts.map((post) => ({
    ...post,
    reportCount: post.reportCount + getEntityReportCount(post.slug),
  }));
  const filtered = type ? enrichedPosts.filter((post) => post.type === type) : enrichedPosts;
  return filtered.sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
}

export function getCommunityPostBySlug(type: CommunityPostType, slug: string): CommunityPost | undefined {
  const post = [...communityPosts, ...getCommunitySubmissions()].find(
    (item) => item.type === type && item.slug === slug
  );

  if (!post) {
    return undefined;
  }

  return {
    ...post,
    reportCount: post.reportCount + getEntityReportCount(post.slug),
  };
}

export function shouldNoIndexCommunityPost(post: CommunityPost): boolean {
  return post.trustLevel !== 'trusted' || post.reportCount > 0 || post.autoHidden;
}

export function getProfileBySlug(slug: string): Profile | undefined {
  return profiles.find((profile) => profile.slug === slug);
}

export function getBusinessesByOwner(ownerProfileSlug: string): Business[] {
  return businesses.filter((business) => business.ownerProfileSlug === ownerProfileSlug);
}

export function getPostsByAuthor(authorSlug: string): CommunityPost[] {
  return [...communityPosts, ...getCommunitySubmissions()].filter((post) => post.authorSlug === authorSlug);
}

export function getRelatedBusinesses(slugs: string[]): Business[] {
  return slugs
    .map((slug) => getBusinessBySlug(slug))
    .filter((business): business is Business => Boolean(business));
}

export function getRelatedEvents(slugs: string[]): Event[] {
  return slugs
    .map((slug) => getEventBySlug(slug))
    .filter((event): event is Event => Boolean(event));
}

export function getFeaturedEvents(): Event[] {
  return getEvents().slice(0, 3);
}

export function getDashboardSnapshot(ownerSlug = 'grace-lin') {
  return {
    profile: getProfileBySlug(ownerSlug),
    businesses: getBusinessesByOwner(ownerSlug),
    recentReviews: reviews.filter((review) =>
      getBusinessesByOwner(ownerSlug).some((business) => business.slug === review.businessSlug)
    ),
    claims: getBusinessClaims(),
  };
}

export function getAdminSnapshot() {
  const pendingClaims = getBusinessClaims().filter((claim) => claim.status === 'pending');
  const reports = getModerationReports();
  const analytics = getAnalyticsSummary();

  return {
    pendingClaims,
    reports,
    analytics,
    flaggedPosts: getCommunityPosts().filter((post) => post.reportCount > 0 || post.autoHidden),
    editors: profiles.filter((profile) => profile.role === 'editor' || profile.role === 'moderator' || profile.role === 'admin'),
  };
}

export function getPopularCities(): string[] {
  return Array.from(new Set(businesses.map((business) => business.city)));
}

export function getAvailableLanguages(): string[] {
  return Array.from(
    new Set(
      businesses.flatMap((business) => business.languages)
    )
  );
}
