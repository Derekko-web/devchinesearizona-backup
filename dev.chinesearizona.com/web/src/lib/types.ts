export const locales = ['en', 'zh'] as const;

export type Locale = (typeof locales)[number];

export type LocalizedText = {
  en: string;
  zh?: string | null;
};

export type LanguageOption = 'English' | 'Mandarin' | 'Traditional Chinese' | 'Taiwanese';

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
  searchAliases: string[];
  verified: boolean;
  bilingual: boolean;
  newcomerFriendly: boolean;
  sponsored: boolean;
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

export type PersonaTarget =
  | 'tsmc_newcomers'
  | 'local_families'
  | 'students'
  | 'business_owners';

export type ArticleSeries =
  | 'housing-watch'
  | 'tsmc-corridor-watch'
  | 'route-watch'
  | 'restaurant-opening-radar'
  | 'trend-radar'
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

export type Guide = {
  slug: string;
  section: 'moving' | 'housing' | 'utilities' | 'schools' | 'healthcare' | 'transportation';
  title: LocalizedText;
  excerpt: LocalizedText;
  heroImage: string;
  readTime: string;
  publishedAt: string;
  updatedAt: string;
  body: LocalizedText[];
  officialResources: ResourceLink[];
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
  republishedWithPermission?: boolean;
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
  endDate: string;
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
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

export type ModerationReport = {
  id: string;
  entityType: 'community_post' | 'review' | 'business';
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
