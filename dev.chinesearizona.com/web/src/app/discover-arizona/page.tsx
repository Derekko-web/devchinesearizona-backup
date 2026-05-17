import { discoverArizonaMetadata } from '@/lib/page-metadata';
import { DiscoverArizonaHubPageView } from '@/views/discover-arizona';

export const metadata = discoverArizonaMetadata('en');

export default function Page() {
  return <DiscoverArizonaHubPageView locale="en" />;
}
