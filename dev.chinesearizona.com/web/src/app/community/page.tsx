import { communityMetadata } from '@/lib/page-metadata';
import { getCurrentSiteProfile } from '@/lib/site-config.server';
import { CommunityPageView } from '@/views/community-page';

export async function generateMetadata() {
  const site = await getCurrentSiteProfile();
  return communityMetadata('en', site);
}

export default async function Page() {
  const site = await getCurrentSiteProfile();
  return <CommunityPageView locale="en" site={site} />;
}
