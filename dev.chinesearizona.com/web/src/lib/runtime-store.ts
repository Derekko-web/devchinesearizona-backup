import type { BusinessClaim, CommunityPost, ModerationReport } from '@/lib/types';

export type AnalyticsEvent = {
  id: string;
  type: string;
  entitySlug?: string;
  path?: string;
  createdAt: string;
};

const analyticsEvents: AnalyticsEvent[] = [];
const businessClaims: BusinessClaim[] = [];
const moderationReports: ModerationReport[] = [];
const communitySubmissions: CommunityPost[] = [];
const entityReportCounts = new Map<string, number>();

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function recordAnalyticsEvent(type: string, entitySlug?: string, path?: string) {
  analyticsEvents.push({
    id: randomId('evt'),
    type,
    entitySlug,
    path,
    createdAt: new Date().toISOString(),
  });
}

export function getAnalyticsSummary() {
  return analyticsEvents.reduce<Record<string, number>>((summary, event) => {
    summary[event.type] = (summary[event.type] ?? 0) + 1;
    return summary;
  }, {});
}

export function createBusinessClaim(
  businessName: string,
  claimantName: string,
  email: string,
  details?: {
    businessSlug?: string;
    businessId?: string;
    category?: string;
    city?: string;
    details?: string;
    heroImage?: string;
    gallery?: string[];
  }
): BusinessClaim {
  const claim = {
    id: randomId('claim'),
    businessId: details?.businessId,
    businessSlug: details?.businessSlug,
    businessName,
    claimantName,
    email,
    category: details?.category,
    city: details?.city,
    details: details?.details,
    heroImage: details?.heroImage,
    gallery: details?.gallery ?? [],
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
  };

  businessClaims.push(claim);
  return claim;
}

export function getBusinessClaims(): BusinessClaim[] {
  return businessClaims;
}

type CreateCommunityPostInput = Pick<
  CommunityPost,
  'type' | 'title' | 'excerpt' | 'body' | 'city' | 'price' | 'linkUrl'
> & {
  authorSlug: string;
};

export function createCommunityPost(input: CreateCommunityPostInput): CommunityPost {
  const slugBase = input.title.en
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const createdAt = new Date().toISOString();
  const post = {
    slug: `${slugBase}-${communitySubmissions.length + 1}`,
    type: input.type,
    title: input.title,
    excerpt: input.excerpt,
    body: input.body,
    authorSlug: input.authorSlug,
    city: input.city,
    createdAt,
    updatedAt: createdAt,
    reportCount: 0,
    autoHidden: false,
    trustLevel: 'new' as const,
    price: input.price,
    tags: ['user-submission'],
    linkUrl: input.linkUrl,
  };

  communitySubmissions.push(post);
  return post;
}

export function getCommunitySubmissions(): CommunityPost[] {
  return communitySubmissions;
}

export function createModerationReport(
  entitySlug: string,
  reason: string,
  entityType: ModerationReport['entityType'] = 'community_post'
): ModerationReport {
  const report = {
    id: randomId('report'),
    entityType,
    entitySlug,
    reason,
    createdAt: new Date().toISOString(),
  };

  moderationReports.push(report);
  entityReportCounts.set(entitySlug, (entityReportCounts.get(entitySlug) ?? 0) + 1);
  return report;
}

export function getModerationReports(): ModerationReport[] {
  return moderationReports;
}

export function getEntityReportCount(entitySlug: string): number {
  return entityReportCounts.get(entitySlug) ?? 0;
}
