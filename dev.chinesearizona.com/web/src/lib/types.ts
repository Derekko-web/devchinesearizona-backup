import type { ListingPlanId } from '@/lib/listing-plan-offers';

export const locales = ['en', 'zh'] as const;

export type Locale = (typeof locales)[number];

export type LocalizedText = {
  en: string;
  zh?: string | null;
};

// 'Chinese' is recorded when a source says Chinese without naming a dialect.
export type LanguageOption = 'English' | 'Mandarin' | 'Cantonese' | 'Taiwanese' | 'Chinese' | 'Traditional Chinese';

export type CategoryIcon =
  | 'home'
  | 'heart'
  | 'scale'
  | 'utensils'
  | 'wrench'
  | 'truck'
  | 'plane'
  | 'graduation-cap'
  | 'briefcase'
  | 'calendar'
  | 'newspaper'
  | 'users';

export type BusinessCategory = {
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  icon: CategoryIcon;
};

export type ProfileRole = 'member' | 'business_owner' | 'editor' | 'moderator' | 'admin';

export type TrustLevel = 'new' | 'trusted';

export type Profile = {
  slug: string;
  name: string;
  nameZh: string;
  role: ProfileRole;
  city: string;
  languages: LanguageOption[];
  bio: LocalizedText;
  avatarColor: string;
  trustLevel: TrustLevel;
};

export type Review = {
  id: string;
  businessSlug: string;
  authorSlug: string;
  rating: number;
  title: LocalizedText;
  content: LocalizedText;
  createdAt: string;
};

export type DirectoryStatus = 'live' | 'pending_review' | 'suppressed' | 'stale' | 'planned';
export type VerificationState = 'unverified' | 'claimed' | 'editor_verified';
export type DirectoryBusinessStatusFilter = 'open_now' | 'closed_now';
export type DirectoryAdCampaignStatus =
  | 'pending_payment'
  | 'active'
  | 'paused'
  | 'cancelled'
  | 'exhausted'
  | 'expired';
export type DirectoryAdEventType = 'impression' | 'click';

export type DirectoryAdMetrics = {
  impressions: number;
  clicks: number;
  ctr: number;
  spendCents: number;
};

export type DirectoryAdCampaign = {
  id: string;
  businessId: string;
  ownerProfileId: string;
  status: DirectoryAdCampaignStatus;
  budgetCents: number;
  remainingBudgetCents: number;
  costPerClickCents: number;
  scopeCity: string;
  scopeCategory: string;
  startsAt: string;
  endsAt: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
  metrics?: DirectoryAdMetrics;
};

export type Business = {
  id: string;
  slug: string;
  name: LocalizedText;
  categorySlug: string;
  city: string;
  region: string;
  address?: string;
  serviceAreaText?: string;
  phone?: string;
  email?: string;
  website?: string;
  menuUrl?: string;
  heroImage?: string | null;
  gallery: string[];
  shortDescription: LocalizedText;
  description: LocalizedText;
  services: LocalizedText[];
  languages: LanguageOption[];
  // Bilingual details (issue #411).
  wechatId?: string;
  acceptsWeChatPay?: boolean;
  acceptsAlipay?: boolean;
  chineseMenuOrForms?: boolean;
  searchAliases: string[];
  verified: boolean;
  bilingual: boolean;
  newcomerFriendly: boolean;
  sponsored: boolean;
  legacySponsored?: boolean;
  featured: boolean;
  ownerProfileSlug?: string;
  rating: number;
  reviewCount: number;
  priceRange?: string;
  lastUpdated: string;
  status?: DirectoryStatus;
  verificationState?: VerificationState;
  hours: Array<{
    label: string;
    value: string;
  }>;
  activeDirectoryAdCampaign?: DirectoryAdCampaign;
  // Paid listing plans running right now (issue #408).
  paidPlans?: ListingPlanId[];
  coordinates?: {
    lat: number;
    lng: number;
  };
};

export type ChineseSignalEvidence = {
  kind: string;
  value: string;
  sourceUrl: string;
};

export type ScrapedBusinessCandidate = {
  name_en: string;
  name_zh?: string | null;
  categorySlug: string;
  city: string;
  region: string;
  address?: string;
  serviceAreaText?: string;
  phone?: string;
  email?: string;
  website?: string;
  heroImage?: string | null;
  gallery: string[];
  hours: Business['hours'];
  coordinates?: Business['coordinates'];
  languages: LanguageOption[];
  shortDescription: string;
  description: string;
  services: string[];
  searchAliases: string[];
  sourceUrls: string[];
  officialSiteUrl?: string;
  chineseSignal: ChineseSignalEvidence[];
  completenessScore: number;
  duplicateKey: string;
  scrapedAt: string;
};

export type ResourceLink = {
  label: LocalizedText;
  url: string;
  source: string;
};

export type HiddenArizonaKind = 'place' | 'story' | 'list' | 'itinerary';

export type HiddenArizonaEntry = {
  slug: string;
  kind: HiddenArizonaKind;
  title: LocalizedText;
  excerpt: LocalizedText;
  body: LocalizedText[];
  heroImage?: string | null;
  gallery: string[];
  tags: string[];
  sourceName: string;
  sourceUrl: string;
  sourceId: string;
  publishedAt: string;
  updatedAt: string;
  republishedWithPermission: boolean;
  relatedLinks: ResourceLink[];
  city?: string;
  address?: string;
  coordinates?: Business['coordinates'];
  visitWebsite?: string;
  directionsUrl?: string;
  nearbyEntrySlugs?: string[];
  knowBeforeYouGo?: LocalizedText[];
};

export type HiddenArizonaPlace = HiddenArizonaEntry & {
  kind: 'place';
  nearbyEntrySlugs: string[];
  knowBeforeYouGo: LocalizedText[];
};

export type HiddenArizonaFilters = {
  q?: string;
  kind?: HiddenArizonaKind | 'all';
  city?: string;
  tag?: string;
};

export type DiscoveryCategory =
  | 'beautiful_arizona'
  | 'things_to_do'
  | 'restaurants'
  | 'hotels'
  | 'parks'
  | 'shopping';

export type DiscoveryQueueStatus =
  | 'queued'
  | 'review_ready'
  | 'approved'
  | 'published'
  | 'blocked'
  | 'stale';

export type DiscoverVideoCandidate = {
  id: string;
  sourceUrl: string;
  postId: string;
  creatorHandle?: string;
  creatorProfileUrl?: string;
  discoveredCategories: DiscoveryCategory[];
  sourceSurface: string;
  firstSeenAt: string;
  lastSeenAt: string;
  queueStatus: DiscoveryQueueStatus;
  collectorRunId?: string;
  collectorNotes?: string;
  missingRunCount: number;
};

export type DiscoverArticle = {
  id: string;
  candidateId: string;
  slug: string;
  primaryCategory: DiscoveryCategory;
  title: LocalizedText;
  excerpt: LocalizedText;
  body: LocalizedText[];
  heroImageUrl?: string;
  city?: string;
  region?: string;
  tags: string[];
  relatedBusinessSlugs: string[];
  relatedHiddenArizonaSlugs: string[];
  publishedAt?: string;
  updatedAt: string;
  isFeatured: boolean;
  embedEnabled: boolean;
  postId: string;
  sourceUrl: string;
  creatorHandle?: string;
  creatorProfileUrl?: string;
  queueStatus: DiscoveryQueueStatus;
  sourceSurface: string;
};

export type DiscoverAdminQueueItem = {
  candidate: DiscoverVideoCandidate;
  article?: DiscoverArticle;
};

export type PersonaTarget =
  | 'tsmc_newcomers'
  | 'local_families'
  | 'students'
  | 'business_owners';

export type ArticleArchiveBucket = 'current' | 'legacy';

export type ArticleSeries =
  | 'housing-watch'
  | 'tsmc-corridor-watch'
  | 'route-watch'
  | 'restaurant-opening-radar'
  | 'trend-radar'
  | 'arizona-radar'
  | 'local-radar'
  | 'austin-radar'
  | 'sf-bay-radar'
  | 'community-wire';

export type FreshnessTier = 'breaking' | 'weekly' | 'monthly' | 'evergreen' | 'archive';

export type SourcePolicy = 'summary_link' | 'signal_only' | 'republish_with_permission';

export type SourceType =
  | 'housing_portal'
  | 'corporate_newsroom'
  | 'official_data'
  | 'airport_newsroom'
  | 'local_media'
  | 'social_signal';

export type DestinationSurface =
  | 'community_news'
  | 'relocation_guide'
  | 'directory_followup'
  | 'discover_arizona'
  | 'mixed';

export type SignalDeskReviewStatus = 'queued' | 'review_ready' | 'approved' | 'published';

export type DirectoryFollowUpAction = 'verify_listing' | 'create_listing' | 'expand_category';

export type DirectoryFollowUpStatus = 'queued' | 'in_progress' | 'done';

export type DirectoryFollowUp = {
  action: DirectoryFollowUpAction;
  status: DirectoryFollowUpStatus;
  notes: LocalizedText;
};

export type MonitoredSource = {
  slug: string;
  name: string;
  url: string;
  sourceType: SourceType;
  personaTargets: PersonaTarget[];
  allowedUse: SourcePolicy;
  cadence: 'daily' | 'weekly' | 'monthly';
  destinationSurface: DestinationSurface;
};

export type SignalDeskQueueItem = {
  id: string;
  slug: string;
  title: LocalizedText;
  series: ArticleSeries;
  reviewStatus: SignalDeskReviewStatus;
  priorityScore: number;
  sourceName: string;
  sourceUrl: string;
  freshnessTier: FreshnessTier;
  destinationSurface: DestinationSurface;
  personaTargets: PersonaTarget[];
  ctaBusinessSlugs: string[];
  publishedAt?: string;
  directoryFollowUp?: DirectoryFollowUp;
};

export type GuideDetailSection = {
  title: LocalizedText;
  intro?: LocalizedText;
  bullets: LocalizedText[];
};

// A short "general information, not advice" note plus the directory
// categories where readers can find a professional for the topic.
export type GuideDirectoryPrompt = {
  note: LocalizedText;
  categorySlugs: string[];
};

export type Guide = {
  slug: string;
  section: 'moving' | 'housing' | 'utilities' | 'schools' | 'healthcare' | 'transportation' | 'community' | 'safety';
  title: LocalizedText;
  excerpt: LocalizedText;
  heroImage: string;
  readTime: string;
  publishedAt: string;
  updatedAt: string;
  body: LocalizedText[];
  quickChecklist?: LocalizedText[];
  detailSections?: GuideDetailSection[];
  practicalNotes?: LocalizedText[];
  officialResources: ResourceLink[];
  directoryPrompt?: GuideDirectoryPrompt;
  relatedBusinessSlugs: string[];
  relatedEventSlugs: string[];
};

export type Article = {
  slug: string;
  title: LocalizedText;
  excerpt: LocalizedText;
  heroImage: string;
  publishedAt: string;
  updatedAt?: string;
  category: 'news' | 'feature';
  body: LocalizedText[];
  series: ArticleSeries;
  freshnessTier: FreshnessTier;
  sourcePolicy: SourcePolicy;
  relatedCategorySlugs: string[];
  ctaBusinessSlugs: string[];
  personaTargets: PersonaTarget[];
  sourceLinks: ResourceLink[];
  authorProfileSlug?: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceId?: string;
  sourceType?: SourceType;
  radarLane?: RadarLane;
  aiGeneratedSummary?: boolean;
  lastCheckedAt?: string;
  heroImagePolicy?: RadarHeroImagePolicy;
  republishedWithPermission?: boolean;
};

export type RadarLane = 'housing' | 'chinese' | 'openings' | 'community' | 'official' | 'social';

export type RadarHeroImagePolicy = 'source_allowed' | 'fallback_only';

export type RadarRunStatus = 'running' | 'completed' | 'failed' | 'paused';

export type RadarModerationState =
  | 'queued'
  | 'published'
  | 'blocked'
  | 'duplicate'
  | 'unpublished'
  | 'review_needed';

export type RadarSourceManifestEntry = {
  slug: string;
  name: string;
  url: string;
  feedUrl?: string;
  excludeUrlPatterns?: string[];
  excludeTitlePatterns?: string[];
  sourceType: SourceType;
  sourcePolicy: SourcePolicy;
  lane: RadarLane;
  cadence: '5m' | 'hourly' | 'daily';
  notes: LocalizedText;
};

export type RadarSourceControl = {
  sourceSlug: string;
  paused: boolean;
  updatedAt: string;
};

export type RadarJobControl = {
  paused: boolean;
  publishCap: number;
  updatedAt: string;
};

export type RadarRun = {
  id: string;
  worker: 'hermes';
  startedAt: string;
  finishedAt?: string;
  status: RadarRunStatus;
  candidateCount: number;
  publishedCount: number;
  blockedCount: number;
  duplicateCount: number;
  errorMessage?: string;
  latestPublishedAt?: string;
};

export type RadarCandidate = {
  id: string;
  slug: string;
  sourceSlug: string;
  sourceName: string;
  sourceUrl: string;
  canonicalUrl: string;
  sourceType: SourceType;
  sourcePolicy: SourcePolicy;
  lane: RadarLane;
  title: LocalizedText;
  excerpt: LocalizedText;
  topicFingerprint: string;
  moderationState: RadarModerationState;
  firstSeenAt: string;
  lastSeenAt: string;
  sourcePublishedAt?: string;
};

export type RadarArticle = {
  id: string;
  candidateId: string;
  slug: string;
  lane: RadarLane;
  title: LocalizedText;
  excerpt: LocalizedText;
  body: LocalizedText[];
  heroImage: string;
  heroImagePolicy: RadarHeroImagePolicy;
  category: Article['category'];
  freshnessTier: FreshnessTier;
  sourcePolicy: SourcePolicy;
  sourceType: SourceType;
  sourceName: string;
  sourceUrl: string;
  sourceLinks: ResourceLink[];
  relatedCategorySlugs: string[];
  ctaBusinessSlugs: string[];
  personaTargets: PersonaTarget[];
  publishedAt: string;
  updatedAt: string;
  lastCheckedAt: string;
  isPublished: boolean;
  aiGeneratedSummary: boolean;
};

export type RadarOverview = {
  runCount: number;
  latestRun?: RadarRun;
  latestPublishedAt?: string;
  publishedCount: number;
  blockedCount: number;
  duplicateCount: number;
  candidateCount: number;
  pausedSourceCount: number;
  jobControl: RadarJobControl;
  topNoisySources: Array<{
    sourceSlug: string;
    sourceName: string;
    itemCount: number;
    blockedCount: number;
    paused: boolean;
  }>;
};

export type Event = {
  slug: string;
  title: LocalizedText;
  excerpt: LocalizedText;
  description: LocalizedText[];
  heroImage: string;
  organizer: string;
  verifiedOrganizer: boolean;
  venueName: string;
  address: string;
  city: string;
  startDate: string;
  endDate?: string;
  ticketUrl?: string;
  languageNote: LocalizedText;
  relatedBusinessSlugs: string[];
  tags: string[];
};

export type CommunityPostType = 'board' | 'classified';

export type CommunityPost = {
  slug: string;
  type: CommunityPostType;
  title: LocalizedText;
  excerpt: LocalizedText;
  body: LocalizedText[];
  authorSlug: string;
  city: string;
  createdAt: string;
  updatedAt: string;
  reportCount: number;
  autoHidden: boolean;
  trustLevel: TrustLevel;
  price?: string;
  tags: string[];
  linkUrl?: string;
};

export type BusinessClaim = {
  id: string;
  businessId?: string;
  businessSlug?: string;
  businessName: string;
  claimantName: string;
  email: string;
  category?: string;
  city?: string;
  details?: string;
  heroImage?: string;
  gallery: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

export type ModerationReport = {
  id: string;
  entityType:
    | 'community_post'
    | 'review'
    | 'business';
  entitySlug: string;
  reason: string;
  createdAt: string;
};

export type SortOption =
  | 'featured'
  | 'rating'
  | 'reviewed'
  | 'alphabetical'
  | 'distance'
  | 'newest';
