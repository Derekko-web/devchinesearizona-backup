import { relocationMetadata } from '@/lib/page-metadata';
import { RelocationGuidePageView } from '@/views/site-pages';

export const metadata = relocationMetadata('en');
export const dynamic = 'force-dynamic';

export default async function Page() {
  return await RelocationGuidePageView({ locale: 'en' });
}
