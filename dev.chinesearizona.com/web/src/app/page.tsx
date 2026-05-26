import { homeMetadata } from '@/lib/page-metadata';
import { getCurrentSiteProfile } from '@/lib/site-config.server';
import { HomePageView } from '@/views/home-page';

export async function generateMetadata() {
  const site = await getCurrentSiteProfile();
  return homeMetadata('en', site);
}

export default async function Page() {
  const site = await getCurrentSiteProfile();
  return <HomePageView locale="en" site={site} />;
}
