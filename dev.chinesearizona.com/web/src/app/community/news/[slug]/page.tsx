import { permanentRedirect } from 'next/navigation';

import { getArizonaNewsArticlePath } from '@/lib/arizona-news';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = 'force-dynamic';

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  permanentRedirect(getArizonaNewsArticlePath(slug));
}
