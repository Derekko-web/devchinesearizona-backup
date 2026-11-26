// Each page area lives in its own file under src/views. This file re-exports
// them so existing imports from '@/views/site-pages' keep working.
export { DirectoryPageView } from '@/views/directory-page';
export { MetroCategoryPageView, CityCategoryPageView } from '@/views/category-pages';
export { BusinessDetailPageView } from '@/views/business-detail-page';
export { RelocationGuidePageView, GuideDetailPageView } from '@/views/guide-pages';
export { CommunityPageView } from '@/views/community-hub-page';
export { CommunityRadarPageView } from '@/views/radar-page';
export { NewsArchivePageView, ArticleDetailPageView } from '@/views/news-pages';
export { EventDetailPageView, CommunityPostDetailPageView } from '@/views/community-detail-pages';
export { AddBusinessPageView } from '@/views/add-business-page';
export { ProfilePageView } from '@/views/profile-page';
export { DashboardPageView } from '@/views/dashboard-page';
export { AdminPageView } from '@/views/admin-page';
export { HiddenArizonaDetailPageView, HiddenArizonaHubPageView } from '@/views/hidden-arizona';
export {
  DiscoverArizonaCategoryPageView,
  DiscoverArizonaDetailPageView,
  DiscoverArizonaHubPageView,
} from '@/views/discover-arizona';
