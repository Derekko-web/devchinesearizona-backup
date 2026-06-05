import { permanentRedirect } from 'next/navigation';

import { getNewsArticlePath } from '@/lib/arizona-news';
import { getCurrentSiteProfile } from '@/lib/site-config.server';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateMetadata() {
  return {};
}

export const dynamic = 'force-dynamic';

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const site = await getCurrentSiteProfile();
  permanentRedirect(getNewsArticlePath(site, slug));
}
