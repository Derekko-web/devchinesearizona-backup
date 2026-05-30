import { permanentRedirect } from 'next/navigation';

import { getArizonaNewsArchivePath } from '@/lib/arizona-news';
import { requireArizonaOnlySite } from '@/lib/arizona-only-routes.server';

type PageProps = {
  searchParams: Promise<{
    bucket?: string;
    series?: string;
    sourcePolicy?: string;
    year?: string;
    month?: string;
    page?: string;
  }>;
};

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: PageProps) {
  await requireArizonaOnlySite();
  const resolvedSearchParams = await searchParams;
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (typeof value === 'string' && value.length > 0) {
      search.set(key, value);
    }
  }

  permanentRedirect(getArizonaNewsArchivePath(search.toString()));
}
