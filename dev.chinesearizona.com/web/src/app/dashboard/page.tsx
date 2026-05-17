import { dashboardMetadata } from '@/lib/page-metadata';
import { requireAuthenticatedPageUser } from '@/lib/page-auth';
import { DashboardPageView } from '@/views/site-pages';

export const metadata = dashboardMetadata('en');
export const dynamic = 'force-dynamic';

export default async function Page() {
  await requireAuthenticatedPageUser('en', '/dashboard');
  return <DashboardPageView locale="en" />;
}
