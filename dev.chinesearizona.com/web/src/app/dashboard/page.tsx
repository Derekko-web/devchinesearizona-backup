import { dashboardMetadata } from '@/lib/page-metadata';
import { DashboardPageView } from '@/views/site-pages';

export const metadata = dashboardMetadata('en');
export const dynamic = 'force-dynamic';

export default function Page() {
  return <DashboardPageView locale="en" />;
}
