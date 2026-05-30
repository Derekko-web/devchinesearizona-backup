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
  sfBayLocalArticles,
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
import {
  getPublishedRadarArticlesAsArticlesAsync,
  radarArticleToArticle,
  getRadarArticleBySlugAsync,
} from '@/lib/radar';
import { defaultSiteProfile, type SiteProfile } from '@/lib/site-config';
import type {
  Article,
  ArticleArchiveBucket,
  ArticleSeries,
  Business,
  BusinessCategory,
  CommunityPost,
  CommunityPostType,
  Event,
  Guide,
  Locale,
  Profile,
  Review,
  SourcePolicy,
  SortOption,
} from '@/lib/types';
import { compareMostPopularDirectoryBusinesses } from '@/lib/directory-highlights';

type BusinessFilters = {
  q?: string;
  city?: string;
  category?: string;
  verifiedOnly?: boolean;
  language?: string;
  newcomerFriendlyOnly?: boolean;
  sort?: SortOption;
};

export type ArticleArchiveSearchParams = {
  bucket?: string;
  series?: string;
  sourcePolicy?: string;
  year?: string;
  month?: string;
  page?: string;
};

export type ResolvedArticleArchiveFilters = {
  bucket: ArticleArchiveBucket;
  series?: ArticleSeries;
  sourcePolicy?: SourcePolicy;
  year?: number;
  month?: number;
  page: number;
};

const GENERATED_IMPORTED_ARTICLES_PATH = path.join(process.cwd(), 'src', 'data', 'generated-imported-articles.json');
const communityTrendingArticleSlugs = [
  'tsmc-corridor-watch-supplier-growth-and-neighborhood-pressure',
  'phoenix-route-watch-asia-connector-playbook',
  'trend-radar-what-phoenix-food-posts-keep-highlighting',
  'restaurant-opening-radar-east-valley-plaza-shifts',
] as const;

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

function canUseDefaultArticleSources(site: SiteProfile): boolean {
  return site.key === defaultSiteProfile.key;
}

function getLocalArticlesForSite(site: SiteProfile = defaultSiteProfile): Article[] {
  if (site.key === 'sf-bay') {
    return sfBayLocalArticles;
  }
  return canUseDefaultArticleSources(site) ? localArticles : [];
}

function getImportedArticlesForSite(site: SiteProfile = defaultSiteProfile): Article[] {
  return canUseDefaultArticleSources(site) ? readImportedArticles() : [];
}

function sortArticlesNewestFirst(articles: Article[]): Article[] {
  return articles
    .slice()
    .sort(
      (left, right) =>
        new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()
    );
}

function isArticleSeries(value: string): value is ArticleSeries {
  return (
    value === 'housing-watch' ||
    value === 'tsmc-corridor-watch' ||
    value === 'route-watch' ||
    value === 'restaurant-opening-radar' ||
    value === 'trend-radar' ||
    value === 'arizona-radar' ||
    value === 'austin-radar' ||
    value === 'sf-bay-radar' ||
    value === 'community-wire'
  );
}

function isSourcePolicy(value: string): value is SourcePolicy {
  return (
    value === 'summary_link' ||
    value === 'signal_only' ||
    value === 'republish_with_permission'
  );
}

function parseArchiveNumber(
  value: string | undefined,
  options: {
    minimum: number;
    maximum?: number;
  }
): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  const integer = Math.floor(parsed);
  if (integer < options.minimum) {
    return undefined;
  }

  if (typeof options.maximum === 'number' && integer > options.maximum) {
    return undefined;
  }

  return integer;
}

function articlePublishedParts(article: Article) {
  const date = new Date(article.publishedAt);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  };
}

function getArticlesForArchiveBucket(bucket: ArticleArchiveBucket): Article[] {
  return bucket === 'legacy'
    ? sortArticlesNewestFirst(readImportedArticles())
    : sortArticlesNewestFirst(localArticles);
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

    const mostPopularDelta = compareMostPopularDirectoryBusinesses(left, right);
    if (mostPopularDelta !== 0) {
      return mostPopularDelta;
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
  const sortedArticles = sortArticlesNewestFirst(getAllArticles());

  return typeof limit === 'number' ? sortedArticles.slice(0, limit) : sortedArticles;
}

export async function getArticlesAsync(
  limit?: number,
  site: SiteProfile = defaultSiteProfile
): Promise<Article[]> {
  const sortedArticles = sortArticlesNewestFirst([
    ...getLocalArticlesForSite(site),
    ...getImportedArticlesForSite(site),
    ...(await getPublishedRadarArticlesAsArticlesAsync(undefined, { site })),
  ]);

  return typeof limit === 'number' ? sortedArticles.slice(0, limit) : sortedArticles;
}

export function getCurrentArticles(limit?: number): Article[] {
  const articles = getArticlesForArchiveBucket('current');
  return typeof limit === 'number' ? articles.slice(0, limit) : articles;
}

export function getCurrentArticlesForSite(
  site: SiteProfile = defaultSiteProfile,
  limit?: number
): Article[] {
  const articles = sortArticlesNewestFirst(getLocalArticlesForSite(site));
  return typeof limit === 'number' ? articles.slice(0, limit) : articles;
}

export async function getCurrentArticlesAsync(
  limit?: number,
  site: SiteProfile = defaultSiteProfile
): Promise<Article[]> {
  const articles = sortArticlesNewestFirst([
    ...getLocalArticlesForSite(site),
    ...(await getPublishedRadarArticlesAsArticlesAsync(undefined, { site })),
  ]);

  return typeof limit === 'number' ? articles.slice(0, limit) : articles;
}

export function getLegacyArticles(limit?: number): Article[] {
  const articles = getArticlesForArchiveBucket('legacy');
  return typeof limit === 'number' ? articles.slice(0, limit) : articles;
}

export function getCommunityTrendingArticles(limit = communityTrendingArticleSlugs.length): Article[] {
  const prioritized = communityTrendingArticleSlugs
    .map((slug) => getArticleBySlug(slug))
    .filter((article): article is Article => Boolean(article));
  const seen = new Set<string>();

  return [...prioritized, ...getCurrentArticles()].filter((article) => {
    if (seen.has(article.slug)) {
      return false;
    }

    seen.add(article.slug);
    return true;
  }).slice(0, limit);
}

export async function getCommunityTrendingArticlesAsync(
  limit = communityTrendingArticleSlugs.length,
  site: SiteProfile = defaultSiteProfile
): Promise<Article[]> {
  if (!canUseDefaultArticleSources(site)) {
    return (await getCurrentArticlesAsync(limit, site)).slice(0, limit);
  }

  const prioritized = (
    await Promise.all(communityTrendingArticleSlugs.map((slug) => getArticleBySlugAsync(slug)))
  ).filter((article): article is Article => Boolean(article));
  const seen = new Set<string>();

  return [...prioritized, ...(await getCurrentArticlesAsync())]
    .filter((article) => {
      if (seen.has(article.slug)) {
        return false;
      }

      seen.add(article.slug);
      return true;
    })
    .slice(0, limit);
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

export function resolveArticleArchiveFilters(
  searchParams?: ArticleArchiveSearchParams
): ResolvedArticleArchiveFilters {
  const bucket: ArticleArchiveBucket =
    searchParams?.bucket === 'legacy' ? 'legacy' : 'current';
  const year = parseArchiveNumber(searchParams?.year, { minimum: 2000, maximum: 2100 });
  const month = year
    ? parseArchiveNumber(searchParams?.month, { minimum: 1, maximum: 12 })
    : undefined;
  const page = parseArchiveNumber(searchParams?.page, { minimum: 1 }) ?? 1;

  return {
    bucket,
    series:
      searchParams?.series && isArticleSeries(searchParams.series)
        ? searchParams.series
        : undefined,
    sourcePolicy:
      searchParams?.sourcePolicy && isSourcePolicy(searchParams.sourcePolicy)
        ? searchParams.sourcePolicy
        : undefined,
    year,
    month,
    page,
  };
}

export function getArticleArchivePage(
  searchParams?: ArticleArchiveSearchParams,
  pageSize = 24
) {
  const filters = resolveArticleArchiveFilters(searchParams);
  const normalizedPageSize = Math.max(1, pageSize);
  const bucketArticles = getArticlesForArchiveBucket(filters.bucket);
  const availableYears = Array.from(
    new Set(bucketArticles.map((article) => articlePublishedParts(article).year))
  ).sort((left, right) => right - left);
  const availableMonths = filters.year
    ? Array.from(
        new Set(
          bucketArticles
            .filter((article) => articlePublishedParts(article).year === filters.year)
            .map((article) => articlePublishedParts(article).month)
        )
      ).sort((left, right) => left - right)
    : [];

  const filteredArticles = bucketArticles.filter((article) => {
    if (filters.series && article.series !== filters.series) {
      return false;
    }

    if (filters.sourcePolicy && article.sourcePolicy !== filters.sourcePolicy) {
      return false;
    }

    const publishedParts = articlePublishedParts(article);
    if (filters.year && publishedParts.year !== filters.year) {
      return false;
    }

    if (filters.month && publishedParts.month !== filters.month) {
      return false;
    }

    return true;
  });

  const totalCount = filteredArticles.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, filters.page), totalPages);
  const startIndex = (currentPage - 1) * normalizedPageSize;

  return {
    articles: filteredArticles.slice(startIndex, startIndex + normalizedPageSize),
    currentPage,
    pageSize: normalizedPageSize,
    totalCount,
    totalPages,
    filters: {
      ...filters,
      page: currentPage,
    },
    availableYears,
    availableMonths,
  };
}

export async function getArticleArchivePageAsync(
  searchParams?: ArticleArchiveSearchParams,
  pageSize = 24,
  site: SiteProfile = defaultSiteProfile
) {
  const filters = resolveArticleArchiveFilters(searchParams);
  const normalizedPageSize = Math.max(1, pageSize);
  const bucketArticles =
    filters.bucket === 'legacy'
      ? sortArticlesNewestFirst(getImportedArticlesForSite(site))
      : sortArticlesNewestFirst([
          ...getLocalArticlesForSite(site),
          ...(await getPublishedRadarArticlesAsArticlesAsync(undefined, { site })),
        ]);
  const availableYears = Array.from(
    new Set(bucketArticles.map((article) => articlePublishedParts(article).year))
  ).sort((left, right) => right - left);
  const availableMonths = filters.year
    ? Array.from(
        new Set(
          bucketArticles
            .filter((article) => articlePublishedParts(article).year === filters.year)
            .map((article) => articlePublishedParts(article).month)
        )
      ).sort((left, right) => left - right)
    : [];

  const filteredArticles = bucketArticles.filter((article) => {
    if (filters.series && article.series !== filters.series) {
      return false;
    }

    if (filters.sourcePolicy && article.sourcePolicy !== filters.sourcePolicy) {
      return false;
    }

    const publishedParts = articlePublishedParts(article);
    if (filters.year && publishedParts.year !== filters.year) {
      return false;
    }

    if (filters.month && publishedParts.month !== filters.month) {
      return false;
    }

    return true;
  });

  const totalCount = filteredArticles.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, filters.page), totalPages);
  const startIndex = (currentPage - 1) * normalizedPageSize;

  return {
    articles: filteredArticles.slice(startIndex, startIndex + normalizedPageSize),
    currentPage,
    pageSize: normalizedPageSize,
    totalCount,
    totalPages,
    filters: {
      ...filters,
      page: currentPage,
    },
    availableYears,
    availableMonths,
  };
}

export function getArticleBySlug(slug: string): Article | undefined {
  return getAllArticles().find((article) => article.slug === slug);
}

export async function getArticleBySlugAsync(
  slug: string,
  site: SiteProfile = defaultSiteProfile
): Promise<Article | undefined> {
  const radarArticle = await getRadarArticleBySlugAsync(slug, { site });
  if (radarArticle?.isPublished) {
    return radarArticleToArticle(radarArticle, { site });
  }

  return [...getLocalArticlesForSite(site), ...getImportedArticlesForSite(site)].find(
    (article) => article.slug === slug
  );
}

export function isLegacyArticle(
  articleOrSlug: Article | string,
  site: SiteProfile = defaultSiteProfile
): boolean {
  const slug = typeof articleOrSlug === 'string' ? articleOrSlug : articleOrSlug.slug;
  return getImportedArticlesForSite(site).some((article) => article.slug === slug);
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
