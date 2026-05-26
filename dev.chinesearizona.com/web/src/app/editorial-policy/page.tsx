import { publisherPageMetadata } from '@/lib/page-metadata';
import { getCurrentSiteProfile } from '@/lib/site-config.server';
import { PublisherPageView } from '@/views/publisher-pages';

export async function generateMetadata() {
  const site = await getCurrentSiteProfile();
  return publisherPageMetadata('en', 'editorial-policy', site);
}

export default async function Page() {
  return await PublisherPageView({ locale: 'en', slug: 'editorial-policy' });
}
