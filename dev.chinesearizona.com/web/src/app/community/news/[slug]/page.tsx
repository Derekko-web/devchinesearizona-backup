import { permanentRedirect } from 'next/navigation';

import { getArizonaNewsArticlePath } from '@/lib/arizona-news';
import { requireArizonaOnlySite } from '@/lib/arizona-only-routes.server';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = 'force-dynamic';

export default async function Page({ params }: PageProps) {
  await requireArizonaOnlySite();
  const { slug } = await params;
  permanentRedirect(getArizonaNewsArticlePath(slug));
}
