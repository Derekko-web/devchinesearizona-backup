import { arizonaOnlyMetadata, requireArizonaOnlySite } from '@/lib/arizona-only-routes.server';
import { relocationMetadata } from '@/lib/page-metadata';
import { RelocationGuidePageView } from '@/views/site-pages';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return arizonaOnlyMetadata('en', '/relocation-guide', () => relocationMetadata('en'), 'Relocation Guide');
}

export default async function Page() {
  await requireArizonaOnlySite();
  return await RelocationGuidePageView({ locale: 'en' });
}
