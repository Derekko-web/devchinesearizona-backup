import { arizonaOnlyMetadata, requireArizonaOnlySite } from '@/lib/arizona-only-routes.server';
import { discoverArizonaMetadata } from '@/lib/page-metadata';
import { DiscoverArizonaHubPageView } from '@/views/discover-arizona';

export async function generateMetadata() {
  return arizonaOnlyMetadata('en', '/discover-arizona', () => discoverArizonaMetadata('en'), 'Discover Arizona');
}

export default async function Page() {
  await requireArizonaOnlySite();
  return <DiscoverArizonaHubPageView locale="en" />;
}
