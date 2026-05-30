import { permanentRedirect } from 'next/navigation';

import { getArizonaNewsPath } from '@/lib/arizona-news';
import { requireArizonaOnlySite } from '@/lib/arizona-only-routes.server';

type PageProps = {
  searchParams: Promise<{
    lane?: string;
  }>;
};

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: PageProps) {
  await requireArizonaOnlySite();
  const { lane } = await searchParams;
  permanentRedirect(getArizonaNewsPath(lane ? `lane=${lane}` : undefined));
}
