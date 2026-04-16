import { adminMetadata } from '@/lib/page-metadata';
import { AdminPageView } from '@/views/site-pages';

export const metadata = adminMetadata('en');
export const dynamic = 'force-dynamic';

export default function Page() {
  return <AdminPageView locale="en" />;
}
