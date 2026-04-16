import { communityMetadata } from '@/lib/page-metadata';
import { CommunityPageView } from '@/views/site-pages';

export const metadata = communityMetadata('en');
export const dynamic = 'force-dynamic';

export default async function Page() {
  return await CommunityPageView({ locale: 'en' });
}
