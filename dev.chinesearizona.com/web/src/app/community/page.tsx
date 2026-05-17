import { communityMetadata } from '@/lib/page-metadata';
import { CommunityPageView } from '@/views/community-page';

export const metadata = communityMetadata('en');

export default function Page() {
  return <CommunityPageView locale="en" />;
}
