import { adminMetadata } from '@/lib/page-metadata';
import { requireStaffPageContext } from '@/lib/page-auth';
import { AdminPageView } from '@/views/site-pages';

export const metadata = adminMetadata('en');
export const dynamic = 'force-dynamic';

export default async function Page() {
  await requireStaffPageContext();
  return <AdminPageView locale="en" />;
}
